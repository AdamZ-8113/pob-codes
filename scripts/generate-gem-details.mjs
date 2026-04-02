import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const localPobMirrorDir = path.join(repoRoot, "local-pob-mirror");
const gemsLua = path.join(localPobMirrorDir, "src", "Data", "Gems.lua");
const skillsDir = path.join(localPobMirrorDir, "src", "Data", "Skills");
const outputPath = path.join(repoRoot, "apps", "web", "lib", "generated", "gem-details.ts");

const skillFiles = [
  "act_int.lua",
  "act_str.lua",
  "act_dex.lua",
  "glove.lua",
  "minion.lua",
  "other.lua",
  "spectre.lua",
  "sup_int.lua",
  "sup_str.lua",
  "sup_dex.lua",
];

// --- Parse Gems.lua ---

/**
 * @typedef {{ name: string, tagString: string, reqStr: number, reqDex: number, reqInt: number, grantedEffectId: string, naturalMaxLevel: number }} GemMeta
 * @type {Map<string, GemMeta>}
 */
const gemMetaByGemId = new Map();
/**
 * @type {Map<string, string>} grantedEffectId -> gemId
 */
const gemIdByEffect = new Map();

const gemsText = fs.readFileSync(gemsLua, "utf8");

// Each top-level entry: ["Metadata/..."] = { ... }
// We parse block by block. Find each key then extract the block contents.
const gemBlockRe = /\["(Metadata\/Items\/Gems\/[^"]+)"\]\s*=\s*\{/g;

let match;
while ((match = gemBlockRe.exec(gemsText)) !== null) {
  const gemId = match[1];
  const blockStart = match.index + match[0].length;

  // Find the matching closing brace
  let depth = 1;
  let i = blockStart;
  while (i < gemsText.length && depth > 0) {
    if (gemsText[i] === "{") depth++;
    else if (gemsText[i] === "}") depth--;
    i++;
  }
  const block = gemsText.slice(blockStart, i - 1);

  const name = extractString(block, "name");
  const tagString = extractString(block, "tagString");
  const grantedEffectId = extractString(block, "grantedEffectId");
  // gameId is the path that PoB actually stores on gem XML elements as gemId.
  // When absent, derive it: "Metadata/Items/Gems/SkillGemSupportFoo" → "Metadata/Items/Gems/SupportGemFoo"
  const rawGameId = extractString(block, "gameId");
  const gameId = rawGameId ?? gemId.replace(
    /^Metadata\/Items\/Gems\/SkillGemSupport(.+)$/,
    "Metadata/Items/Gems/SupportGem$1"
  );
  const reqStr = extractNumber(block, "reqStr") ?? 0;
  const reqDex = extractNumber(block, "reqDex") ?? 0;
  const reqInt = extractNumber(block, "reqInt") ?? 0;
  const naturalMaxLevel = extractNumber(block, "naturalMaxLevel") ?? 20;

  if (!name || !grantedEffectId) continue;

  // Key by gameId — this matches what PoB XML stores in gem's gemId attribute
  gemMetaByGemId.set(gameId, { name, tagString: tagString ?? "", reqStr, reqDex, reqInt, grantedEffectId, naturalMaxLevel });
  if (!gemIdByEffect.has(grantedEffectId)) {
    gemIdByEffect.set(grantedEffectId, gameId);
  }
}

// --- Parse Skills/*.lua ---

/**
 * @typedef {{
 *   description: string,
 *   castTime?: number,
 *   support?: boolean,
 *   statKeys: string[],
 *   skillTypes: string[],
 *   requireSkillTypes: string[],
 *   excludeSkillTypes: string[],
 *   levels: Array<{ levelReq: number, critChance?: number, cooldown?: number, damageMult?: number, manaReserve?: number, manaCost?: number, storedUses?: number }>
 * }} SkillData
 * @type {Map<string, SkillData>}
 */
const skillsByEffectId = new Map();

for (const file of skillFiles) {
  const text = fs.readFileSync(path.join(skillsDir, file), "utf8");

  // Find each skills["EffectId"] = { ... } block
  const skillBlockRe = /skills\["([^"]+)"\]\s*=\s*\{/g;
  let sm;
  while ((sm = skillBlockRe.exec(text)) !== null) {
    const effectId = sm[1];
    const blockStart = sm.index + sm[0].length;

    let depth = 1;
    let i = blockStart;
    while (i < text.length && depth > 0) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      i++;
    }
    const block = text.slice(blockStart, i - 1);

    const description = extractString(block, "description") ?? "";
    const castTime = extractNumber(block, "castTime");
    const support = extractBoolean(block, "support") ?? false;
    const statKeys = parseStatsArray(block);
    const skillTypes = parseSkillTypesMap(block, "skillTypes");
    const requireSkillTypes = parseSkillTypeExpression(block, "requireSkillTypes");
    const excludeSkillTypes = parseSkillTypeExpression(block, "excludeSkillTypes");
    const levels = parseLevels(block, statKeys.length);

    skillsByEffectId.set(effectId, {
      description,
      castTime,
      support,
      statKeys,
      skillTypes,
      requireSkillTypes,
      excludeSkillTypes,
      levels,
    });
  }
}

// --- Join and build output ---

/**
 * @typedef {{
 *   effectId: string,
 *   name: string,
 *   tags: string,
 *   description: string,
 *   castTime?: number,
 *   support: boolean,
 *   skillTypes: string[],
 *   requireSkillTypes: string[],
 *   excludeSkillTypes: string[],
 *   reqStr: number,
 *   reqDex: number,
 *   reqInt: number,
 *   maxLevel: number,
 *   levels: Array<object>
 * }} GemDetails
 * @type {Map<string, GemDetails>}
 */
const output = new Map();

for (const [gemId, meta] of gemMetaByGemId) {
  const skill = skillsByEffectId.get(meta.grantedEffectId);
  if (!skill) continue;

  output.set(gemId, {
    name: meta.name,
    effectId: meta.grantedEffectId,
    tags: meta.tagString,
    description: skill.description,
    castTime: skill.castTime,
    support: skill.support,
    skillTypes: skill.skillTypes,
    requireSkillTypes: skill.requireSkillTypes,
    excludeSkillTypes: skill.excludeSkillTypes,
    reqStr: meta.reqStr,
    reqDex: meta.reqDex,
    reqInt: meta.reqInt,
    maxLevel: meta.naturalMaxLevel,
    statKeys: skill.statKeys,
    levels: skill.levels,
  });
}

// --- Write TypeScript file ---

const lines = [
  "/* This file is generated by scripts/generate-gem-details.mjs — do not edit */",
  "",
  "export interface GemLevelData {",
  "  levelReq: number;",
  "  critChance?: number;",
  "  cooldown?: number;",
  "  damageMult?: number;",
  "  manaReserve?: number;",
  "  manaCost?: number;",
  "  manaMultiplier?: number;",
  "  storedUses?: number;",
  "  statValues?: number[];",
  "}",
  "",
  "export interface GemDetails {",
  "  name: string;",
  "  effectId: string;",
  "  tags: string;",
  "  description: string;",
  "  castTime?: number;",
  "  support: boolean;",
  "  skillTypes: string[];",
  "  requireSkillTypes: string[];",
  "  excludeSkillTypes: string[];",
  "  reqStr: number;",
  "  reqDex: number;",
  "  reqInt: number;",
  "  maxLevel: number;",
  "  statKeys: string[];",
  "  levels: GemLevelData[];",
  "}",
  "",
  "export const GEM_DETAILS: Record<string, GemDetails> = {",
];

for (const [gemId, details] of output) {
  const levelsStr = details.levels
    .map((lv) => {
      const parts = [`levelReq: ${lv.levelReq}`];
      if (lv.critChance != null) parts.push(`critChance: ${lv.critChance}`);
      if (lv.cooldown != null) parts.push(`cooldown: ${lv.cooldown}`);
      if (lv.damageMult != null) parts.push(`damageMult: ${roundTo(lv.damageMult, 4)}`);
      if (lv.manaReserve != null) parts.push(`manaReserve: ${lv.manaReserve}`);
      if (lv.manaCost != null) parts.push(`manaCost: ${lv.manaCost}`);
      if (lv.manaMultiplier != null) parts.push(`manaMultiplier: ${lv.manaMultiplier}`);
      if (lv.storedUses != null) parts.push(`storedUses: ${lv.storedUses}`);
      if (lv.statValues && lv.statValues.length > 0) parts.push(`statValues: [${lv.statValues.map(v => roundTo(v, 4)).join(", ")}]`);
      return `{${parts.join(", ")}}`;
    })
    .join(", ");

  const castTimeStr = details.castTime != null ? `castTime: ${details.castTime}, ` : "";
  const skillTypesStr =
    details.skillTypes.length > 0
      ? `skillTypes: [${details.skillTypes.map((type) => JSON.stringify(type)).join(", ")}], `
      : "skillTypes: [], ";
  const requireSkillTypesStr =
    details.requireSkillTypes.length > 0
      ? `requireSkillTypes: [${details.requireSkillTypes.map((type) => JSON.stringify(type)).join(", ")}], `
      : "requireSkillTypes: [], ";
  const excludeSkillTypesStr =
    details.excludeSkillTypes.length > 0
      ? `excludeSkillTypes: [${details.excludeSkillTypes.map((type) => JSON.stringify(type)).join(", ")}], `
      : "excludeSkillTypes: [], ";
  const statKeysStr = details.statKeys && details.statKeys.length > 0
    ? `statKeys: [${details.statKeys.map(k => JSON.stringify(k)).join(", ")}], `
    : "statKeys: [], ";

  lines.push(
    `  ${JSON.stringify(gemId)}: {`,
    `    name: ${JSON.stringify(details.name)},`,
    `    effectId: ${JSON.stringify(details.effectId)},`,
    `    tags: ${JSON.stringify(details.tags)},`,
    `    description: ${JSON.stringify(details.description)},`,
    `    ${castTimeStr}support: ${details.support}, ${skillTypesStr}${requireSkillTypesStr}${excludeSkillTypesStr}reqStr: ${details.reqStr}, reqDex: ${details.reqDex}, reqInt: ${details.reqInt},`,
    `    maxLevel: ${details.maxLevel}, ${statKeysStr}`,
    `    levels: [${levelsStr}],`,
    `  },`,
  );
}

lines.push("};", "");

fs.writeFileSync(outputPath, lines.join("\n"), "utf8");
console.log(`Written ${output.size} gem entries to ${outputPath}`);

// --- Helpers ---

function extractString(block, key) {
  const re = new RegExp(`\\b${key}\\s*=\\s*"([^"]*)"`, "");
  const m = re.exec(block);
  return m ? m[1] : undefined;
}

function extractNumber(block, key) {
  const re = new RegExp(`\\b${key}\\s*=\\s*(-?[\\d.]+)`, "");
  const m = re.exec(block);
  return m ? Number(m[1]) : undefined;
}

function extractBoolean(block, key) {
  const re = new RegExp(`\\b${key}\\s*=\\s*(true|false)`, "");
  const m = re.exec(block);
  return m ? m[1] === "true" : undefined;
}

function extractTableBlock(block, key) {
  const match = new RegExp(`\\b${key}\\s*=\\s*\\{`).exec(block);
  if (!match) return undefined;

  const start = match.index + match[0].length;
  let depth = 1;
  let i = start;
  while (i < block.length && depth > 0) {
    if (block[i] === "{") depth++;
    else if (block[i] === "}") depth--;
    i++;
  }

  return block.slice(start, i - 1);
}

function parseSkillTypesMap(block, key) {
  const table = extractTableBlock(block, key);
  if (!table) return [];

  return [...table.matchAll(/\[SkillType\.([A-Za-z0-9_]+)\]\s*=\s*true/g)].map((match) => match[1]);
}

function parseSkillTypeExpression(block, key) {
  const table = extractTableBlock(block, key);
  if (!table) return [];

  return [...table.matchAll(/SkillType\.([A-Za-z0-9_]+)/g)].map((match) => match[1]);
}

function parseStatsArray(skillBlock) {
  // Find stats = { "key1", "key2", ... } block
  const statsMatch = /\bstats\s*=\s*\{/.exec(skillBlock);
  if (!statsMatch) return [];

  const start = statsMatch.index + statsMatch[0].length;
  let depth = 1;
  let i = start;
  while (i < skillBlock.length && depth > 0) {
    if (skillBlock[i] === "{") depth++;
    else if (skillBlock[i] === "}") depth--;
    i++;
  }
  const block = skillBlock.slice(start, i - 1);

  const results = [];
  const keyRe = /"([^"]+)"/g;
  let m;
  while ((m = keyRe.exec(block)) !== null) {
    results.push(m[1]);
  }
  return results;
}

function parsePositionalValues(content, count) {
  if (count === 0) return [];
  // Positional values appear BEFORE any named field (word = ...)
  const namedFieldMatch = /\b[a-zA-Z]\w*\s*=/.exec(content);
  const positionalPart = namedFieldMatch ? content.slice(0, namedFieldMatch.index) : content;
  const numRe = /-?[\d]+(?:\.[\d]+)?(?:e[+-]?\d+)?/gi;
  const values = [];
  let m;
  while ((m = numRe.exec(positionalPart)) !== null && values.length < count) {
    values.push(Number(m[0]));
  }
  return values;
}

function parseLevels(skillBlock, statCount = 0) {
  // Find the levels = { ... } sub-block
  const levelsMatch = /\blevels\s*=\s*\{/.exec(skillBlock);
  if (!levelsMatch) return [];

  const levelsStart = levelsMatch.index + levelsMatch[0].length;
  let depth = 1;
  let i = levelsStart;
  while (i < skillBlock.length && depth > 0) {
    if (skillBlock[i] === "{") depth++;
    else if (skillBlock[i] === "}") depth--;
    i++;
  }
  const levelsBlock = skillBlock.slice(levelsStart, i - 1);

  const results = [];

  // Each line: [N] = { ..., levelRequirement = N, ... }
  const levelRe = /\[(\d+)\]\s*=\s*\{([^}]*)\}/g;
  let lm;
  while ((lm = levelRe.exec(levelsBlock)) !== null) {
    const content = lm[2];
    const levelReq = extractNumber(content, "levelRequirement") ?? 1;
    const critChance = extractNumber(content, "critChance");
    const cooldown = extractNumber(content, "cooldown");
    const damageEffectiveness = extractNumber(content, "damageEffectiveness");
    const manaReservationPercent = extractNumber(content, "manaReservationPercent");
    const manaMultiplier = extractNumber(content, "manaMultiplier");
    const storedUses = extractNumber(content, "storedUses");

    // Mana cost: cost = { Mana = N }
    let manaCost;
    const costMatch = /\bcost\s*=\s*\{([^}]*)\}/.exec(content);
    if (costMatch) {
      manaCost = extractNumber(costMatch[1], "Mana");
    }

    const statValues = parsePositionalValues(content, statCount);

    const entry = { levelReq };
    if (critChance != null) entry.critChance = critChance;
    if (cooldown != null) entry.cooldown = cooldown;
    if (damageEffectiveness != null) entry.damageMult = damageEffectiveness;
    if (manaReservationPercent != null) entry.manaReserve = manaReservationPercent;
    if (manaCost != null) entry.manaCost = manaCost;
    if (manaMultiplier != null) entry.manaMultiplier = manaMultiplier;
    if (storedUses != null) entry.storedUses = storedUses;
    if (statValues.length > 0) entry.statValues = statValues;

    results.push(entry);
  }

  return results;
}

function roundTo(n, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}
