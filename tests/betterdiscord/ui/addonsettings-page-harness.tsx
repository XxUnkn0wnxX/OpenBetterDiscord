import {afterEach, expect, mock, test} from "bun:test";
import React, {act} from "react";
import {createRoot, type Root} from "react-dom/client";
import {readFileSync} from "node:fs";
import Store from "../../../src/betterdiscord/stores/base";
import Events from "../../../src/betterdiscord/modules/emitter";
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
const context = React.createContext<any>({});
mock.module(import.meta.resolve("../../../src/betterdiscord/ui/settings/addonshared.tsx"), () => ({addonContext: context, addonText: (v: string) => v, authorByline: (v: React.ReactNode) => v}));
mock.module("@common/i18n", () => ({t: (v: string) => v}));
mock.module("@common/logger", () => ({"default": {stacktrace: () => {}}}));
const shownToasts: unknown[] = [];
mock.module("@stores/toasts", () => ({"default": {show: (...args: unknown[]) => shownToasts.push(args)}}));
mock.module("@structs/markdown", () => ({"default": {parseToReact: (v: string) => v}}));
mock.module("@ui/settings", () => ({SettingsTitleContext: React.createContext(() => null)}));
mock.module("@ui/settings/title", () => ({"default": () => null}));
mock.module("@ui/errorboundary", () => ({"default": ({children}: any) => children}));
mock.module("@ui/base/text", () => ({"default": Object.assign(({children}: any) => children, {Colors: {STATUS_RED: "red"}})}));
const source = readFileSync(new URL("../../../src/betterdiscord/ui/modals.ts", import.meta.url), "utf8");
const method = source.slice(source.indexOf("    static createAddonSettingsContent("), source.indexOf("    static showAddonSettingsModal("));
const compiled = new Bun.Transpiler({loader: "tsx", tsconfig: {compilerOptions: {jsx: "react"}}}).transformSync(`class Modals {${method}}; return Modals;`);
// eslint-disable-next-line no-new-func
const Modals = new Function("React", "TextElement", "t", compiled)(React, Object.assign(() => null, {Colors: {STATUS_RED: "red"}}), (v: string) => v);
mock.module("@ui/modals", () => ({"default": Modals}));
const {default: Page} = await import("../../../src/betterdiscord/ui/settings/addonsettings");
class Manager extends Store {prefix = "plugin" as const; addonList: any[] = []; enabled = true; isEnabled() {return this.enabled;}}
let root: Root; let host: HTMLDivElement; let closes = 0;
afterEach(async () => {await act(async () => root?.unmount()); document.body.replaceChildren(); expect(Events.listenerCount("plugin-unloaded")).toBe(0);});
async function mount(panel: unknown) {
    closes = 0; shownToasts.length = 0; const manager = new Manager();
    const instance = {calls: 0, getSettingsPanel() {expect(this).toBe(instance); this.calls++; return panel;}};
    manager.addonList = [{id: "one", name: "One", author: "A", version: "1", description: "D", instance}];
    host = document.body.appendChild(document.createElement("div")); root = createRoot(host);
    await act(async () => root.render(<context.Provider value={{title: "Plugins", store: manager, closeSettings: () => {closes++;}}}><Page addonId="one" /></context.Provider>));
    return {manager, instance};
}
test("panel content supports DOM, string, function, and React elements with receiver", async () => {
    const node = document.createElement("b"); node.textContent = "node";
    for (const [panel, text] of [[node, "node"], ["<b>html</b>", "html"], [() => <b>function</b>, "function"], [<b>element</b>, "element"]] as const) {
        const {instance} = await mount(panel); expect(instance.calls).toBe(1); expect(host.textContent).toContain(text);
        await act(async () => root.unmount()); host.remove();
    }
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
