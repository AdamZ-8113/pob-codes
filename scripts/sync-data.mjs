import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = mkdtempSync(join(tmpdir(), "pob-codes-sync-"));

const repos = {
  skilltreeExport: {
    url: "https://github.com/grindinggear/skilltree-export",
    dirName: "skilltree-export",
  },
  repoe: {
    url: "https://github.com/repoe-fork/repoe",
    dirName: "repoe",
  },
  pobData: {
    url: "https://github.com/repoe-fork/pob-data",
    dirName: "pob-data",
  },
  pathOfBuilding: {
    url: "https://github.com/PathOfBuildingCommunity/PathOfBuilding",
    dirName: "pathofbuilding",
  },
};

const generatedDataDir = join(repoRoot, "data", "generated");
const generatedSkilltreeDir = join(generatedDataDir, "skilltree");
const webPublicAssetsDir = join(repoRoot, "apps", "web", "public", "assets");
const webGeneratedDir = join(repoRoot, "apps", "web", "lib", "generated");
const itemRootAssetsDir = join(webPublicAssetsDir, "items");
const itemSlotAssetsDir = join(itemRootAssetsDir, "slots");
const itemArtAssetsDir = join(itemRootAssetsDir, "art");
const itemFlaskAssetsDir = join(itemArtAssetsDir, "Flasks");
const gemAssetsDir = join(webPublicAssetsDir, "gems");
const influenceAssetsDir = join(webPublicAssetsDir, "ui", "influences");
const passiveTreeAssetsDir = join(webPublicAssetsDir, "passive-tree", "default");
const repoeDataBaseUrl = "https://repoe-fork.github.io";
const poeCdnImageBaseUrl = "https://web.poecdn.com/image";
const itemArtDownloadConcurrency = 16;
const pobDataBaseArtOverrides = {
  "Cord Belt": "Art/2DItems/Belts/SoulcordBelt.dds",
  "Energy Blade One Handed": "Art/2DItems/Weapons/OneHandWeapons/OneHandSwords/OneHandSwordStormBlade.dds",
  "Energy Blade Two Handed": "Art/2DItems/Weapons/TwoHandWeapons/TwoHandSwords/TwoHandSwordStormBlade.dds",
  "Kinetic Wand": "Art/2DItems/Weapons/OneHandWeapons/Wands/Wand3.dds",
};

const treeFiles = [
  { key: "default", sourceName: "data.json", outputName: "default.json" },
  { key: "alternate", sourceName: "alternate.json", outputName: "alternate.json" },
  { key: "ruthless", sourceName: "ruthless.json", outputName: "ruthless.json" },
  { key: "ruthlessAlternate", sourceName: "ruthless-alternate.json", outputName: "ruthless-alternate.json" },
];

const legacyTreeConstants = {
  orbitRadii: [0, 82, 162, 335, 493, 662, 846],
  skillsPerOrbit: [1, 6, 16, 16, 40, 72, 72],
};

const classArtByIndex = {
  0: "centerscion",
  1: "centermarauder",
  2: "centerranger",
  3: "centerwitch",
  4: "centerduelist",
  5: "centertemplar",
  6: "centershadow",
};

const slotIconMap = {
  amulet: "/assets/items/slots/icon-amulet.png",
  belt: "/assets/items/slots/icon-belt.png",
  bodyArmour: "/assets/items/slots/icon-body-armour.png",
  boots: "/assets/items/slots/icon-boots.png",
  bow: "/assets/items/slots/icon-bow.png",
  flask: "/assets/items/slots/icon-flask.svg",
  generic: "/assets/items/slots/icon-item-generic.svg",
  gloves: "/assets/items/slots/icon-gloves.png",
  helmet: "/assets/items/slots/icon-helmet.png",
  jewel: "/assets/items/slots/icon-jewel.svg",
  quiver: "/assets/items/slots/icon-quiver.png",
  ringLeft: "/assets/items/slots/icon-ring-left.png",
  ringRight: "/assets/items/slots/icon-ring-right.png",
  shield: "/assets/items/slots/icon-shield.png",
  shieldSwap: "/assets/items/slots/icon-shield-swap.png",
  weapon: "/assets/items/slots/icon-weapon.png",
  weapon2: "/assets/items/slots/icon-weapon-2.png",
  weapon2Swap: "/assets/items/slots/icon-weapon-2-swap.png",
  weaponSwap: "/assets/items/slots/icon-weapon-swap.png",
};

const slotPathsBySlot = {
  "Amulet": slotIconMap.amulet,
  "Belt": slotIconMap.belt,
  "Body Armour": slotIconMap.bodyArmour,
  "Boots": slotIconMap.boots,
  "Charm 1": slotIconMap.generic,
  "Charm 2": slotIconMap.generic,
  "Charm 3": slotIconMap.generic,
  "Flask 1": slotIconMap.flask,
  "Flask 2": slotIconMap.flask,
  "Flask 3": slotIconMap.flask,
  "Flask 4": slotIconMap.flask,
  "Flask 5": slotIconMap.flask,
  "Gloves": slotIconMap.gloves,
  "Helmet": slotIconMap.helmet,
  "Off Hand": slotIconMap.shield,
  "Off Hand 2": slotIconMap.shieldSwap,
  "Off Hand Swap": slotIconMap.shieldSwap,
  "Quiver": slotIconMap.quiver,
  "Ring 1": slotIconMap.ringLeft,
  "Ring 2": slotIconMap.ringRight,
  "Tincture 1": slotIconMap.flask,
  "Tincture 2": slotIconMap.flask,
  "Weapon 1": slotIconMap.weapon,
  "Weapon 1 Swap": slotIconMap.weaponSwap,
  "Weapon 2": slotIconMap.weapon2,
  "Weapon 2 Swap": slotIconMap.weapon2Swap,
};

const influenceIconMap = {
  "Crusader Item": "/assets/ui/influences/crusadericon.png",
  "Eater of Worlds Item": "/assets/ui/influences/eatericon.png",
  "Elder Item": "/assets/ui/influences/eldericon.png",
  "Hunter Item": "/assets/ui/influences/huntericon.png",
  "Redeemer Item": "/assets/ui/influences/redeemericon.png",
  "Searing Exarch Item": "/assets/ui/influences/exarchicon.png",
  "Shaper Item": "/assets/ui/influences/shapericon.png",
  "Synthesised Item": "/assets/ui/influences/synthesisicon.png",
  "Veiled Item": "/assets/ui/influences/veiledicon.png",
  "Warlord Item": "/assets/ui/influences/warlordicon.png",
  "Fractured Item": "/assets/ui/influences/fracturedicon.png",
};

await main();

async function main() {
  try {
    ensureEmptyDir(generatedSkilltreeDir);
    ensureEmptyDir(itemSlotAssetsDir);
    mkdirSync(itemArtAssetsDir, { recursive: true });
    ensureEmptyDir(gemAssetsDir);
    ensureEmptyDir(influenceAssetsDir);
    ensureEmptyDir(passiveTreeAssetsDir);
    mkdirSync(webGeneratedDir, { recursive: true });

    const clones = cloneAllRepos();

    copyTreeData(clones.skilltreeExport.dir);
    copyTreeAssets(clones.skilltreeExport.dir);
    writePassiveTreeSpriteManifest();
    copyPobUiAssets(clones.pathOfBuilding.dir);
    writePlaceholderAssets();

    const treeManifest = buildTreeManifest();
    const itemManifest = await buildItemManifest(clones.pobData.dir);
    normalizeFlaskArtAssets();
    const gemManifest = await buildGemManifest(clones.pobData.dir);

    const sourceMeta = {
      generatedAt: new Date().toISOString(),
      sources: {
        pathOfBuilding: cloneMetadata(clones.pathOfBuilding),
        pobData: cloneMetadata(clones.pobData),
        repoe: cloneMetadata(clones.repoe),
        skilltreeExport: cloneMetadata(clones.skilltreeExport),
      },
    };

    writeJson(join(generatedDataDir, "source-meta.json"), sourceMeta);
    writeJson(join(generatedDataDir, "tree-manifest.json"), treeManifest);
    writeJson(join(generatedDataDir, "item-icon-manifest.json"), itemManifest);
    writeJson(join(generatedDataDir, "gem-icon-manifest.json"), gemManifest);
    writeTreeManifestModule(treeManifest);
    writeAssetManifestModule({ gems: gemManifest, items: itemManifest, sources: sourceMeta.sources, tree: treeManifest });

    console.log("Synced data and assets.");
    console.log(`Tree variants: ${Object.keys(treeManifest.variants).length}`);
    console.log(`Item base icons: ${Object.keys(itemManifest.byBaseName).length}`);
    console.log(`Item unique icons: ${Object.keys(itemManifest.byUniqueName).length}`);
    console.log(`Gem icon entries: ${Object.keys(gemManifest.byId).length}`);
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
}

function cloneAllRepos() {
  return Object.fromEntries(
    Object.entries(repos).map(([key, value]) => {
      const dir = join(tempRoot, value.dirName);
      execFileSync("git", ["clone", "--depth", "1", value.url, dir], {
        cwd: tempRoot,
        stdio: "ignore",
      });
      const commit = execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim();

      return [key, { commit, dir, url: value.url }];
    }),
  );
}

function cloneMetadata(repo) {
  return {
    commit: repo.commit,
    url: repo.url,
  };
}

function copyTreeData(skilltreeDir) {
  for (const file of treeFiles) {
    cpSync(join(skilltreeDir, file.sourceName), join(generatedSkilltreeDir, file.outputName));
  }
}

function copyTreeAssets(skilltreeDir) {
  cpSync(join(skilltreeDir, "assets"), passiveTreeAssetsDir, { recursive: true });
}

function copyPobUiAssets(pathOfBuildingDir) {
  const assetsDir = join(pathOfBuildingDir, "src", "Assets");
  const uiAssetsDir = join(webPublicAssetsDir, "ui");
  const slotCopies = {
    "icon_amulet.png": "icon-amulet.png",
    "icon_belt.png": "icon-belt.png",
    "icon_body_armour.png": "icon-body-armour.png",
    "icon_boots.png": "icon-boots.png",
    "icon_bow.png": "icon-bow.png",
    "icon_gloves.png": "icon-gloves.png",
    "icon_helmet.png": "icon-helmet.png",
    "icon_quiver.png": "icon-quiver.png",
    "icon_ring_left.png": "icon-ring-left.png",
    "icon_ring_right.png": "icon-ring-right.png",
    "icon_shield.png": "icon-shield.png",
    "icon_shield_swap.png": "icon-shield-swap.png",
    "icon_weapon.png": "icon-weapon.png",
    "icon_weapon_2.png": "icon-weapon-2.png",
    "icon_weapon_2_swap.png": "icon-weapon-2-swap.png",
    "icon_weapon_swap.png": "icon-weapon-swap.png",
  };

  const influenceCopies = {
    "crusadericon.png": "crusadericon.png",
    "eatericon.png": "eatericon.png",
    "eldericon.png": "eldericon.png",
    "exarchicon.png": "exarchicon.png",
    "fracturedicon.png": "fracturedicon.png",
    "huntericon.png": "huntericon.png",
    "redeemericon.png": "redeemericon.png",
    "shapericon.png": "shapericon.png",
    "synthesisicon.png": "synthesisicon.png",
    "veiledicon.png": "veiledicon.png",
    "warlordicon.png": "warlordicon.png",
  };

  const tooltipCopies = {
    "itemsheaderfoilleft.png": "hdr-foil-left.png",
    "itemsheaderfoilmiddle.png": "hdr-foil-middle.png",
    "itemsheaderfoilright.png": "hdr-foil-right.png",
    "itemsseparatorfoil.png": "sep-foil.png",
  };

  for (const [source, output] of Object.entries(slotCopies)) {
    cpSync(join(assetsDir, source), join(itemSlotAssetsDir, output));
  }

  for (const [source, output] of Object.entries(influenceCopies)) {
    cpSync(join(assetsDir, source), join(influenceAssetsDir, output));
  }

  for (const [source, output] of Object.entries(tooltipCopies)) {
    cpSync(join(assetsDir, source), join(uiAssetsDir, output));
  }
}

function writePlaceholderAssets() {
  writeFileSync(
    join(itemSlotAssetsDir, "icon-item-generic.svg"),
    svgPlaceholder("Item", "#2a2f3a", "#d8bf8b"),
    "utf8",
  );
  writeFileSync(
    join(itemSlotAssetsDir, "icon-jewel.svg"),
    svgPlaceholder("Jewel", "#1f2233", "#7bc0ff"),
    "utf8",
  );
  writeFileSync(
    join(itemSlotAssetsDir, "icon-flask.svg"),
    svgPlaceholder("Flask", "#243326", "#8de29f"),
    "utf8",
  );
  writeFileSync(
    join(gemAssetsDir, "active-skill.svg"),
    svgPlaceholder("Skill", "#24314a", "#8cb8ff"),
    "utf8",
  );
  writeFileSync(
    join(gemAssetsDir, "support-skill.svg"),
    svgPlaceholder("Support", "#33263d", "#e7a8ff"),
    "utf8",
  );
}

function svgPlaceholder(label, background, foreground) {
  return [
    "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 96 96\">",
    `  <rect x=\"4\" y=\"4\" width=\"88\" height=\"88\" rx=\"20\" fill=\"${background}\" stroke=\"#101216\" stroke-width=\"4\" />`,
    `  <circle cx=\"48\" cy=\"36\" r=\"18\" fill=\"${foreground}\" opacity=\"0.92\" />`,
    `  <rect x=\"22\" y=\"60\" width=\"52\" height=\"10\" rx=\"5\" fill=\"${foreground}\" opacity=\"0.82\" />`,
    `  <text x=\"48\" y=\"86\" text-anchor=\"middle\" font-family=\"Segoe UI, Arial, sans-serif\" font-size=\"12\" fill=\"#f4f6f9\">${label}</text>`,
    "</svg>",
    "",
  ].join("\n");
}

function buildTreeManifest() {
  const variants = {};

  for (const file of treeFiles) {
    const localPath = join(generatedSkilltreeDir, file.outputName);
    const data = JSON.parse(readFileSync(localPath, "utf8"));
    const layoutFileName = `layout-${file.key}.json`;
    const layout = buildPassiveTreeLayout(data);

    writeCompactJson(join(passiveTreeAssetsDir, layoutFileName), layout);

    variants[file.key] = {
      bounds: layout.bounds,
      classCount: Array.isArray(data.classes) ? data.classes.length : 0,
      groupCount: data.groups ? Object.keys(data.groups).length : 0,
      layoutPath: `/assets/passive-tree/default/${layoutFileName}`,
      nodeIds: Object.keys(asObject(data.nodes))
        .map((nodeId) => Number(nodeId))
        .filter((nodeId) => Number.isFinite(nodeId))
        .sort((left, right) => left - right),
      nodeCount: data.nodes ? Object.keys(data.nodes).length : 0,
      positionedNodeCount: layout.nodes.length,
      publicAssetRoot: "/assets/passive-tree/default",
      sourceFile: file.outputName,
      treeName: data.tree ?? file.key,
      unpositionedNodeCount: layout.unpositionedNodeIds.length,
    };
  }

  return {
    passiveTreeAssetRoot: "/assets/passive-tree/default",
    spriteManifestPath: "/assets/passive-tree/default/sprite-manifest.json",
    variants,
  };
}

function writePassiveTreeSpriteManifest() {
  const defaultTree = JSON.parse(readFileSync(join(generatedSkilltreeDir, "default.json"), "utf8"));
  const spriteManifest = buildPassiveTreeSpriteManifest(defaultTree);
  writeCompactJson(join(passiveTreeAssetsDir, "sprite-manifest.json"), spriteManifest);
}

function buildPassiveTreeLayout(data) {
  const groups = asObject(data.groups);
  const constants = asObject(data.constants);
  const orbitRadii = normalizeNumberList(constants.orbitRadii, legacyTreeConstants.orbitRadii);
  const skillsPerOrbit = normalizeNumberList(constants.skillsPerOrbit, legacyTreeConstants.skillsPerOrbit);
  const orbitAnglesByOrbit = buildOrbitAnglesByOrbit(skillsPerOrbit);
  const nodes = [];
  const layoutGroups = [];
  const unpositionedNodeIds = [];

  for (const [rawGroupId, rawGroup] of Object.entries(groups)) {
    const groupId = Number(rawGroupId);
    if (!Number.isFinite(groupId)) {
      continue;
    }

    const group = asObject(rawGroup);
    const groupX = Number(group.x);
    const groupY = Number(group.y);
    if (!Number.isFinite(groupX) || !Number.isFinite(groupY) || group.isProxy === true) {
      continue;
    }

    const orbitFlags = new Set(normalizeNumberList(group.orbits, []));
    const background = getPassiveTreeGroupBackground(orbitFlags, typeof group.ascendancyName === "string");
    layoutGroups.push({
      backgroundSpriteKey: background?.key,
      backgroundSpriteMirrorY: background?.mirrorY ?? false,
      id: groupId,
      x: roundCoordinate(groupX),
      y: roundCoordinate(groupY),
    });
  }

  for (const [rawNodeId, rawNode] of Object.entries(asObject(data.nodes))) {
    const nodeId = Number(rawNodeId);
    if (!Number.isFinite(nodeId)) {
      continue;
    }

    const node = asObject(rawNode);
    const groupId = Number(node.group);
    const group = groups[String(groupId)] ?? groups[groupId];
    if (!group) {
      unpositionedNodeIds.push(nodeId);
      continue;
    }

    const groupX = Number(group.x);
    const groupY = Number(group.y);
    if (!Number.isFinite(groupX) || !Number.isFinite(groupY)) {
      unpositionedNodeIds.push(nodeId);
      continue;
    }

    const orbit = Number.isFinite(Number(node.orbit)) ? Number(node.orbit) : 0;
    const orbitIndex = Number.isFinite(Number(node.orbitIndex)) ? Number(node.orbitIndex) : 0;
    const orbitRadius = orbitRadii[orbit] ?? 0;
    const nodesInOrbit = Math.max(skillsPerOrbit[orbit] ?? 1, 1);
    const angle = orbitAnglesByOrbit[orbit]?.[orbitIndex] ?? (orbitIndex / nodesInOrbit) * Math.PI * 2;
    const classStartIndex = Number.isFinite(Number(node.classStartIndex)) ? Number(node.classStartIndex) : undefined;

    nodes.push({
      activeIcon: typeof node.activeIcon === "string" ? node.activeIcon : undefined,
      classStartIndex,
      flavourText: normalizeTextList(node.flavourText),
      groupId,
      groupCenterX: roundCoordinate(groupX),
      groupCenterY: roundCoordinate(groupY),
      id: nodeId,
      icon: typeof node.icon === "string" ? node.icon : undefined,
      inactiveIcon: typeof node.inactiveIcon === "string" ? node.inactiveIcon : undefined,
      isAscendancyStart: node.isAscendancyStart === true,
      isJewelSocket: node.isJewelSocket === true,
      isKeystone: node.isKeystone === true,
      isMastery: node.isMastery === true,
      isNotable: node.isNotable === true,
      masteryEffects: normalizeMasteryEffects(node.masteryEffects),
      name: typeof node.name === "string" ? node.name : `Node ${nodeId}`,
      orbit,
      orbitIndex,
      orbitRadius: roundCoordinate(orbitRadius),
      out: normalizeIdList(node.out),
      reminderText: normalizeTextList(node.reminderText),
      startArt: classStartIndex !== undefined ? classArtByIndex[classStartIndex] : undefined,
      stats: normalizeTextList(node.stats),
      x: roundCoordinate(groupX + Math.sin(angle) * orbitRadius),
      y: roundCoordinate(groupY - Math.cos(angle) * orbitRadius),
    });
  }

  layoutGroups.sort((left, right) => left.id - right.id);
  nodes.sort((left, right) => left.id - right.id);
  unpositionedNodeIds.sort((left, right) => left - right);

  return {
    bounds: {
      maxX: Number.isFinite(Number(data.max_x)) ? Number(data.max_x) : 0,
      maxY: Number.isFinite(Number(data.max_y)) ? Number(data.max_y) : 0,
      minX: Number.isFinite(Number(data.min_x)) ? Number(data.min_x) : 0,
      minY: Number.isFinite(Number(data.min_y)) ? Number(data.min_y) : 0,
    },
    groups: layoutGroups,
    nodes,
    unpositionedNodeIds,
  };
}

function buildPassiveTreeSpriteManifest(data) {
  const atlases = {};

  for (const spriteName of [
    "frame",
    "groupBackground",
    "normalActive",
    "normalInactive",
    "notableActive",
    "notableInactive",
    "keystoneActive",
    "keystoneInactive",
    "masteryInactive",
    "masteryConnected",
    "masteryActiveSelected",
    "startNode",
  ]) {
    const sprite = pickHighestZoomSprite(asObject(data.sprites)[spriteName]);
    if (!sprite) {
      continue;
    }

    atlases[spriteName] = {
      coords: asObject(sprite.coords),
      imagePath: toPassiveTreePublicAssetPath(sprite.filename),
      size: {
        height: Number(sprite.h) || 0,
        width: Number(sprite.w) || 0,
      },
    };
  }

  return {
    atlases,
  };
}

async function buildItemManifest(pobDataDir) {
  const byBaseName = {};
  const foulbornLowResolutionByUniqueName = {};
  const foulbornUpscaledByUniqueName = {};
  const byType = {};
  const byUniqueName = {};
  const pobDataBases = [];

  for (const gameVersion of ["poe1"]) {
    const basesDir = join(pobDataDir, "pob-data", gameVersion, "Bases");
    const baseFiles = readdirSync(basesDir).filter((file) => extname(file) === ".json");

    for (const file of baseFiles) {
      const data = JSON.parse(readFileSync(join(basesDir, file), "utf8"));
      for (const [baseName, baseData] of Object.entries(data)) {
        pobDataBases.push({
          name: baseName,
          type: baseData?.type ?? basename(file, ".json"),
        });

        if (baseData?.type) {
          byType[baseData.type] = slotIconForItemType(baseData.type);
        }
      }
    }
  }

  const [baseItems, uniqueItems] = await Promise.all([
    fetchJson(`${repoeDataBaseUrl}/base_items.min.json`),
    fetchJson(`${repoeDataBaseUrl}/uniques.min.json`),
  ]);

  const baseEntries = [];
  const seenUniqueNames = new Set();
  const uniqueEntries = [];
  const artByDdsFile = new Map();

  for (const entry of Object.values(baseItems)) {
    if (!isPojo(entry) || typeof entry.name !== "string" || entry.name.length === 0) {
      continue;
    }

    const ddsFile = entry.visual_identity?.dds_file;
    baseEntries.push({
      ddsFile: typeof ddsFile === "string" ? ddsFile : undefined,
      fallbackIcon: slotIconForItemType(entry.item_class),
      name: entry.name,
    });

    if (typeof ddsFile === "string" && ddsFile.startsWith("Art/2DItems/")) {
      artByDdsFile.set(ddsFile, buildItemArtDescriptor(ddsFile));
    }
  }

  const uniqueValues = Object.values(uniqueItems).sort(
    (left, right) => Number(Boolean(left?.is_alternate_art)) - Number(Boolean(right?.is_alternate_art)),
  );

  for (const entry of uniqueValues) {
    if (!isPojo(entry) || typeof entry.name !== "string" || entry.name.length === 0) {
      continue;
    }

    if (seenUniqueNames.has(entry.name)) {
      continue;
    }
    seenUniqueNames.add(entry.name);

    const ddsFile = entry.visual_identity?.dds_file;
    uniqueEntries.push({
      ddsFile: typeof ddsFile === "string" ? ddsFile : undefined,
      fallbackIcon: slotIconForItemType(entry.item_class),
      name: entry.name,
    });

    if (typeof ddsFile === "string" && ddsFile.startsWith("Art/2DItems/")) {
      artByDdsFile.set(ddsFile, buildItemArtDescriptor(ddsFile));
    }
  }

  for (const ddsFile of Object.values(pobDataBaseArtOverrides)) {
    artByDdsFile.set(ddsFile, buildItemArtDescriptor(ddsFile));
  }

  const downloadedArt = await downloadItemArtAssets([...artByDdsFile.values()]);

  for (const entry of baseEntries) {
    byBaseName[entry.name] = resolveItemArtPath(entry.ddsFile, downloadedArt) ?? entry.fallbackIcon;
  }

  for (const entry of uniqueEntries) {
    byUniqueName[entry.name] = resolveItemArtPath(entry.ddsFile, downloadedArt) ?? entry.fallbackIcon;
  }

  for (const entry of pobDataBases) {
    if (byBaseName[entry.name]) {
      continue;
    }

    const overrideDdsFile = pobDataBaseArtOverrides[entry.name];
    if (overrideDdsFile) {
      const overridePath = resolveItemArtPath(overrideDdsFile, downloadedArt);
      if (overridePath) {
        byBaseName[entry.name] = overridePath;
        continue;
      }
    }

    byBaseName[entry.name] = slotIconForItemType(entry.type);
  }

  // Merge Foulborn low-resolution originals if the manifest patch exists.
  // These are downloaded separately via scripts/download-foulborn-art.mjs
  // because they require signed CDN URLs from poe.ninja. The runtime icon
  // resolver prefers mirrored Foulborn/Upscaled art first and only falls back
  // to these LowResolution paths when an upscaled asset is unavailable.
  const foulbornManifestPath = join(generatedDataDir, "foulborn-art-manifest.json");
  if (existsSync(foulbornManifestPath)) {
    const foulbornEntries = JSON.parse(readFileSync(foulbornManifestPath, "utf8"));
    let merged = 0;
    for (const [name, publicPath] of Object.entries(foulbornEntries)) {
      if (typeof publicPath === "string" && publicPath.length > 0) {
        foulbornLowResolutionByUniqueName[name] = publicPath;
        byUniqueName[name] = publicPath;
        merged++;
      }
    }
    console.log(`Foulborn art manifest merged: ${merged} entries`);
  }

  const foulbornUpscaledManifestPath = join(generatedDataDir, "foulborn-upscaled-art-manifest.json");
  if (existsSync(foulbornUpscaledManifestPath)) {
    const foulbornUpscaledEntries = JSON.parse(readFileSync(foulbornUpscaledManifestPath, "utf8"));
    let merged = 0;
    for (const [name, publicPath] of Object.entries(foulbornUpscaledEntries)) {
      if (typeof publicPath === "string" && publicPath.length > 0) {
        foulbornUpscaledByUniqueName[name] = publicPath;
        merged++;
      }
    }
    console.log(`Foulborn upscaled art manifest merged: ${merged} entries`);
  }

  return {
    byBaseName: sortObject(byBaseName),
    bySlot: sortObject(slotPathsBySlot),
    byType: sortObject(byType),
    byUniqueName: sortObject(byUniqueName),
    defaults: {
      fallback: slotIconMap.generic,
    },
    foulbornLowResolutionByUniqueName: sortObject(foulbornLowResolutionByUniqueName),
    foulbornUpscaledByUniqueName: sortObject(foulbornUpscaledByUniqueName),
    influences: influenceIconMap,
  };
}

async function buildGemManifest(pobDataDir) {
  const byId = {};
  const [baseItems, repoeGems] = await Promise.all([
    fetchJson(`${repoeDataBaseUrl}/base_items.min.json`),
    fetchJson(`${repoeDataBaseUrl}/gems.min.json`),
  ]);
  const baseItemArtById = new Map();

  for (const [id, entry] of Object.entries(baseItems)) {
    if (!isPojo(entry)) {
      continue;
    }

    const publicPath = resolveDownloadedGemArtPath(entry.visual_identity?.dds_file);
    if (publicPath) {
      baseItemArtById.set(id, publicPath);
    }
  }

  for (const gameVersion of ["poe1"]) {
    const gemsPath = join(pobDataDir, "pob-data", gameVersion, "Gems.json");
    const data = JSON.parse(readFileSync(gemsPath, "utf8"));

    for (const [id, gemData] of Object.entries(data)) {
      const support = isSupportGem(id, gemData);
      const iconPath =
        resolveGemArtPath(id, gemData, baseItemArtById, repoeGems) ??
        (support ? "/assets/gems/support-skill.svg" : "/assets/gems/active-skill.svg");

      for (const key of collectGemLookupKeys(id, gemData)) {
        if (!byId[key]) {
          byId[key] = iconPath;
        }
      }
    }
  }

  return {
    byId: sortObject(byId),
    defaults: {
      active: "/assets/gems/active-skill.svg",
      support: "/assets/gems/support-skill.svg",
    },
  };
}

function resolveGemArtPath(id, gemData, baseItemArtById, repoeGems) {
  for (const candidate of [id, gemData?.gameId]) {
    if (typeof candidate === "string" && baseItemArtById.has(candidate)) {
      return baseItemArtById.get(candidate);
    }
  }

  for (const candidate of [gemData?.variantId, gemData?.grantedEffectId, gemData?.skillId]) {
    if (typeof candidate !== "string" || candidate.length === 0) {
      continue;
    }

    const repoeEntry = repoeGems[candidate];
    if (!isPojo(repoeEntry)) {
      continue;
    }

    const baseItemId = repoeEntry.base_item?.id;
    if (typeof baseItemId === "string" && baseItemArtById.has(baseItemId)) {
      return baseItemArtById.get(baseItemId);
    }
  }

  return undefined;
}

function collectGemLookupKeys(id, gemData) {
  const keys = new Set();

  if (typeof id === "string" && id.length > 0) {
    keys.add(id);
  }

  for (const candidate of [gemData?.gameId, gemData?.grantedEffectId, gemData?.skillId, gemData?.variantId]) {
    if (typeof candidate === "string" && candidate.length > 0) {
      keys.add(candidate);
    }
  }

  return [...keys];
}

function isSupportGem(id, gemData) {
  if (id.includes("/SupportGem")) {
    return true;
  }

  if (typeof gemData.gameId === "string" && gemData.gameId.includes("/SupportGem")) {
    return true;
  }

  if (typeof gemData.name === "string" && gemData.name.includes("Support")) {
    return true;
  }

  return gemData.tags?.grants_active_skill !== true;
}

function slotIconForItemType(type) {
  const normalized = String(type).trim().toLowerCase();

  if (normalized.includes("amulet") || normalized.includes("talisman")) return slotIconMap.amulet;
  if (normalized.includes("belt")) return slotIconMap.belt;
  if (normalized.includes("body")) return slotIconMap.bodyArmour;
  if (normalized.includes("boots")) return slotIconMap.boots;
  if (normalized.includes("bow") || normalized.includes("crossbow")) return slotIconMap.bow;
  if (normalized.includes("flask") || normalized.includes("tincture")) return slotIconMap.flask;
  if (normalized.includes("gloves")) return slotIconMap.gloves;
  if (normalized.includes("helmet") || normalized.includes("helm")) return slotIconMap.helmet;
  if (normalized.includes("jewel") || normalized.includes("rune")) return slotIconMap.jewel;
  if (normalized.includes("quiver")) return slotIconMap.quiver;
  if (normalized.includes("ring")) return slotIconMap.ringLeft;
  if (normalized.includes("shield") || normalized.includes("buckler") || normalized.includes("focus")) return slotIconMap.shield;

  if (
    normalized.includes("axe") ||
    normalized.includes("claw") ||
    normalized.includes("dagger") ||
    normalized.includes("flail") ||
    normalized.includes("mace") ||
    normalized.includes("sceptre") ||
    normalized.includes("spear") ||
    normalized.includes("staff") ||
    normalized.includes("sword") ||
    normalized.includes("wand")
  ) {
    return slotIconMap.weapon;
  }

  return slotIconMap.generic;
}

function buildItemArtDescriptor(ddsFile) {
  const relativePath = ddsFile
    .replace(/^Art\/2DItems\//, "")
    .replace(/\\/g, "/")
    .replace(/\.dds$/i, ".png");

  return {
    ddsFile,
    localPath: join(itemArtAssetsDir, ...relativePath.split("/")),
    publicPath: `/assets/items/art/${relativePath}`,
    urls: [
      `${poeCdnImageBaseUrl}/${encodeURI(ddsFile.replace(/\.dds$/i, ".png"))}`,
      `${repoeDataBaseUrl}/${encodeURI(ddsFile.replace(/\.dds$/i, ".png"))}`,
    ],
  };
}

function resolveDownloadedGemArtPath(ddsFile) {
  if (typeof ddsFile !== "string" || !ddsFile.startsWith("Art/2DItems/")) {
    return undefined;
  }

  const descriptor = buildItemArtDescriptor(ddsFile);
  return existsSync(descriptor.localPath) ? descriptor.publicPath : undefined;
}

async function downloadItemArtAssets(assets) {
  const successfulPaths = new Map();
  let downloadedCount = 0;
  let reusedCount = 0;

  await runWithConcurrency(assets, itemArtDownloadConcurrency, async (asset) => {
    if (existsSync(asset.localPath) && statSync(asset.localPath).size > 0) {
      reusedCount += 1;
      successfulPaths.set(asset.ddsFile, asset.publicPath);
      return;
    }

    mkdirSync(dirname(asset.localPath), { recursive: true });
    const bytes = await fetchFirstSuccessfulBinary(asset.urls);

    if (!bytes) {
      console.warn(`Skipped item art download: ${asset.ddsFile}`);
      return;
    }

    writeFileSync(asset.localPath, bytes);
    downloadedCount += 1;
    successfulPaths.set(asset.ddsFile, asset.publicPath);
  });

  console.log(`Item art cached: ${reusedCount}, downloaded: ${downloadedCount}, resolved: ${successfulPaths.size}`);
  return successfulPaths;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON: ${url} (${response.status})`);
  }

  return response.json();
}

async function fetchFirstSuccessfulBinary(urls) {
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > 0) {
        return buffer;
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

function resolveItemArtPath(ddsFile, downloadedArt) {
  if (!ddsFile) {
    return undefined;
  }

  return downloadedArt.get(ddsFile);
}

function normalizeFlaskArtAssets() {
  if (process.platform !== "win32" || !existsSync(itemFlaskAssetsDir)) {
    return;
  }

  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      join(repoRoot, "scripts", "normalize-flask-art.ps1"),
      "-FlaskDir",
      itemFlaskAssetsDir,
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );
}

async function runWithConcurrency(items, concurrency, worker) {
  let index = 0;

  async function next() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      await worker(items[currentIndex], currentIndex);
    }
  }

  const runnerCount = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: runnerCount }, () => next()));
}

function writeAssetManifestModule(manifest) {
  writeValueModule(join(webGeneratedDir, "asset-manifest.ts"), "GENERATED_ASSET_MANIFEST", manifest, "GeneratedAssetManifest");
}

function writeTreeManifestModule(manifest) {
  writeValueModule(join(webGeneratedDir, "tree-manifest.ts"), "GENERATED_TREE_MANIFEST", manifest, "GeneratedTreeManifest");
}

function writeValueModule(path, exportName, value, typeName) {
  const body = [
    `export const ${exportName} = `,
    `${JSON.stringify(value, null, 2)} as const;`,
    "",
    `export type ${typeName} = typeof ${exportName};`,
    "",
  ].join("\n");

  writeFileSync(path, body, "utf8");
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeCompactJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value), "utf8");
}

function ensureEmptyDir(dir) {
  rmSync(dir, { force: true, recursive: true });
  mkdirSync(dir, { recursive: true });
}

function sortObject(input) {
  return Object.fromEntries(Object.entries(input).sort(([left], [right]) => left.localeCompare(right)));
}

function asObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}

function isPojo(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeIdList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .sort((left, right) => left - right);
}

function normalizeMasteryEffects(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => asObject(entry))
    .map((entry) => ({
      effect: Number(entry.effect),
      reminderText: normalizeTextList(entry.reminderText),
      stats: normalizeTextList(entry.stats),
    }))
    .filter((entry) => Number.isFinite(entry.effect) && entry.stats.length > 0);
}

function normalizeNumberList(value, fallback) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const numbers = value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));

  return numbers.length > 0 ? numbers : [...fallback];
}

function normalizeTextList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => String(entry));
}

function roundCoordinate(value) {
  return Math.round(value * 100) / 100;
}

function buildOrbitAnglesByOrbit(skillsPerOrbit) {
  return skillsPerOrbit.map((nodesInOrbit) => buildOrbitAngles(nodesInOrbit));
}

function buildOrbitAngles(nodesInOrbit) {
  if (nodesInOrbit === 16) {
    return [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330].map(degreesToRadians);
  }

  if (nodesInOrbit === 40) {
    return [
      0, 10, 20, 30, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120, 130, 135, 140, 150, 160, 170, 180, 190, 200, 210,
      220, 225, 230, 240, 250, 260, 270, 280, 290, 300, 310, 315, 320, 330, 340, 350,
    ].map(degreesToRadians);
  }

  return Array.from({ length: nodesInOrbit }, (_, index) => degreesToRadians((360 * index) / Math.max(nodesInOrbit, 1)));
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function getPassiveTreeGroupBackground(orbitFlags, isAscendancyGroup) {
  if (isAscendancyGroup) {
    return undefined;
  }

  if (orbitFlags.has(3)) {
    return { key: "PSGroupBackground3", mirrorY: true };
  }

  if (orbitFlags.has(2)) {
    return { key: "PSGroupBackground2", mirrorY: false };
  }

  if (orbitFlags.has(1)) {
    return { key: "PSGroupBackground1", mirrorY: false };
  }

  return undefined;
}

function pickHighestZoomSprite(spriteGroup) {
  const entries = Object.entries(asObject(spriteGroup))
    .map(([zoom, sprite]) => [Number(zoom), asObject(sprite)])
    .filter(([zoom]) => Number.isFinite(zoom))
    .sort(([left], [right]) => right - left);

  return entries[0]?.[1];
}

function toPassiveTreePublicAssetPath(filename) {
  const name = String(filename).split("/").pop()?.split("?")[0];
  if (!name) {
    return undefined;
  }

  return `/assets/passive-tree/default/${name}`;
}
