import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const localPobMirrorDir = path.join(repoRoot, "local-pob-mirror");
const sourceDir = path.join(localPobMirrorDir, "src", "Data", "Bases");
const outputPath = path.join(repoRoot, "packages", "pob-parser", "src", "generated", "pob-item-bases.ts");

const entries = {};

for (const file of fs.readdirSync(sourceDir)) {
  if (!file.endsWith(".lua")) {
    continue;
  }

  parseLuaFile(path.join(sourceDir, file));
}

const generated = `/* This file is generated from local-pob-mirror/src/Data/Bases/*.lua */
export interface PobItemBaseInfo {
  armour?: {
    armourMin?: number;
    armourMax?: number;
    evasionMin?: number;
    evasionMax?: number;
    energyShieldMin?: number;
    energyShieldMax?: number;
    wardMin?: number;
    wardMax?: number;
  };
  req?: {
    level?: number;
    str?: number;
    dex?: number;
    int?: number;
  };
}

export const POB_ITEM_BASES: Record<string, PobItemBaseInfo> = ${JSON.stringify(entries, null, 2)};
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, generated);

function parseLuaFile(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/g);
  let currentName = null;
  let currentLines = [];

  for (const line of lines) {
    const header = line.match(/^itemBases\["(.+)"\] = \{$/);
    if (header) {
      currentName = header[1];
      currentLines = [];
      continue;
    }

    if (!currentName) {
      continue;
    }

    if (line.trim() === "}") {
      const entry = parseBlock(currentLines.join("\n"));
      if (entry) {
        entries[currentName] = entry;
      }
      currentName = null;
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }
}

function parseBlock(block) {
  const armourBlock = block.match(/armour = \{([^}]*)\}/m)?.[1];
  const reqBlock = block.match(/req = \{([^}]*)\}/m)?.[1];
  const entry = {};

  if (armourBlock) {
    const armour = compactObject({
      armourMin: readNumber(armourBlock, "ArmourBaseMin"),
      armourMax: readNumber(armourBlock, "ArmourBaseMax"),
      evasionMin: readNumber(armourBlock, "EvasionBaseMin"),
      evasionMax: readNumber(armourBlock, "EvasionBaseMax"),
      energyShieldMin: readNumber(armourBlock, "EnergyShieldBaseMin"),
      energyShieldMax: readNumber(armourBlock, "EnergyShieldBaseMax"),
      wardMin: readNumber(armourBlock, "WardBaseMin"),
      wardMax: readNumber(armourBlock, "WardBaseMax"),
    });

    if (Object.keys(armour).length > 0) {
      entry.armour = armour;
    }
  }

  if (reqBlock) {
    const req = compactObject({
      level: readNumber(reqBlock, "level"),
      str: readNumber(reqBlock, "str"),
      dex: readNumber(reqBlock, "dex"),
      int: readNumber(reqBlock, "int"),
    });

    if (Object.keys(req).length > 0) {
      entry.req = req;
    }
  }

  return Object.keys(entry).length > 0 ? entry : undefined;
}

function readNumber(block, key) {
  const match = block.match(new RegExp(`${key} = (-?\\d+(?:\\.\\d+)?)`));
  return match ? Number(match[1]) : undefined;
}

function compactObject(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}
