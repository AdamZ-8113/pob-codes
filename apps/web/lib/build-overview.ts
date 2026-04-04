import type { BuildPayload } from "@pobcodes/shared-types";

import { getSecondaryAscendancyName } from "./ascendancy-names";
import { getSelectedSkillSet } from "./build-viewer-selection";
import { formatDisplayValue } from "./format-value";
import { GEM_DETAILS } from "./generated/gem-details";
import { PATCH_VERSION_NAMES } from "./generated/patch-version-names";

const wholeNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export type BuildSummaryTone =
  | "life"
  | "energy-shield"
  | "mana"
  | "ehp"
  | "fire"
  | "cold"
  | "lightning"
  | "chaos"
  | "dps";

export interface BuildSummaryEntry {
  annotation?: string;
  key: string;
  label: string;
  tone: BuildSummaryTone;
  value: string;
}

export interface BuildSummaryModel {
  metrics: BuildSummaryEntry[];
  resistances: BuildSummaryEntry[];
}

export interface BuildRecentSnapshot {
  dps?: string;
  ehp?: string;
  energyShield?: string;
  guardAnnotation?: string;
  level?: number;
  life?: string;
  mana?: string;
  patchVersion?: string;
  resistances?: string;
  title: string;
}

export function buildLoadoutTitle(
  payload: BuildPayload,
  skillSetId?: number,
  secondaryAscendancyName?: string,
): string {
  const parts = [
    getPrimarySkillTitle(payload, skillSetId),
    formatClassTitle(payload.build.className, payload.build.ascendClassName),
    secondaryAscendancyName?.trim(),
  ].filter((value): value is string => Boolean(value));

  return parts.join(" / ");
}

export function formatBuildTitleWithLevel(title: string, level?: number) {
  if (!Number.isFinite(level) || (level ?? 0) <= 0) {
    return title;
  }

  return `${title} (Level ${level})`;
}

function findSummaryMetric(entries: BuildSummaryEntry[], tone: BuildSummaryEntry["tone"]) {
  return entries.find((entry) => entry.tone === tone);
}

export function buildBuildSummaryEntries(payload: BuildPayload, skillSetId?: number): BuildSummaryModel {
  const stats = payload.stats.player;
  const metrics: BuildSummaryEntry[] = [];
  const resistances: BuildSummaryEntry[] = [];
  const guardSkillAnnotation = getGuardSkillAnnotation(payload, skillSetId);

  addBuildSummaryEntry(metrics, "Life", "Life", "life", stats.Life);
  addBuildSummaryEntry(metrics, "EnergyShield", "ES", "energy-shield", stats.EnergyShield);
  addBuildSummaryEntry(metrics, "Mana", "Mana", "mana", stats.Mana);
  addBuildSummaryEntry(metrics, "TotalEHP", "eHP", "ehp", stats.TotalEHP, "", guardSkillAnnotation);
  const dpsSummary = getBuildSummaryDps(stats);
  if (dpsSummary) {
    addBuildSummaryEntry(metrics, "summary-dps", dpsSummary.label, "dps", dpsSummary.value);
  }

  addBuildSummaryEntry(resistances, "FireResist", "Fire", "fire", stats.FireResist, "%");
  addBuildSummaryEntry(resistances, "ColdResist", "Cold", "cold", stats.ColdResist, "%");
  addBuildSummaryEntry(resistances, "LightningResist", "Light", "lightning", stats.LightningResist, "%");
  addBuildSummaryEntry(resistances, "ChaosResist", "Chaos", "chaos", stats.ChaosResist, "%");

  return {
    metrics,
    resistances,
  };
}

export function buildRecentBuildSnapshot(payload: BuildPayload): BuildRecentSnapshot {
  const activeTree = payload.treeSpecs[payload.activeTreeIndex];
  const summary = buildBuildSummaryEntries(payload, payload.activeSkillSetId);
  const lifeMetric = findSummaryMetric(summary.metrics, "life");
  const energyShieldMetric = findSummaryMetric(summary.metrics, "energy-shield");
  const manaMetric = findSummaryMetric(summary.metrics, "mana");
  const ehpMetric = findSummaryMetric(summary.metrics, "ehp");
  const dpsSummary = getBuildSummaryDps(payload.stats.player);

  return {
    dps: dpsSummary ? formatBuildSummaryValue(dpsSummary.value) : undefined,
    ehp: ehpMetric?.value ?? formatOptionalBuildSummaryValue(payload.stats.player.TotalEHP),
    energyShield: energyShieldMetric?.value,
    guardAnnotation: formatRecentGuardAnnotation(ehpMetric?.annotation),
    level: payload.build.level,
    life: lifeMetric?.value,
    mana: manaMetric?.value,
    patchVersion: resolveBuildPatchVersion(payload, payload.activeTreeIndex),
    resistances: summary.resistances.map((entry) => entry.value).join("/"),
    title: buildLoadoutTitle(
      payload,
      payload.activeSkillSetId,
      getSecondaryAscendancyName(activeTree?.secondaryAscendancyId),
    ),
  };
}

function formatRecentGuardAnnotation(annotation: string | undefined): string | undefined {
  if (annotation === "Guard Skill ON") {
    return "w/Guard";
  }

  if (annotation === "Guard Skill OFF") {
    return "w/o Guard";
  }

  return undefined;
}

export function resolveBuildPatchVersion(payload: BuildPayload, treeIndex?: number): string | undefined {
  return formatPatchVersionLabel(resolveBuildPatchVersionKey(payload, treeIndex));
}

export function formatPatchVersionLabel(value: string | undefined): string | undefined {
  const normalizedVersion = normalizePatchVersion(value);
  if (!normalizedVersion) {
    return undefined;
  }

  const patchName = PATCH_VERSION_NAMES[normalizedVersion as keyof typeof PATCH_VERSION_NAMES];
  return patchName ? `${normalizedVersion} ${patchName}` : normalizedVersion;
}

function resolveBuildPatchVersionKey(payload: BuildPayload, treeIndex?: number): string | undefined {
  const candidateVersions = [
    payload.treeSpecs[treeIndex ?? payload.activeTreeIndex]?.version,
    payload.treeSpecs[payload.activeTreeIndex]?.version,
    ...payload.treeSpecs.map((treeSpec) => treeSpec.version),
    payload.build.targetVersion,
  ];

  for (const candidateVersion of candidateVersions) {
    const normalizedVersion = normalizePatchVersion(candidateVersion);
    if (normalizedVersion) {
      return normalizedVersion;
    }
  }

  return undefined;
}

function getPrimarySkillTitle(payload: BuildPayload, skillSetId?: number): string | undefined {
  const skillSet = getSelectedSkillSet(payload, skillSetId);
  if (!skillSet) {
    return undefined;
  }

  const groupIndex = Math.max((payload.build?.mainSocketGroup ?? 1) - 1, 0);
  const candidateGroups = dedupeGroups([
    skillSet.groups[groupIndex],
    ...skillSet.groups.filter((group) => group.enabled && group.gems.some((gem) => gem.enabled && gem.selected && !gem.support)),
    ...skillSet.groups.filter((group) => group.enabled && group.gems.some((gem) => gem.enabled && !gem.support)),
    ...skillSet.groups,
  ]);

  for (const group of candidateGroups) {
    const indexedGem = group.gems[Math.max(group.mainActiveSkill - 1, 0)];
    const selectedGem =
      group.gems.find((gem) => gem.enabled && gem.selected && !gem.support) ??
      (indexedGem?.enabled && !indexedGem.support ? indexedGem : undefined) ??
      group.gems.find((gem) => gem.enabled && !gem.support);

    const normalizedName = selectedGem?.nameSpec?.trim();
    if (normalizedName) {
      return normalizedName;
    }
  }

  return undefined;
}

function dedupeGroups(groups: Array<BuildPayload["skillSets"][number]["groups"][number] | undefined>) {
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

function formatClassTitle(className?: string, ascendClassName?: string): string | undefined {
  const normalizedClassName = className?.trim();
  const normalizedAscendancyName = ascendClassName?.trim();

  if (normalizedAscendancyName && normalizedClassName && normalizedAscendancyName !== normalizedClassName) {
    return `${normalizedAscendancyName} (${normalizedClassName})`;
  }

  return normalizedAscendancyName || normalizedClassName;
}

function addBuildSummaryEntry(
  entries: BuildSummaryEntry[],
  key: string,
  label: string,
  tone: BuildSummaryTone,
  rawValue: string | undefined,
  suffix = "",
  annotation?: string,
) {
  if (!rawValue) {
    return;
  }

  entries.push({
    key,
    label,
    tone,
    annotation,
    value: `${formatBuildSummaryValue(rawValue)}${suffix}`,
  });
}

function getGuardSkillAnnotation(payload: BuildPayload, skillSetId?: number): string | undefined {
  const skillSets = payload.skillSets ?? [];
  const skillSet =
    skillSets.find((set) => set.id === skillSetId) ??
    skillSets.find((set) => set.active) ??
    skillSets[0];
  if (!skillSet) {
    return undefined;
  }

  let hasGuardSkill = false;
  let hasEnabledGuardSkill = false;

  for (const group of skillSet.groups) {
    for (const gem of group.gems) {
      if (gem.support || !isGuardSkillGem(gem)) {
        continue;
      }

      hasGuardSkill = true;
      if (group.enabled && gem.enabled) {
        hasEnabledGuardSkill = true;
      }
    }
  }

  if (!hasGuardSkill) {
    return undefined;
  }

  return hasEnabledGuardSkill ? "Guard Skill ON" : "Guard Skill OFF";
}

function isGuardSkillGem(gem: BuildPayload["skillSets"][number]["groups"][number]["gems"][number]) {
  if (gem.gemId) {
    const details = GEM_DETAILS[gem.gemId];
    if (details) {
      return !details.support && details.skillTypes.includes("Guard");
    }
  }

  return GUARD_SKILL_NAMES.has(normalizeGemName(gem.nameSpec));
}

function normalizeGemName(value: string) {
  return value.trim().toLowerCase();
}

const GUARD_SKILL_NAMES = new Set(
  Object.values(GEM_DETAILS)
    .filter((details) => !details.support && details.skillTypes.includes("Guard"))
    .map((details) => normalizeGemName(details.name)),
);

function getBuildSummaryDps(stats: Record<string, string>) {
  const fullDps = getUsableSummaryStat(stats.FullDPS);
  if (fullDps) {
    return {
      label: "Full DPS",
      value: fullDps,
    };
  }

  const combinedDps = getUsableSummaryStat(stats.CombinedDPS);
  if (combinedDps) {
    return {
      label: "Combined DPS",
      value: combinedDps,
    };
  }

  const hitDps = getUsableSummaryStat(stats.TotalDPS);
  if (hitDps) {
    return {
      label: "Hit DPS",
      value: hitDps,
    };
  }

  return undefined;
}

function getUsableSummaryStat(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const numericValue = Number(trimmed.replace(/,/g, ""));
  if (Number.isFinite(numericValue) && numericValue === 0) {
    return undefined;
  }

  return trimmed;
}

function formatOptionalBuildSummaryValue(value: string | undefined) {
  if (!value?.trim()) {
    return undefined;
  }

  return formatBuildSummaryValue(value);
}

function formatBuildSummaryValue(value: string | number | boolean): string {
  if (typeof value === "boolean") {
    return formatDisplayValue(value);
  }

  const raw = typeof value === "number" ? String(value) : String(value).trim();
  const numeric = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    return formatDisplayValue(value);
  }

  return wholeNumberFormatter.format(numeric);
}

function normalizePatchVersion(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const match = trimmed.match(/^(\d+)[._](\d+)/);
  if (match) {
    return `${match[1]}.${match[2]}`;
  }

  return trimmed;
}
