import {afterEach, describe, expect, spyOn, test} from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import asar from "@electron/asar";
import {createReleaseArchive, isCI, managedReleasePath, publishLocalRelease, publishManagedRelease, releaseInputs} from "../../scripts/helpers/managedrelease";

const scratch: string[] = [];
function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "obd-release-test-")); scratch.push(root);
    const dist = path.join(root, "dist"); fs.mkdirSync(dist);
    for (const name of releaseInputs) {
        const file = path.join(dist, name); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, `fixture ${name}`);
    }
    return {root, dist};
}
afterEach(() => {for (const root of scratch.splice(0)) fs.rmSync(root, {recursive: true, force: true});});
describe("managed release path", () => {
    test("resolves native platforms and fallback homes with spaces", () => {
        expect(managedReleasePath("darwin", {HOME: "/Users/with space"}, "/fallback")).toBe("/Users/with space/Library/Application Support/BetterDiscord/data/betterdiscord.asar");
        expect(managedReleasePath("darwin", {}, "/fallback")).toBe("/fallback/Library/Application Support/BetterDiscord/data/betterdiscord.asar");
        expect(managedReleasePath("linux", {XDG_CONFIG_HOME: "/space config", HOME: "/other"}, "/fallback")).toBe("/space config/BetterDiscord/data/betterdiscord.asar");
        expect(managedReleasePath("linux", {HOME: "/home/user"}, "/fallback")).toBe("/home/user/.config/BetterDiscord/data/betterdiscord.asar");
        expect(managedReleasePath("linux", {}, "/fallback")).toBe("/fallback/.config/BetterDiscord/data/betterdiscord.asar");
        expect(managedReleasePath("win32", {APPDATA: "C:\\Users\\Name Here\\Roaming", HOME: "/wrong"}, "C:\\Home")).toBe("C:\\Users\\Name Here\\Roaming\\BetterDiscord\\data\\betterdiscord.asar");
        expect(managedReleasePath("win32", {HOME: "/wrong"}, "C:\\Home")).toBe("C:\\Home\\AppData\\Roaming\\BetterDiscord\\data\\betterdiscord.asar");
        expect(() => managedReleasePath("linux", {XDG_CONFIG_HOME: "relative"}, "/fallback")).toThrow("absolute");
    });
    test("only affirmative CI values suppress publication", () => {
        for (const value of ["true", "TRUE", "1", "yes", "on"]) expect(isCI(value)).toBe(true);
        for (const value of [undefined, "", "false", "0", "no"]) expect(isCI(value)).toBe(false);
    });
});
test("real archive is complete, verified, and atomically replaces the shared release", async () => {
    const {root, dist} = fixture(); const destination = path.join(root, "home with spaces", "BetterDiscord", "data", "betterdiscord.asar");
    expect(fs.existsSync(path.dirname(destination))).toBe(false);
    const first = await createReleaseArchive(dist);
    expect(asar.extractFile(first.archive, "editor/script.js").toString()).toBe("fixture editor/script.js");
    expect(fs.readFileSync(path.join(dist, "checksums.txt"), "utf8").split("\n")).toHaveLength(8);
    expect(publishLocalRelease(first.archive, first.inputs, "true", destination)).toBeNull();
    expect(fs.existsSync(path.dirname(destination))).toBe(false);
    expect(publishLocalRelease(first.archive, first.inputs, "false", destination)).toBe(destination);
    const old = fs.readFileSync(destination);
    fs.writeFileSync(path.join(dist, "main.js"), "new main"); const next = await createReleaseArchive(dist);
    publishManagedRelease(next.archive, next.inputs, destination);
    expect(fs.readFileSync(destination)).not.toEqual(old);
    expect(asar.extractFile(destination, "main.js").toString()).toBe("new main"); asar.uncache(destination);
    const preserved = fs.readFileSync(destination);
    expect(() => publishManagedRelease(path.join(root, "missing"), next.inputs, destination)).toThrow();
    expect(() => publishManagedRelease(first.archive, first.inputs, destination)).toThrow();
    expect(fs.readFileSync(destination)).toEqual(preserved);
    const rename = spyOn(fs, "renameSync").mockImplementation(() => {throw new Error("simulated rename failure");});
    try {expect(() => publishManagedRelease(next.archive, next.inputs, destination)).toThrow("simulated rename failure");}
    finally {rename.mockRestore();}
    expect(fs.readFileSync(destination)).toEqual(preserved);
    expect(fs.readdirSync(path.dirname(destination))).toEqual(["betterdiscord.asar"]);
});
test("missing input rejects packaging without replacing an existing release archive", async () => {
    const {dist} = fixture(); const target = path.join(dist, "betterdiscord.asar"); fs.writeFileSync(target, "old");
    fs.rmSync(path.join(dist, "editor/index.html"));
    await expect(createReleaseArchive(dist)).rejects.toThrow(); expect(fs.readFileSync(target, "utf8")).toBe("old");
});
