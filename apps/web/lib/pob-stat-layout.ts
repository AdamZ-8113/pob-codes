import type { BuildPayload } from "@pobcodes/shared-types";

import { formatDisplayValue } from "./format-value";
import { GEM_DETAILS, type GemDetails } from "./generated/gem-details";
import {
  POB_EXTRA_SAVE_STAT_LAYOUT,
  POB_MINION_STAT_LAYOUT,
  POB_PLAYER_STAT_LAYOUT,
  type PobStatLayoutEntry,
} from "./generated/pob-stat-layout";

export interface ExportedStatRowDisplay {
  color?: string;
  gapBefore: boolean;
  key: string;
  label: string;
  section: number;
  value: string;
}

interface StatDisplayContext {
  skillFlags: Set<string>;
}

const EXTRA_STAT_COLORS: Record<string, string> = {
  EnduranceCharges: "#FF9922",
  FrenzyCharges: "#33FF77",
  PowerCharges: "#7070FF",
};

const playerLayoutEntries = [...POB_PLAYER_STAT_LAYOUT, ...POB_EXTRA_SAVE_STAT_LAYOUT];
const minionLayoutEntries = POB_MINION_STAT_LAYOUT;
const playerStatMap = buildLayoutMap(playerLayoutEntries);
const minionStatMap = buildLayoutMap(minionLayoutEntries);
const playerOverCapParents = buildOverCapParentMap(playerLayoutEntries);
const minionOverCapParents = buildOverCapParentMap(minionLayoutEntries);

const REQUIREMENT_STAT_FOR_PRIMARY: Record<string, string> = {
  Dex: "ReqDex",
  Int: "ReqInt",
  Omni: "ReqOmni",
  Str: "ReqStr",
};

const PRIMARY_STAT_FOR_REQUIREMENT: Record<string, string> = Object.fromEntries(
  Object.entries(REQUIREMENT_STAT_FOR_PRIMARY).map(([primary, requirement]) => [requirement, primary]),
);
const CHARGE_MAX_STAT_FOR_CURRENT: Record<string, string> = {
  EnduranceCharges: "EnduranceChargesMax",
  FrenzyCharges: "FrenzyChargesMax",
  PowerCharges: "PowerChargesMax",
};
const GEM_DETAILS_BY_EFFECT_ID = new Map<string, GemDetails>(
  Object.values(GEM_DETAILS).map((details) => [details.effectId, details]),
);
const GEM_DETAILS_BY_NAME = new Map<string, GemDetails>(
  Object.values(GEM_DETAILS).map((details) => [normalizeSupportGemName(details.name), details]),
);
const SKILL_TYPE_TO_DISPLAY_FLAGS: Record<string, string[]> = {
  Attack: ["attack"],
  Brand: ["brand"],
  Duration: ["duration"],
  Projectile: ["projectile"],
  ProjectilesFromUser: ["projectile"],
  Spell: ["spell"],
  Warcry: ["warcry"],
};
const SUPPORT_GEMS_THAT_SKIP_EFFECTIVE_RATE = new Set(["automation", "autoexertion", "call to arms", "spellslinger"]);

export function buildPlayerStatRowsForDisplay(payload: BuildPayload): ExportedStatRowDisplay[] {
  return buildStatRowsForDisplay(
    payload.stats.playerRows,
    payload.stats.player,
    playerLayoutEntries,
    playerStatMap,
    playerOverCapParents,
    buildStatDisplayContext(payload),
  );
}

export function buildPlayerMaxHitRowsForDisplay(payload: BuildPayload): ExportedStatRowDisplay[] {
  return buildPlayerStatRowsForDisplay(payload).filter((row) => row.key.endsWith("MaximumHitTaken"));
}

export function buildMinionStatRowsForDisplay(payload: BuildPayload): ExportedStatRowDisplay[] {
  return buildStatRowsForDisplay(
    payload.stats.minionRows,
    payload.stats.minion,
    minionLayoutEntries,
    minionStatMap,
    minionOverCapParents,
    buildStatDisplayContext(payload),
  );
}

function buildStatRowsForDisplay(
  rows: BuildPayload["stats"]["playerRows"] | BuildPayload["stats"]["minionRows"],
  statValues: Record<string, string>,
  layoutEntries: PobStatLayoutEntry[],
  layoutMap: Map<string, PobStatLayoutEntry>,
  overCapParentMap: Map<string, string>,
  context: StatDisplayContext,
): ExportedStatRowDisplay[] {
  const hiddenStats = new Set<string>();
  const visibleRows = rows
    .map((row) => {
      if (hiddenStats.has(row.stat)) {
        return undefined;
      }

      const metadata = resolveStatLayoutEntry(row.stat, statValues, layoutEntries, context) ?? layoutMap.get(row.stat);
      const combinedChargeRow = buildCombinedChargeRow(row.stat, row.value, statValues, layoutEntries, layoutMap, context);
      if (combinedChargeRow) {
        hiddenStats.add(combinedChargeRow.maxKey);
        return combinedChargeRow.row;
      }

      if (shouldHideStatRow(row.stat, row.value, statValues, metadata, overCapParentMap)) {
        return undefined;
      }

      return {
        color: resolveStatDisplayColor(row.stat, metadata),
        key: row.stat,
        label: resolveStatLabel(row.stat, metadata, statValues),
        section: metadata?.section ?? Number.MAX_SAFE_INTEGER,
        value: buildDisplayValue(row.stat, row.value, statValues, metadata, layoutMap),
      };
    })
    .filter((row): row is Omit<ExportedStatRowDisplay, "gapBefore"> => row !== undefined);

  return visibleRows.map((row, index) => ({
    ...row,
    gapBefore: index > 0 && visibleRows[index - 1]?.section !== row.section,
  }));
}

function buildLayoutMap(entries: PobStatLayoutEntry[]): Map<string, PobStatLayoutEntry> {
  const map = new Map<string, PobStatLayoutEntry>();
  for (const entry of entries) {
    if (!map.has(entry.key)) {
      map.set(entry.key, entry);
    }
  }
  return map;
}

function buildCombinedChargeRow(
  statKey: string,
  rawValue: string,
  statValues: Record<string, string>,
  layoutEntries: PobStatLayoutEntry[],
  layoutMap: Map<string, PobStatLayoutEntry>,
  context: StatDisplayContext,
): { maxKey: string; row: Omit<ExportedStatRowDisplay, "gapBefore"> } | undefined {
  const maxKey = CHARGE_MAX_STAT_FOR_CURRENT[statKey];
  if (!maxKey) {
    return undefined;
  }

  const maxRawValue = statValues[maxKey];
  if (maxRawValue == null || (statNumber(maxRawValue) ?? 0) <= 0) {
    return undefined;
  }

  const metadata = resolveStatLayoutEntry(statKey, statValues, layoutEntries, context) ?? layoutMap.get(statKey);
  const maxMetadata = resolveStatLayoutEntry(maxKey, statValues, layoutEntries, context) ?? layoutMap.get(maxKey);

  return {
    maxKey,
    row: {
      color: resolveStatDisplayColor(statKey, metadata),
      key: statKey,
      label: resolveStatLabel(statKey, metadata, statValues),
      section: metadata?.section ?? maxMetadata?.section ?? Number.MAX_SAFE_INTEGER,
      value: `${formatPobStatValue(rawValue, metadata)}/${formatPobStatValue(maxRawValue, maxMetadata)}`,
    },
  };
}

function resolveStatLayoutEntry(
  statKey: string,
  statValues: Record<string, string>,
  layoutEntries: PobStatLayoutEntry[],
  context: StatDisplayContext,
): PobStatLayoutEntry | undefined {
  const matches = layoutEntries.filter((entry) => entry.key === statKey);
  if (matches.length === 0) {
    return undefined;
  }

  const contextualMatches = matches.filter((entry) => matchesDisplayFlags(entry, context.skillFlags));
  if (contextualMatches.length > 0) {
    return (
      contextualMatches.find((entry) => entry.label && passesKnownStatVariantConditions(statKey, entry.label, statValues)) ??
      contextualMatches[0]
    );
  }

  return matches.find((entry) => entry.label && passesKnownStatVariantConditions(statKey, entry.label, statValues)) ?? matches[0];
}

function matchesDisplayFlags(entry: PobStatLayoutEntry, skillFlags: Set<string>): boolean {
  if (entry.flags && entry.flags.some((flag) => !skillFlags.has(flag))) {
    return false;
  }

  if (entry.notFlags && entry.notFlags.some((flag) => skillFlags.has(flag))) {
    return false;
  }

  return true;
}

function passesKnownStatVariantConditions(statKey: string, label: string, statValues: Record<string, string>): boolean {
  const triggerTime = statNumber(statValues.TriggerTime);

  if (statKey === "Speed") {
    if (label === "Effective Trigger Rate") {
      return (triggerTime ?? 0) !== 0;
    }

    if (label === "Attack Rate" || label === "Cast Rate" || label === "Attack/Cast Rate") {
      return (statNumber(statValues.Speed) ?? 0) > 0 && (triggerTime ?? 0) === 0;
    }
  }

  if (statKey === "HitSpeed" || statKey === "HitTime" || statKey === "TotemPlacementTime") {
    return triggerTime == null;
  }

  if (statKey === "LightningMaximumHitTaken") {
    const fire = statValues.FireMaximumHitTaken;
    const cold = statValues.ColdMaximumHitTaken;
    const lightning = statValues.LightningMaximumHitTaken;
    const allEqual = fire != null && cold != null && lightning != null && fire === cold && cold === lightning;
    return label === (allEqual ? "Elemental Max Hit" : "Lightning Max Hit");
  }

  if (statKey === "LifeRegenRecovery") {
    return label === ((statNumber(statValues.LifeRecovery) ?? 0) > 0 ? "Life Recovery" : "Life Regen");
  }

  if (statKey === "ManaRegenRecovery") {
    return label === ((statNumber(statValues.ManaRecovery) ?? 0) > 0 ? "Mana Recovery" : "Mana Regen");
  }

  if (statKey === "EnergyShieldRegenRecovery") {
    return label === ((statNumber(statValues.EnergyShieldRecovery) ?? 0) > 0 ? "ES Recovery" : "ES Regen");
  }

  return true;
}

function buildStatDisplayContext(payload: BuildPayload): StatDisplayContext {
  return {
    skillFlags: inferMainSkillFlags(payload),
  };
}

function inferMainSkillFlags(payload: BuildPayload): Set<string> {
  const flags = new Set<string>();
  const skillSets = payload.skillSets ?? [];
  const activeSkillSet =
    skillSets.find((set) => set.id === payload.activeSkillSetId) ??
    skillSets.find((set) => set.active) ??
    skillSets[0];
  if (!activeSkillSet) {
    return flags;
  }

  const groupIndex = Math.max((payload.build?.mainSocketGroup ?? 1) - 1, 0);
  const activeGroup = selectPrimarySkillGroup(activeSkillSet.groups, groupIndex);
  if (!activeGroup) {
    return flags;
  }

  const mainGem = selectPrimaryActiveGem(activeGroup);
  const mainGemDetails = mainGem ? resolveGemDetails(mainGem) : undefined;
  if (mainGemDetails) {
    for (const skillType of mainGemDetails.skillTypes) {
      for (const displayFlag of SKILL_TYPE_TO_DISPLAY_FLAGS[skillType] ?? []) {
        flags.add(displayFlag);
      }
    }
  }

  for (const gem of activeGroup.gems) {
    if (!gem.enabled || !gem.support) {
      continue;
    }

    const name = normalizeSupportGemName(gem.nameSpec);
    if (SUPPORT_GEMS_THAT_SKIP_EFFECTIVE_RATE.has(name)) {
      flags.add("skipEffectiveRate");
    }
    if (name === "mirage archer") {
      flags.add("mirageArcher");
    }
    if (name === "sacred wisps") {
      flags.add("wisp");
    }
  }

  return flags;
}

function selectPrimarySkillGroup(
  groups: BuildPayload["skillSets"][number]["groups"],
  groupIndex: number,
): BuildPayload["skillSets"][number]["groups"][number] | undefined {
  return dedupeSkillGroups([
    groups[groupIndex],
    ...groups.filter((group) => group.enabled && group.gems.some((gem) => gem.enabled && gem.selected && !gem.support)),
    ...groups.filter((group) => group.enabled && group.gems.some((gem) => gem.enabled && !gem.support)),
    ...groups,
  ])[0];
}

function selectPrimaryActiveGem(group: BuildPayload["skillSets"][number]["groups"][number]) {
  const indexedGem = group.gems[Math.max(group.mainActiveSkill - 1, 0)];
  return (
    group.gems.find((gem) => gem.enabled && gem.selected && !gem.support) ??
    (indexedGem?.enabled && !indexedGem.support ? indexedGem : undefined) ??
    group.gems.find((gem) => gem.enabled && !gem.support)
  );
}

function dedupeSkillGroups(groups: Array<BuildPayload["skillSets"][number]["groups"][number] | undefined>) {
  const seen = new Set<string>();
  const deduped: BuildPayload["skillSets"][number]["groups"][number][] = [];

  for (const group of groups) {
    if (!group || seen.has(group.id)) {
      continue;
    }

    seen.add(group.id);
    deduped.push(group);
  }

  return deduped;
}

function resolveGemDetails(gem: BuildPayload["skillSets"][number]["groups"][number]["gems"][number]) {
  if (gem.gemId && GEM_DETAILS[gem.gemId]) {
    return GEM_DETAILS[gem.gemId];
  }

  if (gem.skillId && GEM_DETAILS_BY_EFFECT_ID.has(gem.skillId)) {
    return GEM_DETAILS_BY_EFFECT_ID.get(gem.skillId);
  }

  const name = gem.nameSpec.trim();
  if (!name) {
    return undefined;
  }

  return GEM_DETAILS_BY_NAME.get(normalizeSupportGemName(name));
}

function normalizeSupportGemName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+support$/, "");
}

function resolveStatLabel(
  statKey: string,
  metadata: PobStatLayoutEntry | undefined,
  statValues: Record<string, string>,
): string {
  if (metadata?.label) {
    return metadata.label;
  }

  if (statKey === "LightningMaximumHitTaken") {
    const fire = statValues.FireMaximumHitTaken;
    const cold = statValues.ColdMaximumHitTaken;
    const lightning = statValues.LightningMaximumHitTaken;
    if (fire != null && cold != null && lightning != null && fire === cold && cold === lightning) {
      return "Elemental Max Hit";
    }

    return "Lightning Max Hit";
  }

  return humanizeStatKey(statKey);
}

function resolveStatDisplayColor(statKey: string, metadata: PobStatLayoutEntry | undefined): string | undefined {
  return metadata?.color ?? EXTRA_STAT_COLORS[statKey];
}

function buildOverCapParentMap(entries: PobStatLayoutEntry[]): Map<string, string> {
  return new Map(entries.filter((entry) => entry.overCapStat).map((entry) => [entry.overCapStat as string, entry.key]));
}

function humanizeStatKey(value: string): string {
  return value
    .replace(/^Spec:/, "%Inc ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\bDPS\b/g, "DPS")
    .trim();
}

function isZeroStatValue(value: string): boolean {
  const trimmed = value.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return false;
  }

  return Number(trimmed) === 0;
}

function shouldHideStatRow(
  statKey: string,
  rawValue: string,
  statValues: Record<string, string>,
  metadata: PobStatLayoutEntry | undefined,
  overCapParentMap: Map<string, string>,
): boolean {
  if (metadata?.hidden || isZeroStatValue(rawValue)) {
    return true;
  }

  const requirementParent = PRIMARY_STAT_FOR_REQUIREMENT[statKey];
  if (requirementParent && statValues[requirementParent] != null) {
    return true;
  }

  const overCapParent = overCapParentMap.get(statKey);
  if (overCapParent && statValues[overCapParent] != null) {
    return true;
  }

  return !passesPobVisibility(statKey, rawValue, statValues);
}

function passesPobVisibility(statKey: string, rawValue: string, statValues: Record<string, string>): boolean {
  const value = statNumber(rawValue);

  switch (statKey) {
    case "AverageBurstDamage":
      return (statNumber(statValues.AverageBurstHits) ?? 0) > 1 && (value ?? 0) > 0;
    case "CritChance":
      return value !== statNumber(statValues.PreEffectiveCritChance);
    case "CritMultiplier":
      return (statNumber(statValues.CritChance) ?? 0) > 0;
    case "WithDotDPS":
      return value !== statNumber(statValues.TotalDPS) && allZero(statValues, ["PoisonDPS", "IgniteDPS", "ImpaleDPS", "BleedDPS"]);
    case "WithBleedDPS":
      return value !== statNumber(statValues.TotalDPS) && allZero(statValues, ["TotalDot", "PoisonDPS", "ImpaleDPS", "IgniteDPS"]);
    case "WithIgniteDPS":
      return value !== statNumber(statValues.TotalDPS) && allZero(statValues, ["TotalDot", "PoisonDPS", "ImpaleDPS", "BleedDPS"]);
    case "WithPoisonDPS":
      return value !== statNumber(statValues.TotalDPS) && allZero(statValues, ["TotalDot", "IgniteDPS", "ImpaleDPS", "BleedDPS"]);
    case "WithImpaleDPS":
      return value !== statNumber(statValues.TotalDPS) && allZero(statValues, ["TotalDot", "IgniteDPS", "PoisonDPS", "BleedDPS"]);
    case "TotalDotDPS":
      return !matchesAny(value, [
        statNumber(statValues.TotalDot),
        statNumber(statValues.TotalPoisonDPS),
        statNumber(statValues.CausticGroundDPS),
        statNumber(statValues.TotalIgniteDPS) ?? statNumber(statValues.IgniteDPS),
        statNumber(statValues.BurningGroundDPS),
        statNumber(statValues.BleedDPS),
        statNumber(statValues.CorruptingBloodDPS),
        statNumber(statValues.MirageCausticGroundDPS),
        statNumber(statValues.MirageBurningGroundDPS),
      ]);
    case "CombinedDPS":
      return (
        value !== (statNumber(statValues.TotalDPS) ?? 0) + (statNumber(statValues.TotalDot) ?? 0) &&
        value !== statNumber(statValues.WithImpaleDPS) &&
        value !== statNumber(statValues.WithPoisonDPS) &&
        value !== statNumber(statValues.WithIgniteDPS) &&
        value !== statNumber(statValues.WithBleedDPS)
      );
    default:
      return true;
  }
}

function buildDisplayValue(
  statKey: string,
  rawValue: string,
  statValues: Record<string, string>,
  metadata: PobStatLayoutEntry | undefined,
  layoutMap: Map<string, PobStatLayoutEntry>,
): string {
  let displayValue = formatPobStatValue(rawValue, metadata);

  const requirementKey = REQUIREMENT_STAT_FOR_PRIMARY[statKey];
  const requirementValue = requirementKey ? statValues[requirementKey] : undefined;
  if (requirementValue != null && (statNumber(requirementValue) ?? 0) > 0) {
    const requirementFormat = layoutMap.get(requirementKey)?.fmt;
    displayValue += ` (${formatPobStatValue(requirementValue, requirementFormat ? { fmt: requirementFormat } : undefined)} req)`;
  }

  const overCapStat = metadata?.overCapStat;
  const overCapValue = overCapStat ? statValues[overCapStat] : undefined;
  if (overCapStat != null && overCapValue != null && (statNumber(overCapValue) ?? 0) > 0) {
    const overCapFormat = ensurePositiveFormat(layoutMap.get(overCapStat)?.fmt ?? "d%%");
    displayValue += ` (${formatPobStatValue(overCapValue, { fmt: overCapFormat })})`;
  }

  return displayValue;
}

function ensurePositiveFormat(fmt: string): string {
  return fmt.startsWith("+") ? fmt : `+${fmt}`;
}

function formatPobStatValue(rawValue: string, metadata?: Pick<PobStatLayoutEntry, "fmt" | "pc">): string {
  const trimmed = rawValue.trim();
  if (!/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return trimmed;
  }

  const baseNumeric = Number(trimmed);
  const numeric = metadata?.pc ? baseNumeric * 100 : baseNumeric;
  if (!Number.isFinite(numeric)) {
    return trimmed;
  }

  const fmt = metadata?.fmt;
  if (!fmt) {
    return formatDisplayValue(numeric);
  }

  const prefix = fmt.startsWith("+") && numeric > 0 ? "+" : "";
  const suffix = fmt.endsWith("%%") ? "%" : fmt.endsWith("s") ? "s" : fmt.endsWith("m") ? "m" : "";

  if (fmt.includes("d")) {
    return `${prefix}${formatIntegerValue(Math.round(numeric))}${suffix}`;
  }

  const precision = fmt.match(/\.(\d+)f/)?.[1];
  if (precision != null) {
    return `${prefix}${formatDecimalValue(numeric, Number(precision))}${suffix}`;
  }

  return `${prefix}${formatDisplayValue(numeric)}${suffix}`;
}

function formatIntegerValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDecimalValue(value: number, maxFractionDigits: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

function statNumber(value: string | undefined): number | undefined {
  if (value == null) {
    return undefined;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function matchesAny(value: number | undefined, candidates: Array<number | undefined>): boolean {
  if (value == null) {
    return false;
  }

  return candidates.some((candidate) => candidate != null && candidate === value);
}

function allZero(statValues: Record<string, string>, keys: string[]): boolean {
  return keys.every((key) => {
    const value = statNumber(statValues[key]);
    return value == null || value === 0;
  });
}
