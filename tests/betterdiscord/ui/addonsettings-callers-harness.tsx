import {afterEach, beforeEach, expect, mock, test} from "bun:test";
import React, {act} from "react";
import {createRoot, type Root} from "react-dom/client";
import {readFileSync} from "node:fs";
import Store from "../../../src/betterdiscord/stores/base";
import Events from "../../../src/betterdiscord/modules/emitter";
import {useStateFromStores} from "../../../src/betterdiscord/ui/hooks";
import {watchAddonSettingsUnload, type AddonSettingsModalIdentity} from "../../../src/betterdiscord/utils/addonsettingsmodal";
import type {Addon} from "@typed/addon";
import AddonSettingsRoute from "../../../src/betterdiscord/stores/addonsettings";

Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
const roots: Root[] = [];
const opened: Array<{name: string; panel: React.ReactNode; identity: AddonSettingsModalIdentity; closes: number; root: Root}> = [];
const warnings: string[] = [];
const toasts = {warning: (message: string) => {warnings.push(message);}, show: (message: string) => {warnings.push(message);}};
const t = (key: string) => key;

function compile(source: string, parameters: string[], values: unknown[]) {
    const compiled = new Bun.Transpiler({loader: "tsx", tsconfig: {compilerOptions: {jsx: "react"}}}).transformSync(source);
    // Execute production hooks unchanged, following the existing settings-menu harness convention.
    // eslint-disable-next-line no-new-func
    return new Function(...parameters, compiled)(...values);
}
const modalSource = readFileSync(new URL("../../../src/betterdiscord/ui/modals.ts", import.meta.url), "utf8");
const lifecycleSource = modalSource.slice(modalSource.indexOf("function AddonSettingsModalLifecycle("), modalSource.indexOf("export default class Modals"));
const Lifecycle = compile(`${lifecycleSource}\nreturn AddonSettingsModalLifecycle;`, ["React", "watchAddonSettingsUnload"], [React, watchAddonSettingsUnload]);
const Modals = {
    showAddonSettingsModal(name: string, panel: React.ReactNode, identity: AddonSettingsModalIdentity) {
        const root = createRoot(document.body.appendChild(document.createElement("div")));
        roots.push(root);
        const record = {name, panel, identity, closes: 0, root};
        opened.push(record);
        root.render(<Lifecycle identity={identity} onClose={() => {record.closes++;}}>{panel}</Lifecycle>);
    }
};
mock.module("@ui/modals", () => ({"default": Modals}));
mock.module("@stores/toasts", () => ({"default": toasts}));
mock.module("@common/logger", () => ({"default": {stacktrace: () => {}}}));
mock.module("@common/i18n", () => ({t}));
mock.module("@structs/markdown", () => ({"default": {parseToReact: (value: string) => value}}));
mock.module("@webpack", () => ({getByKeys: () => undefined}));
mock.module("@modules/discordmodules", () => ({"default": {
    Tooltip: ({children}: {children: (props: object) => React.ReactNode}) => children({}), Dispatcher: {dispatch: () => {}}
}}));
mock.module(import.meta.resolve("../../../src/betterdiscord/ui/settings/components/switch"), () => ({"default": () => null}));
mock.module(import.meta.resolve("../../../src/betterdiscord/ui/settings/addonshared.tsx"), () => ({addonText: (value: string) => value, authorByline: (value: React.ReactNode) => value}));
const {default: AddonCard} = await import("../../../src/betterdiscord/ui/settings/addoncard");

const ContextMenu = {
    CheckboxItem: ({label, action}: {label: string; action: React.MouseEventHandler}) => <button data-addon-menu onClick={action}>{label}</button>,
    Item: () => null,
    Group: ({children}: {children: React.ReactNode}) => <>{children}</>
};
const settingsSource = readFileSync(new URL("../../../src/betterdiscord/ui/settings.tsx", import.meta.url), "utf8");
const menuSource = settingsSource.slice(settingsSource.indexOf("function useAddonMenu("), settingsSource.indexOf("export default SettingsRenderer;"));
const useAddonMenu = compile(`${menuSource}\nreturn useAddonMenu;`, ["React", "useStateFromStores", "ContextMenu", "toasts", "t", "AddonSettingsRoute", "openCategory"], [React, useStateFromStores, ContextMenu, toasts, t, AddonSettingsRoute, () => {}]);

function addon(id: string): Addon {
    return {id, name: "Header Name", filename: `${id}.plugin.js`, author: "Author", description: "Description", version: "1.0.0", added: 1, modified: 1, size: 1, slug: id, format: "jsdoc"};
}
class MenuManager extends Store {
    prefix = "plugin";
    addonList: any[] = [];
    enabled = true;
    toggles = 0;
    resolveAddon(name: string) {return this.addonList.find(item => item.name === name);}
    isEnabled() {return this.enabled;}
    toggleAddon() {this.toggles++;}
}
let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
    opened.length = 0; warnings.length = 0;
    container = document.body.appendChild(document.createElement("div"));
    root = createRoot(container);
    roots.push(root);
});
afterEach(async () => {
    await act(async () => {for (const active of roots) active.unmount();});
    roots.length = 0;
    document.body.replaceChildren();
    expect(Events.listenerCount("plugin-unloaded")).toBe(0);
    expect(Events.listenerCount("theme-unloaded")).toBe(0);
});

async function unload(identity: AddonSettingsModalIdentity, record = opened.at(-1)!) {
    await act(async () => {
        Events.emit(`${identity.type === "plugin" ? "theme" : "plugin"}-unloaded`, {id: identity.id});
        Events.emit(`${identity.type}-unloaded`, {id: "Other"});
    });
    expect(record.closes).toBe(0);
    await act(async () => {Events.emit(`${identity.type}-unloaded`, {id: identity.id}); Events.emit(`${identity.type}-unloaded`, {id: identity.id});});
    expect(record.closes).toBe(1);
}

test("Settings shift and card route to settings without evaluating panels", async () => {
    const instance = {calls: 0, getSettingsPanel() {this.calls++; return <span>Panel</span>;}};
    const manager = new MenuManager();
    manager.addonList = [{...addon("MenuID"), instance}];
    function Menu() {return useAddonMenu(manager);}
    await act(async () => root.render(<Menu />));
    await act(async () => container.querySelector("button")!.dispatchEvent(new MouseEvent("click", {bubbles: true, shiftKey: true})));
    expect(AddonSettingsRoute.id).toBe("MenuID");
    expect(instance.calls).toBe(0);
    manager.enabled = false;
    await act(async () => manager.emitChange());
    await act(async () => container.querySelector("button")!.dispatchEvent(new MouseEvent("click", {bubbles: true, shiftKey: true})));
    expect(warnings).toEqual(["Addons.isDisabled"]);
    await act(async () => root.render(<AddonCard addon={addon("Card")} type="plugin" enabled hasSettings onChange={() => {}} editAddon={() => {}} deleteAddon={() => {}} store={undefined as any} />));
    await act(async () => container.querySelector<HTMLButtonElement>("button[aria-label='Addons.addonSettings']")!.click());
    expect(AddonSettingsRoute.id).toBe("Card");
});

test("legacy modal retains matching unload lifecycle", async () => {
    await act(async () => Modals.showAddonSettingsModal("Name", <span>Panel</span>, {id: "Legacy", type: "plugin"}));
    await unload({id: "Legacy", type: "plugin"});
});
