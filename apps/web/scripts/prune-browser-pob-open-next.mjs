import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mirrorRoot = path.join(appRoot, ".open-next", "server-functions", "default", "local-pob-mirror");
const allowedRootEntries = new Set(["LICENSE.md", "manifest.xml", "runtime", "src"]);
const allowedTreeDirs = new Set([
  "3_19",
  "3_27",
  "3_27_alternate",
  "3_27_ruthless",
  "3_27_ruthless_alternate",
  "3_28",
  "3_28_alternate",
  "3_28_ruthless",
  "3_28_ruthless_alternate",
  "legion",
]);

let prunedCount = 0;

function isInsideMirror(targetPath) {
  const relative = path.relative(mirrorRoot, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function safeRemove(targetPath) {
  if (!isInsideMirror(targetPath)) {
    throw new Error(`Refusing to prune outside ${mirrorRoot}: ${targetPath}`);
  }

  await fs.rm(targetPath, { force: true, recursive: true });
  prunedCount += 1;
}

async function pruneFiles(root, shouldKeepFile) {
  if (!(await pathExists(root))) {
    return;
  }

  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      await pruneFiles(fullPath, shouldKeepFile);
      continue;
    }

    if (entry.isFile() && !shouldKeepFile(fullPath)) {
      await safeRemove(fullPath);
    }
  }
}

function isLuaFile(fullPath) {
  return path.extname(fullPath).toLowerCase() === ".lua";
}

function isTimelessJewelPayload(fullPath) {
  const normalized = fullPath.replace(/\\/g, "/");
  const fileName = path.basename(fullPath);
  return (
    normalized.includes("/src/Data/TimelessJewelData/") &&
    (/\.zip$/i.test(fileName) || /\.zip\.part\d+$/i.test(fileName))
  );
}

async function pruneRoot() {
  for (const entry of await fs.readdir(mirrorRoot, { withFileTypes: true })) {
    if (!allowedRootEntries.has(entry.name)) {
      await safeRemove(path.join(mirrorRoot, entry.name));
    }
  }
}

async function pruneRuntime() {
  const runtimeRoot = path.join(mirrorRoot, "runtime");
  if (!(await pathExists(runtimeRoot))) {
    return;
  }

  for (const entry of await fs.readdir(runtimeRoot, { withFileTypes: true })) {
    const fullPath = path.join(runtimeRoot, entry.name);
    if (entry.name !== "lua") {
      await safeRemove(fullPath);
    }
  }

  await pruneFiles(path.join(runtimeRoot, "lua"), isLuaFile);
}

async function pruneTreeData(treeDataRoot) {
  for (const entry of await fs.readdir(treeDataRoot, { withFileTypes: true })) {
    const fullPath = path.join(treeDataRoot, entry.name);
    if (!entry.isDirectory()) {
      await safeRemove(fullPath);
      continue;
    }

    if (!allowedTreeDirs.has(entry.name)) {
      await safeRemove(fullPath);
      continue;
    }

    await pruneFiles(fullPath, (filePath) => {
      const fileName = path.basename(filePath);
      if (entry.name === "3_19") {
        return fileName === "Assets.lua";
      }

      if (entry.name === "legion") {
        return fileName === "tree-legion.lua";
      }

      return isLuaFile(filePath);
    });
  }
}

async function pruneSource() {
  const srcRoot = path.join(mirrorRoot, "src");
  if (!(await pathExists(srcRoot))) {
    return;
  }

  for (const entry of await fs.readdir(srcRoot, { withFileTypes: true })) {
    const fullPath = path.join(srcRoot, entry.name);
    if (entry.isDirectory() && entry.name === "TreeData") {
      await pruneTreeData(fullPath);
      continue;
    }

    if (entry.isDirectory()) {
      await pruneFiles(fullPath, (filePath) => isLuaFile(filePath) || isTimelessJewelPayload(filePath));
      continue;
    }

    if (entry.isFile() && !isLuaFile(fullPath)) {
      await safeRemove(fullPath);
    }
  }
}

if (!(await pathExists(mirrorRoot))) {
  console.log(`No browser PoB mirror found at ${mirrorRoot}; skipping prune.`);
} else {
  await pruneRoot();
  await pruneRuntime();
  await pruneSource();
  console.log(`Pruned ${prunedCount} browser PoB deploy artifact entries from ${mirrorRoot}.`);
}
