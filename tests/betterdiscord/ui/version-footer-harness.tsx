import {afterEach, expect, test} from "bun:test";
import React from "react";
import {readFileSync} from "node:fs";
const source = readFileSync(new URL("../../../src/betterdiscord/ui/settings.tsx", import.meta.url), "utf8");
const methods = source.slice(source.indexOf("    private scheduleVersionInfoRefresh()"), source.indexOf("    public openSettingsPage(key: string)"));
const code = `class Renderer {
    versionInfoObserver; versionInfoRoot; versionInfoHost; versionInfoAnchor; versionInfoFeedback;
    versionInfoFeedbackAnchor; versionInfoFeedbackTimeout; versionInfoCopyBound = false; versionInfoFrame = 0;
    ${methods}
}; return Renderer;`;
const compiled = new Bun.Transpiler({loader: "tsx", tsconfig: {compilerOptions: {jsx: "react"}}}).transformSync(code);
let info: {releaseChannel: string; version: number[]} | undefined;
const copied: string[] = []; let nativeClicks = 0; let shows = 0; let hides = 0; let renders = 0; let unmounts = 0;
const ReactDOM = {createRoot: () => ({render: () => {renders++;}, unmount: () => {unmounts++;}})};
const Tooltip = {create: (_anchor: HTMLElement, text: string, options: any) => {
    expect(text).toBe("Copied"); expect(options.style).toBe("success");
    return {show: () => {shows++;}, hide: () => {hides++;}};
}};
// eslint-disable-next-line no-new-func
const Renderer = new Function("React", "ReactDOM", "VersionInfo", "Tooltip", "DiscordNative", "getDebugInfo", "getModule", compiled)(React, ReactDOM, () => null, Tooltip, {clipboard: {copy: (s: string) => copied.push(s)}}, () => "full report with addons", () => info);
let renderer: any;
afterEach(() => {renderer?.teardownVersionInformation(); renderer = undefined; document.body.replaceChildren(); copied.length = 0; nativeClicks = 0; shows = 0; hides = 0; renders = 0; unmounts = 0;});
function row(suffix: string, channel = "stable", version = "0.0.402") {
    const parent = document.createElement("div"); parent.className = `clickable_${suffix} compact_${suffix}`; parent.setAttribute("role", "button");
    const inner = document.createElement("div"); inner.className = `compactInfo_${suffix}`; inner.textContent = `${channel} 667580 (7f6f109) • ${version} x64 (84934)`;
    parent.append(inner); parent.addEventListener("click", () => {nativeClicks++;}); return parent;
}
for (const suffix of ["_legacy", "C_Rpm7"]) {
    test(`mounts on native ${suffix} footer, copies before native listener and cleans up`, () => {
        info = {releaseChannel: "stable", version: [0, 0, 402]}; renderer = new Renderer();
        const decoy = row(suffix, "canary"); const clone = row(suffix, "OpenAsar"); clone.querySelector("div")!.id = "openasar-ver";
        const unrelated = document.createElement("div"); unrelated.className = `compactInfo_${suffix}`; unrelated.textContent = "stable 667580 (7f6f109) • 0.0.402 x64 (84934)";
        const native = row(suffix); document.body.append(decoy, clone, unrelated, native);
        renderer.renderVersionInformation();
        expect(native.getAttribute("data-bd-version-copy")).toBe("true"); expect(native.title).toBe("Click to copy Open BetterDiscord debug info");
        expect(native.nextElementSibling?.className).toBe("bd-version-info-wrapper"); expect(renders).toBe(1);
        native.querySelector("div")!.click(); expect(copied).toEqual(["```md\nfull report with addons\n```"]); expect(nativeClicks).toBe(0); expect(shows).toBe(1);
        renderer.teardownVersionInformation(); expect(native.hasAttribute("data-bd-version-copy")).toBe(false); expect(document.querySelector(".bd-version-info-wrapper")).toBeNull(); expect(unmounts).toBe(1); expect(hides).toBeGreaterThan(0);
        native.click(); expect(nativeClicks).toBe(1);
    });
}
test("replacement, reinsert and absent/mismatched capability preserve ownership", () => {
    info = {releaseChannel: "stable", version: [0, 0, 402]}; renderer = new Renderer();
    const first = row("C_Rpm7"); document.body.append(first); renderer.renderVersionInformation();
    const next = row("_legacy"); first.replaceWith(next); renderer.renderVersionInformation();
    expect(next.getAttribute("data-bd-version-copy")).toBe("true"); expect(next.nextElementSibling?.className).toBe("bd-version-info-wrapper");
    next.remove(); renderer.renderVersionInformation(); expect(document.querySelector(".bd-version-info-wrapper")).toBeNull();
    document.body.append(first); renderer.renderVersionInformation(); expect(first.getAttribute("data-bd-version-copy")).toBe("true");
    info = {releaseChannel: "stable", version: [0, 0, 403]}; renderer.renderVersionInformation(); expect(document.querySelector(".bd-version-info-wrapper")).toBeNull();
    info = undefined; renderer.renderVersionInformation(); expect(renderer.getVersionAnchor()).toBeNull(); expect(first.hasAttribute("data-bd-version-copy")).toBe(false);
});
test("retains the existing parent fallback when a matching compact row has no clickable classes", () => {
    info = {releaseChannel: "stable", version: [0, 0, 402]}; renderer = new Renderer();
    const parent = document.createElement("div"); const inner = document.createElement("span"); inner.className = "compactInfo__legacy"; inner.textContent = "stable 0.0.402"; parent.append(inner); document.body.append(parent);
    expect(renderer.getVersionAnchor()).toBe(parent);
});
