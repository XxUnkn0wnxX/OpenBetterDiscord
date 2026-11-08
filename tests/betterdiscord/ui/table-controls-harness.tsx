import {afterEach, beforeEach, describe, expect, test} from "bun:test";
import React, {act} from "react";
import {createRoot, type Root} from "react-dom/client";

import {SettingsContext} from "@ui/contexts";
import Table from "@ui/settings/components/table";


Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});

let container: HTMLDivElement;
let root: Root;
let resizeObserverDescriptor: PropertyDescriptor | undefined;
let intersectionObserverDescriptor: PropertyDescriptor | undefined;
let togglePopoverDescriptor: PropertyDescriptor | undefined;
const observedButtons: Element[] = [];
const popoverToggles: Array<boolean | undefined> = [];
let observerDisconnects = 0;

beforeEach(() => {
    resizeObserverDescriptor = Object.getOwnPropertyDescriptor(globalThis, "ResizeObserver");
    intersectionObserverDescriptor = Object.getOwnPropertyDescriptor(globalThis, "IntersectionObserver");
    togglePopoverDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "togglePopover");
    observedButtons.length = 0;
    popoverToggles.length = 0;
    observerDisconnects = 0;

    class StubResizeObserver {
        constructor(_callback: ResizeObserverCallback) {}
        observe() {}
        disconnect() {}
    }
    class StubIntersectionObserver {
        constructor(_callback: IntersectionObserverCallback) {}
        observe(target: Element) {observedButtons.push(target);}
        disconnect() {observerDisconnects++;}
    }
    Object.defineProperty(globalThis, "ResizeObserver", {configurable: true, value: StubResizeObserver});
    Object.defineProperty(globalThis, "IntersectionObserver", {configurable: true, value: StubIntersectionObserver});
    Object.defineProperty(HTMLElement.prototype, "togglePopover", {
        configurable: true,
        value(force?: boolean) {popoverToggles.push(force);}
    });

    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
});

afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    if (resizeObserverDescriptor) Object.defineProperty(globalThis, "ResizeObserver", resizeObserverDescriptor);
    else delete (globalThis as {ResizeObserver?: unknown;}).ResizeObserver;
    if (intersectionObserverDescriptor) Object.defineProperty(globalThis, "IntersectionObserver", intersectionObserverDescriptor);
    else delete (globalThis as {IntersectionObserver?: unknown;}).IntersectionObserver;
    if (togglePopoverDescriptor) Object.defineProperty(HTMLElement.prototype, "togglePopover", togglePopoverDescriptor);
    else delete (HTMLElement.prototype as {togglePopover?: unknown;}).togglePopover;
});

async function render(children: React.ReactNode) {
    await act(async () => root.render(children));
}

describe("table setting control", () => {
    test("adds rows with defaults and updates dependent cells once", async () => {
        const changes: unknown[] = [];
        const columns = {
            enabled: {"type": "switch" as const, "label": "Enabled", "default": false},
            name: {"type": "string" as const, "label": "Name", "default": "new"},
            action: {"type": "dropdown" as const, "label": "Action", "default": "toast", "enableWith": "enabled", "options": [{label: "Toast", value: "toast"}]}
        };
        await render(<Table defaultValue={[]} columns={columns} onChange={value => changes.push(value)} />);

        await act(async () => container.querySelector<HTMLButtonElement>(".bd-table-add")!.click());
        expect(container.querySelectorAll("[data-row]")).toHaveLength(1);
        const cells = container.querySelectorAll<HTMLElement>("[data-row] [role=cell]");
        expect((cells[2].querySelector("input") as HTMLInputElement).value).toBe("new");
        expect((cells[3].querySelector("button") as HTMLButtonElement).disabled).toBe(true);
        expect(changes).toHaveLength(1);

        await act(async () => (cells[1].querySelector("input") as HTMLInputElement).click());
        expect((cells[3].querySelector("button") as HTMLButtonElement).disabled).toBe(false);
        expect(changes).toHaveLength(2);
    });

    test("provider disabled state blocks adding rows and child callbacks", async () => {
        const changes: unknown[] = [];
        await render(
            <SettingsContext.Provider value={{value: [], disabled: true}}>
                <Table defaultValue={[]} columns={{name: {type: "string", label: "Name"}}} onChange={value => changes.push(value)} />
            </SettingsContext.Provider>
        );

        const add = container.querySelector<HTMLButtonElement>(".bd-table-add")!;
        await act(async () => add.click());
        expect(add.disabled).toBe(true);
        expect(container.querySelectorAll("[data-row]")).toHaveLength(0);
        expect(changes).toEqual([]);
    });

    test("multiselect cells emit the selected values once and expose the search field", async () => {
        const changes: unknown[] = [];
        await render(
            <Table
                defaultValue={[{actions: []}]}
                columns={{actions: {
                    type: "multiselect",
                    label: "Actions",
                    search: true,
                    options: [
                        {label: "Toast", value: "toast"},
                        {label: "Log", value: "log"}
                    ]
                }}}
                onChange={value => changes.push(value)}
            />
        );

        expect(container.querySelector("input.bd-select-search")).not.toBeNull();
        await act(async () => container.querySelector<HTMLLIElement>("li[role=option]")!.click());
        expect(container.querySelector(".bd-select-current")?.textContent).toContain("Toast");
        expect(changes).toEqual([[{actions: ["toast"]}]]);
    });

    test("duplicates, reorders by keyboard, and deletes rows with one callback per operation", async () => {
        const changes: unknown[] = [];
        await render(
            <Table
                defaultValue={[{name: "A"}, {name: "B"}]}
                columns={{name: {type: "string", label: "Name"}}}
                onChange={value => changes.push(value)}
            />
        );

        const duplicate = () => container.querySelector<HTMLElement>("[data-row] [role=menu] .bd-select-option")!;
        await act(async () => duplicate().click());
        expect(Array.from(container.querySelectorAll<HTMLInputElement>("[data-row] input"), input => input.value)).toEqual(["A", "A", "B"]);
        expect(changes).toEqual([[{name: "A"}, {name: "A"}, {name: "B"}]]);

        const secondHandle = () => container.querySelectorAll<HTMLButtonElement>("[data-row] .bd-table-handle")[1];
        await act(async () => secondHandle().dispatchEvent(new KeyboardEvent("keydown", {bubbles: true, key: "ArrowDown"})));
        expect(Array.from(container.querySelectorAll<HTMLInputElement>("[data-row] input"), input => input.value)).toEqual(["A", "B", "A"]);
        expect(changes).toEqual([
            [{name: "A"}, {name: "A"}, {name: "B"}],
            [{name: "A"}, {name: "B"}, {name: "A"}]
        ]);

        const firstMenuButton = () => container.querySelector<HTMLButtonElement>("[data-row] .bd-table-more")!;
        await act(async () => firstMenuButton().dispatchEvent(new MouseEvent("click", {bubbles: true, shiftKey: true})));
        expect(Array.from(container.querySelectorAll<HTMLInputElement>("[data-row] input"), input => input.value)).toEqual(["B", "A"]);
        expect(changes).toEqual([
            [{name: "A"}, {name: "A"}, {name: "B"}],
            [{name: "A"}, {name: "B"}, {name: "A"}],
            [{name: "B"}, {name: "A"}]
        ]);
    });

    test("attaches a dropdown popover when an initially empty option list fills", async () => {
        const columns = (options: Array<{label: string; value: string;}>) => ({
            mode: {type: "dropdown" as const, label: "Mode", options}
        });
        await render(<Table value={[{mode: "one"}]} columns={columns([])} />);
        const dropdownObservations = () => observedButtons.filter(button => button.classList.contains("bd-select"));
        expect(dropdownObservations()).toHaveLength(0);

        await render(<Table value={[{mode: "one"}]} columns={columns([{label: "One", value: "one"}])} />);
        expect(dropdownObservations()).toHaveLength(1);

        await render(<Table value={[{mode: "one"}]} columns={columns([])} />);
        expect(observerDisconnects).toBeGreaterThan(0);
    });
});
