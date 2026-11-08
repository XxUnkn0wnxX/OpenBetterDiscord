import {afterEach, expect, mock, test} from "bun:test";
import React, {act} from "react";
import {createRoot, type Root} from "react-dom/client";
import {readFileSync} from "node:fs";
import Store from "../../../src/betterdiscord/stores/base";
import Events from "../../../src/betterdiscord/modules/emitter";
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
const context = React.createContext<any>({});
let unloadDuringWatch = false;
let settingsLocation = "page";
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
mock.module("@ui/settings", () => ({SettingsTitleContext: React.createContext(() => null)}));
mock.module("@ui/settings/title", () => ({"default": () => null}));
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
const {default: Page} = await import("../../../src/betterdiscord/ui/settings/addonsettings");
class Manager extends Store {prefix = "plugin" as const; addonList: any[] = []; enabled = true; isEnabled() {return this.enabled;}}
let root: Root; let host: HTMLDivElement; let closes = 0;
afterEach(async () => {await act(async () => root?.unmount()); document.body.replaceChildren(); expect(Events.listenerCount("plugin-unloaded")).toBe(0);});
async function mount(panel: unknown, modalThrow: Error | null = null, location = "page") {
    closes = 0; shownToasts.length = 0; legacyModalCalls.length = 0; legacyModalEvents.length = 0; panelConversions.length = 0; settingsLocation = location; (globalThis as any).__legacyModalThrow = modalThrow; const manager = new Manager();
    const instance = {calls: 0, getSettingsPanel() {expect(this).toBe(instance); this.calls++; return panel;}};
    manager.addonList = [{id: "one", name: "One", author: "A", version: "1", description: "D", instance}];
    host = document.body.appendChild(document.createElement("div")); root = createRoot(host);
    await act(async () => root.render(<context.Provider value={{title: "Plugins", store: manager, closeSettings: () => {closes++; legacyModalEvents.push("route-close"); root.render(null);}}}><Page addonId="one" /></context.Provider>));
    return {manager, instance};
}
test("panel content supports DOM, string, function, and React elements with receiver", async () => {
    const node = document.createElement("b"); node.textContent = "node";
    for (const [panel, text] of [[node, "node"], ["<b>html</b>", "html"], [() => <b>function</b>, "function"], [<b>element</b>, "element"]] as const) {
        const {instance} = await mount(panel); expect(instance.calls).toBe(1); expect(panelConversions).toEqual([panel]); expect(host.textContent).toContain(text);
        await act(async () => root.unmount()); host.remove();
    }
});
test("nullish self-managed panels open one identity-aware modal in either preference", async () => {
    for (const location of ["page", "modal"]) {
        for (const panel of [null, undefined]) {
            const {instance} = await mount(panel, null, location);
            expect(instance.calls).toBe(1); expect(legacyModalCalls).toEqual([["One", panel, {id: "one", type: "plugin"}]]);
            expect(legacyModalEvents).toEqual(["open", "route-close"]); expect(closes).toBe(1); expect(shownToasts).toEqual([]);
            expect(panelConversions).toEqual([panel]); expect(host.querySelector(".bd-addon-settings")).toBeNull();
            await act(async () => {Events.emit("plugin-unloaded", {id: "other"});});
            expect(legacyModalCalls).toHaveLength(1);
            await act(async () => root.unmount()); host.remove();
        }
    }
});
test("the modal preference passes raw panel results without inline conversion", async () => {
    const node = document.createElement("b"); node.textContent = "node";
    for (const panel of [node, "<b>html</b>", () => <b>function</b>, <b>element</b>] as const) {
        const {instance} = await mount(panel, null, "modal");
        expect(instance.calls).toBe(1); expect(legacyModalCalls).toEqual([["One", panel, {id: "one", type: "plugin"}]]);
        expect(panelConversions).toEqual([panel]); expect(host.querySelector(".bd-addon-settings")).toBeNull();
        if (panel === node) expect(document.body.contains(node)).toBe(false);
        await act(async () => root.unmount()); host.remove();
    }
});
test("only page mode mounts a returned React component inline", async () => {
    let mounts = 0;
    function CounterPanel() {mounts++; return <b>counted panel</b>;}

    const page = await mount(CounterPanel);
    expect(page.instance.calls).toBe(1); expect(mounts).toBe(1); expect(host.textContent).toContain("counted panel");
    await act(async () => root.unmount()); host.remove();

    const modal = await mount(CounterPanel, null, "modal");
    expect(modal.instance.calls).toBe(1); expect(mounts).toBe(1); expect(legacyModalCalls).toEqual([["One", CounterPanel, {id: "one", type: "plugin"}]]);
});
test("a preference change applies only to the next settings opening", async () => {
    const panel = <b>panel</b>; const {manager, instance} = await mount(panel);
    settingsLocation = "modal";
    await act(async () => root.render(<context.Provider value={{title: "Updated Plugins", store: manager, closeSettings: () => {closes++; root.render(null);}}}><Page addonId="one" /></context.Provider>));
    expect(instance.calls).toBe(1); expect(legacyModalCalls).toEqual([]); expect(host.textContent).toContain("panel");
    await act(async () => {host.querySelector("button")?.click();});
    const next = await mount(panel, null, settingsLocation);
    expect(next.instance.calls).toBe(1); expect(legacyModalCalls).toEqual([["One", panel, {id: "one", type: "plugin"}]]);
    expect(panelConversions).toEqual([panel]);
    await act(async () => root.unmount()); host.remove();
});
test("Back closes the settings route once without reevaluating the panel", async () => {
    const {instance} = await mount(<b>panel</b>); const button = host.querySelector("button");
    expect(button?.textContent).toContain("Paginator.back");
    await act(async () => {button?.click();});
    expect(closes).toBe(1); expect(instance.calls).toBe(1); expect(legacyModalCalls).toEqual([]);
    await act(async () => {Events.emit("plugin-unloaded", {id: "one"});}); expect(closes).toBe(1);
});
test("false and zero are valid full-page results", async () => {
    for (const panel of [false, 0]) {
        const {instance} = await mount(panel); expect(instance.calls).toBe(1); expect(legacyModalCalls).toEqual([]); expect(closes).toBe(0);
        await act(async () => root.unmount()); host.remove();
    }
});
test("missing providers and thrown providers report errors without fallback", async () => {
    const manager = new Manager(); const instance = {getSettingsPanel() {throw new Error("provider failed");}};
    manager.addonList = [{id: "one", name: "One", instance}]; host = document.body.appendChild(document.createElement("div")); root = createRoot(host);
    await act(async () => root.render(<context.Provider value={{title: "Plugins", store: manager, closeSettings: () => {closes++;}}}><Page addonId="one" /></context.Provider>));
    expect(legacyModalCalls).toEqual([]); expect(shownToasts).toHaveLength(1);
    await act(async () => root.unmount()); host.remove();
    shownToasts.length = 0; legacyModalCalls.length = 0;
    const missingManager = new Manager(); missingManager.addonList = [{id: "one", name: "One", instance: {}}];
    host = document.body.appendChild(document.createElement("div")); root = createRoot(host);
    await act(async () => root.render(<context.Provider value={{title: "Plugins", store: missingManager, closeSettings: () => {closes++;}}}><Page addonId="one" /></context.Provider>));
    expect(legacyModalCalls).toEqual([]); expect(shownToasts).toHaveLength(1);
    await act(async () => root.unmount()); host.remove();
});
test("legacy modal failures are reported once and do not close the route", async () => {
    const {instance} = await mount(null, new Error("modal failed")); expect(instance.calls).toBe(1); expect(legacyModalCalls).toHaveLength(1); expect(closes).toBe(0); expect(shownToasts).toHaveLength(1);
    await act(async () => root.unmount()); host.remove();
});
test("fresh owner and enabled checks suppress a stale fallback", async () => {
    legacyModalCalls.length = 0; closes = 0; panelConversions.length = 0; settingsLocation = "modal";
    const manager = new Manager();
    const instance = {calls: 0, getSettingsPanel() {this.calls++; manager.addonList = [{id: "one", name: "One", instance: {}}]; return <b>panel</b>;}};
    manager.addonList = [{id: "one", name: "One", instance}]; host = document.body.appendChild(document.createElement("div")); root = createRoot(host);
    await act(async () => root.render(<context.Provider value={{title: "Plugins", store: manager, closeSettings: () => {closes++;}}}><Page addonId="one" /></context.Provider>));
    expect(instance.calls).toBe(1); expect(legacyModalCalls).toEqual([]); expect(panelConversions).toEqual([]);
});
test("fresh enabled check suppresses a fallback after the addon becomes disabled", async () => {
    legacyModalCalls.length = 0; closes = 0; panelConversions.length = 0; settingsLocation = "modal";
    const manager = new Manager(); const instance = {calls: 0, getSettingsPanel() {this.calls++; manager.enabled = false; return <b>panel</b>;}};
    manager.addonList = [{id: "one", name: "One", instance}]; host = document.body.appendChild(document.createElement("div")); root = createRoot(host);
    await act(async () => root.render(<context.Provider value={{title: "Plugins", store: manager, closeSettings: () => {closes++;}}}><Page addonId="one" /></context.Provider>));
    expect(instance.calls).toBe(1); expect(legacyModalCalls).toEqual([]); expect(panelConversions).toEqual([]);
});
test("matching unload before the passive fallback closes without opening a modal", async () => {
    closes = 0; legacyModalCalls.length = 0;
    const manager = new Manager(); const instance = {calls: 0, getSettingsPanel() {this.calls++; return null;}};
    manager.addonList = [{id: "one", name: "One", instance}]; host = document.body.appendChild(document.createElement("div")); root = createRoot(host);
    unloadDuringWatch = true;
    await act(async () => root.render(<context.Provider value={{title: "Plugins", store: manager, closeSettings: () => {closes++;}}}><Page addonId="one" /></context.Provider>));
    expect(instance.calls).toBe(1); expect(closes).toBe(1); expect(legacyModalCalls).toEqual([]);
});
test("unrelated unloads do nothing and matching unload closes once", async () => {
    await mount(<b>panel</b>);
    await act(async () => {Events.emit("theme-unloaded", {id: "one"}); Events.emit("plugin-unloaded", {id: "other"});}); expect(closes).toBe(0);
    await act(async () => {Events.emit("plugin-unloaded", {id: "one"}); Events.emit("plugin-unloaded", {id: "one"});}); expect(closes).toBe(1);
});
test("replacement emitted before unload never invokes replacement or reopens", async () => {
    const {manager, instance} = await mount(<b>old</b>); let replacementCalls = 0;
    manager.addonList = [{...manager.addonList[0], instance: {getSettingsPanel() {replacementCalls++; return <b>new</b>;}}}];
    await act(async () => {manager.emitChange(); Events.emit("plugin-unloaded", {id: "one"});});
    expect(instance.calls).toBe(1); expect(replacementCalls).toBe(0); expect(closes).toBe(1); expect(shownToasts).toEqual([]); expect(host.textContent).not.toContain("new");
});
