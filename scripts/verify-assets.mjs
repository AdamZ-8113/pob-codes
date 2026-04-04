import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedDir = join(repoRoot, "data", "generated");
const publicDir = join(repoRoot, "apps", "web", "public");

const treeManifest = readJson(join(generatedDir, "tree-manifest.json"));
const itemManifest = readJson(join(generatedDir, "item-icon-manifest.json"));
const gemManifest = readJson(join(generatedDir, "gem-icon-manifest.json"));
const sourceMeta = readJson(join(generatedDir, "source-meta.json"));

const errors = [];

for (const variant of Object.values(treeManifest.variants)) {
  const skilltreePath = join(generatedDir, "skilltree", variant.sourceFile);
  if (!existsSync(skilltreePath)) {
    errors.push(`Missing skilltree data file: ${skilltreePath}`);
  }

  if (!Array.isArray(variant.nodeIds) || variant.nodeIds.length === 0) {
    errors.push(`Tree variant is missing node ids: ${variant.sourceFile}`);
  }

  if (!variant.layoutPath || !existsSync(join(publicDir, trimLeadingSlash(variant.layoutPath)))) {
    errors.push(`Missing passive tree layout asset: ${variant.layoutPath ?? variant.sourceFile}`);
  }
}

const passiveTreeRoot = join(publicDir, trimLeadingSlash(treeManifest.passiveTreeAssetRoot));
if (!existsSync(passiveTreeRoot) || readdirSync(passiveTreeRoot).length === 0) {
  errors.push(`Passive tree assets missing or empty: ${passiveTreeRoot}`);
}

if (!treeManifest.spriteManifestPath || !existsSync(join(publicDir, trimLeadingSlash(treeManifest.spriteManifestPath)))) {
  errors.push(`Passive tree sprite manifest missing: ${treeManifest.spriteManifestPath ?? "undefined"}`);
}

for (const assetPath of collectAssetPaths(itemManifest)) {
  if (!existsSync(join(publicDir, trimLeadingSlash(assetPath)))) {
    errors.push(`Missing item asset: ${assetPath}`);
  }
}

for (const assetPath of collectAssetPaths(gemManifest)) {
  if (!existsSync(join(publicDir, trimLeadingSlash(assetPath)))) {
    errors.push(`Missing gem asset: ${assetPath}`);
  }
}

for (const [source, meta] of Object.entries(sourceMeta.sources)) {
  if (!meta.commit || !meta.url) {
    errors.push(`Invalid source metadata for ${source}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

console.log("Asset verification passed.");
console.log(`Tree variants: ${Object.keys(treeManifest.variants).length}`);
console.log(`Item assets referenced: ${collectAssetPaths(itemManifest).length}`);
console.log(`Gem assets referenced: ${collectAssetPaths(gemManifest).length}`);

function collectAssetPaths(manifest) {
  const paths = new Set();

  for (const value of Object.values(manifest.defaults ?? {})) {
    if (typeof value === "string") {
      paths.add(value);
    }
  }

  for (const value of Object.values(manifest.byBaseName ?? {})) {
    if (typeof value === "string") {
      paths.add(value);
    }
  }

  for (const value of Object.values(manifest.byUniqueName ?? {})) {
    if (typeof value === "string") {
      paths.add(value);
    }
  }

  for (const value of Object.values(manifest.byId ?? {})) {
    if (typeof value === "string") {
      paths.add(value);
    }
  }

  for (const value of Object.values(manifest.bySlot ?? {})) {
    if (typeof value === "string") {
      paths.add(value);
    }
  }

  for (const value of Object.values(manifest.byType ?? {})) {
    if (typeof value === "string") {
      paths.add(value);
    }
  }

  for (const value of Object.values(manifest.influences ?? {})) {
    if (typeof value === "string") {
      paths.add(value);
    }
  }

  return [...paths].sort();
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function trimLeadingSlash(path) {
  return path.replace(/^\/+/, "");
}
