import {expect, test} from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
test("path query and missing wrapper preflight do not create or stage a release", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "obd-path-query-"));
    const repo = path.resolve(import.meta.dir, "../..");
    try {
        const env = {...process.env, HOME: root, XDG_CONFIG_HOME: path.join(root, "config"), APPDATA: path.join(root, "Roaming")};
        const result = Bun.spawnSync({cmd: [process.execPath, "scripts/managed-release-path.ts"], cwd: repo, env, stdout: "pipe", stderr: "pipe"});
        expect(result.exitCode).toBe(0);
        const output = new TextDecoder().decode(result.stdout).trim();
        const base = process.platform === "darwin" ? path.join(root, "Library", "Application Support") : process.platform === "win32" ? path.join(root, "Roaming") : path.join(root, "config");
        expect(output).toBe(path.join(base, "BetterDiscord", "data", "betterdiscord.asar"));
        expect(fs.readdirSync(root)).toEqual([]);
        if (process.platform === "darwin") {
            const wrapper = Bun.spawnSync({cmd: [Bun.which("zsh") || "/bin/zsh", "local-inject.zsh", "stable", "--dry-run"], cwd: repo, env, stdout: "pipe", stderr: "pipe"});
            expect(wrapper.exitCode).not.toBe(0);
            expect(new TextDecoder().decode(wrapper.stdout) + new TextDecoder().decode(wrapper.stderr)).toContain("Managed release missing:");
            expect(fs.readdirSync(root)).toEqual([]);
        }
    }
    finally {fs.rmSync(root, {recursive: true, force: true});}
});
