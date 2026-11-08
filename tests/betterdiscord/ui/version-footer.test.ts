import {expect, test} from "bun:test";
import path from "node:path";
test("isolated native settings footer ownership", () => {
    const result = Bun.spawnSync({cmd: [process.execPath, "test", path.join(import.meta.dir, "version-footer-harness.tsx")], cwd: path.join(import.meta.dir, "../../.."), stdout: "pipe", stderr: "pipe"});
    const output = [result.stdout, result.stderr].map(value => new TextDecoder().decode(value)).join("\n");
    expect(result.exitCode, output).toBe(0);
});
