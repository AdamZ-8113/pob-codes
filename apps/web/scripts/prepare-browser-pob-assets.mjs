import fs from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { inflateRawSync, inflateSync } from "node:zlib";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "..", "..");
const pobRoot = path.join(repoRoot, "local-pob-mirror");
const pobSrcRoot = path.join(pobRoot, "src");
const pobRuntimeLuaRoot = path.join(pobRoot, "runtime", "lua");
const dataRoot = path.join(repoRoot, "data");
const publicRoot = path.join(appRoot, "public", "browser-pob");
const mirrorOutputRoot = path.join(publicRoot, "mirror");
const manifestOutputRoot = path.join(publicRoot, "manifests");
const shouldCopyAssets = process.env.BROWSER_POB_COPY_ASSETS === "1";
const supportedTreeVersions = new Set(["3_27", "3_28"]);
const latestSupportedTreeVersion = "3_28";
const treeVariantSuffixes = ["", "_alternate", "_ruthless", "_ruthless_alternate"];
const nonTreePobSourceEntries = [
  "Assets",
  "Classes",
  "Data",
  "Export",
  "Modules",
  "GameVersions.lua",
  "HeadlessWrapper.lua",
  "Launch.lua",
  "LaunchInstall.lua",
  "UpdateApply.lua",
  "UpdateCheck.lua",
];
const requiredTreeAssetFiles = ["TreeData/3_19/Assets.lua", "TreeData/legion/tree-legion.lua"];
const timelessJewelDir = path.join(pobSrcRoot, "Data", "TimelessJewelData");

function getDefaultAssetBaseUrl() {
  try {
    const revision = execFileSync("git", ["-C", pobRoot, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return `https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/${revision}`;
  } catch {
    return "https://raw.githubusercontent.com/PathOfBuildingCommunity/PathOfBuilding/dev";
  }
}

const assetBaseUrl = (process.env.BROWSER_POB_ASSET_BASE_URL ?? getDefaultAssetBaseUrl()).replace(/\/+$/, "");

function toPosix(filePath) {
  return filePath.replace(/\\/g, "/");
}

function encodeAssetPath(relativePath) {
  return toPosix(relativePath)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function staticMirrorUrl(relativePath) {
  const encodedPath = encodeAssetPath(relativePath);
  return shouldCopyAssets ? `/browser-pob/mirror/${encodedPath}` : `${assetBaseUrl}/${encodedPath}`;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}

async function copyFilePreservingPath(sourceRoot, sourcePath, outputRoot = mirrorOutputRoot) {
  const relativePath = toPosix(path.relative(sourceRoot, sourcePath));
  let outputPath = null;
  if (shouldCopyAssets) {
    outputPath = path.join(outputRoot, relativePath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await pipeline(createReadStream(sourcePath), createWriteStream(outputPath));
  }

  return {
    outputPath,
    relativePath,
    size: (await fs.stat(sourcePath)).size,
    url: staticMirrorUrl(relativePath),
  };
}

function inflateMaybe(buffer) {
  try {
    return inflateSync(buffer);
  } catch {
    return inflateRawSync(buffer);
  }
}

function getTreeDirsForVersion(treeVersion) {
  return treeVariantSuffixes.map((suffix) => `${treeVersion}${suffix}`);
}

async function getSampleBuilds() {
  if (!(await pathExists(dataRoot))) {
    return [];
  }

  return (await fs.readdir(dataRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".txt"))
    .map(async (entry) => {
      const stats = await fs.stat(path.join(dataRoot, entry.name));
      return {
        id: entry.name,
        label: entry.name.replace(/\.txt$/i, ""),
        size: stats.size,
      };
    })
    .reduce(async (pendingOut, pendingEntry) => {
      const out = await pendingOut;
      out.push(await pendingEntry);
      return out;
    }, Promise.resolve([]))
    .then((sampleBuilds) => sampleBuilds.sort((left, right) => left.label.localeCompare(right.label)));
}

async function getTimelessJewelSources() {
  const grouped = new Map();

  for (const entry of await fs.readdir(timelessJewelDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    const zipMatch = entry.name.match(/^(.*)\.zip$/);
    if (zipMatch) {
      const existing = grouped.get(zipMatch[1]) ?? { baseName: zipMatch[1], zip: null, parts: [] };
      existing.zip = entry.name;
      grouped.set(zipMatch[1], existing);
      continue;
    }

    const partMatch = entry.name.match(/^(.*)\.zip\.part(\d+)$/);
    if (partMatch) {
      const existing = grouped.get(partMatch[1]) ?? { baseName: partMatch[1], zip: null, parts: [] };
      existing.parts.push({ fileName: entry.name, partNumber: Number(partMatch[2]) });
      grouped.set(partMatch[1], existing);
    }
  }

  return Array.from(grouped.values())
    .map((source) => ({
      ...source,
      parts: source.parts.sort((left, right) => left.partNumber - right.partNumber),
    }))
    .sort((left, right) => left.baseName.localeCompare(right.baseName));
}

async function getTimelessInflatedSize(source) {
  const compressedBuffer = source.zip
    ? await fs.readFile(path.join(timelessJewelDir, source.zip))
    : Buffer.concat(await Promise.all(source.parts.map((part) => fs.readFile(path.join(timelessJewelDir, part.fileName)))));
  return inflateMaybe(compressedBuffer).length;
}

async function copyPobLuaFile(fullPath, mountFiles, addedMountPaths) {
  if (!fullPath.endsWith(".lua") || !(await pathExists(fullPath))) {
    return;
  }

  const stats = await fs.stat(fullPath);
  if (!stats.isFile()) {
    return;
  }

  const relativeToPob = toPosix(path.relative(pobRoot, fullPath));
  const mountPath = `/pob/${relativeToPob}`;
  if (addedMountPaths.has(mountPath)) {
    return;
  }

  const copied = await copyFilePreservingPath(pobRoot, fullPath);
  mountFiles.push({
    kind: "static",
    sourcePath: relativeToPob,
    mountPath,
    size: copied.size,
    binary: false,
    url: copied.url,
  });
  addedMountPaths.add(mountPath);
}

async function copyRuntimeLuaFile(fullPath, mountFiles, addedMountPaths) {
  const relativeToRuntime = toPosix(path.relative(pobRuntimeLuaRoot, fullPath));
  if (!relativeToRuntime.endsWith(".lua")) {
    return;
  }

  const mountPath = `/pob/runtime/lua/${relativeToRuntime}`;
  if (addedMountPaths.has(mountPath)) {
    return;
  }

  const copied = await copyFilePreservingPath(pobRoot, fullPath);
  mountFiles.push({
    kind: "static",
    sourcePath: `runtime/lua/${relativeToRuntime}`,
    mountPath,
    size: copied.size,
    binary: false,
    url: copied.url,
  });
  addedMountPaths.add(mountPath);
}

async function copyTimelessPayloads(timelessSources) {
  for (const source of timelessSources) {
    if (source.zip) {
      await copyFilePreservingPath(pobRoot, path.join(timelessJewelDir, source.zip));
      continue;
    }

    for (const part of source.parts) {
      await copyFilePreservingPath(pobRoot, path.join(timelessJewelDir, part.fileName));
    }
  }
}

async function buildMountManifest({ treeVersion, includeTimeless, timelessSources, timelessSizes }) {
  const resolvedTreeVersion = supportedTreeVersions.has(treeVersion) ? treeVersion : latestSupportedTreeVersion;
  const includedTreeDirs = new Set([
    ...getTreeDirsForVersion(latestSupportedTreeVersion),
    ...getTreeDirsForVersion(resolvedTreeVersion),
  ]);
  const mountFiles = [];
  const addedMountPaths = new Set();

  for (const entry of nonTreePobSourceEntries) {
    const fullPath = path.join(pobSrcRoot, entry);
    if (!(await pathExists(fullPath))) {
      continue;
    }

    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      for (const sourceFile of await walk(fullPath)) {
        await copyPobLuaFile(sourceFile, mountFiles, addedMountPaths);
      }
    } else if (stats.isFile()) {
      await copyPobLuaFile(fullPath, mountFiles, addedMountPaths);
    }
  }

  for (const treeDir of includedTreeDirs) {
    const fullPath = path.join(pobSrcRoot, "TreeData", treeDir);
    if (!(await pathExists(fullPath))) {
      continue;
    }

    for (const sourceFile of await walk(fullPath)) {
      await copyPobLuaFile(sourceFile, mountFiles, addedMountPaths);
    }
  }

  for (const sourcePath of requiredTreeAssetFiles) {
    await copyPobLuaFile(path.join(pobSrcRoot, sourcePath), mountFiles, addedMountPaths);
  }

  for (const runtimeFile of await walk(pobRuntimeLuaRoot)) {
    await copyRuntimeLuaFile(runtimeFile, mountFiles, addedMountPaths);
  }

  const manifestCopied = await copyFilePreservingPath(pobRoot, path.join(pobRoot, "manifest.xml"));
  mountFiles.push({
    kind: "static",
    sourcePath: "manifest.xml",
    mountPath: "/pob/manifest.xml",
    size: manifestCopied.size,
    binary: false,
    url: manifestCopied.url,
  });

  if (includeTimeless) {
    for (const source of timelessSources) {
      const urls = source.zip
        ? [staticMirrorUrl(`src/Data/TimelessJewelData/${source.zip}`)]
        : source.parts.map((part) => staticMirrorUrl(`src/Data/TimelessJewelData/${part.fileName}`));

      mountFiles.push({
        kind: "compressed-timeless-bin",
        sourcePath: `${source.baseName}.bin`,
        mountPath: `/pob/src/Data/TimelessJewelData/${source.baseName}.bin`,
        size: timelessSizes.get(source.baseName) ?? 0,
        compressedSize: source.zip
          ? (await fs.stat(path.join(timelessJewelDir, source.zip))).size
          : (
              await Promise.all(source.parts.map((part) => fs.stat(path.join(timelessJewelDir, part.fileName))))
            ).reduce((sum, stats) => sum + stats.size, 0),
        binary: true,
        compression: "zlib",
        urls,
      });
    }
  }

  mountFiles.sort((left, right) => left.mountPath.localeCompare(right.mountPath));

  const excluded = [
    "historical passive tree versions outside the requested build version",
    "passive tree image assets",
  ];
  if (!includeTimeless) {
    excluded.push("timeless jewel binary lookup tables not requested by this build");
  }

  return {
    generatedAt: new Date().toISOString(),
    mountFiles,
    mountFileCount: mountFiles.length,
    mountBytes: mountFiles.reduce((sum, file) => sum + file.size, 0),
    notes: {
      mode: "static-targeted-mount-manifest",
      requestedTreeVersion: resolvedTreeVersion,
      startupTreeVersion: latestSupportedTreeVersion,
      includedTreeDirs: Array.from(includedTreeDirs),
      includesTimelessJewelData: includeTimeless,
      treeAssetSource: ["src/TreeData/3_19/Assets.lua", "src/TreeData/legion/tree-legion.lua"],
      excluded,
    },
  };
}

async function writeJson(relativePath, payload) {
  const outputPath = path.join(manifestOutputRoot, relativePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(payload)}\n`);
}

if (!(await pathExists(pobRoot))) {
  throw new Error(`Missing local PoB mirror at ${pobRoot}`);
}

await fs.rm(mirrorOutputRoot, { force: true, recursive: true });
await fs.rm(manifestOutputRoot, { force: true, recursive: true });
if (shouldCopyAssets) {
  await fs.mkdir(mirrorOutputRoot, { recursive: true });
}
await fs.mkdir(manifestOutputRoot, { recursive: true });

const timelessSources = await getTimelessJewelSources();
const timelessSizes = new Map();
for (const source of timelessSources) {
  timelessSizes.set(source.baseName, await getTimelessInflatedSize(source));
}
await copyTimelessPayloads(timelessSources);

const catalog = {
  generatedAt: new Date().toISOString(),
  sampleBuilds: await getSampleBuilds(),
  supportedTreeVersions: Array.from(supportedTreeVersions).sort(),
  notes: {
    mode: "static-catalog",
    strategy: "load static browser PoB assets generated at deploy time",
    assetBaseUrl,
    assetMode: shouldCopyAssets ? "copied" : "remote",
    treeVariantSuffixes,
  },
};
await writeJson("catalog.json", catalog);

for (const treeVersion of supportedTreeVersions) {
  await writeJson(
    `${treeVersion}.json`,
    await buildMountManifest({ treeVersion, includeTimeless: false, timelessSources, timelessSizes }),
  );
  await writeJson(
    `${treeVersion}-timeless.json`,
    await buildMountManifest({ treeVersion, includeTimeless: true, timelessSources, timelessSizes }),
  );
}

if (shouldCopyAssets) {
  const mirrorStats = await walk(mirrorOutputRoot).then(async (files) => {
    const sizes = await Promise.all(files.map((file) => fs.stat(file).then((stats) => stats.size)));
    return {
      files: files.length,
      bytes: sizes.reduce((sum, size) => sum + size, 0),
    };
  });

  console.log(
    `Prepared browser PoB copied assets: ${mirrorStats.files} files, ${(mirrorStats.bytes / 1024 / 1024).toFixed(2)} MiB.`,
  );
} else {
  console.log(`Prepared browser PoB manifests with remote asset base: ${assetBaseUrl}`);
}
