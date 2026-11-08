import {expect, test} from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const macTest = process.platform === "darwin" ? test : test.skip;
const zsh = Bun.which("zsh") || "/bin/zsh";

macTest("build wrapper defaults to release, dispatches dev aliases and has a read-only dry-run", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "obd-wrapper-"));
    const bin = path.join(root, "bin"); fs.mkdirSync(bin);
    const repo = path.resolve(import.meta.dir, "../..");
    fs.copyFileSync(path.join(repo, "local-build.zsh"), path.join(root, "local-build.zsh"));
    const log = path.join(root, "bun.log");
    fs.writeFileSync(path.join(bin, "bun"), "#!/bin/sh\nprintf '%s\\n' __call__ \"$@\" >> \"$OBD_TEST_LOG\"\n", {mode: 0o755});
    const env = {...process.env, PATH: `${bin}:${process.env.PATH}`, OBD_TEST_LOG: log};
    const run = (args: string[]) => {fs.rmSync(log, {force: true}); return Bun.spawnSync({cmd: [zsh, "local-build.zsh", ...args], cwd: root, env, stdout: "pipe", stderr: "pipe"});};
    try {
        expect(run([]).exitCode).toBe(0); expect(fs.readFileSync(log, "utf8")).toBe("__call__\nscripts/dist.ts\n");
        for (const mode of ["dev", "dist", "build"]) {
            expect(run([mode, "--module=main"]).exitCode).toBe(0); expect(fs.readFileSync(log, "utf8")).toBe("__call__\nscripts/build.ts\n--module=main\n");
        }
        expect(run(["production"]).exitCode).toBe(0); expect(fs.readFileSync(log, "utf8")).toBe("__call__\nscripts/build.ts\n--minify\n");
        expect(run(["pack"]).exitCode).toBe(0); expect(fs.readFileSync(log, "utf8")).toBe("__call__\nscripts/pack.ts\n");
        fs.rmSync(log); const dry = run(["release", "-mrts", "45", "--dry-run"]);
        expect(dry.exitCode).toBe(0); expect(new TextDecoder().decode(dry.stdout)).toContain("scripts/dist.ts");
        expect(fs.existsSync(log)).toBe(false);
    }
    finally {fs.rmSync(root, {recursive: true, force: true});}
});

macTest("inject and uninject wrappers delegate once with release defaults and dev aliases", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "obd-wrapper-dispatch-"));
    const bin = path.join(root, "bin"); fs.mkdirSync(bin);
    const repo = path.resolve(import.meta.dir, "../..");
    for (const name of ["local-inject.zsh", "local-uninject.zsh"]) fs.copyFileSync(path.join(repo, name), path.join(root, name));
    const log = path.join(root, "bun.log");
    fs.writeFileSync(path.join(bin, "bun"), "#!/bin/sh\nprintf '%s\\n' __call__ \"$@\" >> \"$OBD_TEST_LOG\"\n", {mode: 0o755});
    const env = {...process.env, PATH: `${bin}:${process.env.PATH}`, OBD_TEST_LOG: log};
    const run = (script: string, args: string[]) => {fs.rmSync(log, {force: true}); return Bun.spawnSync({cmd: [zsh, script, ...args], cwd: root, env, stdout: "pipe", stderr: "pipe"});};
    try {
        for (const [script, args, expected] of [
            ["local-inject.zsh", ["stable"], "scripts/inject.ts\nrelease\nstable\n"],
            ["local-inject.zsh", ["ptb", "dist", "--dry-run"], "scripts/inject.ts\ndev\nptb\n--dry-run\n"],
            ["local-uninject.zsh", ["stable"], "scripts/uninject.ts\nstable\nrelease\n"],
            ["local-uninject.zsh", ["canary", "dist"], "scripts/uninject.ts\ncanary\ndev\n"],
            ["local-uninject.zsh", ["ptb", "auto", "--dry-run"], "scripts/uninject.ts\nptb\nauto\n--dry-run\n"]
        ] as const) {
            expect(run(script, [...args]).exitCode).toBe(0); expect(fs.readFileSync(log, "utf8")).toBe(`__call__\n${expected}`);
        }
    }
    finally {fs.rmSync(root, {recursive: true, force: true});}
});
