import fs from "node:fs";
import path from "node:path";
import { inflateRawSync, inflateSync } from "node:zlib";

import { decodeBuildCode } from "@pobcodes/pob-codec";
import { XMLParser } from "fast-xml-parser";

import { resolveBuildInput } from "../../../worker/src/import-resolver";

const repoRoot = path.resolve(process.cwd(), "..", "..");
const pobRoot = path.join(repoRoot, "local-pob-mirror");
const pobSrcRoot = path.join(pobRoot, "src");
const pobRuntimeLuaRoot = path.join(pobRoot, "runtime", "lua");
const pobManifestPath = path.join(pobRoot, "manifest.xml");
const dataRoot = path.join(repoRoot, "data");
const supportedTreeVersions = new Set(["3_27", "3_28"]);
const latestSupportedTreeVersion = "3_28";
const treeVariantSuffixes = ["", "_alternate", "_ruthless", "_ruthless_alternate"];
const timelessJewelDir = path.join(pobRoot, "src", "Data", "TimelessJewelData");
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
const timelessJewelBinCache = new Map<string, Buffer>();
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  trimValues: false,
});

const poeRealmList = [
  { label: "PC", id: "PC", realmCode: "pc", hostName: "https://www.pathofexile.com/", profileURL: "account/view-profile/" },
  { label: "Xbox", id: "XBOX", realmCode: "xbox", hostName: "https://www.pathofexile.com/", profileURL: "account/view-profile/" },
  { label: "PS4", id: "SONY", realmCode: "sony", hostName: "https://www.pathofexile.com/", profileURL: "account/view-profile/" },
] as const;

export interface BrowserPobRequirements {
  treeVersion: string;
  includeTimeless: boolean;
}

interface TimelessJewelSource {
  baseName: string;
  zip: string | null;
  parts: Array<{ fileName: string; partNumber: number }>;
}

function toPosix(filePath: string) {
  return filePath.replace(/\\/g, "/");
}

function walk(dir: string, out: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}

function inflateMaybe(buffer: Buffer) {
  try {
    return inflateSync(buffer);
  } catch {
    return inflateRawSync(buffer);
  }
}

function getTreeDirsForVersion(treeVersion: string) {
  return treeVariantSuffixes.map((suffix) => `${treeVersion}${suffix}`);
}

function getSampleBuilds() {
  return fs
    .readdirSync(dataRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".txt"))
    .map((entry) => {
      const stats = fs.statSync(path.join(dataRoot, entry.name));
      return {
        id: entry.name,
        label: entry.name.replace(/\.txt$/i, ""),
        size: stats.size,
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

function getTimelessJewelSources(): TimelessJewelSource[] {
  const grouped = new Map<string, TimelessJewelSource>();

  for (const entry of fs.readdirSync(timelessJewelDir, { withFileTypes: true })) {
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

  return Array.from(grouped.values()).sort((left, right) => left.baseName.localeCompare(right.baseName));
}

function getTimelessJewelBin(baseName: string) {
  if (timelessJewelBinCache.has(baseName)) {
    return timelessJewelBinCache.get(baseName);
  }

  const sources = getTimelessJewelSources().find((entry) => entry.baseName === baseName);
  if (!sources) {
    return undefined;
  }

  let compressedBuffer: Buffer | undefined;
  if (sources.zip) {
    compressedBuffer = fs.readFileSync(path.join(timelessJewelDir, sources.zip));
  } else if (sources.parts.length > 0) {
    const buffers = sources.parts.map((part) => fs.readFileSync(path.join(timelessJewelDir, part.fileName)));
    compressedBuffer = Buffer.concat(buffers);
  }

  if (!compressedBuffer) {
    return undefined;
  }

  const inflated = inflateMaybe(compressedBuffer);
  timelessJewelBinCache.set(baseName, inflated);
  return inflated;
}

export function buildBrowserPobCatalog() {
  return {
    generatedAt: new Date().toISOString(),
    repoRoot: toPosix(repoRoot),
    sampleBuilds: getSampleBuilds(),
    supportedTreeVersions: Array.from(supportedTreeVersions).sort(),
    poeRealms: poeRealmList.map((realm) => ({
      label: realm.label,
      id: realm.id,
      realmCode: realm.realmCode,
    })),
    notes: {
      mode: "catalog",
      strategy: "decode the build first, then request only the needed passive tree version and optional timeless jewel data",
      treeVariantSuffixes,
    },
  };
}

export function buildBrowserPobMountManifest({ treeVersion, includeTimeless = false }: BrowserPobRequirements) {
  const resolvedTreeVersion = supportedTreeVersions.has(treeVersion) ? treeVersion : latestSupportedTreeVersion;
  const includedTreeDirs = new Set([
    ...getTreeDirsForVersion(latestSupportedTreeVersion),
    ...getTreeDirsForVersion(resolvedTreeVersion),
  ]);
  const mountFiles: Array<{
    kind: string;
    sourcePath: string;
    mountPath: string;
    size: number;
    binary: boolean;
  }> = [];
  const addedMountPaths = new Set<string>();

  function addPobLuaFile(fullPath: string) {
    if (!fullPath.endsWith(".lua") || !fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
      return;
    }

    const relativeToPob = toPosix(path.relative(pobRoot, fullPath));
    const mountPath = `/pob/${relativeToPob}`;
    if (addedMountPaths.has(mountPath)) {
      return;
    }

    const stats = fs.statSync(fullPath);
    mountFiles.push({
      kind: "pob",
      sourcePath: relativeToPob,
      mountPath,
      size: stats.size,
      binary: false,
    });
    addedMountPaths.add(mountPath);
  }

  for (const entry of nonTreePobSourceEntries) {
    const fullPath = path.join(pobSrcRoot, entry);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      for (const sourceFile of walk(fullPath)) {
        addPobLuaFile(sourceFile);
      }
    } else if (stats.isFile()) {
      addPobLuaFile(fullPath);
    }
  }

  for (const treeDir of includedTreeDirs) {
    const fullPath = path.join(pobSrcRoot, "TreeData", treeDir);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    for (const sourceFile of walk(fullPath)) {
      addPobLuaFile(sourceFile);
    }
  }

  for (const sourcePath of requiredTreeAssetFiles) {
    addPobLuaFile(path.join(pobSrcRoot, sourcePath));
  }

  const runtimeFiles = walk(pobRuntimeLuaRoot);
  for (const fullPath of runtimeFiles) {
    const relativeToRuntime = toPosix(path.relative(pobRuntimeLuaRoot, fullPath));
    if (!relativeToRuntime.endsWith(".lua")) {
      continue;
    }

    const stats = fs.statSync(fullPath);
    mountFiles.push({
      kind: "runtime",
      sourcePath: relativeToRuntime,
      mountPath: `/pob/runtime/lua/${relativeToRuntime}`,
      size: stats.size,
      binary: false,
    });
  }

  const manifestStats = fs.statSync(pobManifestPath);
  mountFiles.push({
    kind: "root",
    sourcePath: "manifest.xml",
    mountPath: "/pob/manifest.xml",
    size: manifestStats.size,
    binary: false,
  });

  if (includeTimeless) {
    for (const entry of getTimelessJewelSources()) {
      const buffer = getTimelessJewelBin(entry.baseName);
      if (!buffer) {
        continue;
      }

      mountFiles.push({
        kind: "generated-timeless-bin",
        sourcePath: `${entry.baseName}.bin`,
        mountPath: `/pob/src/Data/TimelessJewelData/${entry.baseName}.bin`,
        size: buffer.length,
        binary: true,
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
    repoRoot: toPosix(repoRoot),
    mountFiles,
    mountFileCount: mountFiles.length,
    mountBytes: mountFiles.reduce((sum, file) => sum + file.size, 0),
    sampleBuilds: getSampleBuilds(),
    notes: {
      mode: "targeted-mount-manifest",
      requestedTreeVersion: resolvedTreeVersion,
      startupTreeVersion: latestSupportedTreeVersion,
      includedTreeDirs: Array.from(includedTreeDirs),
      includesTimelessJewelData: includeTimeless,
      treeAssetSource: ["src/TreeData/3_19/Assets.lua", "src/TreeData/legion/tree-legion.lua"],
      excluded,
    },
  };
}

export function resolveBrowserPobFile(kind: string, sourcePath: string) {
  const normalized = sourcePath.replace(/\\/g, "/").replace(/^\/+/, "");

  if (kind === "root") {
    return normalized === "manifest.xml" && fs.existsSync(pobManifestPath) ? pobManifestPath : undefined;
  }

  const roots: Record<string, string> = {
    pob: pobSrcRoot,
    runtime: pobRuntimeLuaRoot,
    data: dataRoot,
  };

  const rootDir = roots[kind];
  if (!rootDir) {
    return undefined;
  }

  const normalizedWithinRoot = kind === "pob" ? normalized.replace(/^src\//, "") : normalized;
  const fullPath = path.resolve(rootDir, normalizedWithinRoot);
  const relative = path.relative(rootDir, fullPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return undefined;
  }

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return undefined;
  }

  return fullPath;
}

export function readBrowserPobGeneratedTimelessFile(sourcePath: string) {
  const baseName = sourcePath.replace(/\.bin$/i, "");
  return getTimelessJewelBin(baseName);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  return value == null ? [] : [value];
}

function toStr(value: unknown) {
  if (value == null) {
    return undefined;
  }
  return String(value);
}

function toNum(value: unknown) {
  if (value == null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toBool(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }
  return String(value).toLowerCase() === "true";
}

function parseConfigEntries(nodes: Array<Record<string, unknown>>) {
  const out: Record<string, string | number | boolean> = {};

  for (const input of nodes) {
    const value = asRecord(input);
    const name = toStr(value.name);
    if (!name) {
      continue;
    }

    if (value.number != null && Number.isFinite(Number(value.number))) {
      out[name] = Number(value.number);
    } else if (value.boolean != null) {
      out[name] = toBool(value.boolean);
    } else if (value.string != null) {
      out[name] = String(value.string);
    }
  }

  return out;
}

export function parseConfigPresetFromXml(xml: string) {
  const parsed = xmlParser.parse(xml);
  const root = asRecord(asRecord(parsed).PathOfBuilding);
  if (!("PathOfBuilding" in asRecord(parsed))) {
    throw new Error("Only Path of Exile 1 Path of Building exports are supported");
  }

  const buildNode = asRecord(root.Build);
  const configNode = asRecord(root.Config);
  const activeConfigSetId = toNum(configNode.activeConfigSet) ?? 1;
  const configSetNodes = asArray(configNode.ConfigSet).map((entry) => asRecord(entry));
  const topLevelInputs = parseConfigEntries(asArray(configNode.Input).map((entry) => asRecord(entry)));
  const topLevelPlaceholders = parseConfigEntries(asArray(configNode.Placeholder).map((entry) => asRecord(entry)));

  if (configSetNodes.length > 0) {
    let configSets = configSetNodes.map((configSetNode, index) => {
      const id = toNum(configSetNode.id) ?? index + 1;
      return {
        id,
        title: toStr(configSetNode.title),
        inputs: parseConfigEntries(asArray(configSetNode.Input).map((entry) => asRecord(entry))),
        placeholders: parseConfigEntries(asArray(configSetNode.Placeholder).map((entry) => asRecord(entry))),
        active: id === activeConfigSetId,
      };
    });

    if (!configSets.some((configSet) => configSet.active)) {
      configSets[0] = { ...configSets[0], active: true };
    }

    const activeConfigIndex = configSets.findIndex((configSet) => configSet.active);
    if (activeConfigIndex >= 0 && Object.keys(topLevelInputs).length > 0) {
      configSets = configSets.map((configSet, index) =>
        index === activeConfigIndex
          ? {
              ...configSet,
              inputs: { ...configSet.inputs, ...topLevelInputs },
            }
          : configSet,
      );
    }

    if (activeConfigIndex >= 0 && Object.keys(topLevelPlaceholders).length > 0) {
      configSets = configSets.map((configSet, index) =>
        index === activeConfigIndex
          ? {
              ...configSet,
              placeholders: { ...configSet.placeholders, ...topLevelPlaceholders },
            }
          : configSet,
      );
    }

    const activeConfig = configSets.find((configSet) => configSet.active) ?? configSets[0];
    return {
      build: {
        className: toStr(buildNode.className),
        ascendClassName: toStr(buildNode.ascendClassName),
        level: toNum(buildNode.level),
        targetVersion: toStr(buildNode.targetVersion),
      },
      activeConfigSetId: activeConfig?.id,
      configSets,
      inputs: { ...(activeConfig?.inputs ?? {}) },
      placeholders: { ...(activeConfig?.placeholders ?? {}) },
    };
  }

  return {
    build: {
      className: toStr(buildNode.className),
      ascendClassName: toStr(buildNode.ascendClassName),
      level: toNum(buildNode.level),
      targetVersion: toStr(buildNode.targetVersion),
    },
    activeConfigSetId: 1,
    configSets: [
      {
        id: 1,
        title: "Default",
        inputs: { ...topLevelInputs },
        placeholders: { ...topLevelPlaceholders },
        active: true,
      },
    ],
    inputs: { ...topLevelInputs },
    placeholders: { ...topLevelPlaceholders },
  };
}

export async function resolveConfigPreset(source: string) {
  const trimmed = source.trim();
  if (!trimmed) {
    throw new Error("Build link or code is required.");
  }

  const resolved = await resolveBuildInput(trimmed);
  const xml = decodeBuildCode(resolved);
  const preset = parseConfigPresetFromXml(xml);

  return {
    source: trimmed,
    resolvedUrl: trimmed === resolved ? undefined : source,
    explicitInputCount: Object.keys(preset.inputs).length,
    activeConfigSetId: preset.activeConfigSetId,
    inputs: preset.inputs,
    placeholders: preset.placeholders,
    configSets: preset.configSets,
    build: preset.build,
  };
}

function getPoeRealm(realmId: string | undefined) {
  const normalized = String(realmId || "PC").toUpperCase();
  return poeRealmList.find((realm) => realm.id === normalized) ?? poeRealmList[0];
}

function normalizePoeAccountName(rawAccountName: string, realmCode: string) {
  if (!rawAccountName.trim()) {
    return "";
  }

  let accountName: string;
  if (realmCode === "pc") {
    accountName = rawAccountName.replace(/\s+/g, "");
  } else {
    accountName = rawAccountName.trim().replace(/\s/g, "+");
  }

  return accountName.replace(/(.*)[#-]/, "$1#");
}

function encodePoeAccountName(accountName: string) {
  return accountName.replace(/#/g, "%23");
}

function buildPoeHeaders() {
  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Referer: "https://www.pathofexile.com/",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  };
}

async function fetchPoeText(url: string) {
  const response = await fetch(url, {
    headers: buildPoeHeaders(),
    redirect: "follow",
  });
  const body = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

function isCloudflareBlock(body: string) {
  return /cloudflare/i.test(body) && /you have been blocked|attention required/i.test(body);
}

function extractRealAccountName(profileBody: string) {
  const match = profileBody.match(/\/view-profile\/([^/]+)\/characters/i);
  return match?.[1] ?? null;
}

async function resolveRealAccountName(
  realm: (typeof poeRealmList)[number],
  accountName: string,
) {
  const response = await fetchPoeText(`${realm.hostName}${realm.profileURL}${encodePoeAccountName(accountName)}`);
  if (!response.ok) {
    return accountName;
  }

  const realAccountName = extractRealAccountName(response.body);
  return realAccountName ? realAccountName.replace(/(.*)[#-]/, "$1#") : accountName;
}

export async function loadPoeCharacters(input: { realm?: string; accountName: string }) {
  const realm = getPoeRealm(input.realm);
  const accountName = normalizePoeAccountName(String(input.accountName ?? ""), realm.realmCode);

  if (!accountName) {
    throw new Error("Account name is required.");
  }

  const charactersResponse = await fetchPoeText(
    `${realm.hostName}character-window/get-characters?accountName=${encodePoeAccountName(accountName)}&realm=${realm.realmCode}`,
  );

  if (isCloudflareBlock(charactersResponse.body)) {
    throw new Error("Path of Exile blocked the profile lookup request.");
  }
  if (charactersResponse.status === 401) {
    throw new Error("Sign-in is required.");
  }
  if (charactersResponse.status === 403) {
    throw new Error("Account profile is private. Make the profile public and try again.");
  }
  if (charactersResponse.status === 404) {
    throw new Error("Account name is incorrect.");
  }
  if (!charactersResponse.ok) {
    throw new Error(`Error retrieving character list (${charactersResponse.status}).`);
  }

  let characters: unknown;
  try {
    characters = JSON.parse(charactersResponse.body);
  } catch {
    throw new Error("Failed to parse character list.");
  }

  if (!Array.isArray(characters) || characters.length === 0) {
    throw new Error("The account has no characters to import.");
  }

  const realAccountName = await resolveRealAccountName(realm, accountName);
  const sortedCharacters = [...characters].sort((left, right) => {
    const leftName = String(asRecord(left).name ?? "").toLowerCase();
    const rightName = String(asRecord(right).name ?? "").toLowerCase();
    return leftName.localeCompare(rightName);
  });

  return {
    realm: {
      id: realm.id,
      label: realm.label,
      realmCode: realm.realmCode,
    },
    accountName: realAccountName,
    characters: sortedCharacters,
  };
}

export async function loadPoeCharacterImport(input: {
  realm?: string;
  accountName: string;
  characterName: string;
}) {
  const realm = getPoeRealm(input.realm);
  const accountName = normalizePoeAccountName(String(input.accountName ?? ""), realm.realmCode);
  const characterName = String(input.characterName ?? "").trim();

  if (!accountName) {
    throw new Error("Account name is required.");
  }
  if (!characterName) {
    throw new Error("Character name is required.");
  }

  const encodedAccountName = encodePoeAccountName(accountName);
  const encodedCharacterName = encodeURIComponent(characterName);

  const [itemsResponse, passiveResponse] = await Promise.all([
    fetchPoeText(
      `${realm.hostName}character-window/get-items?accountName=${encodedAccountName}&character=${encodedCharacterName}&realm=${realm.realmCode}`,
    ),
    fetchPoeText(
      `${realm.hostName}character-window/get-passive-skills?accountName=${encodedAccountName}&character=${encodedCharacterName}&realm=${realm.realmCode}`,
    ),
  ]);

  if (isCloudflareBlock(itemsResponse.body) || isCloudflareBlock(passiveResponse.body)) {
    throw new Error("Path of Exile blocked the character import request.");
  }
  if (!itemsResponse.ok || itemsResponse.body === "false") {
    throw new Error(`Failed to retrieve items for "${characterName}".`);
  }
  if (!passiveResponse.ok || passiveResponse.body === "false") {
    throw new Error(`Failed to retrieve passive skills for "${characterName}".`);
  }

  return {
    realm: {
      id: realm.id,
      label: realm.label,
      realmCode: realm.realmCode,
    },
    accountName,
    characterName,
    itemsJson: itemsResponse.body,
    passiveSkillsJson: passiveResponse.body,
  };
}
