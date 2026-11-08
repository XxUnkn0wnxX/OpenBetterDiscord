import {expect, test} from "bun:test";
import path from "node:path";
const macTest = process.platform === "darwin" ? test : test.skip;
macTest("isolated client workflow preflight and recovery ordering", () => {
    const result = Bun.spawnSync({cmd: [process.execPath, "test", path.join(import.meta.dir, "client-workflow-harness.ts")], cwd: path.resolve(import.meta.dir, "../.."), stdout: "pipe", stderr: "pipe"});
    const output = [result.stdout, result.stderr].map(value => new TextDecoder().decode(value)).join("\n");
    expect(result.exitCode, output).toBe(0);
});
