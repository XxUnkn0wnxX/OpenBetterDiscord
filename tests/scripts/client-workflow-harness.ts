import {afterAll, expect, mock, spyOn, test} from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "obd-workflow-"));
const oldHome = process.env.HOME; const oldArgs = process.argv;
const events: string[] = []; let layout = "wrapped"; let stopFails = false; let missing = false; let simulatedSignal: "SIGINT" | "SIGTERM" | null = null;
const marker = path.join(temp, "Library", "Application Support", "discord", "betterdiscord-bootstrap", "recovery-disabled");
const macTest = process.platform === "darwin" ? test : test.skip;
const managed = path.join(temp, "managed.asar"); fs.writeFileSync(managed, "fixture");
process.env.HOME = temp;
mock.module(import.meta.resolve("../../scripts/helpers/managedrelease.ts"), () => ({managedReleasePath: () => managed}));
mock.module(import.meta.resolve("../../scripts/helpers/validate.ts"), () => ({"default": () => {events.push("sanity");}}));
mock.module(import.meta.resolve("../../scripts/helpers/package.ts"), () => ({"default": () => {events.push("package");}}));
mock.module(import.meta.resolve("../../scripts/helpers/clientprocess.ts"), () => ({stopClient: () => {
events.push("stop");
    if (stopFails || simulatedSignal) expect(fs.existsSync(marker)).toBe(true);
    if (simulatedSignal) {
        const handler = process.listeners(simulatedSignal).at(-1);
        expect(handler).toBeDefined();
        (handler as () => void)();
    }
    if (stopFails) throw new Error("stop failed");
}}));
mock.module(import.meta.resolve("../../scripts/helpers/injection.ts"), () => ({
    inspectInjection: () => {events.push("inspect"); return layout === "unsafe" ? {kind: "unsafe", reason: "foreign"} : {kind: "wrapped", marker: {mode: "release", bdPath: managed}};},
    wrapInjection: () => {events.push("wrap"); return {installationId: "fixture"};},
    unwrapInjection: () => {events.push("unwrap");}
}));
const actualExists = fs.existsSync.bind(fs); const exists = spyOn(fs, "existsSync");
exists.mockImplementation((value: any) => value === managed && missing ? false : actualExists(value));
const exit = spyOn(process, "exit").mockImplementation(((code: number) => {throw new Error(`exit:${code}`);}) as typeof process.exit);
let serial = 0;
async function run(script: "inject" | "uninject", args: string[]) {
    events.length = 0; process.argv = [process.execPath, script, ...args];
    return import(`../../scripts/${script}.ts?case=${serial++}`);
}
afterAll(() => {exit.mockRestore(); exists.mockRestore(); process.argv = oldArgs; process.env.HOME = oldHome; fs.rmSync(temp, {recursive: true, force: true});});
macTest("injection preflights before shutdown and avoids shutdown for failure or dry-run", async () => {
    layout = "unsafe"; await expect(run("inject", ["release", "stable"])).rejects.toThrow("foreign"); expect(events).not.toContain("stop");
    layout = "wrapped"; missing = true; await expect(run("inject", ["release", "stable"])).rejects.toThrow("Managed release missing"); expect(events).not.toContain("stop");
    missing = false; await run("inject", ["dist", "stable", "--dry-run"]); expect(events).not.toContain("stop"); expect(events).not.toContain("package");
    await run("inject", ["release", "stable"]); expect(events).toEqual(["sanity", "inspect", "stop", "package", "wrap"]);
});
macTest("uninject rejects mode and leaves dry/check/prepare without shutdown; stop failures honor marker ownership", async () => {
    layout = "wrapped"; await expect(run("uninject", ["stable", "dev"])).rejects.toThrow("use release or auto"); expect(events).not.toContain("stop");
    await run("uninject", ["stable", "auto", "--dry-run"]); expect(events).not.toContain("stop");
    await expect(run("uninject", ["stable", "auto", "--check"])).rejects.toThrow("exit:0"); expect(events).not.toContain("stop");
    await expect(run("uninject", ["stable", "auto", "--prepare", "--dry-run"])).rejects.toThrow("exit:0"); expect(events).not.toContain("stop");
    await expect(run("uninject", ["stable", "auto", "--prepare"])).rejects.toThrow("exit:0"); expect(events).not.toContain("stop"); expect(fs.existsSync(marker)).toBe(true); fs.rmSync(marker);
    stopFails = true; await expect(run("uninject", ["stable", "auto"])).rejects.toThrow("stop failed"); expect(fs.existsSync(marker)).toBe(false); expect(events).toEqual(["inspect", "stop", "inspect"]);
    fs.mkdirSync(path.dirname(marker), {recursive: true}); fs.writeFileSync(marker, "preexisting");
    await expect(run("uninject", ["stable", "release"])).rejects.toThrow("stop failed"); expect(fs.existsSync(marker)).toBe(true);
});

macTest("signal handlers remove only an owned recovery marker and detach after exit", async () => {
    const beforeInt = process.listenerCount("SIGINT"); const beforeTerm = process.listenerCount("SIGTERM");
    layout = "wrapped"; stopFails = false; fs.rmSync(marker, {force: true});
    simulatedSignal = "SIGINT";
    await expect(run("uninject", ["stable", "auto"])).rejects.toThrow("exit:130");
    expect(fs.existsSync(marker)).toBe(false);
    expect(process.listenerCount("SIGINT")).toBe(beforeInt); expect(process.listenerCount("SIGTERM")).toBe(beforeTerm);
    fs.mkdirSync(path.dirname(marker), {recursive: true}); fs.writeFileSync(marker, "preexisting");
    simulatedSignal = "SIGTERM";
    await expect(run("uninject", ["stable", "release"])).rejects.toThrow("exit:143");
    expect(fs.existsSync(marker)).toBe(true);
    expect(process.listenerCount("SIGINT")).toBe(beforeInt); expect(process.listenerCount("SIGTERM")).toBe(beforeTerm);
    simulatedSignal = null;
});
