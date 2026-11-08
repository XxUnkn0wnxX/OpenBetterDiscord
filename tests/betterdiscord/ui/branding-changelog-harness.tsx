import {afterEach, expect, mock, test} from "bun:test";
import React, {act} from "react";
import {createRoot, type Root} from "react-dom/client";
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
let toggles = 0; let relaunches = 0;
mock.module("@common/i18n", () => ({t: (s: string) => s}));
mock.module("@webpack", () => ({getByKeys: () => undefined}));
mock.module("@modules/ipc", () => ({"default": {allowPreloadOverride: {toggle: async () => {toggles++;}}, relaunch: () => {relaunches++;}}}));
mock.module("@modules/discordmodules", () => ({"default": {Tooltip: ({children}: any) => children({}), Dispatcher: {dispatch() {}}}}));
mock.module("@structs/markdown", () => ({"default": {parseToReact: (s: string) => s}}));
mock.module("@ui/modals", () => ({"default": {showGuildJoinModal() {}}}));
const Box = ({children}: any) => <div>{children}</div>;
mock.module("../../../src/betterdiscord/ui/modals/root", () => ({"default": Object.assign(Box, {Sizes: {MEDIUM: "medium"}, Styles: {STANDARD: "standard"}})}));
for (const name of ["header", "footer", "content", "close"]) mock.module(import.meta.resolve(`../../../src/betterdiscord/ui/modals/${name}`), () => ({"default": Box}));
mock.module("@ui/base/flex", () => ({"default": Object.assign(Box, {Child: Box, Justify: {BETWEEN: "between"}, Direction: {VERTICAL: "vertical", HORIZONTAL: "horizontal"}})}));
mock.module("@ui/base/text", () => ({"default": Object.assign(Box, {Sizes: {SIZE_20: 20, SIZE_12: 12}, Colors: {MUTED: "muted"}})}));
const {default: Changelog} = await import("../../../src/betterdiscord/ui/modals/changelog");
let host: HTMLDivElement; let root: Root;
afterEach(async () => {await act(async () => root?.unmount()); document.body.replaceChildren();});
async function render(props: React.ComponentProps<typeof Changelog>) {
    host = document.body.appendChild(document.createElement("div")); root = createRoot(host);
    await act(async () => root.render(<Changelog {...props} />));
}
test("legacy public and branded core footers retain support, socials and preload triple-click", async () => {
    for (const props of [{title: "BetterDiscord"}, {title: "Open BetterDiscord", coreFooter: true}]) {
        toggles = 0; relaunches = 0; await render(props);
        expect(host.textContent).toContain("Need support?");
        expect(host.querySelectorAll("a.bd-social")).toHaveLength(2);
        const trigger = [...host.querySelectorAll("span")].find(node => node.textContent === "Need support?")!;
        await act(async () => trigger.dispatchEvent(new MouseEvent("click", {bubbles: true, detail: 3})));
        expect(toggles).toBe(1); expect(relaunches).toBe(1);
        await act(async () => root.unmount()); host.remove();
    }
});
test("third party title has no default footer and custom footer overrides it", async () => {
    await render({title: "Third party"}); expect(host.textContent).not.toContain("Need support?");
    await act(async () => root.render(<Changelog title="BetterDiscord" footer={<b>Custom</b>} />));
    expect(host.textContent).toContain("Custom"); expect(host.textContent).not.toContain("Need support?"); expect(host.querySelectorAll("a.bd-social")).toHaveLength(0);
});
