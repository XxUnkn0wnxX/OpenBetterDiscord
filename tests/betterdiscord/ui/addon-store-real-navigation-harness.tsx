import {afterEach, beforeEach, expect, mock, test} from "bun:test";
import React, {act} from "react";
import {createRoot, type Root} from "react-dom/client";
import Store from "../../../src/betterdiscord/stores/base";
import Route from "../../../src/betterdiscord/stores/addonsettings";
import {useStateFromStores} from "../../../src/betterdiscord/ui/hooks";
import {readFileSync} from "node:fs";

Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});

mock.module("@common/i18n", () => ({t: (key: string) => key}));
mock.module("@common/logger", () => ({"default": {warn: () => {}, error: () => {}}}));
mock.module("@modules/discordmodules", () => ({"default": {Tooltip: ({children}: any) => children({})}}));
mock.module("@modules/ipc", () => ({"default": {openPath: () => undefined}}));
mock.module("@stores/settings", () => ({"default": {get: () => false}}));
mock.module("@stores/json", () => ({"default": {get: () => ({}), set: () => undefined}}));
const MockButton = Object.assign(({children, onClick, ...props}: any) => <button onClick={onClick} {...props}>{children}</button>, {
    Sizes: {LARGE: "large", NONE: "none"},
    Looks: {BLANK: "blank"}
});
mock.module("@ui/base/button", () => ({"default": MockButton}));
const MockText = Object.assign(({children, ...props}: any) => <span {...props}>{children}</span>, {Colors: {HEADER_PRIMARY: "primary", HEADER_SECONDARY: "secondary"}});
mock.module("@ui/base/text", () => ({"default": MockText}));
mock.module("@ui/blankslates/empty", () => ({"default": ({title, children}: any) => <div data-empty-slate>{title}{children}</div>}));
mock.module("@ui/blankslates/noresults", () => ({"default": () => <div data-no-results />}));
mock.module("@ui/errorboundary", () => ({"default": ({children}: any) => <>{children}</>}));
mock.module("@ui/modals", () => ({"default": {showConfirmationModal: () => undefined}}));
mock.module("@ui/settings/components/dropdown", () => ({"default": () => <div />}));
mock.module("@ui/settings/components/search", () => ({"default": () => <input />}));
const SettingsTitleContext = React.createContext((value: React.ReactNode) => value);
mock.module("@ui/settings", () => ({SettingsTitleContext}));
mock.module("@ui/settings/title", () => ({
    "default": ({text, children}: any) => <>{text}{children}</>,
    "SettingsTitlePublisher": ({title}: any) => title
}));
mock.module("lucide-react", () => {
    const ChevronRightIcon = () => <svg data-chevron />;
    const Icon = () => <svg />;
    return {
        BadgeCheckIcon: Icon,
        CheckIcon: Icon,
        ChevronRightIcon,
        FolderIcon: Icon,
        LayoutGridIcon: Icon,
        StoreIcon: Icon,
        StretchHorizontalIcon: Icon,
        XIcon: Icon
    };
});
mock.module(import.meta.resolve("../../../src/betterdiscord/ui/settings/addoncard.tsx"), () => ({"default": () => null}));

mock.module(import.meta.resolve("../../../src/betterdiscord/ui/settings/addonstore.tsx"), () => ({
    "default": () => {
        const {toggleStore} = React.useContext(addonContext);
        return <div data-store-page>
            <AddonHeader count={0} searching={false}><input /></AddonHeader>
            <button data-store-back onClick={toggleStore}>Back to addons</button>
        </div>;
    }
}));


const {addonContext, AddonHeader} = await import("@ui/settings/addonshared");
const {default: AddonPage} = await import("@ui/settings/addonpage");
const settingsSource = readFileSync(new URL("../../../src/betterdiscord/ui/settings.tsx", import.meta.url), "utf8");
function compile(source: string, parameters: string[], values: unknown[]) {
    const compiled = new Bun.Transpiler({loader: "tsx", tsconfig: {compilerOptions: {jsx: "react"}}}).transformSync(source);
    // eslint-disable-next-line no-new-func
    return new Function(...parameters, compiled)(...values);
}
const declaration = settingsSource.slice(settingsSource.indexOf("const UserSettings ="), settingsSource.indexOf("const closeUserSettings =")).trim();
const methodStart = settingsSource.indexOf("    public openSettingsPage(key: string) {");
const methodEnd = settingsSource.indexOf("\n    public closeUserSettingsModal()", methodStart);
const method = settingsSource.slice(methodStart, methodEnd).trim().replace(/^public /, "");
const categoryStart = settingsSource.indexOf("function openCategory(id: string) {");
const categoryEnd = settingsSource.indexOf("\nfunction useCollectionMenu(", categoryStart);
const category = settingsSource.slice(categoryStart, categoryEnd);
const menuStart = settingsSource.indexOf("function useAddonMenu(manager: AddonManager) {");
const menuEnd = settingsSource.indexOf("\nexport default SettingsRenderer;", menuStart);
const menu = settingsSource.slice(menuStart, menuEnd);
let order: string[] = [];
const ContextMenu = {
    close() {order.push("close");},
    Group: ({children}: any) => <>{children}</>,
    CheckboxItem: ({label, action}: any) => <button onClick={action}>{label}</button>,
    Item: ({id, action}: any) => <button data-store-menu={id} onClick={action} />
};
class Manager extends Store {
    state = {}; addonFolder = "/plugins";
    constructor(public prefix: "plugin" | "theme", public addonList: any[]) {super();}
    resolveAddon(name: string) {return this.addonList.find(addon => addon.name === name);}
    isEnabled() {return false;} toggleAddon() {} enableAllAddons() {} disableAllAddons() {}
}
const addon = {id: "sample", name: "Sample", author: "Author", description: "Description", version: "1.0", added: 1, modified: 1};
let container: HTMLDivElement; let root: Root;
beforeEach(() => {order = []; container = document.body.appendChild(document.createElement("div")); root = createRoot(container);});
afterEach(async () => {await act(async () => {root.unmount(); Route.close(); Route.consumeStore("plugin"); Route.consumeStore("theme");}); container.remove();});
for (const combined of [false, true]) {
    test(combined ? "combined lookup takes priority and Store route precedes navigation" : "opener fallback queues Store before close and open", async () => {
        const lookups: string[][] = [];
        const candidate: any = {openUserSettings(this: any, target: string, options: {section: string}) {
            expect(this).toBe(candidate); expect(Route.pendingStore).toBe(combined ? "theme" : "plugin");
            expect(target).toBe(combined ? "betterdiscord_themes_panel" : "betterdiscord_plugins_panel");
            expect(options.section).toBe(combined ? "themes" : "plugins"); order.push("open");
        }};
        if (combined) candidate.USER_SETTINGS_MODAL_KEY = "key";
        const openerOnly = {openUserSettings() {throw new Error("wrong candidate");}};
        const candidates = combined ? [openerOnly, candidate] : [candidate];
        const getByKeys = (keys: string[], options: unknown) => {
            expect(options).toEqual({firstId: 840065, cacheId: "core-settings-usersettings"});
            lookups.push(keys); return candidates.find(item => keys.every(key => Object.hasOwn(item, key)));
        };
        const selected = compile(declaration + "\nreturn UserSettings;", ["getByKeys"], [getByKeys]);
        const renderer = compile("return ({" + method + "});", ["UserSettings"], [selected]);
        const openCategory = compile(category + "\nreturn openCategory;", ["ContextMenu", "SettingsRenderer"], [ContextMenu, renderer]);
        const manager = new Manager(combined ? "theme" : "plugin", []);
        const route = {openStore(prefix: "plugin" | "theme") {order.push("route"); Route.openStore(prefix);}, open: Route.open.bind(Route)};
        const useMenu = compile(menu + "\nreturn useAddonMenu;", ["React", "useStateFromStores", "ContextMenu", "toasts", "t", "AddonSettingsRoute", "openCategory"], [React, useStateFromStores, ContextMenu, {warning() {}}, (v: string) => v, route, openCategory]);
        function Menu() {return useMenu(manager);}
        await act(async () => root.render(<Menu />));
        await act(async () => container.querySelector<HTMLButtonElement>("[data-store-menu]")!.click());
        expect(order).toEqual(["route", "close", "open"]);
        expect(lookups).toEqual(combined ? [["openUserSettings", "USER_SETTINGS_MODAL_KEY"]] : [["openUserSettings", "USER_SETTINGS_MODAL_KEY"], ["openUserSettings"]]);
    });
}
test("real addon list Store card and back; empty inventory initially opens Store", async () => {
    const installed = new Manager("plugin", [addon]);
    await act(async () => root.render(<AddonPage title="Plugins" store={installed as any} />));
    expect(container.querySelector(".bd-store-card")).not.toBeNull();
    await act(async () => container.querySelector<HTMLElement>(".bd-store-card")!.click());
    expect(container.querySelector("[data-store-page]")).not.toBeNull();
    await act(async () => container.querySelector<HTMLButtonElement>("[data-store-back]")!.click());
    expect(container.querySelector(".bd-store-card")).not.toBeNull();
    await act(async () => root.render(<AddonPage key="empty" title="Plugins" store={new Manager("plugin", []) as any} />));
    expect(container.querySelector("[data-store-page]")).not.toBeNull();
    await act(async () => container.querySelector<HTMLButtonElement>("[data-store-back]")!.click());
    expect(container.querySelector("[data-empty-slate]")).not.toBeNull();
    expect(container.querySelector(".bd-store-card")).not.toBeNull();
});
