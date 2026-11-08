import {expect, test} from "bun:test";
import path from "node:path";
test("isolated changelog branding preserves footer behavior", () => {
    const result = Bun.spawnSync({cmd: [process.execPath, "test", path.join(import.meta.dir, "branding-changelog-harness.tsx")], cwd: path.join(import.meta.dir, "../../.."), stdout: "pipe", stderr: "pipe"});
    const output = [result.stdout, result.stderr].map(value => new TextDecoder().decode(value)).join("\n");
    expect(result.exitCode, output).toBe(0);
});

test("public changelog entry cannot enable the private core footer", async () => {
    const {readFileSync} = await import("node:fs");
    const React = (await import("react")).default;
    const source = readFileSync(new URL("../../../src/betterdiscord/ui/modals.ts", import.meta.url), "utf8");
    const methods = source.slice(source.indexOf("    private static openChangelogModal("), source.indexOf("    /**\n     * Shows the guild join modal", source.indexOf("    private static openChangelogModal(")));
    const compiled = new Bun.Transpiler({loader: "tsx"}).transformSync(`class Modals { static openModal(callback) {return callback({});} ${methods} }; return Modals;`);
    // eslint-disable-next-line no-new-func
    const Modals = new Function("React", "ErrorBoundary", "ChangelogModal", compiled)(React, "boundary", "changelog");
    const publicElement = Modals.showChangelogModal({title: "Other", coreFooter: true});
    const coreElement = Modals.showCoreChangelogModal({title: "Open BetterDiscord"});
    expect(publicElement.props.children.props.coreFooter).toBe(false);
    expect(coreElement.props.children.props.coreFooter).toBe(true);
});
