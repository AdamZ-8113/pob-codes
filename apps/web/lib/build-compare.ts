import type { BuildPayload, ConfigSetPayload, GemPayload, ItemPayload, ItemSetPayload, SkillSetPayload, TreeSpecPayload } from "@pobcodes/shared-types";

import { buildApiUrl } from "./api-base";
import { getSecondaryAscendancyName } from "./ascendancy-names";
import {
  getInitialBuildViewerSelection,
  getSelectedConfigSet,
  getSelectedItemSet,
  getSelectedSkillSet,
  getSelectedTreeSpec,
  type BuildViewerSelection,
} from "./build-viewer-selection";
import { GENERATED_TREE_MANIFEST } from "./generated/tree-manifest";
import { GEM_DETAILS, type GemDetails } from "./generated/gem-details";
import { isWeaponSwapSlot } from "./weapon-swap";
import {
  augmentPassiveTreeLayoutWithClusters,
  describePassiveTreeNode,
  pickPassiveTreeVariant,
  type PassiveTreeLayout,
  type PassiveTreeLayoutNode,
  type PassiveTreeManifest,
} from "./passive-tree";
import { buildConfigDisplaySections } from "./pob-config-display";

export interface BuildCompareRow {
  currentValue: string;
  highlight?: boolean;
  key: string;
  name: string;
  targetValue: string;
}

export interface BuildCompareFinding {
  kind?: "default" | "item";
  key: string;
  rows: BuildCompareRow[];
  severity: "major" | "notable";
  title: string;
}

export interface BuildCompareReport {
  findings: BuildCompareFinding[];
  targetSummary: string;
}

interface BuildCompareTreeContext {
  nodeIndex: Map<number, PassiveTreeLayoutNode>;
  spec?: TreeSpecPayload;
}

interface ComparedGem {
  level: number;
  quality: number;
}

interface ComparedGemCollections {
  allGems: Map<string, ComparedGem>;
  skillGems: Map<string, ComparedGem>;
  supportLinks: Map<string, ComparedGem>;
}

interface ComparedConfigRow {
  configKey: string;
  key: string;
  label: string;
  section: string;
  type: "custom" | "toggle" | "value";
  value?: string;
}

interface BuildCompareSelectionContext {
  configSet?: ConfigSetPayload;
  itemSet?: ItemSetPayload;
  itemsById: Map<number, ItemPayload>;
  payload: BuildPayload;
  skillSet?: SkillSetPayload;
  tree?: BuildCompareTreeContext;
  treeSpec?: TreeSpecPayload;
}

const TREE_MANIFEST = GENERATED_TREE_MANIFEST as PassiveTreeManifest;
const GEM_DETAILS_BY_NAME = new Map<string, GemDetails>(
  Object.values(GEM_DETAILS).map((details) => [normalizeGemCompareName(details.name), details]),
);
const GEM_DETAILS_BY_EFFECT_ID = new Map<string, GemDetails>(
  Object.values(GEM_DETAILS).map((details) => [details.effectId, details]),
);

export async function compareBuildAgainstInput(
  currentPayload: BuildPayload,
  currentSelection: BuildViewerSelection,
  input: string,
): Promise<BuildCompareReport> {
  const targetPayload = await fetchComparedBuildPayload(input);
  const targetSelection = getInitialBuildViewerSelection(targetPayload);
  const [currentTree, targetTree] = await Promise.all([
    loadCompareTreeContext(currentPayload, currentSelection),
    loadCompareTreeContext(targetPayload, targetSelection),
  ]);

  return buildBuildComparisonReport(currentPayload, currentSelection, targetPayload, targetSelection, currentTree, targetTree);
}

export function buildBuildComparisonReport(
  currentPayload: BuildPayload,
  currentSelection: BuildViewerSelection,
  targetPayload: BuildPayload,
  targetSelection: BuildViewerSelection,
  currentTree?: BuildCompareTreeContext,
  targetTree?: BuildCompareTreeContext,
): BuildCompareReport {
  const currentContext = buildSelectionContext(currentPayload, currentSelection, currentTree);
  const targetContext = buildSelectionContext(targetPayload, targetSelection, targetTree);
  const findings = [
    buildConfigFinding(currentContext, targetContext),
    buildMissingSkillGemsFinding(currentContext, targetContext),
    buildMissingSupportGemsFinding(currentContext, targetContext),
    buildGemLevelsAndQualityFinding(currentContext, targetContext),
    buildItemFinding(currentContext, targetContext),
    buildAnointFinding(currentContext, targetContext),
    buildUniqueVariantFinding(currentContext, targetContext),
    buildPassiveTreeFinding(currentContext, targetContext),
  ].filter((finding): finding is BuildCompareFinding => Boolean(finding));

  return {
    findings,
    targetSummary: buildTargetSummary(targetPayload, targetSelection),
  };
}

async function fetchComparedBuildPayload(input: string): Promise<BuildPayload> {
  const response = await fetch(buildApiUrl("/pob/parse"), {
    body: input.trim(),
    method: "POST",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Compare import failed");
  }

  return (await response.json()) as BuildPayload;
}

async function loadCompareTreeContext(
  payload: BuildPayload,
  selection: BuildViewerSelection,
): Promise<BuildCompareTreeContext | undefined> {
  const treeSpec = getSelectedTreeSpec(payload, selection.treeIndex);
  if (!treeSpec) {
    return undefined;
  }

  const variantKey = pickPassiveTreeVariant(treeSpec, TREE_MANIFEST);
  const variant = variantKey ? TREE_MANIFEST.variants[variantKey] : undefined;
  if (!variant?.layoutPath) {
    return undefined;
  }

  const response = await fetch(variant.layoutPath);
  if (!response.ok) {
    return undefined;
  }

  const layout = (await response.json()) as PassiveTreeLayout;
  const itemsById = new Map(payload.items.map((item) => [item.id, item]));
  const augmentedLayout = augmentPassiveTreeLayoutWithClusters(layout, treeSpec, itemsById, variantKey);
  return {
    nodeIndex: new Map(augmentedLayout.nodes.map((node) => [node.id, node])),
    spec: treeSpec,
  };
}

function buildSelectionContext(
  payload: BuildPayload,
  selection: BuildViewerSelection,
  tree?: BuildCompareTreeContext,
): BuildCompareSelectionContext {
  return {
    configSet: getSelectedConfigSet(payload, selection.configSetId),
    itemSet: getSelectedItemSet(payload, selection.itemSetId),
    itemsById: new Map(payload.items.map((item) => [item.id, item])),
    payload,
    skillSet: getSelectedSkillSet(payload, selection.skillSetId),
    tree,
    treeSpec: getSelectedTreeSpec(payload, selection.treeIndex),
  };
}

function buildConfigFinding(
  currentContext: BuildCompareSelectionContext,
  targetContext: BuildCompareSelectionContext,
): BuildCompareFinding | undefined {
  const currentInputs = getCompareConfigInputs(currentContext);
  const targetInputs = getCompareConfigInputs(targetContext);
  const currentRows = collectConfigRows(currentInputs);
  const targetRows = collectConfigRows(targetInputs);
  const rows = buildConfigCompareRows(
    currentRows,
    targetRows,
    currentInputs,
    targetInputs,
    currentContext.payload,
    targetContext.payload,
  );

  if (rows.length === 0) {
    return undefined;
  }

  return {
    key: "configs",
    rows,
    severity: "major",
    title: "Configurations",
  };
}

function getCompareConfigInputs(context: BuildCompareSelectionContext) {
  if (context.configSet?.active) {
    return {
      ...context.configSet.inputs,
      ...(context.configSet.placeholders ?? {}),
      ...context.payload.config,
      ...(context.payload.configPlaceholders ?? {}),
    };
  }

  return {
    ...(context.configSet?.inputs ?? context.payload.config ?? {}),
    ...(context.configSet?.placeholders ?? context.payload.configPlaceholders ?? {}),
  };
}

function buildMissingSkillGemsFinding(
  currentContext: BuildCompareSelectionContext,
  targetContext: BuildCompareSelectionContext,
): BuildCompareFinding | undefined {
  const currentGems = collectComparedGems(currentContext.skillSet);
  const targetGems = collectComparedGems(targetContext.skillSet);
  const rows = buildMissingGemRows(currentGems.skillGems, targetGems.skillGems, "skill");

  if (rows.length === 0) {
    return undefined;
  }

  return {
    key: "missing-skill-gems",
    rows,
    severity: "major",
    title: "Missing Skill Gems",
  };
}

function buildMissingSupportGemsFinding(
  currentContext: BuildCompareSelectionContext,
  targetContext: BuildCompareSelectionContext,
): BuildCompareFinding | undefined {
  const currentGems = collectComparedGems(currentContext.skillSet);
  const targetGems = collectComparedGems(targetContext.skillSet);
  const rows = buildMissingGemRows(currentGems.supportLinks, targetGems.supportLinks, "support");

  if (rows.length === 0) {
    return undefined;
  }

  return {
    key: "missing-support-gems",
    rows,
    severity: "major",
    title: "Missing Support Gems",
  };
}

function buildGemLevelsAndQualityFinding(
  currentContext: BuildCompareSelectionContext,
  targetContext: BuildCompareSelectionContext,
): BuildCompareFinding | undefined {
  const currentGems = collectComparedGems(currentContext.skillSet);
  const targetGems = collectComparedGems(targetContext.skillSet);
  const rows = buildGemCompareRows(currentGems.allGems, targetGems.allGems, "gem");

  if (rows.length === 0) {
    return undefined;
  }

  return {
    key: "gem-progress",
    rows,
    severity: "notable",
    title: "Gem Levels and Quality",
  };
}

function buildAnointFinding(
  currentContext: BuildCompareSelectionContext,
  targetContext: BuildCompareSelectionContext,
): BuildCompareFinding | undefined {
  const slots = ["Amulet", "Boots", "Gloves", "Belt"];
  const currentItems = collectItemsBySlot(currentContext.itemSet, currentContext.itemsById);
  const targetItems = collectItemsBySlot(targetContext.itemSet, targetContext.itemsById);
  const rows: BuildCompareRow[] = [];

  for (const slotName of slots) {
    const targetItem = targetItems.get(slotName);
    const targetAnoint = targetItem?.anointments.join(", ") ?? "";
    const currentAnoint = currentItems.get(slotName)?.anointments.join(", ") ?? "";
    if (!targetAnoint && !currentAnoint) {
      continue;
    }
    if (currentAnoint === targetAnoint) {
      continue;
    }

    rows.push({
      currentValue: currentAnoint || "None",
      key: `anoint:${slotName}`,
      name: slotName,
      targetValue: targetAnoint || "None",
    });
  }

  if (rows.length === 0) {
    return undefined;
  }

  return {
    key: "anoints",
    rows,
    severity: "notable",
    title: "Anointments",
  };
}

function buildItemFinding(
  currentContext: BuildCompareSelectionContext,
  targetContext: BuildCompareSelectionContext,
): BuildCompareFinding | undefined {
  const currentItemsBySlot = collectItemsBySlot(currentContext.itemSet, currentContext.itemsById);
  const targetItemsBySlot = collectItemsBySlot(targetContext.itemSet, targetContext.itemsById);
  const orderedSlots = [...targetItemsBySlot.keys(), ...[...currentItemsBySlot.keys()].filter((slot) => !targetItemsBySlot.has(slot))];
  const rows: BuildCompareRow[] = [];

  for (const slotName of orderedSlots) {
    const currentItem = currentItemsBySlot.get(slotName);
    const targetItem = targetItemsBySlot.get(slotName);

    if (!currentItem && !targetItem) {
      continue;
    }

    if (sameComparedItemIdentity(currentItem, targetItem)) {
      continue;
    }

    rows.push({
      currentValue: describeComparedItem(currentItem),
      highlight: true,
      key: `item:${slotName}`,
      name: slotName,
      targetValue: describeComparedItem(targetItem),
    });
  }

  if (rows.length === 0) {
    return undefined;
  }

  return {
    key: "items",
    kind: "item",
    rows,
    severity: "major",
    title: "Items",
  };
}

function buildUniqueVariantFinding(
  currentContext: BuildCompareSelectionContext,
  targetContext: BuildCompareSelectionContext,
): BuildCompareFinding | undefined {
  const rows: BuildCompareRow[] = [];
  const currentItemsBySlot = collectItemsBySlot(currentContext.itemSet, currentContext.itemsById);
  const targetItemsBySlot = collectItemsBySlot(targetContext.itemSet, targetContext.itemsById);

  for (const [slotName, targetItem] of targetItemsBySlot) {
    const currentItem = currentItemsBySlot.get(slotName);
    if (!currentItem || !targetItem || currentItem.rarity !== "Unique" || targetItem.rarity !== "Unique") {
      continue;
    }

    if (currentItem.name !== targetItem.name) {
      continue;
    }

    if (!sameVariantFingerprint(currentItem, targetItem)) {
      rows.push({
        currentValue: describeItemVariant(currentItem),
        highlight: true,
        key: `unique-item:${slotName}:${targetItem.name}`,
        name: `${targetItem.name} (${slotName})`,
        targetValue: describeItemVariant(targetItem),
      });
    }
  }

  const currentUniqueJewels = collectUniqueSocketedJewels(currentContext);
  const targetUniqueJewels = collectUniqueSocketedJewels(targetContext);
  for (const [jewelName, targetItem] of targetUniqueJewels) {
    const currentItem = currentUniqueJewels.get(jewelName);
    if (!currentItem) {
      continue;
    }

    if (!sameVariantFingerprint(currentItem, targetItem)) {
      rows.push({
        currentValue: describeItemVariant(currentItem),
        highlight: true,
        key: `unique-jewel:${jewelName}`,
        name: jewelName,
        targetValue: describeItemVariant(targetItem),
      });
    }
  }

  if (rows.length === 0) {
    return undefined;
  }

  return {
    kind: "item",
    key: "unique-variants",
    rows,
    severity: "notable",
    title: "Unique Item Variants",
  };
}

function buildPassiveTreeFinding(
  currentContext: BuildCompareSelectionContext,
  targetContext: BuildCompareSelectionContext,
): BuildCompareFinding | undefined {
  if (!currentContext.tree?.spec || !targetContext.tree?.spec) {
    return undefined;
  }

  const currentKeystones = collectKeystoneNames(currentContext.tree);
  const targetKeystones = collectKeystoneNames(targetContext.tree);
  const currentMasteries = collectMasterySelections(currentContext.tree);
  const targetMasteries = collectMasterySelections(targetContext.tree);
  const rows = [
    ...buildTreeCompareRows("Keystone", currentKeystones, targetKeystones, "keystone"),
    ...buildTreeCompareRows("Mastery", currentMasteries, targetMasteries, "mastery"),
  ];

  if (rows.length === 0) {
    return undefined;
  }

  return {
    key: "tree",
    rows,
    severity: "major",
    title: "Passive Tree",
  };
}

function collectConfigRows(inputs: Record<string, string | number | boolean>) {
  const rows = new Map<string, ComparedConfigRow>();
  for (const section of buildConfigDisplaySections(inputs)) {
    for (const row of section.rows) {
      rows.set(`${section.key}:${row.key}`, {
        configKey: row.key,
        key: `${section.key}:${row.key}`,
        label: row.label,
        section: section.title,
        type: row.type,
        value: row.type === "value" ? row.value : undefined,
      });
    }
  }
  return rows;
}

function buildConfigCompareRows(
  currentRows: ReadonlyMap<string, ComparedConfigRow>,
  targetRows: ReadonlyMap<string, ComparedConfigRow>,
  currentInputs: Record<string, string | number | boolean>,
  targetInputs: Record<string, string | number | boolean>,
  currentPayload: BuildPayload,
  targetPayload: BuildPayload,
) {
  const orderedKeys = [...targetRows.keys(), ...[...currentRows.keys()].filter((key) => !targetRows.has(key))];
  const rows: BuildCompareRow[] = [];

  for (const key of orderedKeys) {
    const currentRow = currentRows.get(key);
    const targetRow = targetRows.get(key);
    const configKey = currentRow?.configKey ?? targetRow?.configKey;
    if (!configKey) {
      continue;
    }

    const currentDefault = getEffectiveConfigDefaultValue(configKey, currentInputs, currentPayload);
    const targetDefault = getEffectiveConfigDefaultValue(configKey, targetInputs, targetPayload);
    const currentValue = formatConfigCompareValue(currentRow, targetRow, currentDefault);
    const targetValue = formatConfigCompareValue(targetRow, currentRow, targetDefault);

    if (currentValue === targetValue) {
      continue;
    }

    rows.push({
      currentValue,
      key,
      name: formatConfigCompareName(currentRow, targetRow),
      targetValue,
    });
  }

  return rows;
}

function formatConfigCompareName(currentRow: ComparedConfigRow | undefined, targetRow: ComparedConfigRow | undefined) {
  const row = targetRow ?? currentRow;
  if (!row) {
    return "Configuration";
  }

  return `[${row.section}] ${row.label}`;
}

function formatConfigCompareValue(
  row: ComparedConfigRow | undefined,
  counterpart: ComparedConfigRow | undefined,
  effectiveDefault?: string,
) {
  if (row) {
    if (row.type === "toggle") {
      return "Enabled";
    }
    if (row.type === "custom") {
      return "Present";
    }
    if (effectiveDefault !== undefined && normalizeConfigCompareScalar(row.value) === normalizeConfigCompareScalar(effectiveDefault)) {
      return "Default";
    }
    return row.value ?? "Set";
  }

  if (counterpart?.type === "toggle") {
    return "Disabled";
  }

  if (counterpart?.type === "custom") {
    return "Missing";
  }

  return "Default";
}

function getEffectiveConfigDefaultValue(
  configKey: string,
  inputs: Record<string, string | number | boolean>,
  payload: BuildPayload,
) {
  const enemyPreset = normalizeEnemyBossPreset(inputs.enemyIsBoss);
  const characterLevel = Math.max(1, payload.build.level || 1);

  switch (configKey) {
    case "enemyIsBoss":
      return enemyPreset === "None"
        ? "No"
        : enemyPreset === "Boss"
          ? "Standard Boss"
          : enemyPreset === "Uber"
            ? "Uber Pinnacle Boss"
            : "Guardian/Pinnacle Boss";
    case "meleeDistance":
      return "15";
    case "projectileDistance":
      return "40";
    case "multiplierWitheredStackCountSelf":
      return "15";
    case "ShockStacks":
    case "ScorchStacks":
    case "sigilOfPowerStages":
      return "1";
    case "configSpectralTigerCount":
      return "5";
    case "enemySpeed":
      return "700";
    case "enemyCritChance":
      return "5";
    case "enemyCritDamage":
      return "30";
    case "enemyDamageRollRange":
      return "70";
    case "enemyLevel":
      if (enemyPreset === "Uber") {
        return "85";
      }
      if (enemyPreset === "Pinnacle") {
        return "84";
      }
      return String(Math.min(83, characterLevel));
    case "enemyLightningResist":
    case "enemyColdResist":
    case "enemyFireResist":
      if (enemyPreset === "Boss") {
        return "40";
      }
      if (enemyPreset === "Pinnacle" || enemyPreset === "Uber") {
        return "50";
      }
      return "";
    case "enemyChaosResist":
      if (enemyPreset === "Boss") {
        return "25";
      }
      if (enemyPreset === "Pinnacle" || enemyPreset === "Uber") {
        return "30";
      }
      return "";
    default:
      return undefined;
  }
}

function normalizeEnemyBossPreset(value: string | number | boolean | undefined) {
  const normalized = String(value ?? "Pinnacle").trim().toLowerCase();

  switch (normalized) {
    case "0":
    case "none":
    case "no":
      return "None";
    case "boss":
    case "standard boss":
      return "Boss";
    case "uber":
    case "uber pinnacle boss":
      return "Uber";
    case "pinnacle":
    case "guardian/pinnacle boss":
    default:
      return "Pinnacle";
  }
}

function normalizeConfigCompareScalar(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return value.trim();
}

function buildGemCompareRows(
  currentGems: ReadonlyMap<string, ComparedGem>,
  targetGems: ReadonlyMap<string, ComparedGem>,
  type: "gem" | "skill" | "support",
) {
  const rows: BuildCompareRow[] = [];

  const orderedGemNames = [...targetGems.keys(), ...[...currentGems.keys()].filter((gemName) => !targetGems.has(gemName))];

  for (const gemName of orderedGemNames) {
    const currentGem = currentGems.get(gemName);
    const targetGem = targetGems.get(gemName);
    if (!currentGem || !targetGem) {
      continue;
    }

    const currentValue = currentGem ? formatGemProgress(currentGem) : "Missing";
    const targetValue = targetGem ? formatGemProgress(targetGem) : "Missing";
    if (currentValue === targetValue) {
      continue;
    }

    rows.push({
      currentValue,
      key: `gem-progress:${type}:${gemName}`,
      name: gemName,
      targetValue,
    });
  }

  return rows;
}

function buildTreeCompareRows(
  label: string,
  currentValues: ReadonlySet<string>,
  targetValues: ReadonlySet<string>,
  keyPrefix: string,
) {
  const orderedValues = [...targetValues, ...[...currentValues].filter((value) => !targetValues.has(value))];
  const rows: BuildCompareRow[] = [];

  for (const value of orderedValues) {
    const currentAllocated = currentValues.has(value);
    const targetAllocated = targetValues.has(value);
    if (currentAllocated === targetAllocated) {
      continue;
    }

    rows.push({
      currentValue: currentAllocated ? "Allocated" : "Missing",
      key: `${keyPrefix}:${value}`,
      name: `${label}: ${value}`,
      targetValue: targetAllocated ? "Allocated" : "Missing",
    });
  }

  return rows;
}

function buildMissingGemRows(
  currentGems: ReadonlyMap<string, ComparedGem>,
  targetGems: ReadonlyMap<string, ComparedGem>,
  type: "skill" | "support",
) {
  const rows: BuildCompareRow[] = [];

  const orderedGemNames = [...targetGems.keys(), ...[...currentGems.keys()].filter((gemName) => !targetGems.has(gemName))];

  for (const gemName of orderedGemNames) {
    const currentGem = currentGems.get(gemName);
    const targetGem = targetGems.get(gemName);
    if (Boolean(currentGem) === Boolean(targetGem)) {
      continue;
    }

    rows.push({
      currentValue: currentGem ? formatGemProgress(currentGem) : "Missing",
      key: `missing-gem:${type}:${gemName}`,
      name: gemName,
      targetValue: targetGem ? formatGemProgress(targetGem) : "Missing",
    });
  }

  return rows;
}

function collectComparedGems(skillSet: SkillSetPayload | undefined): ComparedGemCollections {
  const allGems = new Map<string, ComparedGem>();
  const skillGems = new Map<string, ComparedGem>();
  const supportLinks = new Map<string, ComparedGem>();
  for (const group of skillSet?.groups ?? []) {
    if (!group.enabled) {
      continue;
    }
    if (group.slot && isWeaponSwapSlot(group.slot)) {
      continue;
    }
    const activeGems: GemPayload[] = [];
    const supportGems: GemPayload[] = [];

    for (const gem of group.gems ?? []) {
      if (!gem.enabled) {
        continue;
      }
      const gemName = resolveComparedGemName(gem);
      if (gemName) {
        upsertComparedGem(allGems, gemName, gem);
      }
      if (gem.support) {
        supportGems.push(gem);
      } else {
        activeGems.push(gem);
      }
    }

    for (const gem of activeGems) {
      const gemName = resolveComparedGemName(gem);
      if (!gemName) {
        continue;
      }
      upsertComparedGem(skillGems, gemName, gem);
    }

    for (const supportGem of supportGems) {
      const supportName = resolveComparedGemName(supportGem);
      if (!supportName) {
        continue;
      }

      const supportedSkillNames = inferSupportedSkillNames(supportGem, activeGems);
      for (const skillName of supportedSkillNames) {
        upsertComparedGem(supportLinks, buildSupportLinkName(skillName, supportName), supportGem);
      }
    }
  }
  return { allGems, skillGems, supportLinks };
}

function upsertComparedGem(gems: Map<string, ComparedGem>, name: string, gem: GemPayload) {
  if (!name) {
    return;
  }

  const existing = gems.get(name);
  if (!existing) {
    gems.set(name, { level: gem.level, quality: gem.quality });
    return;
  }

  existing.level = Math.max(existing.level, gem.level);
  existing.quality = Math.max(existing.quality, gem.quality);
}

function inferSupportedSkillNames(supportGem: GemPayload, activeGems: readonly GemPayload[]) {
  if (activeGems.length === 0) {
    return [];
  }

  const supportDetails = resolveGemDetails(supportGem);
  if (!supportDetails) {
    if (activeGems.length === 1) {
      const fallbackName = resolveComparedGemName(activeGems[0]);
      return fallbackName ? [fallbackName] : [];
    }

    return [];
  }

  const explicitMatches = activeGems
    .filter((activeGem) => supportGemSupportsActiveGem(supportGem, activeGem, supportDetails))
    .map((activeGem) => resolveComparedGemName(activeGem))
    .filter((name): name is string => Boolean(name));

  if (explicitMatches.length > 0) {
    return dedupePreserveOrder(explicitMatches);
  }

  return [];
}

function supportGemSupportsActiveGem(
  supportGem: GemPayload,
  activeGem: GemPayload,
  supportDetails = resolveGemDetails(supportGem),
) {
  const activeDetails = resolveGemDetails(activeGem);
  if (!supportDetails || !activeDetails) {
    return false;
  }

  const activeSkillTypes = new Set(activeDetails.skillTypes);
  if (
    supportDetails.excludeSkillTypes.length > 0 &&
    doesTypeExpressionMatch(supportDetails.excludeSkillTypes, activeSkillTypes)
  ) {
    return false;
  }

  if (supportDetails.requireSkillTypes.length === 0) {
    return true;
  }

  return doesTypeExpressionMatch(supportDetails.requireSkillTypes, activeSkillTypes);
}

function doesTypeExpressionMatch(checkTypes: readonly string[], skillTypes: ReadonlySet<string>) {
  const stack: boolean[] = [];

  for (const token of checkTypes) {
    if (token === "OR") {
      const other = stack.pop() ?? false;
      const current = stack.pop() ?? false;
      stack.push(current || other);
      continue;
    }

    if (token === "AND") {
      const other = stack.pop() ?? false;
      const current = stack.pop() ?? false;
      stack.push(current && other);
      continue;
    }

    if (token === "NOT") {
      if (stack.length > 0) {
        stack[stack.length - 1] = !stack[stack.length - 1];
      }
      continue;
    }

    stack.push(skillTypes.has(token));
  }

  return stack.some(Boolean);
}

function resolveComparedGemName(gem: GemPayload) {
  const nameSpec = gem.nameSpec.trim();
  if (nameSpec) {
    return gem.support ? nameSpec.replace(/\s+Support$/, "") : nameSpec;
  }

  const details = resolveGemDetails(gem);
  return details?.name;
}

function resolveGemDetails(gem: GemPayload) {
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

  return GEM_DETAILS_BY_NAME.get(normalizeGemCompareName(name));
}

function normalizeGemCompareName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+support$/, "");
}

function buildSupportLinkName(skillName: string, supportName: string) {
  return `${skillName} --> ${supportName}`;
}

function collectItemsBySlot(itemSet: ItemSetPayload | undefined, itemsById: ReadonlyMap<number, ItemPayload>) {
  const items = new Map<string, ItemPayload>();
  for (const slot of itemSet?.slots ?? []) {
    const item = itemsById.get(slot.itemId);
    if (item) {
      items.set(slot.name, item);
    }
  }
  return items;
}

function collectUniqueSocketedJewels(context: BuildCompareSelectionContext) {
  const jewels = new Map<string, ItemPayload>();
  for (const socket of context.treeSpec?.sockets ?? []) {
    const item = context.itemsById.get(socket.itemId);
    if (item?.rarity === "Unique" && item.name) {
      jewels.set(item.name, item);
    }
  }
  return jewels;
}

function collectKeystoneNames(tree: BuildCompareTreeContext) {
  const names = new Set<string>();
  for (const nodeId of tree.spec?.nodes ?? []) {
    const node = tree.nodeIndex.get(nodeId);
    if (node?.isKeystone) {
      names.add(node.name);
    }
  }
  return names;
}

function collectMasterySelections(tree: BuildCompareTreeContext) {
  const selections = new Set<string>();
  if (!tree.spec) {
    return selections;
  }

  for (const nodeId of tree.spec.nodes) {
    const node = tree.nodeIndex.get(nodeId);
    if (!node?.isMastery) {
      continue;
    }

    const description = describePassiveTreeNode(node, tree.spec);
    const summary = description.lines.join(" / ");
    selections.add(summary ? `${description.title}: ${summary}` : description.title);
  }

  return selections;
}

function sameVariantFingerprint(currentItem: ItemPayload, targetItem: ItemPayload) {
  const current = collectVariantFingerprints(currentItem);
  const target = collectVariantFingerprints(targetItem);
  if (current.size !== target.size) {
    return false;
  }

  for (const entry of target) {
    if (!current.has(entry)) {
      return false;
    }
  }

  return true;
}

function collectVariantFingerprints(item: ItemPayload) {
  const fingerprints = new Set<string>();
  const lines = collectVariantFingerprintLines(item);

  for (const line of lines) {
    const fingerprint = normalizeVariantFingerprint(line);
    if (fingerprint) {
      fingerprints.add(fingerprint);
    }
  }

  return fingerprints;
}

function collectVariantDisplayLines(item: ItemPayload) {
  const lines: string[] = [];
  const synthesizedAndImplicitLines = dedupePreserveOrder([
    ...(item.synthesizedMods ?? []),
    ...(item.implicits ?? []),
  ].map((line) => line.trim()).filter(Boolean));
  const explicitLines = dedupePreserveOrder([
    ...(item.orderedExplicitMods?.map((mod) => mod.text) ?? []),
    ...(item.explicits ?? []),
    ...(item.fracturedMods ?? []),
    ...(item.crafted ?? []),
  ].map((line) => line.trim()).filter(Boolean));
  const anointmentLines = dedupePreserveOrder((item.anointments ?? []).map((line) => line.trim()).filter(Boolean));
  const flagLines = dedupePreserveOrder([
    item.corrupted ? "Corrupted" : undefined,
    item.mirrored ? "Mirrored" : undefined,
    item.split ? "Split" : undefined,
  ].filter((line): line is string => Boolean(line)));

  appendLabeledCompareSection(lines, "Synthesized and Corrupted Implicits", synthesizedAndImplicitLines);
  appendLabeledCompareSection(lines, "Explicit Mods", explicitLines);
  appendLabeledCompareSection(lines, "Anointments", anointmentLines);
  appendLabeledCompareSection(lines, "Flags", flagLines);

  return lines;
}

function describeItemVariant(item: ItemPayload) {
  const lines = collectVariantDisplayLines(item);
  return lines.length > 0 ? lines.join("\n") : "Different modifier set";
}

function collectVariantFingerprintLines(item: ItemPayload) {
  return dedupePreserveOrder([
    ...(item.synthesizedMods ?? []).map((line) => `synthesized:${line.trim()}`),
    ...(item.implicits ?? []).map((line) => `implicit:${line.trim()}`),
    ...(item.orderedExplicitMods?.map((mod) => `explicit:${mod.text.trim()}`) ?? []),
    ...(item.explicits ?? []).map((line) => `explicit:${line.trim()}`),
    ...(item.fracturedMods ?? []).map((line) => `fractured:${line.trim()}`),
    ...(item.crafted ?? []).map((line) => `crafted:${line.trim()}`),
    ...(item.anointments ?? []).map((line) => `anointment:${line.trim()}`),
    ...(item.corrupted ? ["flag:corrupted"] : []),
    ...(item.mirrored ? ["flag:mirrored"] : []),
    ...(item.split ? ["flag:split"] : []),
  ].filter((line) => !line.endsWith(":")));
}

function describeComparedItem(item: ItemPayload | undefined) {
  if (!item) {
    return "Missing";
  }

  const label = [item.name, item.base].filter((value): value is string => Boolean(value)).join("\n");
  const variantDescription = describeItemVariant(item);

  if (variantDescription === "Different modifier set") {
    return label || "Occupied";
  }

  return [label, variantDescription].filter(Boolean).join("\n");
}

function sameComparedItemIdentity(currentItem: ItemPayload | undefined, targetItem: ItemPayload | undefined) {
  if (!currentItem || !targetItem) {
    return currentItem === targetItem;
  }

  const currentIdentity = normalizeComparedItemIdentity(currentItem);
  const targetIdentity = normalizeComparedItemIdentity(targetItem);
  return currentIdentity === targetIdentity;
}

function normalizeComparedItemIdentity(item: ItemPayload) {
  return [
    item.rarity ?? "",
    item.name ?? "",
    item.base ?? "",
  ]
    .map((value) => value.trim().toLowerCase())
    .join("|");
}

function appendLabeledCompareSection(lines: string[], title: string, values: readonly string[]) {
  if (values.length === 0) {
    return;
  }

  if (lines.length > 0) {
    lines.push("");
  }

  lines.push(title, ...values);
}

function dedupePreserveOrder(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }

  return result;
}

function normalizeVariantFingerprint(line: string) {
  return line
    .toLowerCase()
    .replace(/\{[^}]+\}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatGemProgress(gem: ComparedGem) {
  return `${gem.level}/${gem.quality}`;
}

function buildTargetSummary(payload: BuildPayload, selection: BuildViewerSelection) {
  const tree = getSelectedTreeSpec(payload, selection.treeIndex);
  const parts = [payload.build.className, payload.build.ascendClassName, getSecondaryAscendancyName(tree?.secondaryAscendancyId)].filter(
    (value): value is string => Boolean(value),
  );
  const label = parts.filter(Boolean).join(" / ");
  return payload.build.level ? `${label} (Level ${payload.build.level})` : label;
}
