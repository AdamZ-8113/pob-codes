import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const localPobMirrorDir = path.join(repoRoot, "local-pob-mirror");
const sourcePath = path.join(localPobMirrorDir, "src", "Modules", "BuildDisplayStats.lua");
const globalSourcePath = path.join(localPobMirrorDir, "src", "Data", "Global.lua");
const outputPath = path.join(repoRoot, "apps", "web", "lib", "generated", "pob-stat-layout.ts");

const source = fs.readFileSync(sourcePath, "utf8");
const globalSource = fs.readFileSync(globalSourcePath, "utf8");
const colorCodes = parseColorCodes(globalSource);

const playerBlock = extractLuaBlock(source, "local displayStats = {", "local minionDisplayStats = {");
const minionBlock = extractLuaBlock(source, "local minionDisplayStats = {", "local extraSaveStats = {");
const extraSaveStats = extractStringArray(source, "local extraSaveStats = {");

const playerSections = parseStatSections(playerBlock, colorCodes);
const minionSections = parseStatSections(minionBlock, colorCodes);
const extraSection = playerSections.reduce((max, entry) => Math.max(max, entry.section), 0) + 1;

const generated = `/* This file is generated from local-pob-mirror/src/Modules/BuildDisplayStats.lua */
export interface PobStatLayoutEntry {
  key: string;
  label?: string;
  color?: string;
  fmt?: string;
  hidden: boolean;
  overCapStat?: string;
  pc?: boolean;
  flags?: string[];
  notFlags?: string[];
  section: number;
}

export const POB_PLAYER_STAT_LAYOUT: PobStatLayoutEntry[] = ${toTs(playerSections)};

export const POB_MINION_STAT_LAYOUT: PobStatLayoutEntry[] = ${toTs(minionSections)};

export const POB_EXTRA_SAVE_STAT_LAYOUT: PobStatLayoutEntry[] = ${toTs(
  extraSaveStats.map((key) => ({ hidden: false, key, section: extraSection })),
)};
`;

fs.writeFileSync(outputPath, generated);

function extractLuaBlock(input, startMarker, endMarker) {
  const start = input.indexOf(startMarker);
  const end = input.indexOf(endMarker, start);
  if (start === -1 || end === -1) {
    throw new Error(`Could not extract Lua block between ${startMarker} and ${endMarker}`);
  }

  return input.slice(start + startMarker.length, end);
}

function extractStringArray(input, startMarker) {
  const start = input.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`Could not find ${startMarker}`);
  }

  const bodyStart = start + startMarker.length;
  const bodyEnd = input.indexOf("\n}", bodyStart);
  if (bodyEnd === -1) {
    throw new Error(`Could not find end of string array for ${startMarker}`);
  }

  return input
    .slice(bodyStart, bodyEnd)
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.match(/"([^"]+)"/)?.[1])
    .filter(Boolean);
}

function parseStatSections(block, colorCodes) {
  const entries = [];
  let section = 0;

  for (const rawLine of block.split(/\r?\n/g)) {
    const line = rawLine.trim();
    if (!line.startsWith("{")) {
      continue;
    }

    if (/^\{\s*\},?$/.test(line)) {
      section += 1;
      continue;
    }

    const stat = line.match(/stat\s*=\s*"([^"]+)"/)?.[1];
    if (!stat) {
      continue;
    }

    const childStat = line.match(/childStat\s*=\s*"([^"]+)"/)?.[1] ?? "";
    const key = `${stat}${childStat}`;
    const label = line.match(/label\s*=\s*"([^"]+)"/)?.[1];
    const colorKey = line.match(/color\s*=\s*colorCodes\.([A-Z_]+)/)?.[1];
    const color = colorKey ? colorCodes[colorKey] : undefined;
    const fmt = line.match(/fmt\s*=\s*"([^"]+)"/)?.[1];
    const hidden = /hideStat\s*=\s*true/.test(line);
    const overCapStat = line.match(/overCapStat\s*=\s*"([^"]+)"/)?.[1];
    const pc = /pc\s*=\s*true/.test(line);
    const flags = [...line.matchAll(/flag\s*=\s*"([^"]+)"/g)].map((match) => match[1]);
    const notFlags = [...line.matchAll(/notFlag\s*=\s*"([^"]+)"/g)].map((match) => match[1]);

    const entry = {
      key,
      ...(label ? { label } : {}),
      ...(color ? { color } : {}),
      ...(fmt ? { fmt } : {}),
      hidden,
      ...(overCapStat ? { overCapStat } : {}),
      ...(pc ? { pc: true } : {}),
      ...(flags.length > 0 ? { flags } : {}),
      ...(notFlags.length > 0 ? { notFlags } : {}),
      section,
    };

    entries.push(entry);
  }

  return entries;
}

function parseColorCodes(input) {
  const tableBlock = extractLuaBlock(input, "colorCodes = {", "colorCodes.STRENGTH");
  const colorCodes = Object.fromEntries(
    [...tableBlock.matchAll(/([A-Z_]+)\s*=\s*"\^x([0-9A-Fa-f]{6})"/g)].map((match) => [match[1], `#${match[2].toUpperCase()}`]),
  );

  for (const match of input.matchAll(/colorCodes\.([A-Z_]+)\s*=\s*colorCodes\.([A-Z_]+)/g)) {
    const [, key, sourceKey] = match;
    if (colorCodes[sourceKey]) {
      colorCodes[key] = colorCodes[sourceKey];
    }
  }

  return colorCodes;
}

function toTs(value) {
  return JSON.stringify(value, null, 2);
}
