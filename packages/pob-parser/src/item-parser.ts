import type {
  ItemExplicitModPayload,
  ItemJewelRadius,
  ItemPayload,
  ItemRarity,
  ItemRequirementsPayload,
} from "@pobcodes/shared-types";

import { POB_ITEM_BASES } from "./generated/pob-item-bases";
import { POB_MOD_ORDER_LOOKUP } from "./generated/pob-mod-order";

const INFLUENCE_LINES = new Set([
  "Shaper Item",
  "Elder Item",
  "Crusader Item",
  "Hunter Item",
  "Redeemer Item",
  "Warlord Item",
  "Searing Exarch Item",
  "Eater of Worlds Item",
]);

const NON_MOD_LINES = new Set([
  "Corrupted",
  "Fractured Item",
  "Mirrored",
  "Mirrored Item",
  "Split",
  "Split Item",
  "Synthesised Item",
  "Unidentified",
]);

const PROPERTY_PREFIXES = [
  "Unique ID:",
  "Item Level:",
  "Quality:",
  "Sockets:",
  "LevelReq:",
  "Requires Class ",
  "Radius:",
  "Limited to:",
  "Armour:",
  "Evasion:",
  "Evasion Rating:",
  "Energy Shield:",
  "Ward:",
  "League:",
  "Catalyst:",
  "CatalystQuality:",
  "Talisman Tier:",
  "Variant:",
  "Selected Variant:",
  "Selected Alt Variant:",
  "Selected Alt Variant Two:",
  "Selected Alt Variant Three:",
  "Selected Alt Variant Four:",
  "Selected Alt Variant Five:",
  "Has Alt Variant",
  "Note:",
  "Class: ",
  "Prefixes:",
  "Suffixes:",
];
const SELECTED_VARIANT_PREFIX = "Selected Variant:";

interface ParsedItemProperties {
  quality?: number;
  armour?: number;
  evasion?: number;
  energyShield?: number;
  ward?: number;
  sockets?: string;
}

interface RequirementComputationState {
  level?: number;
  str?: number;
  dex?: number;
  int?: number;
  className?: string;
  attributePercentModifier: number;
  strFlatModifier: number;
  dexFlatModifier: number;
  intFlatModifier: number;
  hasNoAttributeRequirements: boolean;
}

export function parseRawItem(raw: string, id: number): ItemPayload {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^[-]+$/.test(line));

  const foilType = parseFoilType(lines);
  const rarity = resolveItemRarity(parseRarity(lines[0]), foilType);
  const nameAndBase = parseNameAndBase(lines, rarity);
  const baseInfo = nameAndBase.base ? POB_ITEM_BASES[nameAndBase.base] : undefined;
  const requirementState = createRequirementState(baseInfo?.req);
  const properties = parseItemProperties(lines, requirementState);

  const implicitInfo = findImplicitBlock(lines);
  const selectedVariant = parseSelectedVariant(lines);
  const jewelRadius = parseJewelRadius(lines, selectedVariant);
  const implicits: string[] = [];
  const startIdx = implicitInfo.nextIndex;

  const influences = lines.filter((line) => INFLUENCE_LINES.has(line));
  const explicits: string[] = [];
  const anointments: string[] = [];
  const enchantments: string[] = [];
  const crafted: string[] = [];
  const fracturedMods: string[] = [];
  const scourgedMods: string[] = [];
  const crucibleMods: string[] = [];
  const synthesizedMods: string[] = [];
  const orderedExplicitMods: ItemExplicitModPayload[] = [];
  let fractured = lines.includes("Fractured Item");
  let implicitLinesRemaining = implicitInfo.count;

  for (let i = startIdx; i < lines.length; i += 1) {
    const line = lines[i];
    if (isSkippableLine(line, nameAndBase)) {
      continue;
    }

    const clean = formatDisplayLine(line);
    if (!clean) {
      continue;
    }

    if (!matchesSelectedVariant(line, selectedVariant)) {
      continue;
    }

    const inImplicitBlock = implicitLinesRemaining > 0;

    if (line.includes("{fractured}")) {
      fractured = true;
      fracturedMods.push(clean);
      orderedExplicitMods.push({ text: clean, kind: "fractured" });
      applyRequirementModifiers(clean, requirementState);
      continue;
    }

    if (shouldTreatAsAnoint(line, clean, inImplicitBlock)) {
      anointments.push(clean.replace(/^Enchant:\s*/i, ""));
      if (inImplicitBlock) {
        implicitLinesRemaining -= 1;
      }
      continue;
    }

    if (line.includes("{crafted}") && inImplicitBlock) {
      enchantments.push(clean);
      implicitLinesRemaining -= 1;
      continue;
    }

    if (line.includes("{crafted}")) {
      crafted.push(clean);
      orderedExplicitMods.push({ text: clean, kind: "crafted" });
      applyRequirementModifiers(clean, requirementState);
      continue;
    }

    if (line.includes("{enchant}") || clean.startsWith("Enchant:")) {
      enchantments.push(clean.replace(/^Enchant:\s*/i, ""));
      if (inImplicitBlock) {
        implicitLinesRemaining -= 1;
      }
      continue;
    }

    if (line.includes("{scourge}")) {
      scourgedMods.push(clean);
      if (inImplicitBlock) {
        implicitLinesRemaining -= 1;
      }
      continue;
    }

    if (line.includes("{crucible}")) {
      crucibleMods.push(clean);
      continue;
    }

    if (line.includes("{synthesis}")) {
      synthesizedMods.push(clean);
      if (inImplicitBlock) {
        implicitLinesRemaining -= 1;
      }
      continue;
    }

    if (inImplicitBlock) {
      implicits.push(clean);
      implicitLinesRemaining -= 1;
      applyRequirementModifiers(clean, requirementState);
      continue;
    }

    explicits.push(clean);
    orderedExplicitMods.push({ text: clean, kind: "explicit" });
    applyRequirementModifiers(clean, requirementState);
  }

  const requirements = finalizeRequirements(requirementState);
  const sortedOrderedExplicitMods = sortOrderedExplicitMods(orderedExplicitMods);
  const split = hasStandaloneItemFlagLine(lines, "Split");
  const mirrored = hasStandaloneItemFlagLine(lines, "Mirrored") || isInherentlyMirroredItem(nameAndBase);

  return {
    id,
    raw,
    name: nameAndBase.name,
    base: nameAndBase.base,
    rarity,
    foilType,
    iconKey: nameAndBase.name ?? nameAndBase.base,
    quality: properties.quality,
    armour: properties.armour,
    evasion: properties.evasion,
    energyShield: properties.energyShield,
    ward: properties.ward,
    sockets: properties.sockets,
    requirements,
    jewelRadius,
    implicits,
    explicits,
    anointments,
    enchantments,
    crafted,
    fracturedMods,
    scourgedMods,
    crucibleMods,
    synthesizedMods,
    orderedExplicitMods: sortedOrderedExplicitMods,
    influences,
    fractured,
    split,
    synthesised: lines.includes("Synthesised Item"),
    corrupted: lines.includes("Corrupted"),
    mirrored,
  };
}

function parseSelectedVariant(lines: string[]): number | undefined {
  const line = lines.find((entry) => entry.startsWith(SELECTED_VARIANT_PREFIX));
  if (!line) {
    return undefined;
  }

  const value = Number(line.slice(SELECTED_VARIANT_PREFIX.length).trim());
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function parseJewelRadius(lines: string[], selectedVariant?: number): ItemJewelRadius | undefined {
  const radiusLine = lines.find((line) => line.startsWith("Radius:"));
  if (!radiusLine) {
    return extractVariableRingRadius(lines, selectedVariant);
  }

  const radiusLabel = radiusLine.slice("Radius:".length).trim();
  if (/^Variable$/i.test(radiusLabel)) {
    return extractVariableRingRadius(lines, selectedVariant);
  }

  return normalizeJewelRadiusLabel(radiusLabel);
}

function extractVariableRingRadius(lines: string[], selectedVariant?: number): ItemJewelRadius | undefined {
  for (const line of lines) {
    if (!matchesSelectedVariant(line, selectedVariant)) {
      continue;
    }

    const match = stripLineTags(line).match(
      /^Only affects Passives in (Small|Medium|Large|Very Large|Massive) Ring(?:\s*\([^)]+\))?$/i,
    );
    if (match) {
      return normalizeJewelRadiusLabel(match[1]);
    }
  }

  return undefined;
}

function normalizeJewelRadiusLabel(label: string): ItemJewelRadius | undefined {
  const normalized = label.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized === "small") {
    return "small";
  }
  if (normalized === "medium") {
    return "medium";
  }
  if (normalized === "large") {
    return "large";
  }
  if (normalized === "very large") {
    return "veryLarge";
  }
  if (normalized === "massive") {
    return "massive";
  }
  return undefined;
}

function parseRarity(line?: string): ItemRarity | undefined {
  if (!line) {
    return undefined;
  }

  const match = line.match(/^Rarity:\s+(\w+)/);
  if (!match) {
    return undefined;
  }

  const value = match[1].toLowerCase();
  if (value === "normal") return "Normal";
  if (value === "magic") return "Magic";
  if (value === "rare") return "Rare";
  if (value === "unique") return "Unique";
  if (value === "relic") return "Relic";
  return undefined;
}

function parseFoilType(lines: string[]): string | undefined {
  for (const line of lines) {
    const match = line.match(/^Foil Unique(?: \((.+)\))?$/);
    if (!match) {
      continue;
    }

    return match[1]?.trim() || "Rainbow";
  }

  return undefined;
}

function resolveItemRarity(rarity?: ItemRarity, foilType?: string): ItemRarity | undefined {
  if (foilType && (!rarity || rarity === "Unique" || rarity === "Relic")) {
    return "Relic";
  }

  return rarity;
}

function parseNameAndBase(lines: string[], rarity?: ItemRarity): { name?: string; base?: string } {
  if (lines.length < 2) {
    return {};
  }

  if (rarity === "Rare" || rarity === "Unique" || rarity === "Relic") {
    return {
      name: lines[1],
      base: lines[2] ?? lines[1],
    };
  }

  return {
    name: lines[1],
    base: lines[1],
  };
}

function parseItemProperties(lines: string[], requirementState: RequirementComputationState): ParsedItemProperties {
  const properties: ParsedItemProperties = {};

  for (const line of lines) {
    const value = readQualityNumber(line);
    if (value !== undefined) {
      properties.quality = value;
      continue;
    }

    const armour = readPositiveNumber(line, "Armour:");
    if (armour !== undefined) {
      properties.armour = armour;
      continue;
    }

    const evasion = readPositiveNumber(line, "Evasion:") ?? readPositiveNumber(line, "Evasion Rating:");
    if (evasion !== undefined) {
      properties.evasion = evasion;
      continue;
    }

    const energyShield = readPositiveNumber(line, "Energy Shield:");
    if (energyShield !== undefined) {
      properties.energyShield = energyShield;
      continue;
    }

    const ward = readPositiveNumber(line, "Ward:");
    if (ward !== undefined) {
      properties.ward = ward;
      continue;
    }

    const sockets = readSocketSpec(line);
    if (sockets) {
      properties.sockets = sockets;
      continue;
    }

    if (applyRequirementProperty(line, requirementState)) {
      continue;
    }
  }

  return properties;
}

function createRequirementState(baseReq?: {
  level?: number;
  str?: number;
  dex?: number;
  int?: number;
}): RequirementComputationState {
  return {
    level: baseReq?.level,
    str: baseReq?.str,
    dex: baseReq?.dex,
    int: baseReq?.int,
    attributePercentModifier: 0,
    strFlatModifier: 0,
    dexFlatModifier: 0,
    intFlatModifier: 0,
    hasNoAttributeRequirements: false,
  };
}

function applyRequirementProperty(line: string, state: RequirementComputationState): boolean {
  const levelReq = readPositiveNumber(line, "LevelReq:");
  if (levelReq !== undefined) {
    state.level = Math.max(state.level ?? 0, levelReq);
    return true;
  }

  const requiresClass = line.match(/^Requires Class\s+(.+)$/i)?.[1]?.trim();
  if (requiresClass) {
    state.className = requiresClass;
    return true;
  }

  const requiresLine = line.match(/^Requires Level\s+(\d+)(.*)$/i);
  if (requiresLine) {
    state.level = Math.max(state.level ?? 0, Number(requiresLine[1]));
    for (const [, amount, stat] of requiresLine[2].matchAll(/(\d+)\s+(Str|Dex|Int|Strength|Dexterity|Intelligence)/gi)) {
      assignAttributeRequirement(state, stat, Number(amount));
    }
    return true;
  }

  for (const [prefix, key] of [
    ["Strength:", "Strength"],
    ["Str:", "Str"],
    ["Dexterity:", "Dexterity"],
    ["Dex:", "Dex"],
    ["Intelligence:", "Intelligence"],
    ["Int:", "Int"],
  ] as const) {
    const value = readPositiveNumber(line, prefix);
    if (value !== undefined) {
      assignAttributeRequirement(state, key, value);
      return true;
    }
  }

  return false;
}

function applyRequirementModifiers(line: string, state: RequirementComputationState) {
  if (/^Has no Attribute Requirements$/i.test(line)) {
    state.hasNoAttributeRequirements = true;
    return;
  }

  const reducedAll = line.match(/^(\d+)% reduced Attribute Requirements$/i);
  if (reducedAll) {
    state.attributePercentModifier -= Number(reducedAll[1]);
    return;
  }

  const increasedAll = line.match(/^(\d+)% increased Attribute Requirements$/i);
  if (increasedAll) {
    state.attributePercentModifier += Number(increasedAll[1]);
    return;
  }

  const flatStrength = line.match(/^\+(\d+)\s+(?:Strength|Str) Requirement$/i);
  if (flatStrength) {
    state.strFlatModifier += Number(flatStrength[1]);
    return;
  }

  const flatDexterity = line.match(/^\+(\d+)\s+(?:Dexterity|Dex) Requirement$/i);
  if (flatDexterity) {
    state.dexFlatModifier += Number(flatDexterity[1]);
    return;
  }

  const flatIntelligence = line.match(/^\+(\d+)\s+(?:Intelligence|Int) Requirement$/i);
  if (flatIntelligence) {
    state.intFlatModifier += Number(flatIntelligence[1]);
  }
}

function finalizeRequirements(state: RequirementComputationState): ItemRequirementsPayload | undefined {
  const requirements: ItemRequirementsPayload = {};

  if (state.level && state.level > 0) {
    requirements.level = state.level;
  }

  if (state.className) {
    requirements.className = state.className;
  }

  if (state.hasNoAttributeRequirements) {
    requirements.str = 0;
    requirements.dex = 0;
    requirements.int = 0;
  } else {
    const strength = computeAttributeRequirement(state.str, state.strFlatModifier, state.attributePercentModifier);
    const dexterity = computeAttributeRequirement(state.dex, state.dexFlatModifier, state.attributePercentModifier);
    const intelligence = computeAttributeRequirement(state.int, state.intFlatModifier, state.attributePercentModifier);

    if (strength !== undefined) {
      requirements.str = strength;
    }
    if (dexterity !== undefined) {
      requirements.dex = dexterity;
    }
    if (intelligence !== undefined) {
      requirements.int = intelligence;
    }
  }

  return Object.keys(requirements).length > 0 ? requirements : undefined;
}

function computeAttributeRequirement(base: number | undefined, flatModifier: number, percentModifier: number): number | undefined {
  if (base === undefined) {
    return undefined;
  }

  const adjusted = Math.floor((base + flatModifier) * (1 + percentModifier / 100));
  return Math.max(adjusted, 0);
}

function assignAttributeRequirement(state: RequirementComputationState, stat: string, value: number) {
  const key = stat.slice(0, 3).toLowerCase();
  if (key === "str") {
    state.str = value;
  } else if (key === "dex") {
    state.dex = value;
  } else if (key === "int") {
    state.int = value;
  }
}

function findImplicitBlock(lines: string[]): { count: number; nextIndex: number } {
  const implicitIdx = lines.findIndex((line) => line.startsWith("Implicits:"));
  if (implicitIdx === -1) {
    return { count: 0, nextIndex: 0 };
  }

  const count = Number(lines[implicitIdx].split(":")[1]?.trim() ?? "0");
  if (!Number.isFinite(count) || count <= 0) {
    return { count: 0, nextIndex: implicitIdx + 1 };
  }

  return {
    count,
    nextIndex: implicitIdx + 1,
  };
}

function isSkippableLine(line: string, nameAndBase: { name?: string; base?: string }): boolean {
  return (
    line.startsWith("Foil Unique") ||
    line.startsWith("Rarity:") ||
    line === nameAndBase.name ||
    line === nameAndBase.base ||
    NON_MOD_LINES.has(stripLineTags(line)) ||
    INFLUENCE_LINES.has(line) ||
    isPropertyLine(line)
  );
}

function hasStandaloneItemFlagLine(lines: string[], flag: "Mirrored" | "Split"): boolean {
  return lines.some((line) => matchesStandaloneItemFlag(stripLineTags(line), flag));
}

function matchesStandaloneItemFlag(line: string, flag: "Mirrored" | "Split"): boolean {
  return line === flag || line === `${flag} Item`;
}

function isInherentlyMirroredItem(nameAndBase: { name?: string; base?: string }): boolean {
  return nameAndBase.name === "Kalandra's Touch" && nameAndBase.base === "Ring";
}

function isPropertyLine(line: string): boolean {
  return (
    PROPERTY_PREFIXES.some((prefix) => line.startsWith(prefix)) ||
    /^Quality(?:\s*\([^)]*\))?:\s/.test(line) ||
    /^[A-Za-z]+BasePercentile:\s/.test(line)
  );
}

function readPositiveNumber(line: string, prefix: string): number | undefined {
  if (!line.startsWith(prefix)) {
    return undefined;
  }

  const value = Number(line.slice(prefix.length).replace(/[^\d.-]/g, "").trim());
  return Number.isFinite(value) ? value : undefined;
}

function readQualityNumber(line: string): number | undefined {
  if (line.startsWith("CatalystQuality:")) {
    return readPositiveNumber(line, "CatalystQuality:");
  }

  const match = line.match(/^Quality(?:\s*\([^)]*\))?:\s*(.+)$/);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1].replace(/[^\d.-]/g, "").trim());
  return Number.isFinite(value) ? value : undefined;
}

function readSocketSpec(line: string): string | undefined {
  const match = line.match(/^Sockets:\s+(.+)$/i);
  return match?.[1]?.trim();
}

function stripLineTags(line: string): string {
  return line.replace(/\{[^}]+\}/g, "").trim();
}

function formatDisplayLine(line: string): string {
  const range = extractLineRange(line);
  const stripped = stripLineTags(line);
  if (!stripped) {
    return stripped;
  }

  return range === undefined ? stripped : applyRangeToLine(stripped, range, getDisplayRangePrecision(line));
}

function extractLineRange(line: string): number | undefined {
  const match = line.match(/\{range:([\d.]+)\}/);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

function applyRangeToLine(line: string, range: number, precision: number): string {
  return line.replace(
    /(\+?)\((-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\)/g,
    (_: string, plus: string, min: string, max: string) => {
      const resolved = roundRangeValue(Number(min) + range * (Number(max) - Number(min)), precision);
      const prefix = resolved.startsWith("-") ? "" : plus;
      return `${prefix}${resolved}`;
    },
  );
}

function roundRangeValue(value: number, precision: number): string {
  const power = 10 ** precision;
  const rounded = Math.floor(value * power + 0.5) / power;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }

  return rounded.toString();
}

function getDisplayRangePrecision(line: string): number {
  return /\d+\.\d+/.test(stripLineTags(line)) ? 1 : 0;
}

function matchesSelectedVariant(line: string, selectedVariant?: number): boolean {
  const lineVariants = extractLineVariants(line);
  if (lineVariants.length === 0 || selectedVariant === undefined) {
    return true;
  }

  return lineVariants.includes(selectedVariant);
}

function extractLineVariants(line: string): number[] {
  const variants: number[] = [];

  for (const match of line.matchAll(/\{variant:([^}]+)\}/g)) {
    for (const part of match[1].split(",")) {
      const value = Number(part.trim());
      if (Number.isInteger(value) && value > 0) {
        variants.push(value);
      }
    }
  }

  return variants;
}

function sortOrderedExplicitMods(mods: ItemExplicitModPayload[]): ItemExplicitModPayload[] {
  return mods
    .map((mod, index) => ({
      mod,
      index,
      priority: getExplicitModPriority(mod.kind),
      order: resolveExplicitModOrder(mod.text),
    }))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }
      if (left.order !== right.order) {
        return left.order - right.order;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.mod);
}

function getExplicitModPriority(kind: ItemExplicitModPayload["kind"]): number {
  if (kind === "fractured") {
    return 0;
  }
  if (kind === "crafted") {
    return 2;
  }
  return 1;
}

function resolveExplicitModOrder(text: string): number {
  const normalized = normalizeModLine(text);
  return POB_MOD_ORDER_LOOKUP[normalized]?.order ?? Number.MAX_SAFE_INTEGER;
}

function normalizeModLine(line: string): string {
  return stripLineTags(line)
    .replace(/\((?:-?\d+(?:\.\d+)?)\s*-\s*(?:-?\d+(?:\.\d+)?)\)/g, "#")
    .replace(/-?\d+(?:\.\d+)?/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function shouldTreatAsAnoint(line: string, clean: string, inImplicitBlock: boolean): boolean {
  if (!isAnointmentLine(clean)) {
    return false;
  }

  return inImplicitBlock || line.includes("{crafted}") || line.includes("{enchant}") || clean.startsWith("Enchant:");
}

function isAnointmentLine(line: string): boolean {
  return /^Allocates [A-Za-z][A-Za-z' -]+$/.test(line.replace(/^Enchant:\s*/i, "").trim());
}
