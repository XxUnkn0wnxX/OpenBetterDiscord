import {afterEach, expect, mock, test} from "bun:test";
import React, {act} from "react";
import {createRoot, type Root} from "react-dom/client";
import {readFileSync} from "node:fs";
import Store from "../../../src/betterdiscord/stores/base";
import Events from "../../../src/betterdiscord/modules/emitter";
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
const context = React.createContext<any>({});
const settingsTitleContext = React.createContext<any>(() => null);
let renderedTitle: React.ReactNode = null;
let unloadDuringWatch = false;
let settingsLocation = "page";
let unloadOnTitle = false;
let setQuery: React.Dispatch<React.SetStateAction<string>>;
mock.module(import.meta.resolve("../../../src/betterdiscord/ui/settings/addonshared.tsx"), () => ({addonContext: context, addonText: (v: string) => v, authorByline: (v: React.ReactNode) => v}));
mock.module(import.meta.resolve("../../../src/betterdiscord/utils/addonsettingsmodal.ts"), () => ({watchAddonSettingsUnload: ({id, type}: {id: string; type: string;}, onClose: () => void) => {
    const event = `${type}-unloaded`;
    const listener = (addon?: {id?: string;}) => {if (addon?.id === id) {Events.off(event, listener); onClose();}};
    Events.on(event, listener);
    if (unloadDuringWatch) {unloadDuringWatch = false; Events.emit(event, {id});}
    return () => Events.off(event, listener);
}}));
mock.module("@common/i18n", () => ({t: (v: string) => v}));
mock.module("@stores/settings", () => ({"default": {get: () => settingsLocation}}));
mock.module("@common/logger", () => ({"default": {stacktrace: () => {}}}));
const shownToasts: unknown[] = [];
mock.module("@stores/toasts", () => ({"default": {show: (...args: unknown[]) => shownToasts.push(args)}}));
mock.module("@structs/markdown", () => ({"default": {parseToReact: (v: string) => v}}));
mock.module("@ui/settings", () => ({SettingsTitleContext: settingsTitleContext}));
mock.module("@ui/settings/title", () => ({"default": ({text}: any) => <div data-settings-title>{text}</div>}));
mock.module("@ui/errorboundary", () => ({"default": ({children}: any) => children}));
mock.module("@ui/base/text", () => ({"default": Object.assign(({children}: any) => children, {Colors: {STATUS_RED: "red"}})}));
mock.module("@ui/base/button", () => ({"default": Object.assign(({children, onClick, grow: _grow, ...props}: any) => <button {...props} onClick={onClick}>{children}</button>, {Sizes: {SMALL: "small"}, Looks: {LINK: "link"}})}));
const source = readFileSync(new URL("../../../src/betterdiscord/ui/modals.ts", import.meta.url), "utf8");
const method = source.slice(source.indexOf("    static createAddonSettingsContent("), source.indexOf("    static showAddonSettingsModal("));
const compiled = new Bun.Transpiler({loader: "tsx", tsconfig: {compilerOptions: {jsx: "react"}}}).transformSync(`class Modals {${method} static showAddonSettingsModal(...args) { globalThis.__legacyModalCalls.push(args); if (globalThis.__legacyModalThrow) throw globalThis.__legacyModalThrow; globalThis.__legacyModalEvents.push("open"); this.createAddonSettingsContent(args[1]); } }; return Modals;`);
// eslint-disable-next-line no-new-func
const Modals = new Function("React", "TextElement", "t", compiled)(React, Object.assign(() => null, {Colors: {STATUS_RED: "red"}}), (v: string) => v);
const convertPanel = Modals.createAddonSettingsContent;
const panelConversions: unknown[] = [];
Modals.createAddonSettingsContent = function(panel: unknown) {panelConversions.push(panel); return convertPanel.call(this, panel);};
mock.module("@ui/modals", () => ({"default": Modals}));
const legacyModalCalls: unknown[][] = [];
const legacyModalEvents: string[] = [];
Object.assign(globalThis, {__legacyModalCalls: legacyModalCalls, __legacyModalEvents: legacyModalEvents, __legacyModalThrow: null});
let mounts = 0;
mock.module(import.meta.resolve("../../../src/betterdiscord/ui/settings/addonlist.tsx"), () => ({"default": () => {const [query, set] = React.useState("search"); setQuery = set; React.useEffect(() => {mounts++;}, []); return <div data-list><input value={query} onChange={event => set(event.target.value)} /><div data-scroll /></div>;}}));
mock.module(import.meta.resolve("../../../src/betterdiscord/ui/settings/addonstore.tsx"), () => ({"default": () => <div data-store />}));
const {default: AddonPage} = await import("../../../src/betterdiscord/ui/settings/addonpage");
const {default: route} = await import("../../../src/betterdiscord/stores/addonsettings");
const managers: Manager[] = [];
class Manager extends Store {
    prefix = "plugin" as const; addonList: any[] = []; enabled = true;
    listeners = new Set<() => void>();
    constructor() {super(); managers.push(this);}
    addChangeListener(listener: () => void) {this.listeners.add(listener); return super.addChangeListener(listener);}
    removeChangeListener(listener: () => void) {this.listeners.delete(listener); super.removeChangeListener(listener);}
    isEnabled() {return this.enabled;}
}
let root: Root; let host: HTMLDivElement; let titleRoot: Root | undefined; let titleHost: HTMLDivElement | undefined;
afterEach(async () => {await act(async () => {titleRoot?.unmount(); root?.unmount(); route.close();}); document.body.replaceChildren(); titleRoot = undefined; titleHost = undefined; expect(Events.listenerCount("plugin-unloaded")).toBe(0); for (const manager of managers) expect(manager.listeners.size).toBe(0); managers.length = 0; unloadOnTitle = false;});
async function renderHeader() {titleHost = document.body.appendChild(document.createElement("div")); titleRoot = createRoot(titleHost); await act(async () => titleRoot!.render(renderedTitle));}
async function mount(panel: unknown, location = "page") {
    mounts = 0; renderedTitle = null; shownToasts.length = 0; legacyModalCalls.length = 0; legacyModalEvents.length = 0; panelConversions.length = 0; settingsLocation = location; (globalThis as any).__legacyModalThrow = null;
    const manager = new Manager();
    const instance = {calls: 0, getSettingsPanel() {expect(this).toBe(instance); this.calls++; return panel;}};
    manager.addonList = [{id: "one", name: "One", author: "A", version: "1", description: "D", instance}];
    host = document.body.appendChild(document.createElement("div")); root = createRoot(host);
    await act(async () => root.render(<settingsTitleContext.Provider value={(title: React.ReactNode) => {renderedTitle = title; if (unloadOnTitle) {unloadOnTitle = false; Events.emit("plugin-unloaded", {id: "one"});}}}><AddonPage title="Plugins" store={manager as any} /></settingsTitleContext.Provider>));
    return {manager, instance};
}
async function open() {await act(async () => route.open("plugin", "one"));}
test("modal and nullish openings preserve the list, search and scroll", async () => {
    for (const [panel, location] of [[null, "page"], [undefined, "page"], [<b>panel</b>, "modal"]] as const) {
        const {manager, instance} = await mount(panel, location); expect(manager.listeners.size).toBe(0); const list = host.querySelector("[data-list]"); const input = host.querySelector("input")!; const scroll = host.querySelector("[data-scroll]")!; await act(async () => setQuery("query")); scroll.scrollTop = 42;
        await open(); expect(instance.calls).toBe(1); expect(host.querySelector("[data-list]")).toBe(list); expect(input.value).toBe("query"); expect(scroll.scrollTop).toBe(42); expect(mounts).toBe(1); expect(manager.listeners.size).toBe(1);
        expect(legacyModalCalls[0].slice(0, 3)).toEqual(["One", panel, {id: "one", type: "plugin"}]);
        (legacyModalCalls[0][3] as any).release(); expect(manager.listeners.size).toBe(0); await act(async () => root.unmount()); host.remove();
    }
});
test("page results preserve content, receiver and Back", async () => {
    const node = document.createElement("b"); node.textContent = "node";
    for (const [panel, text] of [[node, "node"], ["<b>html</b>", "html"], [() => <b>function</b>, "function"], [<b>element</b>, "element"], [false, ""], [0, "0"]] as const) {
        const {instance} = await mount(panel); await open(); expect(instance.calls).toBe(1); expect(panelConversions).toEqual([panel]); expect(host.textContent).toContain(text); await renderHeader();
        const button = titleHost!.querySelector<HTMLButtonElement>("button.bd-addon-settings-back")!; expect(titleHost!.querySelector(".bd-addon-title")?.children[0]).toBe(button); await act(async () => button.click()); expect(host.querySelector("[data-list]")).not.toBeNull();
        await act(async () => {titleRoot?.unmount(); root.unmount();}); titleRoot = undefined; titleHost?.remove(); host.remove();
    }
});
test("errors show a page and Back; disabled addons are not evaluated", async () => {
    const {manager, instance} = await mount(null); manager.enabled = false; await open(); expect(instance.calls).toBe(0); expect(host.querySelector("[data-list]")).not.toBeNull();
    manager.enabled = true; Object.defineProperty(instance, "getSettingsPanel", {get() {throw new Error("getter failed");}}); await open(); expect(shownToasts).toHaveLength(1); await renderHeader(); expect(titleHost!.querySelector(".bd-addon-settings-back")).not.toBeNull();
});
test("same ID reentrant intent invalidates the first result and consumes once", async () => {
    const {instance} = await mount(null); instance.getSettingsPanel = function() {this.calls++; if (this.calls === 1) route.open("plugin", "one"); return <b>new</b>;}; await open(); expect(instance.calls).toBe(2); expect(legacyModalCalls).toHaveLength(0); expect(host.textContent).toContain("new");
});
test("disable and reenable during provider invalidates its result", async () => {
    const {manager, instance} = await mount(null); instance.getSettingsPanel = function() {this.calls++; manager.enabled = false; manager.emitChange(); manager.enabled = true; manager.emitChange(); return null;}; await open(); expect(instance.calls).toBe(1); expect(legacyModalCalls).toHaveLength(0); expect(host.querySelector("[data-list]")).not.toBeNull(); expect(manager.listeners.size).toBe(0);
});
test("displayed page closes on disable", async () => {const {manager} = await mount(<b>panel</b>); await open(); manager.enabled = false; await act(async () => manager.emitChange()); expect(host.querySelector("[data-list]")).not.toBeNull();});
test("modal leaves an existing page mounted and newer same-ID page owns Back", async () => {
    const {instance} = await mount(<b>first</b>); await open(); const oldBack = (renderedTitle as any).props.text.props.children[0].props.onClick;
    settingsLocation = "modal"; await open(); expect(instance.calls).toBe(2); expect(host.textContent).toContain("first"); (legacyModalCalls[0][3] as any).release();
    settingsLocation = "page"; instance.getSettingsPanel = function() {this.calls++; return <b>second</b>;}; await open(); expect(host.textContent).toContain("second"); await act(async () => oldBack()); expect(host.textContent).toContain("second");
});
test("modal leaves Store mounted", async () => {
    await mount(null, "modal"); await act(async () => route.openStore("plugin")); const store = host.querySelector("[data-store]"); expect(store).not.toBeNull(); await open(); expect(host.querySelector("[data-store]")).toBe(store); (legacyModalCalls[0][3] as any).release();
});
test("matching unload before destination handoff cancels opening", async () => {
    await mount(null, "modal"); await open(); const opening = legacyModalCalls[0][3] as any; expect(opening.isCurrent()).toBe(true); await act(async () => Events.emit("plugin-unloaded", {id: "one"})); expect(opening.isCurrent()).toBe(false); opening.release();
});
test("synchronous consume listener changing intent discards old request", async () => {
    const {instance} = await mount(<b>panel</b>); let changed = false; const unsub = route.addChangeListener(() => {if (!route.request && !changed) {changed = true; route.openStore("plugin"); route.consumeStore("plugin");}}); await open(); unsub(); expect(instance.calls).toBe(0); expect(legacyModalCalls).toHaveLength(0);
});
test("throwing provider and modal wrapper report one error", async () => {
    const {instance} = await mount(null); instance.getSettingsPanel = () => {throw new Error("provider");}; await open(); expect(shownToasts).toHaveLength(1); expect(legacyModalCalls).toHaveLength(0); await act(async () => root.unmount()); host.remove();
    const next = await mount(null); (globalThis as any).__legacyModalThrow = new Error("wrapper"); await open(); expect(next.instance.calls).toBe(1); expect(shownToasts).toHaveLength(1); expect(host.querySelector(".bd-addon-settings")).not.toBeNull();
});
test("replacement restored during provider and matching unload suppress stale results", async () => {
    for (const action of ["replace", "unload"]) {
        const {manager, instance} = await mount(null); const original = manager.addonList[0];
        instance.getSettingsPanel = function() {
            this.calls++;
            if (action === "replace") {manager.addonList = [{...original}]; manager.emitChange(); manager.addonList = [original]; manager.emitChange();}
            else {Events.emit("plugin-unloaded", {id: "one"});}
            return null;
        };
        await open(); expect(instance.calls).toBe(1); expect(legacyModalCalls).toHaveLength(0); expect(host.querySelector("[data-list]")).not.toBeNull(); expect(manager.listeners.size).toBe(0); await act(async () => root.unmount()); host.remove();
    }
});
test("unload during guard installation prevents provider call", async () => {
    const {instance} = await mount(null); unloadDuringWatch = true; await open(); expect(instance.calls).toBe(0); expect(legacyModalCalls).toHaveLength(0);
});
test("a getter that starts a new intent is read once and never invoked", async () => {
    const {instance} = await mount(null); let reads = 0; let calls = 0;
    Object.defineProperty(instance, "getSettingsPanel", {get() {reads++; route.openStore("plugin"); route.consumeStore("plugin"); return () => {calls++;};}});
    await open(); expect(reads).toBe(1); expect(calls).toBe(0); expect(legacyModalCalls).toHaveLength(0);
});
test("new ID request supersedes old work", async () => {
    const {manager, instance} = await mount(null); const other = {calls: 0, getSettingsPanel() {this.calls++; return <b>other</b>;}};
    manager.addonList.push({id: "two", name: "Two", instance: other});
    instance.getSettingsPanel = function() {this.calls++; route.open("plugin", "two"); return null;};
    await open(); expect(instance.calls).toBe(1); expect(other.calls).toBe(1); expect(host.textContent).toContain("other"); expect(legacyModalCalls).toHaveLength(0);
});
test("preference changes affect the next opening and unload closes the displayed page", async () => {
    const {instance} = await mount(<b>panel</b>); await open(); settingsLocation = "modal"; expect(host.textContent).toContain("panel"); expect(instance.calls).toBe(1);
    await act(async () => Events.emit("plugin-unloaded", {id: "other"})); expect(host.textContent).toContain("panel");
    await act(async () => Events.emit("plugin-unloaded", {id: "one"})); expect(host.querySelector("[data-list]")).not.toBeNull();
    await open(); expect(instance.calls).toBe(2); expect(legacyModalCalls).toHaveLength(1); (legacyModalCalls[0][3] as any).release();
});

test("page handoff catches unload during title publication before its watcher attaches", async () => {
    const {manager, instance} = await mount(<b>panel</b>); expect(manager.listeners.size).toBe(0); unloadOnTitle = true;
    await open(); expect(instance.calls).toBe(1); expect(host.querySelector("[data-list]")).not.toBeNull(); expect(shownToasts).toHaveLength(0); expect(manager.listeners.size).toBe(0);
    await open(); expect(instance.calls).toBe(2); expect(host.textContent).toContain("panel"); expect(manager.listeners.size).toBe(1);
});
