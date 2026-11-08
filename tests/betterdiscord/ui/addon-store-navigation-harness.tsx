import {afterEach, expect, mock, test} from "bun:test";
import React, {act} from "react";
import {createRoot, type Root} from "react-dom/client";
import Store from "../../../src/betterdiscord/stores/base";
import Route from "../../../src/betterdiscord/stores/addonsettings";

Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
const context = React.createContext<any>({});
mock.module(import.meta.resolve("../../../src/betterdiscord/ui/settings/addonshared.tsx"), () => ({addonContext: context, addonText: (value: string) => value}));
mock.module(import.meta.resolve("../../../src/betterdiscord/ui/settings/addonlist.tsx"), () => ({"default": () => <div data-list />}));
mock.module(import.meta.resolve("../../../src/betterdiscord/ui/settings/addonstore.tsx"), () => ({"default": () => <div data-store />}));
mock.module("@stores/settings", () => ({"default": {get: () => "page"}}));
mock.module("@ui/modals", () => ({"default": {}}));
mock.module(import.meta.resolve("../../../src/betterdiscord/ui/settings/addonsettings.tsx"), () => ({"default": ({payload}: any) => {React.useLayoutEffect(() => {payload.opening.release();}, [payload]); return <div data-settings={payload.addon.id} />;}}));
const {default: Page} = await import("../../../src/betterdiscord/ui/settings/addonpage");
class Manager extends Store { constructor(public prefix: "plugin" | "theme") {super();} addonList = [{id: "one", instance: {getSettingsPanel: () => <div />}}]; isEnabled() {return true;} }
let roots: Root[] = [];
async function mount(prefix: "plugin" | "theme") {
    const element = document.body.appendChild(document.createElement("div"));
    const root = createRoot(element); roots.push(root);
    await act(async () => root.render(<Page title={prefix} store={new Manager(prefix) as any} />));
    return element;
}
afterEach(async () => {
    await act(async () => {for (const root of roots) root.unmount(); Route.close(); Route.consumeStore("plugin"); Route.consumeStore("theme");});
    roots = []; document.body.replaceChildren();
});
test("pending Store is consumed after delayed mount", async () => {
    Route.openStore("plugin");
    const element = await mount("plugin");
    expect(element.querySelector("[data-store]")).not.toBeNull();
    expect(Route.pendingStore).toBeNull();
});
test("mounted page responds to Store and repeated Store requests", async () => {
    const element = await mount("plugin");
    expect(element.querySelector("[data-list]")).not.toBeNull();
    await act(async () => Route.openStore("plugin"));
    expect(element.querySelector("[data-store]")).not.toBeNull();
    await act(async () => Route.openStore("plugin"));
    expect(element.querySelector("[data-store]")).not.toBeNull();
});
test("plugin and theme routes remain isolated", async () => {
    const plugin = await mount("plugin"); const theme = await mount("theme");
    await act(async () => Route.openStore("theme"));
    expect(plugin.querySelector("[data-list]")).not.toBeNull();
    expect(theme.querySelector("[data-store]")).not.toBeNull();
    await act(async () => Route.open("plugin", "one"));
    expect(plugin.querySelector("[data-settings=\"one\"]")).not.toBeNull();
    expect(theme.querySelector("[data-store]")).not.toBeNull();
});
