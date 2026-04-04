import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localPobMirrorDir = resolve(repoRoot, "local-pob-mirror");
const remoteUrl = "https://github.com/PathOfBuildingCommunity/PathOfBuilding";
const branch = "dev";

mkdirSync(dirname(localPobMirrorDir), { recursive: true });

if (!existsSync(localPobMirrorDir)) {
  execFileSync("git", ["clone", "--branch", branch, remoteUrl, localPobMirrorDir], {
    cwd: repoRoot,
    stdio: "inherit",
  });
} else {
  execFileSync("git", ["-C", localPobMirrorDir, "fetch", "origin", branch], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  execFileSync("git", ["-C", localPobMirrorDir, "checkout", branch], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  execFileSync("git", ["-C", localPobMirrorDir, "merge", "--ff-only", `origin/${branch}`], {
    cwd: repoRoot,
    stdio: "inherit",
  });
}

const head = execFileSync("git", ["-C", localPobMirrorDir, "rev-parse", "HEAD"], {
  cwd: repoRoot,
  encoding: "utf8",
}).trim();

console.log(`Local PoB mirror ready at ${localPobMirrorDir}`);
console.log(`Branch: ${branch}`);
console.log(`Commit: ${head}`);
