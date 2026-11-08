import path from "node:path";
import doSanityChecks from "./helpers/validate";
import buildPackage from "./helpers/package";
import {createReleaseArchive, publishLocalRelease} from "./helpers/managedrelease";

const dist = path.resolve(__dirname, "..", "dist");
doSanityChecks(dist);
buildPackage(dist);
console.log("\nGenerating bundle");
const {archive, inputs} = await createReleaseArchive(dist);
console.log(`    ✅ Successfully created bundle ${archive} and checksums`);
const destination = publishLocalRelease(archive, inputs);
if (!destination) console.log("    CI detected; skipping installed release publication");
else console.log(`    ✅ Published managed release ${destination}`);
