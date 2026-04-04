/**
 * Downloads Foulborn (mutated) unique item art from GGG's documented Public
 * Stash API (`item.icon` on mutated uniques).
 *
 * Foulborn art is ultimately served by the PoE CDN, but the validated mutated
 * icon URLs are discovered through official Public Stash item payloads rather
 * than being constructed locally.
 *
 * Usage:
 *   node scripts/download-foulborn-art.mjs
 *   node scripts/download-foulborn-art.mjs --start-id <next_change_id>
 *
 * Requirements:
 *   - `--access-token` or `POE_PUBLIC_STASH_ACCESS_TOKEN`
 *   - `--user-agent` or `POE_API_USER_AGENT`
 *
 * Limitation:
 *   - The Public Stash API only sees currently public listings in the stash
 *     stream, so it is not guaranteed to enumerate the entire Foulborn catalog
 *     in a single pass.
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedDataDir = join(repoRoot, "data", "generated");
const itemArtAssetsDir = join(
  repoRoot,
  "apps",
  "web",
  "public",
  "assets",
  "items",
  "art",
);

const POE_API_BASE = "https://api.pathofexile.com";
const DEFAULT_LEAGUE = "Standard";
const DEFAULT_DELAY_MS = 10_000;
const DEFAULT_PUBLIC_STASH_PAGE_DELAY_MS = 1_000;
const DEFAULT_PUBLIC_STASH_MAX_PAGES = 100;
const PUBLIC_STASH_REALMS = new Set(["pc", "xbox", "sony"]);
const ACCESS_TOKEN_ENV_KEYS = [
  "POE_PUBLIC_STASH_ACCESS_TOKEN",
  "PATH_OF_EXILE_ACCESS_TOKEN",
  "POE_ACCESS_TOKEN",
];
const USER_AGENT_ENV_KEYS = [
  "POE_API_USER_AGENT",
  "PATH_OF_EXILE_USER_AGENT",
];

try {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  await main(args);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Fatal error:", message);
  process.exit(1);
}

async function main(config) {
  console.log("=== Foulborn Art Downloader ===");
  console.log("Source: Public Stash API");
  console.log(`League filter: ${config.league}`);
  console.log(`Download delay: ${config.delayMs}ms between downloads`);
  console.log(`Dry run: ${config.dryRun}`);
  console.log(`Realm: ${config.realm}`);
  console.log(`Page delay: ${config.pageDelayMs}ms`);
  console.log(`Max pages: ${config.maxPages}`);
  console.log(`Start change id: ${config.startId ?? "(automatic)"}`);
  console.log("");

  const { assets, meta } = await collectFoulbornAssets(config);
  console.log(`\nTotal Foulborn assets discovered: ${assets.length}`);

  if (assets.length === 0) {
    console.log("No Foulborn assets found.");
    if (meta.nextChangeId) {
      console.log(`Latest next_change_id: ${meta.nextChangeId}`);
    }
    return;
  }

  const estimatedMinutes = Math.round(
    (assets.length * config.delayMs) / 1000 / 60,
  );
  console.log(
    `Estimated download time: ~${estimatedMinutes} minutes at ${config.delayMs / 1000}s intervals`,
  );
  console.log("");

  const { downloadedCount, skippedCount, failedCount, manifestPatch } =
    await downloadAssets(assets, config);

  console.log("\n=== Summary ===");
  console.log(`Downloaded: ${downloadedCount}`);
  console.log(`Already cached: ${skippedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Total manifest entries: ${Object.keys(manifestPatch).length}`);

  if (meta.knownTargetCount > 0) {
    console.log(
      `Known Foulborn names observed: ${meta.knownMatchedCount}/${meta.knownTargetCount}`,
    );
  }

  if (meta.nextChangeId) {
    console.log(`Latest next_change_id: ${meta.nextChangeId}`);
  }

  console.warn(
    "Public Stash coverage is limited to current public listings; missing Foulborn items may require a later pass.",
  );

  const patchPath = join(generatedDataDir, "foulborn-art-manifest.json");
  mkdirSync(dirname(patchPath), { recursive: true });
  writeFileSync(patchPath, JSON.stringify(manifestPatch, null, 2) + "\n");
  console.log(`\nManifest patch written to: ${patchPath}`);
  console.log(
    "Integrate this into the asset manifest by running sync-data.mjs or manually merging into byUniqueName.",
  );
}

function parseArgs(argv) {
  const config = {
    accessToken: undefined,
    delayMs: DEFAULT_DELAY_MS,
    dryRun: false,
    help: false,
    league: DEFAULT_LEAGUE,
    maxPages: DEFAULT_PUBLIC_STASH_MAX_PAGES,
    pageDelayMs: DEFAULT_PUBLIC_STASH_PAGE_DELAY_MS,
    realm: "pc",
    startId: undefined,
    userAgent: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "--access-token":
        config.accessToken = readRequiredValue(argv, ++index, arg);
        break;
      case "--delay":
        config.delayMs = readNumberValue(argv, ++index, arg);
        break;
      case "--dry-run":
        config.dryRun = true;
        break;
      case "--help":
      case "-h":
        config.help = true;
        break;
      case "--league":
        config.league = readRequiredValue(argv, ++index, arg);
        break;
      case "--max-pages":
        config.maxPages = readNumberValue(argv, ++index, arg);
        break;
      case "--page-delay":
        config.pageDelayMs = readNumberValue(argv, ++index, arg);
        break;
      case "--realm":
        config.realm = readRequiredValue(argv, ++index, arg).toLowerCase();
        break;
      case "--start-id":
        config.startId = readRequiredValue(argv, ++index, arg);
        break;
      case "--user-agent":
        config.userAgent = readRequiredValue(argv, ++index, arg);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (config.help) {
    return config;
  }

  if (!Number.isFinite(config.delayMs) || config.delayMs < 0) {
    throw new Error("--delay must be a non-negative number");
  }

  if (!Number.isFinite(config.pageDelayMs) || config.pageDelayMs < 0) {
    throw new Error("--page-delay must be a non-negative number");
  }

  if (!Number.isFinite(config.maxPages) || config.maxPages <= 0) {
    throw new Error("--max-pages must be a positive number");
  }

  if (!config.league.trim()) {
    throw new Error("--league must not be empty");
  }

  if (!PUBLIC_STASH_REALMS.has(config.realm)) {
    throw new Error(`--realm must be one of: ${[...PUBLIC_STASH_REALMS].join(", ")}`);
  }

  config.accessToken = config.accessToken ?? readEnvValue(ACCESS_TOKEN_ENV_KEYS);
  config.userAgent = config.userAgent ?? readEnvValue(USER_AGENT_ENV_KEYS);

  if (!config.accessToken) {
    throw new Error(
      "Public Stash mode requires --access-token or POE_PUBLIC_STASH_ACCESS_TOKEN",
    );
  }

  if (!config.userAgent) {
    throw new Error(
      "Public Stash mode requires --user-agent or POE_API_USER_AGENT",
    );
  }

  return config;
}

function printHelp() {
  console.log(`Usage:
  node scripts/download-foulborn-art.mjs [options]

Options:
  --league <name>                    League filter (default: ${DEFAULT_LEAGUE})
  --delay <ms>                       Delay between image downloads (default: ${DEFAULT_DELAY_MS})
  --dry-run                          Preview without downloading
  --help                             Show this message

Public Stash API options:
  --realm <pc|xbox|sony>             API realm (default: pc)
  --start-id <next_change_id>        Resume from a previous public stash cursor
  --max-pages <count>                Maximum stash pages to scan (default: ${DEFAULT_PUBLIC_STASH_MAX_PAGES})
  --page-delay <ms>                  Delay between stash page fetches (default: ${DEFAULT_PUBLIC_STASH_PAGE_DELAY_MS})
  --access-token <token>             OAuth access token with service:psapi
  --user-agent <value>               Identifiable OAuth-style User-Agent

Environment variables:
  ${ACCESS_TOKEN_ENV_KEYS.join(", ")}
  ${USER_AGENT_ENV_KEYS.join(", ")}

Notes:
  - This downloader uses only GGG's documented Public Stash API.
  - The unsupported trade-search API is intentionally not used.
  - The Public Stash API is not guaranteed to enumerate every Foulborn item in one pass.`);
}

function readRequiredValue(argv, index, optionName) {
  const value = argv[index];
  if (value === undefined) {
    throw new Error(`${optionName} requires a value`);
  }
  return value;
}

function readNumberValue(argv, index, optionName) {
  const rawValue = readRequiredValue(argv, index, optionName);
  const number = Number(rawValue);
  if (!Number.isFinite(number)) {
    throw new Error(`${optionName} must be a number`);
  }
  return number;
}

function readEnvValue(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

async function collectFoulbornAssets(config) {
  const assetsByName = new Map();
  const knownTargetNames = loadKnownFoulbornNames();
  const matchedKnownNames = new Set();
  let nextChangeId = config.startId;

  console.log(
    `Known Foulborn names in local manifests: ${knownTargetNames.size}`,
  );

  for (let pageNumber = 1; pageNumber <= config.maxPages; pageNumber += 1) {
    const page = await fetchPublicStashPage(config, nextChangeId);
    const stashes = Array.isArray(page.stashes) ? page.stashes : [];
    nextChangeId = typeof page.next_change_id === "string" && page.next_change_id
      ? page.next_change_id
      : nextChangeId;

    let discoveredThisPage = 0;

    for (const stash of stashes) {
      const stashItems = Array.isArray(stash?.items) ? stash.items : [];
      for (const item of stashItems) {
        if (!isMatchingPublicStashItem(stash, item, config.league)) {
          continue;
        }

        const asset = addAssetRecord(assetsByName, {
          artFilename: item.artFilename,
          iconUrl: item.icon,
          name: item.name,
        });

        if (asset) {
          discoveredThisPage += 1;
          if (knownTargetNames.has(asset.name)) {
            matchedKnownNames.add(asset.name);
          }
        }
      }
    }

    console.log(
      `[page ${pageNumber}/${config.maxPages}] stash changes=${stashes.length}, matches=${discoveredThisPage}, unique names=${assetsByName.size}, known matched=${matchedKnownNames.size}/${knownTargetNames.size}`,
    );

    if (stashes.length === 0) {
      console.log("Reached the current end of the Public Stash stream.");
      break;
    }

    if (pageNumber < config.maxPages) {
      await sleep(config.pageDelayMs);
    }
  }

  return {
    assets: sortAssets(assetsByName),
    meta: {
      knownMatchedCount: matchedKnownNames.size,
      knownTargetCount: knownTargetNames.size,
      nextChangeId,
    },
  };
}

function loadKnownFoulbornNames() {
  const names = new Set();

  const foulbornManifest = readJsonIfExists(
    join(generatedDataDir, "foulborn-art-manifest.json"),
  );
  if (isPojo(foulbornManifest)) {
    for (const name of Object.keys(foulbornManifest)) {
      if (isFoulbornName(name)) {
        names.add(name);
      }
    }
  }

  const itemManifest = readJsonIfExists(
    join(generatedDataDir, "item-icon-manifest.json"),
  );
  if (isPojo(itemManifest?.byUniqueName)) {
    for (const name of Object.keys(itemManifest.byUniqueName)) {
      if (isFoulbornName(name)) {
        names.add(name);
      }
    }
  }

  return names;
}

function readJsonIfExists(path) {
  if (!existsSync(path)) {
    return undefined;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

async function fetchPublicStashPage(config, nextChangeId) {
  const path =
    config.realm === "pc"
      ? "/public-stash-tabs"
      : `/public-stash-tabs/${config.realm}`;
  const url = new URL(`${POE_API_BASE}${path}`);

  if (nextChangeId) {
    url.searchParams.set("id", nextChangeId);
  }

  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${config.accessToken}`,
      "user-agent": config.userAgent,
    },
  });

  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    const body = await safeReadText(response);
    const retrySuffix = retryAfter ? ` Retry-After: ${retryAfter}s.` : "";
    throw new Error(
      `Failed to fetch ${url} (${response.status}).${retrySuffix} ${body}`.trim(),
    );
  }

  return response.json();
}

async function safeReadText(response) {
  try {
    return (await response.text()).slice(0, 240);
  } catch {
    return "";
  }
}

function isMatchingPublicStashItem(stash, item, league) {
  if (!isPojo(item)) {
    return false;
  }

  if (item.mutated !== true || !isFoulbornName(item.name)) {
    return false;
  }

  const rarity = typeof item.rarity === "string" ? item.rarity : undefined;
  const frameType = Number.isFinite(Number(item.frameType))
    ? Number(item.frameType)
    : undefined;
  if (rarity !== "Unique" && frameType !== 3) {
    return false;
  }

  if (typeof item.icon !== "string" || item.icon.length === 0) {
    return false;
  }

  const itemLeague = resolveItemLeague(stash, item);
  return !league || itemLeague === league;
}

function resolveItemLeague(stash, item) {
  if (typeof item?.league === "string" && item.league.length > 0) {
    return item.league;
  }

  if (typeof stash?.league === "string" && stash.league.length > 0) {
    return stash.league;
  }

  return undefined;
}

function addAssetRecord(assetsByName, candidate) {
  if (!isFoulbornName(candidate?.name) || typeof candidate?.iconUrl !== "string") {
    return undefined;
  }

  const artPath =
    decodeFoulbornArtPath(candidate.iconUrl) ??
    normalizeArtFilename(candidate.artFilename);

  if (!artPath) {
    console.warn(`  Skipping ${candidate.name}: could not determine art path`);
    return undefined;
  }

  const assetInfo = buildFoulbornAssetInfo(artPath);
  const asset = {
    name: candidate.name,
    baseName: candidate.name.replace(/^Foulborn /, ""),
    iconUrl: candidate.iconUrl,
    ...assetInfo,
  };

  const existing = assetsByName.get(asset.name);
  if (existing) {
    return existing;
  }

  assetsByName.set(asset.name, asset);
  return asset;
}

function isFoulbornName(value) {
  return typeof value === "string" && value.startsWith("Foulborn ");
}

function decodeFoulbornArtPath(iconUrl) {
  if (typeof iconUrl !== "string") {
    return undefined;
  }

  const match = iconUrl.match(/gen\/image\/([^/?]+)/);
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

function normalizeArtFilename(artFilename) {
  if (typeof artFilename !== "string" || artFilename.length === 0) {
    return undefined;
  }

  const normalized = artFilename
    .replace(/^Art\//, "")
    .replace(/\\/g, "/")
    .replace(/\.(dds|png)$/i, "");

  return normalized.startsWith("2DItems/") ? normalized : undefined;
}

function buildFoulbornAssetInfo(artPath) {
  const relativePath = artPath.replace(/^2DItems\//, "") + ".png";
  const foulbornRelativePath = `Foulborn/LowResolution/${relativePath}`;
  const localPath = join(
    itemArtAssetsDir,
    "Foulborn",
    "LowResolution",
    ...relativePath.split("/"),
  );
  const publicPath = `/assets/items/art/Foulborn/LowResolution/${relativePath}`;

  return { foulbornRelativePath, localPath, publicPath };
}

function sortAssets(assetsByName) {
  return [...assetsByName.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

async function downloadAssets(assets, config) {
  let downloadedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const manifestPatch = {};

  for (let index = 0; index < assets.length; index += 1) {
    const asset = assets[index];
    manifestPatch[asset.name] = asset.publicPath;

    if (existsSync(asset.localPath) && statSync(asset.localPath).size > 0) {
      skippedCount += 1;
      continue;
    }

    if (config.dryRun) {
      console.log(
        `[DRY RUN] Would download: ${asset.name} => ${asset.foulbornRelativePath}`,
      );
      continue;
    }

    if (downloadedCount > 0) {
      const remaining = assets.length - index;
      const etaMinutes = Math.round((remaining * config.delayMs) / 1000 / 60);
      console.log(
        `  Waiting ${config.delayMs / 1000}s before next download... (${remaining} remaining, ~${etaMinutes}min)`,
      );
      await sleep(config.delayMs);
    }

    try {
      console.log(
        `[${index + 1}/${assets.length}] Downloading ${asset.name}...`,
      );
      const response = await fetch(asset.iconUrl);
      if (!response.ok) {
        console.warn(`  Failed (HTTP ${response.status}): ${asset.name}`);
        failedCount += 1;
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length === 0) {
        console.warn(`  Empty response: ${asset.name}`);
        failedCount += 1;
        continue;
      }

      mkdirSync(dirname(asset.localPath), { recursive: true });
      writeFileSync(asset.localPath, buffer);
      downloadedCount += 1;
      console.log(
        `  Saved: ${asset.foulbornRelativePath} (${buffer.length} bytes)`,
      );
    } catch (error) {
      console.warn(`  Error downloading ${asset.name}: ${error.message}`);
      failedCount += 1;
    }
  }

  return { downloadedCount, failedCount, manifestPatch, skippedCount };
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function isPojo(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
