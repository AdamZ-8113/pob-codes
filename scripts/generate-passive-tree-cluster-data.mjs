import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const treeFiles = [
  { key: "default", fileName: "default.json" },
  { key: "alternate", fileName: "alternate.json" },
  { key: "ruthless", fileName: "ruthless.json" },
  { key: "ruthlessAlternate", fileName: "ruthless-alternate.json" },
];

const localPobMirrorDir = join(repoRoot, "local-pob-mirror");
const clusterLuaPath = join(localPobMirrorDir, "src", "Data", "ClusterJewels.lua");
const skilltreeDir = join(repoRoot, "data", "generated", "skilltree");
const outputPath = join(repoRoot, "apps", "web", "lib", "generated", "passive-tree-cluster-data.ts");

const clusterLua = readFileSync(clusterLuaPath, "utf8");
const templates = parseClusterTemplates(clusterLua);
const notableSortOrder = parseNotableSortOrder(clusterLua);
const variants = {};
const defaultTree = JSON.parse(readFileSync(join(skilltreeDir, "default.json"), "utf8"));
const baseNodesByName = buildBaseNodesByName(defaultTree, notableSortOrder);

for (const treeFile of treeFiles) {
  const tree = JSON.parse(readFileSync(join(skilltreeDir, treeFile.fileName), "utf8"));
  variants[treeFile.key] = {
    nodesById: buildClusterNodesById(tree),
  };
}

writeFileSync(
  outputPath,
  [
    "export const GENERATED_PASSIVE_TREE_CLUSTER_DATA = ",
    `${JSON.stringify(
      {
        baseNodesByName,
        notableSortOrder,
        templates,
        variants,
      },
      null,
      2,
    )} as const;`,
    "",
  ].join("\n"),
  "utf8",
);

function parseClusterTemplates(luaSource) {
  const result = {};
  for (const baseName of ["Small Cluster Jewel", "Medium Cluster Jewel", "Large Cluster Jewel"]) {
    const blockMatch = luaSource.match(
      new RegExp(
        String.raw`\["${escapeRegExp(baseName)}"\]\s*=\s*\{([\s\S]*?)\n\t\t\tskills\s*=\s*\{`,
        "m",
      ),
    );

    if (!blockMatch) {
      throw new Error(`Could not find cluster jewel block for ${baseName}.`);
    }

    const block = blockMatch[1];
    result[baseName] = {
      maxNodes: parseLuaNumber(block, "maxNodes"),
      minNodes: parseLuaNumber(block, "minNodes"),
      notableIndices: parseLuaNumberArray(block, "notableIndicies"),
      size: parseLuaString(block, "size"),
      sizeIndex: parseLuaNumber(block, "sizeIndex"),
      smallIndices: parseLuaNumberArray(block, "smallIndicies"),
      socketIndices: parseLuaNumberArray(block, "socketIndicies"),
      totalIndices: parseLuaNumber(block, "totalIndicies"),
    };
  }

  return result;
}

function parseNotableSortOrder(luaSource) {
  const match = luaSource.match(/notableSortOrder\s*=\s*\{([\s\S]*?)\n\t\},/m);
  if (!match) {
    throw new Error("Could not find cluster jewel notable sort order.");
  }

  const result = {};
  for (const entry of match[1].matchAll(/\["([^"]+)"\]\s*=\s*(\d+)/g)) {
    result[entry[1]] = Number(entry[2]);
  }
  return result;
}

function buildBaseNodesByName(tree, notableSortOrder) {
  const result = {};
  const nodeEntries = Object.values(tree.nodes ?? {});

  for (const rawNode of nodeEntries) {
    if (!rawNode || typeof rawNode !== "object" || typeof rawNode.name !== "string") {
      continue;
    }

    if (notableSortOrder[rawNode.name] === undefined && rawNode.isKeystone !== true) {
      continue;
    }

    result[rawNode.name] = {
      flavourText: normalizeTextArray(rawNode.flavourText),
      icon: typeof rawNode.icon === "string" ? rawNode.icon : undefined,
      isKeystone: rawNode.isKeystone === true,
      isNotable: rawNode.isNotable === true,
      reminderText: normalizeTextArray(rawNode.reminderText),
      stats: normalizeTextArray(rawNode.stats),
    };
  }

  return result;
}

function buildClusterNodesById(tree) {
  const result = {};
  for (const [rawNodeId, rawNode] of Object.entries(tree.nodes ?? {})) {
    if (!rawNode || typeof rawNode !== "object") {
      continue;
    }

    if (rawNode.isProxy !== true && !rawNode.expansionJewel) {
      continue;
    }

    const nodeId = Number(rawNodeId);
    if (!Number.isFinite(nodeId)) {
      continue;
    }

    const groupId = Number(rawNode.group);
    if (!Number.isFinite(groupId)) {
      continue;
    }

    const entry = {
      expansionJewel: normalizeExpansionJewel(rawNode.expansionJewel),
      groupId,
      in: normalizeIdArray(rawNode.in),
      isProxy: rawNode.isProxy === true,
      name: typeof rawNode.name === "string" ? rawNode.name : `Node ${nodeId}`,
      orbit: Number.isFinite(Number(rawNode.orbit)) ? Number(rawNode.orbit) : 0,
      orbitIndex: Number.isFinite(Number(rawNode.orbitIndex)) ? Number(rawNode.orbitIndex) : 0,
      out: normalizeIdArray(rawNode.out),
    };

    result[nodeId] = entry;
  }

  return result;
}

function normalizeExpansionJewel(expansionJewel) {
  if (!expansionJewel || typeof expansionJewel !== "object") {
    return undefined;
  }

  const size = Number(expansionJewel.size);
  const index = Number(expansionJewel.index);
  const proxy = Number(expansionJewel.proxy);
  if (!Number.isFinite(size) || !Number.isFinite(index) || !Number.isFinite(proxy)) {
    return undefined;
  }

  const parent = Number(expansionJewel.parent);
  return {
    index,
    parent: Number.isFinite(parent) ? parent : undefined,
    proxy,
    size,
  };
}

function normalizeTextArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => String(entry));
}

function normalizeIdArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));
}

function parseLuaNumber(source, key) {
  const match = source.match(new RegExp(String.raw`\b${escapeRegExp(key)}\s*=\s*(\d+)`));
  if (!match) {
    throw new Error(`Could not parse ${key}.`);
  }

  return Number(match[1]);
}

function parseLuaString(source, key) {
  const match = source.match(new RegExp(String.raw`\b${escapeRegExp(key)}\s*=\s*"([^"]+)"`));
  if (!match) {
    throw new Error(`Could not parse ${key}.`);
  }

  return match[1];
}

function parseLuaNumberArray(source, key) {
  const match = source.match(new RegExp(String.raw`\b${escapeRegExp(key)}\s*=\s*\{([^}]*)\}`));
  if (!match) {
    throw new Error(`Could not parse ${key}.`);
  }

  return match[1]
    .split(",")
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isFinite(entry));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
