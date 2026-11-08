import {expect, mock, test} from "bun:test";
import Route from "../../../src/betterdiscord/stores/addonsettings";
const warnings: string[] = []; const pages: string[] = [];
mock.module("@common/i18n", () => ({t: (key: string) => key}));
mock.module("@stores/toasts", () => ({"default": {warning: (s: string) => warnings.push(s)}}));
mock.module("@ui/settings", () => ({"default": {openSettingsPage: (s: string) => pages.push(s)}}));
const {default: AddonAPI} = await import("../../../src/betterdiscord/api/addonapi");
test("missing, disabled libraries and absent panels never evaluate; enabled resolves aliases", () => {
    let calls = 0; let enabled = false;
    const addon = {id: "id", filename: "file.plugin.js", name: "Name", instance: {getSettingsPanel() {calls++;}}};
    const manager = {prefix: "plugin", resolveAddon: (id: string) => [addon.id, addon.filename, addon.name].includes(id) ? addon : undefined, isEnabled: () => enabled};
    const api = new AddonAPI(manager as any);
    expect(api.openSettings("missing")).toBe(false);
    for (const name of ["Name", "BDFDB", "ZeresPluginLibrary"]) {
        addon.name = name;
        expect(api.openSettings(name)).toBe(false);
    }
    expect(calls).toBe(0); expect(pages).toHaveLength(0);
    enabled = true; const panel = addon.instance.getSettingsPanel; (addon.instance as any).getSettingsPanel = undefined;
    expect(api.openSettings("id")).toBe(false);
    addon.instance.getSettingsPanel = panel;
    expect(api.openSettings("file.plugin.js")).toBe(true);
    expect(Route.id).toBe("id"); expect(pages).toEqual(["plugins"]); expect(calls).toBe(0);
    expect(warnings).toEqual(["Addons.isDisabled", "Addons.isDisabled", "Addons.isDisabled", "Addons.noSettings"]);
});
