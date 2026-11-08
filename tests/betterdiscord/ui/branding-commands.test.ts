import {expect, test} from "bun:test";
import {readFileSync} from "node:fs";
const source = readFileSync(new URL("../../../src/betterdiscord/modules/commandmanager.tsx", import.meta.url), "utf8");
const register = source.slice(source.indexOf("    static registerCommand("), source.indexOf("    private static optionsMap"));
const section = source.slice(source.indexOf("    static #ensureSection("), source.indexOf("    static #patchExecuteFunction("));
const unregister = source.slice(source.indexOf("    static unregisterCommand("), source.indexOf("\n}\n\nexport default CommandManager"));
const code = `class CommandManager {
    static #commands = new Map(); static #sections = new Map();
    static #formatOptions(options) { return options; }
    static #patchExecuteFunction(command) { return command.execute; }
    ${register} ${section} ${unregister}
}; return CommandManager;`;
const compiled = new Bun.Transpiler({loader: "tsx"}).transformSync(code);
// eslint-disable-next-line no-new-func
const Manager = new Function("InputTypes", "CommandTypes", compiled)({BUILT_IN: 1}, {CHAT_INPUT: 1});
test("branding changes display only and preserves caller identity and unregister", () => {
    const command = {id: "test", name: "test", execute() {}};
    const releaseCore = Manager.registerCommand("BetterDiscord", command);
    const releasePlugin = Manager.registerCommand("Example", command);
    const core = Manager.getCommandsByCaller("BetterDiscord")[0]; const plugin = Manager.getCommandsByCaller("Example")[0];
    expect(core.integrationTitle).toBe("Open BetterDiscord"); expect(core.section.name).toBe("Open BetterDiscord");
    expect(core.id).toBe("bd-BetterDiscord-test"); expect(core.applicationId).toBe("BetterDiscord"); expect(core.section.id).toBe("BetterDiscord");
    expect(plugin.integrationTitle).toBe("Example"); expect(plugin.applicationId).toBe("Example"); expect(plugin.section.name).toBe("Example");
    releaseCore(); expect(Manager.getCommandsByCaller("BetterDiscord")).toHaveLength(0); expect(Manager.getCommandsByCaller("Example")).toHaveLength(1);
    releasePlugin(); expect(Manager.getCommandsByCaller("Example")).toHaveLength(0);
});
