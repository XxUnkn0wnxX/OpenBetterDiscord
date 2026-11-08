import {expect, mock, test} from "bun:test";
import React, {act} from "react";
import {createRoot} from "react-dom/client";
import Store from "../../../src/betterdiscord/stores/base";
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
class TestStore extends Store {get() {return false;}}
const plugin = new TestStore(); const theme = new TestStore(); const settings = new TestStore();
const copies: string[] = [];
Object.assign(globalThis, {DiscordNative: {clipboard: {copy: (value: string) => copies.push(value)}}});
mock.module("@modules/pluginmanager", () => ({"default": plugin}));
mock.module("@modules/thememanager", () => ({"default": theme}));
mock.module("@stores/settings", () => ({"default": settings}));
mock.module("@common/i18n", () => ({t: (key: string) => key}));
mock.module("@webpack", () => ({Stores: {UserStore: {getCurrentUser: () => ({id: "not-allowed"})}}}));
mock.module("@modules/discordmodules", () => ({"default": {Tooltip: ({text, children}: any) => <div data-tooltip={text}>{children({onMouseLeave() {}})}</div>}}));
mock.module("@ui/base/text", () => ({"default": Object.assign(({children}: any) => <div>{children}</div>, {Colors: {MUTED: "muted"}, Sizes: {SIZE_12: 12}})}));
mock.module("@utils/debug", () => ({"default": () => "full debug report", "getCoreInfo": () => "Stable 1.14.6 (abc)", "getDiscordInfo": () => ["stable 667580 (hash)", "Host 0.0.402", "macOS 11.7.10"], "getAddonCounts": (store: unknown) => store === plugin ? {total: 3, enabled: 2} : {total: 2, enabled: 1}}));
const {default: VersionInfo} = await import("../../../src/betterdiscord/ui/misc/versioninfo");
test("version component retains client details, counts, copy and feedback", async () => {
    const host = document.body.appendChild(document.createElement("div")); const root = createRoot(host);
    try {
        await act(async () => root.render(<VersionInfo />));
        expect(host.textContent).toContain("stable 667580 (hash)"); expect(host.textContent).toContain("Host 0.0.402"); expect(host.textContent).toContain("macOS 11.7.10");
        expect(host.textContent).toContain("OBD Stable 1.14.6 (abc)"); expect(host.textContent).toContain("Panels.plugins 3 (2 Addons.isEnabled)"); expect(host.textContent).toContain("Panels.themes 2 (1 Addons.isEnabled)");
        expect(host.querySelector("[data-tooltip]")?.getAttribute("data-tooltip")).toBe("Click to copy");
        await act(async () => host.querySelector<HTMLElement>(".bd-version-info")!.click());
        expect(copies).toEqual(["```md\nfull debug report\n```"]); expect(host.querySelector("[data-tooltip]")?.getAttribute("data-tooltip")).toBe("Copied");
    }
    finally {await act(async () => root.unmount()); host.remove();}
});
