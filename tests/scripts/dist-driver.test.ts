import {expect, test} from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

test("normal Bun and wrapper-style dist driver forward build arguments, defaults and failures", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "obd-dist-driver-"));
    const scripts = path.join(root, "scripts"); fs.mkdirSync(scripts);
    const repo = path.resolve(import.meta.dir, "../..");
    fs.copyFileSync(path.join(repo, "scripts/dist.ts"), path.join(scripts, "dist.ts"));
    fs.copyFileSync(path.join(repo, "bunfig.toml"), path.join(root, "bunfig.toml"));
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({scripts: {dist: "bun scripts/dist.ts"}}));
    const log = path.join(root, "calls.jsonl");
    fs.writeFileSync(path.join(scripts, "build.ts"), `import fs from "node:fs"; fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({script:"build", args:process.argv.slice(2), production:process.env.NODE_ENV, timeout:process.env.BETTERDISCORD_MACOS_RECOVERY_TIMEOUT_SECONDS})+"\\n"); process.exitCode=Number(process.env.FAIL_BUILD || 0);`);
    fs.writeFileSync(path.join(scripts, "pack.ts"), `import fs from "node:fs"; fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify({script:"pack", args:process.argv.slice(2)})+"\\n"); process.exitCode=Number(process.env.FAIL_PACK || 0);`);
    function invoke(args: string[], extra: Record<string, string> = {}, normal = true) {
        fs.writeFileSync(log, "");
        const env = {...process.env, NODE_ENV: "development", BETTERDISCORD_MACOS_RECOVERY_TIMEOUT_SECONDS: undefined, ...extra};
        const cmd = normal ? [process.execPath, "run", "dist", ...args] : [process.execPath, "scripts/dist.ts", ...args];
        const result = Bun.spawnSync({cmd, cwd: root, env, stdout: "pipe", stderr: "pipe"});
        const calls = fs.readFileSync(log, "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
        return {result, calls};
    }
    try {
        const initial = invoke([]); expect(initial.result.exitCode).toBe(0);
        expect(initial.calls).toEqual([{script: "build", args: ["--minify"], production: "production", timeout: "45"}, {script: "pack", args: []}]);
        const forwarded = invoke(["-mrts", "37", "--module=main"], {BETTERDISCORD_MACOS_RECOVERY_TIMEOUT_SECONDS: "62"});
        expect(forwarded.result.exitCode).toBe(0); expect(forwarded.calls[0]).toEqual({script: "build", args: ["--minify", "--macos-recovery-timeout-seconds", "37", "--module=main"], production: "production", timeout: "62"}); expect(forwarded.calls[1].args).toEqual([]);
        expect(invoke([], {BETTERDISCORD_MACOS_RECOVERY_TIMEOUT_SECONDS: ""}, false).calls[0].timeout).toBe("");
        const buildFailure = invoke([], {FAIL_BUILD: "7"}); expect(buildFailure.result.exitCode).toBe(7); expect(buildFailure.calls).toHaveLength(1);
        const packFailure = invoke([], {FAIL_PACK: "9"}); expect(packFailure.result.exitCode).toBe(9); expect(packFailure.calls).toHaveLength(2);
    }
    finally {fs.rmSync(root, {recursive: true, force: true});}
});
