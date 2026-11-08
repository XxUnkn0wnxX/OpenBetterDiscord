import {afterEach, expect, test} from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {managedReleasePath} from "../../scripts/helpers/managedrelease";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "obd-failures-"));
const scripts = path.join(root, "scripts"); fs.mkdirSync(scripts);
const repo = path.resolve(import.meta.dir, "../..");
fs.copyFileSync(path.join(repo, "scripts/build.ts"), path.join(scripts, "build.ts"));
fs.copyFileSync(path.join(repo, "scripts/pack.ts"), path.join(scripts, "pack.ts"));
fs.cpSync(path.join(repo, "scripts/helpers"), path.join(scripts, "helpers"), {recursive: true});
fs.copyFileSync(path.join(repo, "package.json"), path.join(root, "package.json"));
fs.symlinkSync(path.join(repo, "node_modules"), path.join(root, "node_modules"), "dir");
afterEach(() => fs.rmSync(root, {recursive: true, force: true}));
test("build and late pack failures return nonzero while preserving the managed archive", () => {
    const env = {...process.env, HOME: path.join(root, "home"), XDG_CONFIG_HOME: path.join(root, "config"), APPDATA: path.join(root, "appdata"), CI: "false"};
    const build = Bun.spawnSync({cmd: [process.execPath, "scripts/build.ts", "--module=invalid-fixture-module"], cwd: root, env, stdout: "pipe", stderr: "pipe"});
    expect(build.exitCode).not.toBe(0);
    const invalidTimeout = Bun.spawnSync({cmd: [process.execPath, "scripts/build.ts"], cwd: root, env: {...env, BETTERDISCORD_MACOS_RECOVERY_TIMEOUT_SECONDS: ""}, stdout: "pipe", stderr: "pipe"});
    expect(invalidTimeout.exitCode).not.toBe(0);
    expect(new TextDecoder().decode(invalidTimeout.stderr)).toContain("must be a positive integer");
    const pack = Bun.spawnSync({cmd: [process.execPath, "scripts/pack.ts"], cwd: root, env, stdout: "pipe", stderr: "pipe"});
    expect(pack.exitCode).not.toBe(0);
    expect(fs.existsSync(path.join(root, "config", "BetterDiscord"))).toBe(false);
    expect(fs.existsSync(path.join(root, "home", "Library", "Application Support", "BetterDiscord"))).toBe(false);

    const managed = managedReleasePath(process.platform, env, path.join(root, "home"));
    const previous = Buffer.from("previous managed ASAR");
    fs.mkdirSync(path.dirname(managed), {recursive: true}); fs.writeFileSync(managed, previous);
    const dist = path.join(root, "dist"); fs.mkdirSync(path.join(dist, "editor"), {recursive: true});
    for (const file of ["main.js", "preload.js", "betterdiscord.js", "editor/preload.js", "editor/script.js", "editor/index.html"]) {
        fs.writeFileSync(path.join(dist, file), `fixture ${file}`);
    }
    function assertPreserved() {
        expect(fs.readFileSync(managed)).toEqual(previous);
        expect(fs.readdirSync(path.dirname(managed))).toEqual(["betterdiscord.asar"]);
        expect(fs.readdirSync(dist).filter(name => name.endsWith(".tmp"))).toEqual([]);
    }
    const missingEarly = Bun.spawnSync({cmd: [process.execPath, "scripts/pack.ts"], cwd: root, env, stdout: "pipe", stderr: "pipe"});
    const missingOutput = new TextDecoder().decode(missingEarly.stdout) + new TextDecoder().decode(missingEarly.stderr);
    expect(missingEarly.exitCode).not.toBe(0); expect(missingOutput).toContain("Generating bundle"); expect(missingOutput).toContain("earlyRenderer.js");
    expect(fs.existsSync(path.join(dist, "package.json"))).toBe(true); assertPreserved();

    fs.writeFileSync(path.join(dist, "earlyRenderer.js"), "early renderer fixture");
    fs.mkdirSync(path.join(dist, "checksums.txt"));
    const checksumFailure = Bun.spawnSync({cmd: [process.execPath, "scripts/pack.ts"], cwd: root, env, stdout: "pipe", stderr: "pipe"});
    const checksumOutput = new TextDecoder().decode(checksumFailure.stdout) + new TextDecoder().decode(checksumFailure.stderr);
    expect(checksumFailure.exitCode).not.toBe(0); expect(checksumOutput).toContain("Generating bundle"); expect(checksumOutput).toContain("checksums.txt");
    assertPreserved();
});
