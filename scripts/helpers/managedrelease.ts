import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {finished} from "node:stream/promises";
import asar from "@electron/asar";

export const releaseInputs = ["main.js", "package.json", "preload.js", "earlyRenderer.js", "betterdiscord.js", "editor/preload.js", "editor/script.js", "editor/index.html"] as const;
type RuntimePlatform = NodeJS.Platform;

/** Resolve the installer-owned shared release path without touching the filesystem. */
export function managedReleasePath(platform: RuntimePlatform = process.platform, env: NodeJS.ProcessEnv = process.env, home = os.homedir()) {
    const paths = platform === "win32" ? path.win32 : path.posix;
    let base: string;
    if (platform === "win32") {
        base = env.APPDATA || paths.join(home, "AppData", "Roaming");
    }
    else if (platform === "darwin") {
        base = paths.join(env.HOME || home, "Library", "Application Support");
    }
    else {
        if (env.XDG_CONFIG_HOME && !paths.isAbsolute(env.XDG_CONFIG_HOME)) throw new Error("XDG_CONFIG_HOME must be an absolute path");
        base = env.XDG_CONFIG_HOME || paths.join(env.HOME || home, ".config");
    }
    return paths.join(base, "BetterDiscord", "data", "betterdiscord.asar");
}

export function isCI(value: string | undefined) {
    return /^(?:true|1|yes|on)$/i.test(value?.trim() || "");
}

const sha256 = (buffer: Buffer) => crypto.createHash("sha256").update(buffer).digest("hex");
const tempName = (target: string) => `${target}.${process.pid}.${crypto.randomBytes(12).toString("hex")}.tmp`;

export function readReleaseInputs(dist: string) {
    return releaseInputs.map(name => ({name, bytes: fs.readFileSync(path.join(dist, name))}));
}

type ReleaseInput = ReturnType<typeof readReleaseInputs>[number];
export function validateArchive(archive: string, inputs: ReleaseInput[]) {
    try {
        const actual = asar.listPackage(archive, {isPack: false}).map(name => name.replaceAll("\\", "/").replace(/^\/+/, "")).filter(name => !("files" in asar.statFile(archive, name))).sort();
        const expected = inputs.map(input => input.name).sort();
        if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("ASAR contents do not match the eight release inputs");
        for (const input of inputs) {
            if (sha256(asar.extractFile(archive, input.name)) !== sha256(input.bytes)) throw new Error(`ASAR content mismatch: ${input.name}`);
        }
    }
    finally {asar.uncache(archive);}
}

/** Create, finish and validate an archive before replacing the dist artifact. */
export async function createReleaseArchive(dist: string) {
    const archive = path.join(dist, "betterdiscord.asar");
    const temporary = tempName(archive);
    const inputs = readReleaseInputs(dist);
    try {
        const result: unknown = await asar.createPackageFromFiles(dist, temporary, releaseInputs.map(name => path.join(dist, name)));
        // The ASAR promise can resolve before the returned writable has finished.
        if (result && typeof result === "object" && "on" in result && "writable" in result) await finished(result as NodeJS.WritableStream);
        validateArchive(temporary, inputs);
        const current = readReleaseInputs(dist);
        if (current.some((input, index) => !input.bytes.equals(inputs[index].bytes))) throw new Error("Release inputs changed during packaging");
        const sums = inputs.map(input => `${sha256(input.bytes)}  ${input.name}`).join("\n");
        fs.writeFileSync(path.join(dist, "checksums.txt"), sums);
        if (fs.readFileSync(path.join(dist, "checksums.txt"), "utf8") !== sums) throw new Error("Release checksum verification failed");
        fs.renameSync(temporary, archive);
        return {archive, inputs};
    }
    finally {fs.rmSync(temporary, {force: true});}
}

/** Publish only a verified temporary sibling; a failure leaves the prior release intact. */
export function publishManagedRelease(archive: string, inputs: ReleaseInput[], destination = managedReleasePath()) {
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    const temporary = tempName(destination);
    try {
        fs.copyFileSync(archive, temporary, fs.constants.COPYFILE_EXCL);
        validateArchive(temporary, inputs);
        fs.renameSync(temporary, destination);
    }
    finally {fs.rmSync(temporary, {force: true});}
    return destination;
}

export function publishLocalRelease(archive: string, inputs: ReleaseInput[], ci = process.env.CI, destination?: string) {
    if (isCI(ci)) return null;
    return publishManagedRelease(archive, inputs, destination);
}
