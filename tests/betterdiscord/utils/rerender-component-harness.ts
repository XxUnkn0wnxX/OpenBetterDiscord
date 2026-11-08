import {afterEach, beforeEach, describe, expect, mock, test} from "bun:test";


const discordModules: {ReactConciler?: Record<string, (...args: any[]) => any>;} = {};
mock.module("@modules/discordmodules", () => ({"default": discordModules}));
mock.module("@modules/nodepatcher", () => ({"default": class NodePatcher {}}));

const ReactUtils = new (await import("@api/reactutils")).default();

type TestFiber = {
    type: any;
    elementType: any;
    flags: number;
    child: TestFiber | null;
    sibling: TestFiber | null;
    alternate: TestFiber | null;
    stateNode?: {current: TestFiber;};
    [key: string]: any;
};

function fiber(type: any, extra: Record<string, unknown> = {}): TestFiber {
    return {
        type,
        elementType: type,
        flags: 0,
        child: null,
        sibling: null,
        alternate: null,
        ...extra
    };
}

let appMount: HTMLDivElement | undefined;
let queueRoot: object;
let enqueued: Array<{fiber: TestFiber; lane: number;}>;
let scheduled: Array<{root: object; fiber: TestFiber; lane: number;}>;

function mountRoot(rootFiber: TestFiber) {
    appMount = document.createElement("div");
    appMount.id = "app-mount";
    Object.defineProperty(appMount, "__reactContainer$test", {
        configurable: true,
        enumerable: true,
        value: {stateNode: {current: rootFiber}}
    });
    document.body.append(appMount);
}

function installSchedulers(enqueueResult: object | null = queueRoot) {
    discordModules.ReactConciler = {
        enqueueConcurrentRenderForLane(instance: TestFiber, lane: number) {
            enqueued.push({fiber: instance, lane});
            return enqueueResult;
        },
        scheduleUpdateOnFiber(root: object, instance: TestFiber, lane: number) {
            scheduled.push({root, fiber: instance, lane});
        }
    };
}

beforeEach(() => {
    queueRoot = {};
    enqueued = [];
    scheduled = [];
    discordModules.ReactConciler = undefined;
});

afterEach(() => {
    appMount?.remove();
    appMount = undefined;
});

describe("ReactUtils.rerenderComponent", () => {
    test("walks child and sibling fibers and applies the optional filter", () => {
        function Target() {}
        const root = fiber(null);
        const first = fiber(Target, {key: "keep"});
        const nested = fiber(Target, {key: "skip"});
        const sibling = fiber(Target, {key: "keep"});
        root.child = first;
        first.child = nested;
        first.sibling = sibling;
        mountRoot(root);
        installSchedulers();

        ReactUtils.rerenderComponent(Target, instance => instance.key === "keep");

        expect(enqueued.map(item => item.fiber)).toEqual([first, sibling]);
        expect(scheduled.map(item => item.fiber)).toEqual([first, sibling]);
        expect(enqueued.every(item => item.lane === 2)).toBe(true);
        expect(nested.type).toBe(Target);
    });

    test("accepts module/key and matches patched and unpatched fiber identities while preserving alternate elementType", () => {
        function Original() {}
        function Patched() {}
        (Patched as any).__originalFunction = Original;
        const root = fiber(null);
        const current = fiber(Original);
        const alternate = fiber(Patched, {elementType: Original});
        current.alternate = alternate;
        alternate.alternate = current;
        root.child = current;
        mountRoot(root);
        installSchedulers();

        const componentModule = {View: Patched};
        ReactUtils.rerenderComponent([componentModule, "View"]);

        expect(current.type).toBe(Patched);
        expect(current.elementType).toBe(Patched);
        expect(alternate.type).toBe(Patched);
        expect(alternate.elementType).toBe(Original);
        expect(enqueued.map(item => item.fiber)).toEqual([current]);
        expect(scheduled.map(item => item.fiber)).toEqual([current]);

        componentModule.View = Original;
        ReactUtils.rerenderComponent([componentModule, "View"]);

        expect(current.type).toBe(Original);
        expect(current.elementType).toBe(Original);
        expect(alternate.type).toBe(Original);
        expect(alternate.elementType).toBe(Original);
        expect(enqueued.map(item => item.fiber)).toEqual([current, current]);
        expect(scheduled).toHaveLength(2);
        expect(scheduled[1]).toEqual({root: queueRoot, fiber: current, lane: 2});
    });

    test("marks both alternates with the force-update flag and schedules with the same sync lane", () => {
        function Target() {}
        const root = fiber(null);
        const current = fiber(Target);
        const alternate = fiber(Target);
        current.alternate = alternate;
        alternate.alternate = current;
        root.child = current;
        mountRoot(root);
        installSchedulers();

        ReactUtils.rerenderComponent(Target);

        expect(current.flags & 131072).toBe(131072);
        expect(alternate.flags & 131072).toBe(131072);
        expect(enqueued).toEqual([{fiber: current, lane: 2}]);
        expect(scheduled).toEqual([{root: queueRoot, fiber: current, lane: 2}]);
    });

    test("returns without work when there is no root or the component is not a function", () => {
        function Target() {}
        const root = fiber(null, {child: fiber(Target)});
        installSchedulers();

        ReactUtils.rerenderComponent(Target);
        expect(enqueued).toEqual([]);

        mountRoot(root);
        ReactUtils.rerenderComponent({});
        expect(enqueued).toEqual([]);
        expect((root.child as TestFiber).type).toBe(Target);
    });

    test("keeps the upstream type mutation when schedulers are missing and skips scheduling for a falsy queue root", () => {
        function Original() {}
        function Patched() {}
        (Patched as any).__originalFunction = Original;
        const root = fiber(null);
        const current = fiber(Original);
        root.child = current;
        mountRoot(root);

        ReactUtils.rerenderComponent([{View: Patched}, "View"]);
        expect(current.type).toBe(Patched);
        expect(current.flags).toBe(0);
        expect(enqueued).toEqual([]);

        installSchedulers(null);
        ReactUtils.rerenderComponent([{View: Patched}, "View"]);
        expect(current.type).toBe(Patched);
        expect(current.flags & 131072).toBe(131072);
        expect(enqueued).toEqual([{fiber: current, lane: 2}]);
        expect(scheduled).toEqual([]);
    });
});
