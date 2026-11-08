import fs from "fs";
import path from "path";
import bun from "bun";

import doSanityChecks from "./helpers/validate";
import buildPackage from "./helpers/package";
import copyFiles from "./helpers/copy";
import {findLatestDiscordResources} from "../src/common/discordResources";
import {inspectInjection, wrapInjection, type InjectionChannel, type InjectionMode} from "./helpers/injection";
import {managedReleasePath} from "./helpers/managedrelease";
import {stopClient} from "./helpers/clientprocess";

const rawArgs = process.argv.slice(2);
const dryRun = rawArgs.includes("--dry-run");
const args = rawArgs.filter(argument => argument !== "--dry-run");
const requestedMode = args[0]?.toLowerCase();
const useBdRelease = requestedMode === "release";
if (requestedMode === "release" || requestedMode === "dev" || requestedMode === "dist") args.shift();
if (args.length > 1) throw new Error("Usage: bun scripts/inject.ts [release|dev|dist] [stable|ptb|canary] [--dry-run]");

const requestedChannel = (args[0] ?? "stable").toLowerCase();
if (requestedChannel !== "stable" && requestedChannel !== "ptb" && requestedChannel !== "canary" && requestedChannel !== "discord") {
    throw new Error("Channel must be stable, ptb, or canary");
}

const channel: InjectionChannel = requestedChannel === "discord" ? "stable" : requestedChannel;
const mode: InjectionMode = useBdRelease ? "release" : "dev";
const release = channel === "canary" ? "Discord Canary" : channel === "ptb" ? "Discord PTB" : "Discord";
const releaseDirectory = channel === "canary" ? "discordcanary" : channel === "ptb" ? "discordptb" : "discord";
const distPath = path.resolve(__dirname, "..", "dist");
const bundlePath = useBdRelease ? managedReleasePath() : "";

const resources = await (async function resolveResources() {
    if (process.platform === "darwin") return path.join(path.sep, "Applications", `${release}.app`, "Contents", "Resources");

    let basedir: string;
    if (process.platform === "win32") {
        basedir = path.join(process.env.LOCALAPPDATA!, release.replace(/ /g, ""));
    }
    else if (process.env.WSL_DISTRO_NAME) {
        const appdata = (await bun.$`wslpath "$(cmd.exe /c "echo %LOCALAPPDATA%" 2>/dev/null | tr -d '\r')"`.text()).trim();
        basedir = path.join(appdata, release.replace(/ /g, ""));
    }
    else {
        const config = process.env.XDG_CONFIG_HOME || path.join(process.env.HOME!, ".config");
        basedir = path.join(config, releaseDirectory);
    }

    if (!fs.existsSync(basedir)) throw new Error(`No ${release} install at ${basedir}`);
    const candidate = findLatestDiscordResources(basedir);
    if (!candidate) throw new Error(`No app-* or version directory with a modern Discord application payload exists in ${basedir}`);
    return candidate.resourcesPath;
})();

doSanityChecks(distPath);
if (useBdRelease && (!fs.existsSync(bundlePath) || !fs.statSync(bundlePath).isFile())) {
    throw new Error(`    ❌ Managed release missing: ${bundlePath}. Run \`bun run dist\` to stage the managed release before using release injection.`);
}

const layout = inspectInjection(resources);
if (layout.kind === "missing" || layout.kind === "unsafe") throw new Error(`Refusing to inject ${release}: ${layout.reason}`);
if (dryRun) console.log(`    [dry-run] Would close ${release} if running before injection`);
if (!dryRun) {
    console.log(`Checking and closing ${release} if it is running...`);
    stopClient(channel);
    buildPackage(distPath);
}

let bdPath = useBdRelease ? bundlePath : distPath;
if (process.env.WSL_DISTRO_NAME) {
    const target = path.join(resources, "..", "..", "betterdiscord");
    bdPath = useBdRelease ? "../../../betterdiscord/betterdiscord.asar" : "../../../betterdiscord";
    if (dryRun) {
        console.log(`    [dry-run] Would copy Open BetterDiscord ${mode} files to ${target}`);
    }
    else if (useBdRelease) {
        fs.mkdirSync(target, {recursive: true});
        fs.copyFileSync(bundlePath, path.join(target, "betterdiscord.asar"));
    }
    else {
        copyFiles(distPath, target);
    }
}

console.log("");
console.log(`${dryRun ? "Dry-run for" : "Injecting into"} ${release}`);
console.log(`    ✅ Found resources in ${resources}`);

const marker = wrapInjection({
    resources,
    channel,
    mode,
    bdPath,
    dryRun,
    log: message => console.log(`    ${dryRun ? "[dry-run] " : ""}${message}`),
});

if (!dryRun && process.platform === "darwin") {
    const recoveryDisabled = path.join(process.env.HOME!, "Library", "Application Support", releaseDirectory, "betterdiscord-bootstrap", "recovery-disabled");
    fs.rmSync(recoveryDisabled, {force: true});
}

console.log(`    ${dryRun ? "[dry-run] Would write" : "✅ Wrote"} ${path.join(resources, "app", ".betterdiscord-inject.json")}`);
console.log(`    Installation ID: ${marker.installationId}`);
console.log("");
console.log(dryRun ? `Dry-run complete; ${release} was not modified.` : `Injection successful, please restart ${release}.`);
