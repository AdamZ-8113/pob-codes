import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedDir = join(repoRoot, "data", "generated");
const publicDir = join(repoRoot, "apps", "web", "public");
const tmpDir = join(repoRoot, "tmp");
const reportPath = join(tmpDir, "unique-art-coverage-report.json");
const repoeDataBaseUrl = "https://repoe-fork.github.io";

mkdirSync(tmpDir, { recursive: true });

const itemManifest = readJson(join(generatedDir, "item-icon-manifest.json"));
const sourceMeta = readJson(join(generatedDir, "source-meta.json"));
const uniqueItems = await fetchJson(`${repoeDataBaseUrl}/uniques.min.json`);

const uniqueEntries = collectUniqueEntries(uniqueItems);
const normalizedManifestNameMap = buildNormalizedNameMap(Object.keys(itemManifest.byUniqueName ?? {}));

const results = uniqueEntries.map((entry) => {
  const directPath = itemManifest.byUniqueName?.[entry.name];
  const normalizedAliasName = directPath ? undefined : normalizedManifestNameMap.get(normalizeLookupKey(entry.name));
  const resolvedPath = directPath ?? (normalizedAliasName ? itemManifest.byUniqueName?.[normalizedAliasName] : undefined);
  const fallbackPath = itemManifest.byType?.[entry.itemClass];
  const expectedPathFromDds = buildExpectedPublicPath(entry.ddsFile);
  const resolvedFileExists = typeof resolvedPath === "string" && existsSync(join(publicDir, trimLeadingSlash(resolvedPath)));
  const expectedFileExists =
    typeof expectedPathFromDds === "string" && existsSync(join(publicDir, trimLeadingSlash(expectedPathFromDds)));

  let status = "ok";

  if (!resolvedPath) {
    status = "missing-manifest-entry";
  } else if (resolvedPath === fallbackPath) {
    status = "fallback-slot-icon";
  } else if (!resolvedFileExists) {
    status = "missing-asset-file";
  } else if (expectedPathFromDds && resolvedPath !== expectedPathFromDds) {
    status = "unexpected-art-path";
  } else if (normalizedAliasName) {
    status = "ok-via-normalized-alias";
  }

  return {
    ddsFile: entry.ddsFile,
    expectedPathFromDds,
    expectedFileExists,
    fallbackPath,
    itemClass: entry.itemClass,
    name: entry.name,
    normalizedAliasName,
    resolvedFileExists,
    resolvedPath,
    status,
  };
});

const summary = summarize(results);
const report = {
  generatedAt: new Date().toISOString(),
  sourceMeta,
  summary,
  problems: results.filter((entry) => entry.status !== "ok"),
};

writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Unique art coverage report written: ${relativeToRepo(reportPath)}`);
console.log(`Upstream unique names checked: ${summary.total}`);
console.log(`Resolved unique art entries: ${summary.ok}`);
console.log(`Missing manifest entries: ${summary["missing-manifest-entry"]}`);
console.log(`Fallback slot icon entries: ${summary["fallback-slot-icon"]}`);
console.log(`Missing asset files: ${summary["missing-asset-file"]}`);
console.log(`Unexpected art path mismatches: ${summary["unexpected-art-path"]}`);
console.log(`Normalized alias recoveries: ${summary["ok-via-normalized-alias"]}`);

if (report.problems.length > 0) {
  console.error("Unique art coverage issues found. See the JSON report for full details.");
  process.exit(1);
}

console.log("Unique art coverage passed.");

function collectUniqueEntries(uniqueItems) {
  const seenNames = new Set();
  const entries = [];
  const uniqueValues = Object.values(uniqueItems).sort(
    (left, right) => Number(Boolean(left?.is_alternate_art)) - Number(Boolean(right?.is_alternate_art)),
  );

  for (const entry of uniqueValues) {
    if (!isPojo(entry) || typeof entry.name !== "string" || entry.name.length === 0) {
      continue;
    }

    if (seenNames.has(entry.name)) {
      continue;
    }
    seenNames.add(entry.name);

    entries.push({
      ddsFile: typeof entry.visual_identity?.dds_file === "string" ? entry.visual_identity.dds_file : undefined,
      itemClass: typeof entry.item_class === "string" ? entry.item_class : "",
      name: entry.name,
    });
  }

  return entries;
}

function summarize(results) {
  const summary = {
    total: results.length,
    ok: 0,
    "fallback-slot-icon": 0,
    "missing-asset-file": 0,
    "missing-manifest-entry": 0,
    "ok-via-normalized-alias": 0,
    "unexpected-art-path": 0,
  };

  for (const entry of results) {
    summary[entry.status] += 1;
  }

  return summary;
}

function buildExpectedPublicPath(ddsFile) {
  if (typeof ddsFile !== "string" || !ddsFile.startsWith("Art/2DItems/")) {
    return undefined;
  }

  const relativePath = ddsFile.replace(/^Art\/2DItems\//, "").replace(/\\/g, "/").replace(/\.dds$/i, ".png");
  return `/assets/items/art/${relativePath}`;
}

function buildNormalizedNameMap(names) {
  const normalizedNameMap = new Map();
  const ambiguousKeys = new Set();

  for (const name of names) {
    const normalizedName = normalizeLookupKey(name);
    if (!normalizedName || ambiguousKeys.has(normalizedName)) {
      continue;
    }

    if (normalizedNameMap.has(normalizedName) && normalizedNameMap.get(normalizedName) !== name) {
      normalizedNameMap.delete(normalizedName);
      ambiguousKeys.add(normalizedName);
      continue;
    }

    normalizedNameMap.set(normalizedName, name);
  }

  return normalizedNameMap;
}

function normalizeLookupKey(value) {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  const normalizedValue = value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/['’]s\b/giu, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toLowerCase();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function relativeToRepo(path) {
  return path.replace(`${repoRoot}\\`, "").replace(/\\/g, "/");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function trimLeadingSlash(path) {
  return path.replace(/^\/+/, "");
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON: ${url} (${response.status})`);
  }

  return response.json();
}

function isPojo(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
