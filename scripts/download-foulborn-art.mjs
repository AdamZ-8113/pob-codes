/**
 * Downloads Foulborn (mutated) unique item art from poe.ninja's signed CDN URLs.
 *
 * GGG's image server composites a purple glow effect onto base item art when the
 * `"mutated": true` parameter is present in the gen/image URL. These signed URLs
 * cannot be constructed — they must be obtained from an API that returns them
 * (poe.ninja, PoE trade API, etc.).
 *
 * This script:
 *   1. Fetches all unique item types from poe.ninja's Standard league API
 *   2. Deduplicates Foulborn items by icon URL (many variants share the same art)
 *   3. Downloads each unique image with a 10-second delay between requests
 *   4. Stores them under public/assets/items/art/Foulborn/LowResolution/{category}/{file}.png
 *   5. Prints an asset manifest patch (JSON) to stdout for integration
 *
 * Usage:
 *   node scripts/download-foulborn-art.mjs
 *   node scripts/download-foulborn-art.mjs --dry-run     # preview without downloading
 *   node scripts/download-foulborn-art.mjs --delay 5000  # custom delay in ms
 */

import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const itemArtAssetsDir = join(
  repoRoot,
  "apps",
  "web",
  "public",
  "assets",
  "items",
  "art",
);

const POENINJA_API_BASE = "https://poe.ninja/api/data/itemoverview";
const LEAGUE = "Standard";
const ITEM_TYPES = [
  "UniqueArmour",
  "UniqueAccessory",
  "UniqueWeapon",
  "UniqueJewel",
];
const DEFAULT_DELAY_MS = 10_000;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const delayIndex = args.indexOf("--delay");
const delayMs =
  delayIndex !== -1 ? Number(args[delayIndex + 1]) : DEFAULT_DELAY_MS;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeFoulbornArtPath(iconUrl) {
  const match = iconUrl.match(/gen\/image\/([^/]+)/);
  if (!match) {
    return undefined;
  }

  try {
    const decoded = JSON.parse(Buffer.from(match[1], "base64").toString());
    const params = decoded[2];
    if (!params?.mutated || typeof params.f !== "string") {
      return undefined;
    }

    return params.f;
  } catch {
    return undefined;
  }
}

function buildFoulbornAssetInfo(artPath) {
  // artPath is like "2DItems/Armours/BodyArmours/WilefangsPelt"
  const relativePath = artPath.replace(/^2DItems\//, "") + ".png";
  const foulbornRelativePath = "Foulborn/LowResolution/" + relativePath;
  const localPath = join(itemArtAssetsDir, "Foulborn", "LowResolution", ...relativePath.split("/"));
  const publicPath = `/assets/items/art/Foulborn/LowResolution/${relativePath}`;

  return { localPath, publicPath, foulbornRelativePath };
}

async function fetchPoeNinjaItems(type) {
  const url = `${POENINJA_API_BASE}?league=${LEAGUE}&type=${type}`;
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const data = await response.json();
  return data.lines ?? [];
}

async function collectFoulbornAssets() {
  const uniqueByIcon = new Map();

  for (const type of ITEM_TYPES) {
    console.log(`Fetching ${type} from poe.ninja...`);
    const items = await fetchPoeNinjaItems(type);
    const foulborn = items.filter((item) => item.name.startsWith("Foulborn "));
    console.log(`  Found ${foulborn.length} Foulborn variants`);

    for (const item of foulborn) {
      if (uniqueByIcon.has(item.icon)) {
        continue;
      }

      const artPath = decodeFoulbornArtPath(item.icon);
      if (!artPath) {
        console.warn(`  Skipping ${item.name}: could not decode icon URL`);
        continue;
      }

      const assetInfo = buildFoulbornAssetInfo(artPath);
      uniqueByIcon.set(item.icon, {
        name: item.name,
        baseName: item.name.replace(/^Foulborn /, ""),
        iconUrl: item.icon,
        ...assetInfo,
      });
    }

    // Small delay between API calls to be polite
    await sleep(1000);
  }

  return [...uniqueByIcon.values()];
}

async function downloadAssets(assets) {
  let downloadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const manifestPatch = {};

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];

    // Build manifest entry regardless of download status
    const foulbornName = asset.name;

    if (
      existsSync(asset.localPath) &&
      statSync(asset.localPath).size > 0
    ) {
      skippedCount++;
      manifestPatch[foulbornName] = asset.publicPath;
      continue;
    }

    if (dryRun) {
      console.log(
        `[DRY RUN] Would download: ${foulbornName} => ${asset.foulbornRelativePath}`,
      );
      manifestPatch[foulbornName] = asset.publicPath;
      continue;
    }

    // Rate limit: wait before each download (except the first)
    if (downloadedCount > 0) {
      const remaining = assets.length - i;
      const eta = Math.round((remaining * delayMs) / 1000 / 60);
      console.log(
        `  Waiting ${delayMs / 1000}s before next download... (${remaining} remaining, ~${eta}min)`,
      );
      await sleep(delayMs);
    }

    try {
      console.log(
        `[${i + 1}/${assets.length}] Downloading ${foulbornName}...`,
      );
      const response = await fetch(asset.iconUrl);
      if (!response.ok) {
        console.warn(
          `  Failed (HTTP ${response.status}): ${foulbornName}`,
        );
        failedCount++;
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length === 0) {
        console.warn(`  Empty response: ${foulbornName}`);
        failedCount++;
        continue;
      }

      mkdirSync(dirname(asset.localPath), { recursive: true });
      writeFileSync(asset.localPath, buffer);
      downloadedCount++;
      manifestPatch[foulbornName] = asset.publicPath;
      console.log(
        `  Saved: ${asset.foulbornRelativePath} (${buffer.length} bytes)`,
      );
    } catch (error) {
      console.warn(`  Error downloading ${foulbornName}: ${error.message}`);
      failedCount++;
    }
  }

  return { downloadedCount, skippedCount, failedCount, manifestPatch };
}

async function main() {
  console.log("=== Foulborn Art Downloader ===");
  console.log(`League: ${LEAGUE}`);
  console.log(`Delay: ${delayMs}ms between downloads`);
  console.log(`Dry run: ${dryRun}`);
  console.log("");

  const assets = await collectFoulbornAssets();
  console.log(`\nTotal unique Foulborn images to process: ${assets.length}`);

  if (assets.length === 0) {
    console.log("No Foulborn assets found.");
    return;
  }

  const estimatedMinutes = Math.round(
    (assets.length * delayMs) / 1000 / 60,
  );
  console.log(
    `Estimated download time: ~${estimatedMinutes} minutes at ${delayMs / 1000}s intervals`,
  );
  console.log("");

  const { downloadedCount, skippedCount, failedCount, manifestPatch } =
    await downloadAssets(assets);

  console.log("\n=== Summary ===");
  console.log(`Downloaded: ${downloadedCount}`);
  console.log(`Already cached: ${skippedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Total manifest entries: ${Object.keys(manifestPatch).length}`);

  // Write manifest patch to a JSON file for integration into sync-data.mjs
  const patchPath = join(
    repoRoot,
    "data",
    "generated",
    "foulborn-art-manifest.json",
  );
  mkdirSync(dirname(patchPath), { recursive: true });
  writeFileSync(patchPath, JSON.stringify(manifestPatch, null, 2) + "\n");
  console.log(`\nManifest patch written to: ${patchPath}`);
  console.log(
    "Integrate this into the asset manifest by running sync-data.mjs or manually merging into byUniqueName.",
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
