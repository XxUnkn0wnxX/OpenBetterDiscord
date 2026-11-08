import path from "node:path";
import {spawnSync} from "node:child_process";

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2).map(argument => argument === "-mrts" ? "--macos-recovery-timeout-seconds" : argument);
const env = {
    ...process.env,
    NODE_ENV: "production",
    BETTERDISCORD_MACOS_RECOVERY_TIMEOUT_SECONDS: process.env.BETTERDISCORD_MACOS_RECOVERY_TIMEOUT_SECONDS ?? "45"
};

function run(script: string, extraArgs: string[] = []) {
    const result = spawnSync(process.execPath, [path.join(root, "scripts", script), ...extraArgs], {cwd: root, env, stdio: "inherit"});
    if (result.error) console.error(result.error);
    return result.status ?? 1;
}

const buildStatus = run("build.ts", ["--minify", ...args]);
if (buildStatus !== 0) process.exit(buildStatus);
process.exitCode = run("pack.ts");
