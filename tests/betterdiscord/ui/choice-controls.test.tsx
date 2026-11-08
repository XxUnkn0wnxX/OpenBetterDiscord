import {expect, test} from "bun:test";
import path from "node:path";

test("choice controls retain state and callback behavior in an isolated renderer fixture", () => {
    const result = Bun.spawnSync({
        cmd: [process.execPath, "test", path.join(import.meta.dir, "choice-controls-harness.tsx")],
        cwd: path.join(import.meta.dir, "../../.."),
        stdout: "pipe",
        stderr: "pipe"
    });
    const output = [result.stdout, result.stderr].map(value => new TextDecoder().decode(value).trim()).filter(Boolean).join("\n");
    expect(result.exitCode, output).toBe(0);
});
