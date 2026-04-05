import type {
  BuildPayload,
  ConfigSetPayload,
  GemPayload,
  ItemExplicitModPayload,
  ItemPayload,
  ItemSetPayload,
  SkillSetPayload,
  TreeSpecPayload,
} from "@pobcodes/shared-types";

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
  collectAllocatedClusterJewelNodeSummaries,
  describePassiveTreeNode,
  pickPassiveTreeVariant,
  type PassiveTreeLayout,
  type PassiveTreeLayoutNode,
  type PassiveTreeManifest,
} from "./passive-tree";
import { buildConfigDisplaySections } from "./pob-config-display";

export interface BuildCompareRow {
  currentValue: string;
  direction?: "both" | "source-only" | "target-only";
  highlight?: boolean;
  itemCategory?: "cluster-jewel" | "flask" | "other" | "rare" | "regular-jewel" | "unique";
  key: string;
  name: string;
  nameDisplay?: {
    skillNames: string[];
    supportName: string;
    type: "support-link-group";
  };
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

interface ComparedCountedTreeValue {
  count: number;
  label: string;
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

interface ComparedItemEntry {
  displayLabel: string;
  item: ItemPayload;
  key: string;
  pool: "equipment" | "flask" | "jewel";
  slotName?: string;
}

interface ComparedItemPair {
  current?: ComparedItemEntry;
  key: string;
  target?: ComparedItemEntry;
}

interface ComparedItemMod {
  category: string;
  template: string;
  text: string;
  values: number[];
}

interface ComparedItemModDiff {
  currentOnly: ComparedItemMod[];
  significantPairs: Array<{
    current: ComparedItemMod;
    target: ComparedItemMod;
  }>;
  targetOnly: ComparedItemMod[];
}

interface ComparedItemModDiffDisplay {
  currentValue: string;
  direction: "both" | "source-only" | "target-only";
  targetValue: string;
}

const TREE_MANIFEST = GENERATED_TREE_MANIFEST as PassiveTreeManifest;
const GEM_DETAILS_BY_NAME = new Map<string, GemDetails>(
  Object.values(GEM_DETAILS).map((details) => [normalizeGemCompareName(details.name), details]),
);
const GEM_DETAILS_BY_EFFECT_ID = new Map<string, GemDetails>(
  Object.values(GEM_DETAILS).map((details) => [details.effectId, details]),
);
const ANOINT_SLOT_NAMES = new Set(["Amulet", "Boots", "Gloves", "Belt"]);
const FLASK_SLOT_NAME_PATTERN = /^Flask \d+$/i;
const TINCTURE_SLOT_NAME_PATTERN = /^Tincture \d+$/i;
const FLASK_BASE_MODIFIER_TYPES = new Set(["hybrid", "life", "mana"]);
const RARE_VALUE_DIFFERENCE_THRESHOLD = 0.2;
const SUPPORT_LINK_SEPARATOR = " --> ";

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
    buildMagicFlaskModFinding(currentContext, targetContext),
    buildTinctureModFinding(currentContext, targetContext),
    buildClusterJewelAggregateFinding(currentContext, targetContext),
    buildRareItemModFinding(currentContext, targetContext),
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
    title: "Support Gem Differences",
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
  const currentItems = collectItemsBySlot(currentContext.itemSet, currentContext.itemsById);
  const targetItems = collectItemsBySlot(targetContext.itemSet, targetContext.itemsById);
  const rows: BuildCompareRow[] = [];

  for (const slotName of ANOINT_SLOT_NAMES) {
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
  const pairs = collectComparedItemPairs(currentContext, targetContext);
  const rows: BuildCompareRow[] = [];

  for (const pair of pairs) {
    const currentItem = pair.current?.item;
    const targetItem = pair.target?.item;
    if (!currentItem && !targetItem) {
      continue;
    }

    if (isAggregatedClusterJewelItem(currentItem) || isAggregatedClusterJewelItem(targetItem)) {
      continue;
    }

    if (sameComparedItemIdentity(currentItem, targetItem)) {
      continue;
    }

    const comparedFieldName = pair.target?.displayLabel ?? pair.current?.displayLabel ?? "Item";
    const comparedItem = targetItem ?? currentItem;
    const magicFlaskBaseRow = comparedItem ? isPooledFlaskSectionItem(comparedItem) : false;

    rows.push({
      currentValue: magicFlaskBaseRow ? describeComparedPooledFlaskSectionBase(currentItem) : describeComparedItem(currentItem, comparedFieldName),
      direction: !currentItem ? "target-only" : !targetItem ? "source-only" : "both",
      highlight: true,
      itemCategory: resolveComparedItemCategory(currentItem, targetItem),
      key: `item:${pair.key}`,
      name: comparedFieldName,
      targetValue: magicFlaskBaseRow ? describeComparedPooledFlaskSectionBase(targetItem) : describeComparedItem(targetItem, comparedFieldName),
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
  const pairs = collectComparedItemPairs(currentContext, targetContext);
  const rows: BuildCompareRow[] = [];
  for (const pair of pairs) {
    const currentItem = pair.current?.item;
    const targetItem = pair.target?.item;
    if (!currentItem || !targetItem || !isComparableUniqueItemPair(currentItem, targetItem)) {
      continue;
    }

    const diff = buildUniqueItemModDiff(currentItem, targetItem);
    if (!diff) {
      continue;
    }

    rows.push({
      currentValue: diff.currentValue,
      direction: diff.direction,
      highlight: true,
      itemCategory: resolveComparedItemCategory(currentItem, targetItem),
      key: `unique-item:${pair.key}`,
      name: pair.target?.displayLabel ?? pair.current?.displayLabel ?? targetItem.name ?? targetItem.base ?? "Unique Item",
      targetValue: diff.targetValue,
    });
  }

  if (rows.length === 0) {
    return undefined;
  }

  return {
    kind: "item",
    key: "unique-variants",
    rows,
    severity: "notable",
    title: "Unique Item Mods",
  };
}

function buildMagicFlaskModFinding(
  currentContext: BuildCompareSelectionContext,
  targetContext: BuildCompareSelectionContext,
): BuildCompareFinding | undefined {
  const currentMagicFlasks = collectFlaskEntries(currentContext).map((entry) => entry.item).filter(isMagicFlaskItem);
  const targetMagicFlasks = collectFlaskEntries(targetContext).map((entry) => entry.item).filter(isMagicFlaskItem);
  const diff = buildMagicFlaskPoolModDiff(currentMagicFlasks, targetMagicFlasks);

  if (!diff) {
    return undefined;
  }

  return {
    kind: "item",
    key: "magic-flask-mods",
    rows: [
      {
        currentValue: diff.currentValue,
        direction: diff.direction,
        highlight: true,
        itemCategory: "flask",
        key: "magic-flask-mod-pool",
        name: "Magic Flask Modifier Pool",
        targetValue: diff.targetValue,
      },
    ],
    severity: "notable",
    title: "Magic Flask Modifiers",
  };
}

function buildTinctureModFinding(
  currentContext: BuildCompareSelectionContext,
  targetContext: BuildCompareSelectionContext,
): BuildCompareFinding | undefined {
  const currentTinctures = collectTinctureEntries(currentContext).map((entry) => entry.item).filter(isTinctureItem);
  const targetTinctures = collectTinctureEntries(targetContext).map((entry) => entry.item).filter(isTinctureItem);
  const diff = buildExplicitModPoolDiffDisplay(currentTinctures, targetTinctures);

  if (!diff) {
    return undefined;
  }

  return {
    kind: "item",
    key: "tincture-mods",
    rows: [
      {
        currentValue: diff.currentValue,
        direction: diff.direction,
        highlight: true,
        itemCategory: "flask",
        key: "tincture-mod-pool",
        name: "Tincture Modifier Pool",
        targetValue: diff.targetValue,
      },
    ],
    severity: "notable",
    title: "Tincture Modifiers",
  };
}

function buildClusterJewelAggregateFinding(
  currentContext: BuildCompareSelectionContext,
  targetContext: BuildCompareSelectionContext,
): BuildCompareFinding | undefined {
  const currentSummaries = collectAllocatedClusterJewelSummaries(currentContext);
  const targetSummaries = collectAllocatedClusterJewelSummaries(targetContext);
  const rows: BuildCompareRow[] = [];

  const smallPassiveDiff = buildComparedClusterAggregateDiff(
    aggregateClusterSmallPassiveTotals(currentSummaries),
    aggregateClusterSmallPassiveTotals(targetSummaries),
    {
      pairTitle: "Significant total differences",
    },
    RARE_VALUE_DIFFERENCE_THRESHOLD,
  );
  if (smallPassiveDiff) {
    rows.push({
      currentValue: smallPassiveDiff.currentValue,
      direction: smallPassiveDiff.direction,
      highlight: true,
      itemCategory: "cluster-jewel",
      key: "cluster-jewel:small-passives",
      name: "Allocated Small Passive Totals",
      targetValue: smallPassiveDiff.targetValue,
    });
  }

  const notableDiff = buildComparedClusterAggregateDiff(
    aggregateClusterNotableTotals(currentSummaries),
    aggregateClusterNotableTotals(targetSummaries),
    {
      pairTitle: "Different counts",
    },
    0,
  );
  if (notableDiff) {
    rows.push({
      currentValue: notableDiff.currentValue,
      direction: notableDiff.direction,
      highlight: true,
      itemCategory: "cluster-jewel",
      key: "cluster-jewel:notables",
      name: "Allocated Notables",
      targetValue: notableDiff.targetValue,
    });
  }

  if (rows.length === 0) {
    return undefined;
  }

  return {
    kind: "item",
    key: "cluster-jewel-aggregates",
    rows,
    severity: "notable",
    title: "Cluster Jewel Effects",
  };
}

function buildRareItemModFinding(
  currentContext: BuildCompareSelectionContext,
  targetContext: BuildCompareSelectionContext,
): BuildCompareFinding | undefined {
  const pairs = collectComparedItemPairs(currentContext, targetContext);
  const rows: BuildCompareRow[] = [];

  for (const pair of pairs) {
    const currentItem = pair.current?.item;
    const targetItem = pair.target?.item;
    if (!currentItem || !targetItem || !isComparableRareItemPair(currentItem, targetItem)) {
      continue;
    }

    if (isAggregatedClusterJewelItem(currentItem) || isAggregatedClusterJewelItem(targetItem)) {
      continue;
    }

    const diff = buildRareItemModDiff(currentItem, targetItem);
    if (!diff) {
      continue;
    }

    rows.push({
      currentValue: diff.currentValue,
      direction: diff.direction,
      highlight: true,
      itemCategory: resolveComparedItemCategory(currentItem, targetItem),
      key: `rare-item:${pair.key}`,
      name: pair.target?.displayLabel ?? pair.current?.displayLabel ?? targetItem.base ?? "Rare Item",
      targetValue: diff.targetValue,
    });
  }

  if (rows.length === 0) {
    return undefined;
  }

  return {
    kind: "item",
    key: "rare-item-mods",
    rows,
    severity: "notable",
    title: "Rare Item Mods",
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
  const currentRunegrafts = collectTreeOverrideCounts(currentContext.tree, /\bRunegraft\b/i);
  const targetRunegrafts = collectTreeOverrideCounts(targetContext.tree, /\bRunegraft\b/i);
  const currentTattoos = collectTreeOverrideCounts(currentContext.tree, /\bTattoo\b/i);
  const targetTattoos = collectTreeOverrideCounts(targetContext.tree, /\bTattoo\b/i);
  const rows = [
    ...buildTreeCompareRows("Keystone", currentKeystones, targetKeystones, "keystone"),
    ...buildTreeCompareRows("Mastery", currentMasteries, targetMasteries, "mastery"),
    ...buildCountedTreeCompareRows("Runegraft", currentRunegrafts, targetRunegrafts, "runegraft"),
    ...buildCountedTreeCompareRows("Tattoo", currentTattoos, targetTattoos, "tattoo"),
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

function buildCountedTreeCompareRows(
  label: string,
  currentValues: ReadonlyMap<string, ComparedCountedTreeValue>,
  targetValues: ReadonlyMap<string, ComparedCountedTreeValue>,
  keyPrefix: string,
) {
  const orderedKeys = [...targetValues.keys(), ...[...currentValues.keys()].filter((value) => !targetValues.has(value))];
  const rows: BuildCompareRow[] = [];

  for (const value of orderedKeys) {
    const currentCount = currentValues.get(value)?.count ?? 0;
    const targetCount = targetValues.get(value)?.count ?? 0;
    if (currentCount === targetCount) {
      continue;
    }

    const displayLabel = targetValues.get(value)?.label ?? currentValues.get(value)?.label ?? value;
    rows.push({
      currentValue: formatTreeAllocationCount(currentCount),
      key: `${keyPrefix}:${value}`,
      name: `${label}: ${displayLabel}`,
      targetValue: formatTreeAllocationCount(targetCount),
    });
  }

  return rows;
}

function formatTreeAllocationCount(count: number) {
  if (count <= 0) {
    return "Missing";
  }

  return count === 1 ? "Allocated" : `Allocated x${count}`;
}

function buildMissingGemRows(
  currentGems: ReadonlyMap<string, ComparedGem>,
  targetGems: ReadonlyMap<string, ComparedGem>,
  type: "skill" | "support",
) {
  if (type === "support") {
    return buildMissingSupportGemRows(currentGems, targetGems);
  }

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

function buildMissingSupportGemRows(currentGems: ReadonlyMap<string, ComparedGem>, targetGems: ReadonlyMap<string, ComparedGem>) {
  const orderedGemNames = [...targetGems.keys(), ...[...currentGems.keys()].filter((gemName) => !targetGems.has(gemName))];
  const groupedRows = new Map<
    string,
    {
      currentValue: string;
      key: string;
      skillNames: string[];
      supportName: string;
      targetValue: string;
    }
  >();
  const fallbackRows: BuildCompareRow[] = [];

  for (const gemName of orderedGemNames) {
    const currentGem = currentGems.get(gemName);
    const targetGem = targetGems.get(gemName);
    if (Boolean(currentGem) === Boolean(targetGem)) {
      continue;
    }

    const currentValue = currentGem ? formatGemProgress(currentGem) : "Missing";
    const targetValue = targetGem ? formatGemProgress(targetGem) : "Missing";
    const parsedLink = parseSupportLinkName(gemName);
    if (!parsedLink) {
      fallbackRows.push({
        currentValue,
        key: `missing-gem:support:${gemName}`,
        name: gemName,
        targetValue,
      });
      continue;
    }

    const groupKey = `${normalizeGemCompareName(parsedLink.supportName)}|${currentValue}|${targetValue}`;
    const existing = groupedRows.get(groupKey);
    if (existing) {
      if (!existing.skillNames.includes(parsedLink.skillName)) {
        existing.skillNames.push(parsedLink.skillName);
      }
      continue;
    }

    groupedRows.set(groupKey, {
      currentValue,
      key: `missing-gem:support:${normalizeGemCompareName(parsedLink.supportName)}:${groupedRows.size}`,
      skillNames: [parsedLink.skillName],
      supportName: parsedLink.supportName,
      targetValue,
    });
  }

  return [
    ...[...groupedRows.values()].map((group) => ({
      currentValue: group.currentValue,
      key: group.key,
      name: formatSupportLinkGroupName(group.supportName, group.skillNames),
      nameDisplay: {
        skillNames: group.skillNames,
        supportName: group.supportName,
        type: "support-link-group" as const,
      },
      targetValue: group.targetValue,
    })),
    ...fallbackRows,
  ];
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
    return canonicalizeComparedGemName(gem.support ? nameSpec.replace(/\s+Support$/, "") : nameSpec);
  }

  const details = resolveGemDetails(gem);
  if (details?.name) {
    return canonicalizeComparedGemName(gem.support ? details.name.replace(/\s+Support$/, "") : details.name);
  }

  if (gem.skillId) {
    return canonicalizeComparedGemName(humanizeComparedSkillId(gem.skillId));
  }

  return undefined;
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

function humanizeComparedSkillId(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeComparedGemName(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return normalized;
  }

  const knownDetails = GEM_DETAILS_BY_NAME.get(normalizeGemCompareName(normalized));
  if (knownDetails?.name) {
    return knownDetails.support ? knownDetails.name.replace(/\s+Support$/, "") : knownDetails.name;
  }

  const stopWords = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with"]);
  return normalized
    .split(" ")
    .map((segment, index) => {
      if (!segment) {
        return segment;
      }

      const lower = segment.toLowerCase();
      if (index > 0 && stopWords.has(lower)) {
        return lower;
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function buildSupportLinkName(skillName: string, supportName: string) {
  return `${skillName}${SUPPORT_LINK_SEPARATOR}${supportName}`;
}

function parseSupportLinkName(value: string) {
  const separatorIndex = value.lastIndexOf(SUPPORT_LINK_SEPARATOR);
  if (separatorIndex <= 0) {
    return undefined;
  }

  const skillName = value.slice(0, separatorIndex).trim();
  const supportName = value.slice(separatorIndex + SUPPORT_LINK_SEPARATOR.length).trim();
  if (!skillName || !supportName) {
    return undefined;
  }

  return { skillName, supportName };
}

function formatSupportLinkGroupName(supportName: string, skillNames: readonly string[]) {
  const skillLabel = skillNames.length === 1 ? "Skill" : "Skills";
  return [`Support: ${supportName}`, `${skillLabel}: ${skillNames.join(", ")}`].join("\n");
}

function collectItemsBySlot(itemSet: ItemSetPayload | undefined, itemsById: ReadonlyMap<number, ItemPayload>) {
  const items = new Map<string, ItemPayload>();
  for (const slot of itemSet?.slots ?? []) {
    if (!slot.active || slot.itemId <= 0) {
      continue;
    }

    const item = itemsById.get(slot.itemId);
    if (item) {
      items.set(slot.name, item);
    }
  }
  return items;
}

function collectComparedItemPairs(
  currentContext: BuildCompareSelectionContext,
  targetContext: BuildCompareSelectionContext,
): ComparedItemPair[] {
  return [
    ...collectEquipmentPairs(currentContext, targetContext),
    ...collectUnorderedPoolPairs(collectFlaskEntries(currentContext), collectFlaskEntries(targetContext)),
    ...collectUnorderedPoolPairs(collectTinctureEntries(currentContext), collectTinctureEntries(targetContext)),
    ...collectUnorderedPoolPairs(collectSocketedJewelEntries(currentContext), collectSocketedJewelEntries(targetContext)),
  ];
}

function collectEquipmentPairs(
  currentContext: BuildCompareSelectionContext,
  targetContext: BuildCompareSelectionContext,
): ComparedItemPair[] {
  const currentEntries = new Map<string, ComparedItemEntry>();
  const targetEntries = new Map<string, ComparedItemEntry>();

  for (const slot of currentContext.itemSet?.slots ?? []) {
    if (!slot.active || slot.itemId <= 0 || isFlaskSectionSlotName(slot.name)) {
      continue;
    }

    const item = currentContext.itemsById.get(slot.itemId);
    if (!item) {
      continue;
    }

    currentEntries.set(slot.name, {
      displayLabel: slot.name,
      item,
      key: `equipment:${slot.name}`,
      pool: "equipment",
      slotName: slot.name,
    });
  }

  for (const slot of targetContext.itemSet?.slots ?? []) {
    if (!slot.active || slot.itemId <= 0 || isFlaskSectionSlotName(slot.name)) {
      continue;
    }

    const item = targetContext.itemsById.get(slot.itemId);
    if (!item) {
      continue;
    }

    targetEntries.set(slot.name, {
      displayLabel: slot.name,
      item,
      key: `equipment:${slot.name}`,
      pool: "equipment",
      slotName: slot.name,
    });
  }

  const orderedSlotNames = [
    ...targetEntries.keys(),
    ...[...currentEntries.keys()].filter((slotName) => !targetEntries.has(slotName)),
  ];

  return orderedSlotNames.map((slotName) => ({
    current: currentEntries.get(slotName),
    key: `equipment:${slotName}`,
    target: targetEntries.get(slotName),
  }));
}

function collectFlaskEntries(context: BuildCompareSelectionContext): ComparedItemEntry[] {
  const entries: ComparedItemEntry[] = [];

  for (const slot of context.itemSet?.slots ?? []) {
    if (!slot.active || slot.itemId <= 0 || !FLASK_SLOT_NAME_PATTERN.test(slot.name)) {
      continue;
    }

    const item = context.itemsById.get(slot.itemId);
    if (!item) {
      continue;
    }

    entries.push({
      displayLabel: slot.name,
      item,
      key: `flask:${slot.name}:${slot.itemId}`,
      pool: "flask",
      slotName: slot.name,
    });
  }

  return assignPoolDisplayLabels(entries);
}

function collectTinctureEntries(context: BuildCompareSelectionContext): ComparedItemEntry[] {
  const entries: ComparedItemEntry[] = [];

  for (const slot of context.itemSet?.slots ?? []) {
    if (!slot.active || slot.itemId <= 0 || !TINCTURE_SLOT_NAME_PATTERN.test(slot.name)) {
      continue;
    }

    const item = context.itemsById.get(slot.itemId);
    if (!item) {
      continue;
    }

    entries.push({
      displayLabel: slot.name,
      item,
      key: `tincture:${slot.name}:${slot.itemId}`,
      pool: "flask",
      slotName: slot.name,
    });
  }

  return assignPoolDisplayLabels(entries);
}

function collectSocketedJewelEntries(context: BuildCompareSelectionContext): ComparedItemEntry[] {
  const entries: ComparedItemEntry[] = [];

  for (const socket of [...(context.treeSpec?.sockets ?? [])].sort((left, right) => left.nodeId - right.nodeId)) {
    const item = context.itemsById.get(socket.itemId);
    if (!item) {
      continue;
    }

    entries.push({
      displayLabel: `Jewel ${entries.length + 1}`,
      item,
      key: `jewel:${socket.nodeId}:${socket.itemId}`,
      pool: "jewel",
    });
  }

  return assignPoolDisplayLabels(entries);
}

function assignPoolDisplayLabels(entries: ComparedItemEntry[]): ComparedItemEntry[] {
  const totals = new Map<string, number>();
  const occurrences = new Map<string, number>();

  for (const entry of entries) {
    const label = buildPoolItemDisplayName(entry.item, entry.pool);
    totals.set(label, (totals.get(label) ?? 0) + 1);
  }

  return entries.map((entry) => {
    const baseLabel = buildPoolItemDisplayName(entry.item, entry.pool);
    const occurrence = (occurrences.get(baseLabel) ?? 0) + 1;
    occurrences.set(baseLabel, occurrence);
    const total = totals.get(baseLabel) ?? 1;

    return {
      ...entry,
      displayLabel: total > 1 ? `${baseLabel} #${occurrence}` : baseLabel,
    };
  });
}

function buildPoolItemDisplayName(item: ItemPayload, pool: ComparedItemEntry["pool"]) {
  if (pool === "flask" && isMagicFlaskItem(item)) {
    return resolveComparedFlaskBaseName(item);
  }

  if (pool === "flask" && isTinctureItem(item)) {
    return resolveComparedTinctureBaseName(item);
  }

  const name = item.name?.trim();
  const base = item.base?.trim();

  if (name && base && normalizeComparedText(name) !== normalizeComparedText(base)) {
    return `${name} (${base})`;
  }

  if (name || base) {
    return name || base || (pool === "jewel" ? "Socketed Jewel" : "Flask");
  }

  return pool === "jewel" ? "Socketed Jewel" : "Flask";
}

function collectUnorderedPoolPairs(currentEntries: ComparedItemEntry[], targetEntries: ComparedItemEntry[]): ComparedItemPair[] {
  const rows: ComparedItemPair[] = [];
  const orderedKeys = [
    ...new Set([
      ...targetEntries.map((entry) => buildComparedPoolMatchKey(entry.item)),
      ...currentEntries.map((entry) => buildComparedPoolMatchKey(entry.item)),
    ]),
  ];

  for (const key of orderedKeys) {
    const currentGroup = currentEntries.filter((entry) => buildComparedPoolMatchKey(entry.item) === key);
    const targetGroup = targetEntries.filter((entry) => buildComparedPoolMatchKey(entry.item) === key);
    rows.push(...pairComparedItemEntries(key, currentGroup, targetGroup));
  }

  return rows;
}

function pairComparedItemEntries(
  key: string,
  currentEntries: ComparedItemEntry[],
  targetEntries: ComparedItemEntry[],
): ComparedItemPair[] {
  const pairs: ComparedItemPair[] = [];
  const availableCurrent = new Set(currentEntries.map((_, index) => index));
  const availableTarget = new Set(targetEntries.map((_, index) => index));
  const candidates: Array<{ currentIndex: number; score: number; targetIndex: number }> = [];

  for (const [currentIndex, currentEntry] of currentEntries.entries()) {
    for (const [targetIndex, targetEntry] of targetEntries.entries()) {
      candidates.push({
        currentIndex,
        score: calculateComparedItemMatchScore(currentEntry.item, targetEntry.item),
        targetIndex,
      });
    }
  }

  candidates.sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }
    if (left.targetIndex !== right.targetIndex) {
      return left.targetIndex - right.targetIndex;
    }
    return left.currentIndex - right.currentIndex;
  });

  for (const candidate of candidates) {
    if (!availableCurrent.has(candidate.currentIndex) || !availableTarget.has(candidate.targetIndex)) {
      continue;
    }

    availableCurrent.delete(candidate.currentIndex);
    availableTarget.delete(candidate.targetIndex);
    pairs.push({
      current: currentEntries[candidate.currentIndex],
      key: `${key}:${candidate.targetIndex}:${candidate.currentIndex}`,
      target: targetEntries[candidate.targetIndex],
    });
  }

  for (const currentIndex of availableCurrent) {
    pairs.push({
      current: currentEntries[currentIndex],
      key: `${key}:current:${currentIndex}`,
    });
  }

  for (const targetIndex of availableTarget) {
    pairs.push({
      key: `${key}:target:${targetIndex}`,
      target: targetEntries[targetIndex],
    });
  }

  return pairs;
}

function buildComparedPoolMatchKey(item: ItemPayload) {
  if (isTinctureItem(item)) {
    return `tincture:${normalizeComparedText(resolveComparedTinctureBaseName(item))}`;
  }

  if (isFlaskItem(item)) {
    return `flask:${normalizeComparedText(resolveComparedFlaskBaseName(item))}`;
  }

  if (isUniqueLikeItem(item)) {
    return `unique:${normalizeComparedText(item.name ?? item.base)}|${normalizeComparedText(item.base ?? item.name)}`;
  }

  if (item.rarity === "Rare") {
    return `rare:${normalizeComparedText(item.base ?? item.name)}`;
  }

  return [
    "other",
    normalizeComparedText(item.rarity),
    normalizeComparedText(item.name),
    normalizeComparedText(item.base),
  ].join("|");
}

function calculateComparedItemMatchScore(currentItem: ItemPayload, targetItem: ItemPayload) {
  const currentMods = collectComparableMods(currentItem);
  const targetMods = collectComparableMods(targetItem);
  const sharedTemplates = countSharedTemplates(currentMods, targetMods);
  const exactMatches = countSharedExactModLines(currentMods, targetMods);
  const totalMods = currentMods.length + targetMods.length;

  return sharedTemplates * 100 + exactMatches * 10 - (totalMods - sharedTemplates * 2);
}

function countSharedTemplates(currentMods: ComparedItemMod[], targetMods: ComparedItemMod[]) {
  const currentCounts = countByKey(currentMods.map((mod) => mod.template));
  const targetCounts = countByKey(targetMods.map((mod) => mod.template));
  let shared = 0;

  for (const [template, currentCount] of currentCounts) {
    shared += Math.min(currentCount, targetCounts.get(template) ?? 0);
  }

  return shared;
}

function countSharedExactModLines(currentMods: ComparedItemMod[], targetMods: ComparedItemMod[]) {
  const currentCounts = countByKey(currentMods.map((mod) => normalizeComparedText(mod.text)));
  const targetCounts = countByKey(targetMods.map((mod) => normalizeComparedText(mod.text)));
  let shared = 0;

  for (const [text, currentCount] of currentCounts) {
    shared += Math.min(currentCount, targetCounts.get(text) ?? 0);
  }

  return shared;
}

function countByKey(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return counts;
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

function collectTreeOverrideCounts(tree: BuildCompareTreeContext, pattern: RegExp) {
  const counts = new Map<string, ComparedCountedTreeValue>();
  if (!tree.spec) {
    return counts;
  }

  for (const override of tree.spec.overrides) {
    if (!pattern.test(override.name)) {
      continue;
    }

    const key = override.name.trim();
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(key, {
      count: 1,
      label: key,
    });
  }

  return counts;
}

function isUniqueLikeItem(item: ItemPayload) {
  return item.rarity === "Unique" || item.rarity === "Relic";
}

function isComparableUniqueItemPair(currentItem: ItemPayload, targetItem: ItemPayload) {
  return isUniqueLikeItem(currentItem) && isUniqueLikeItem(targetItem) && buildComparedPoolMatchKey(currentItem) === buildComparedPoolMatchKey(targetItem);
}

function isComparableRareItemPair(currentItem: ItemPayload, targetItem: ItemPayload) {
  return currentItem.rarity === "Rare" && targetItem.rarity === "Rare" && buildComparedPoolMatchKey(currentItem) === buildComparedPoolMatchKey(targetItem);
}

function buildUniqueItemModDiff(currentItem: ItemPayload, targetItem: ItemPayload) {
  return buildThresholdedItemModDiff(currentItem, targetItem);
}

function buildRareItemModDiff(currentItem: ItemPayload, targetItem: ItemPayload) {
  return buildThresholdedItemModDiff(currentItem, targetItem);
}

function buildMagicFlaskPoolModDiff(currentFlasks: ItemPayload[], targetFlasks: ItemPayload[]) {
  return buildExplicitModPoolDiffDisplay(currentFlasks, targetFlasks);
}

function buildExplicitModPoolDiffDisplay(currentItems: ItemPayload[], targetItems: ItemPayload[]) {
  const diff = buildComparedExplicitModPoolDiff(currentItems, targetItems);
  if (!diff) {
    return undefined;
  }

  if (diff.currentOnly.length === 0 && diff.targetOnly.length === 0 && diff.significantPairs.length === 0) {
    return undefined;
  }

  return formatComparedItemModDiff(diff);
}

function buildThresholdedItemModDiff(currentItem: ItemPayload, targetItem: ItemPayload) {
  const diff = buildComparedItemModDiff(currentItem, targetItem, true);
  if (diff.currentOnly.length === 0 && diff.targetOnly.length === 0 && diff.significantPairs.length === 0) {
    return undefined;
  }

  return formatComparedItemModDiff(diff);
}

function buildComparedExplicitModPoolDiff(currentItems: ItemPayload[], targetItems: ItemPayload[]): ComparedItemModDiff | undefined {
  const currentMods = collectExplicitModifierPoolMods(currentItems);
  const targetMods = collectExplicitModifierPoolMods(targetItems);
  if (currentMods.length === 0 && targetMods.length === 0) {
    return undefined;
  }

  return buildComparedModPoolDiffWithThreshold(currentMods, targetMods, RARE_VALUE_DIFFERENCE_THRESHOLD);
}

function buildComparedItemModDiff(
  currentItem: ItemPayload,
  targetItem: ItemPayload,
  includeSignificantValueDiffs: boolean,
): ComparedItemModDiff {
  const currentMods = collectComparableMods(currentItem);
  const targetMods = collectComparableMods(targetItem);
  return buildComparedModPoolDiffWithThreshold(
    currentMods,
    targetMods,
    includeSignificantValueDiffs ? RARE_VALUE_DIFFERENCE_THRESHOLD : undefined,
  );
}

function buildComparedModPoolDiffWithThreshold(
  currentMods: ComparedItemMod[],
  targetMods: ComparedItemMod[],
  valueDifferenceThreshold?: number,
): ComparedItemModDiff {
  const templateOrder = [
    ...targetMods.map((mod) => mod.template),
    ...currentMods.map((mod) => mod.template).filter((template) => !targetMods.some((mod) => mod.template === template)),
  ];
  const orderedTemplates = dedupePreserveOrder(templateOrder);
  const diff: ComparedItemModDiff = {
    currentOnly: [],
    significantPairs: [],
    targetOnly: [],
  };

  for (const template of orderedTemplates) {
    const currentGroup = currentMods.filter((mod) => mod.template === template);
    const targetGroup = targetMods.filter((mod) => mod.template === template);
    const { pairs, remainingCurrent, remainingTarget } = pairComparedMods(currentGroup, targetGroup);

    diff.currentOnly.push(...remainingCurrent);
    diff.targetOnly.push(...remainingTarget);

    if (valueDifferenceThreshold === undefined) {
      continue;
    }

    for (const pair of pairs) {
      if (hasValueDifferenceAboveThreshold(pair.current, pair.target, valueDifferenceThreshold)) {
        diff.significantPairs.push(pair);
      }
    }
  }

  return diff;
}

function collectComparableMods(item: ItemPayload): ComparedItemMod[] {
  const mods: ComparedItemMod[] = [];

  for (const line of dedupePreserveOrder((item.synthesizedMods ?? []).map((entry) => entry.trim()).filter(Boolean))) {
    mods.push(toComparedItemMod("Synthesized", line));
  }

  for (const line of dedupePreserveOrder((item.implicits ?? []).map((entry) => entry.trim()).filter(Boolean))) {
    mods.push(toComparedItemMod("Implicit", line));
  }

  for (const mod of collectComparableExplicitMods(item)) {
    mods.push(toComparedItemMod(capitalize(mod.kind), mod.text));
  }

  for (const line of dedupePreserveOrder((item.scourgedMods ?? []).map((entry) => entry.trim()).filter(Boolean))) {
    mods.push(toComparedItemMod("Scourged", line));
  }

  for (const line of dedupePreserveOrder((item.crucibleMods ?? []).map((entry) => entry.trim()).filter(Boolean))) {
    mods.push(toComparedItemMod("Crucible", line));
  }

  return mods;
}

function collectExplicitModifierPoolMods(items: ItemPayload[]) {
  return items.flatMap((item) =>
    collectComparableExplicitMods(item).map((mod) => toComparedItemMod(capitalize(mod.kind), mod.text)),
  );
}

function collectComparableExplicitMods(item: ItemPayload): ItemExplicitModPayload[] {
  if (item.orderedExplicitMods?.length) {
    return item.orderedExplicitMods;
  }

  return [
    ...(item.explicits ?? []).map((text) => ({ kind: "explicit" as const, text })),
    ...(item.fracturedMods ?? []).map((text) => ({ kind: "fractured" as const, text })),
    ...(item.crafted ?? []).map((text) => ({ kind: "crafted" as const, text })),
  ];
}

function toComparedItemMod(category: string, text: string): ComparedItemMod {
  const cleanText = text.trim();
  return {
    category,
    template: normalizeComparedModTemplate(cleanText),
    text: cleanText,
    values: extractComparedNumericValues(cleanText),
  };
}

function pairComparedMods(currentMods: ComparedItemMod[], targetMods: ComparedItemMod[]) {
  const pairs: Array<{ current: ComparedItemMod; target: ComparedItemMod }> = [];
  const availableCurrent = new Set(currentMods.map((_, index) => index));
  const availableTarget = new Set(targetMods.map((_, index) => index));
  const candidates: Array<{ currentIndex: number; score: number; targetIndex: number }> = [];

  for (const [currentIndex, currentMod] of currentMods.entries()) {
    for (const [targetIndex, targetMod] of targetMods.entries()) {
      candidates.push({
        currentIndex,
        score: calculateComparedModPairScore(currentMod, targetMod),
        targetIndex,
      });
    }
  }

  candidates.sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }
    if (left.targetIndex !== right.targetIndex) {
      return left.targetIndex - right.targetIndex;
    }
    return left.currentIndex - right.currentIndex;
  });

  for (const candidate of candidates) {
    if (!availableCurrent.has(candidate.currentIndex) || !availableTarget.has(candidate.targetIndex)) {
      continue;
    }

    availableCurrent.delete(candidate.currentIndex);
    availableTarget.delete(candidate.targetIndex);
    pairs.push({
      current: currentMods[candidate.currentIndex],
      target: targetMods[candidate.targetIndex],
    });
  }

  return {
    pairs,
    remainingCurrent: [...availableCurrent].map((index) => currentMods[index]),
    remainingTarget: [...availableTarget].map((index) => targetMods[index]),
  };
}

function calculateComparedModPairScore(currentMod: ComparedItemMod, targetMod: ComparedItemMod) {
  if (currentMod.text === targetMod.text) {
    return 1_000;
  }

  const maxRelativeDifference = calculateMaxRelativeDifference(currentMod.values, targetMod.values);
  if (maxRelativeDifference === undefined) {
    return 0;
  }

  return 100 - maxRelativeDifference * 100;
}

function hasValueDifferenceAboveThreshold(currentMod: ComparedItemMod, targetMod: ComparedItemMod, threshold: number) {
  const maxRelativeDifference = calculateMaxRelativeDifference(currentMod.values, targetMod.values);
  return maxRelativeDifference !== undefined && maxRelativeDifference > threshold;
}

function calculateMaxRelativeDifference(currentValues: number[], targetValues: number[]) {
  if (currentValues.length === 0 || targetValues.length === 0 || currentValues.length !== targetValues.length) {
    return undefined;
  }

  let maxDifference = 0;
  for (let index = 0; index < currentValues.length; index += 1) {
    const currentValue = currentValues[index];
    const targetValue = targetValues[index];
    const denominator = Math.max(Math.abs(currentValue), Math.abs(targetValue));
    const difference = denominator === 0 ? 0 : Math.abs(currentValue - targetValue) / denominator;
    maxDifference = Math.max(maxDifference, difference);
  }

  return maxDifference;
}

function formatComparedItemModDiff(
  diff: ComparedItemModDiff,
  labels?: {
    currentOnlyTitle?: string;
    pairTitle?: string;
    targetOnlyTitle?: string;
  },
): ComparedItemModDiffDisplay {
  const currentOnlyTitle = labels?.currentOnlyTitle ?? "Only in current";
  const targetOnlyTitle = labels?.targetOnlyTitle ?? "Only in target";
  const pairTitle = labels?.pairTitle ?? "Significant roll differences";
  const currentLines: string[] = [];
  const targetLines: string[] = [];

  appendCompareSummarySection(
    currentLines,
    currentOnlyTitle,
    diff.currentOnly.map((mod) => formatComparedModLine(mod)),
  );
  appendCompareSummarySection(
    targetLines,
    targetOnlyTitle,
    diff.targetOnly.map((mod) => formatComparedModLine(mod)),
  );
  appendCompareSummarySection(
    currentLines,
    pairTitle,
    diff.significantPairs.map((pair) => formatComparedModLine(pair.current)),
  );
  appendCompareSummarySection(
    targetLines,
    pairTitle,
    diff.significantPairs.map((pair) => formatComparedModLine(pair.target)),
  );

  return {
    currentValue: currentLines.length > 0 ? currentLines.join("\n") : "None",
    direction:
      diff.currentOnly.length > 0 && diff.targetOnly.length === 0 && diff.significantPairs.length === 0
        ? "source-only"
        : diff.targetOnly.length > 0 && diff.currentOnly.length === 0 && diff.significantPairs.length === 0
          ? "target-only"
          : "both",
    targetValue: targetLines.length > 0 ? targetLines.join("\n") : "None",
  };
}

function appendCompareSummarySection(lines: string[], title: string, values: readonly string[]) {
  if (values.length === 0) {
    return;
  }

  if (lines.length > 0) {
    lines.push("");
  }

  lines.push(title, ...values.map((value) => `- ${value}`));
}

function formatComparedModLine(mod: ComparedItemMod) {
  return `${mod.category}: ${mod.text}`;
}

function collectAllocatedClusterJewelSummaries(context: BuildCompareSelectionContext) {
  if (!context.treeSpec) {
    return [];
  }

  return collectAllocatedClusterJewelNodeSummaries(
    context.treeSpec,
    context.itemsById,
    pickPassiveTreeVariant(context.treeSpec, TREE_MANIFEST),
  ).filter((summary) => isAggregatedClusterJewelItem(summary.item));
}

function aggregateClusterSmallPassiveTotals(
  summaries: ReturnType<typeof collectAllocatedClusterJewelSummaries>,
): ComparedItemMod[] {
  return aggregateComparedMods(
    summaries
      .filter((summary) => summary.kind === "small-passive")
      .flatMap((summary) => summary.stats.map((line) => ({ category: "Small Passive", text: line.trim() })).filter((entry) => entry.text)),
  );
}

function aggregateClusterNotableTotals(summaries: ReturnType<typeof collectAllocatedClusterJewelSummaries>): ComparedItemMod[] {
  const counts = new Map<string, number>();
  const orderedNames: string[] = [];

  for (const summary of summaries) {
    if (summary.kind !== "notable") {
      continue;
    }

    const name = summary.name.trim();
    if (!name) {
      continue;
    }

    if (!counts.has(name)) {
      orderedNames.push(name);
    }
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return orderedNames.map((name) => toComparedItemMod("Notable", `${name} x${counts.get(name) ?? 0}`));
}

function aggregateComparedMods(entries: Array<{ category: string; text: string }>): ComparedItemMod[] {
  const aggregated = new Map<
    string,
    {
      category: string;
      displayTemplate: string;
      order: number;
      values: number[];
    }
  >();
  let order = 0;

  for (const entry of entries) {
    const mod = toComparedItemMod(entry.category, entry.text);
    const existing = aggregated.get(mod.template);
    if (!existing) {
      aggregated.set(mod.template, {
        category: mod.category,
        displayTemplate: buildComparedDisplayTemplate(mod.text),
        order,
        values: [...mod.values],
      });
      order += 1;
      continue;
    }

    for (let index = 0; index < mod.values.length; index += 1) {
      existing.values[index] = (existing.values[index] ?? 0) + mod.values[index];
    }
  }

  return [...aggregated.entries()]
    .sort((left, right) => left[1].order - right[1].order)
    .map(([template, entry]) => ({
      category: entry.category,
      template,
      text: renderComparedDisplayTemplate(entry.displayTemplate, entry.values),
      values: entry.values,
    }));
}

function buildComparedClusterAggregateDiff(
  currentMods: ComparedItemMod[],
  targetMods: ComparedItemMod[],
  labels: Parameters<typeof formatComparedItemModDiff>[1],
  valueDifferenceThreshold: number,
) {
  if (currentMods.length === 0 && targetMods.length === 0) {
    return undefined;
  }

  const diff = buildComparedModPoolDiffWithThreshold(currentMods, targetMods, valueDifferenceThreshold);
  if (diff.currentOnly.length === 0 && diff.targetOnly.length === 0 && diff.significantPairs.length === 0) {
    return undefined;
  }

  return formatComparedItemModDiff(diff, labels);
}

function buildComparedDisplayTemplate(text: string) {
  return text.trim().replace(/-?\d+(?:\.\d+)?/g, "#");
}

function renderComparedDisplayTemplate(template: string, values: number[]) {
  let valueIndex = 0;
  return template.replace(/#/g, () => formatComparedDisplayValue(values[valueIndex++] ?? 0));
}

function formatComparedDisplayValue(value: number) {
  if (Number.isInteger(value)) {
    return `${value}`;
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

function normalizeComparedModTemplate(line: string) {
  return normalizeComparedText(line)
    .replace(/\((?:-?\d+(?:\.\d+)?)\s*-\s*(?:-?\d+(?:\.\d+)?)\)/g, "#")
    .replace(/-?\d+(?:\.\d+)?/g, "#")
    .replace(/\bcharges\b/g, "charge")
    .replace(/(#\s+[a-z]+)s\b/g, "$1");
}

function extractComparedNumericValues(line: string) {
  return [...line.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0])).filter((value) => Number.isFinite(value));
}

function normalizeComparedText(value: string | undefined) {
  return value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
}

function isComparedItemLabelEquivalent(comparedFieldName: string, item: ItemPayload, expandedLabel: string) {
  const normalizedFieldName = normalizeComparedText(stripComparedPoolOccurrenceSuffix(comparedFieldName));
  if (!normalizedFieldName) {
    return false;
  }

  const compactLabel = buildCompactComparedItemLabel(item);
  return [expandedLabel, compactLabel].some((label) => normalizeComparedText(label) === normalizedFieldName);
}

function stripComparedPoolOccurrenceSuffix(value: string) {
  return value.replace(/\s+#\d+$/, "");
}

function buildCompactComparedItemLabel(item: ItemPayload) {
  const name = item.name?.trim();
  const base = item.base?.trim();
  if (name && base && normalizeComparedText(name) !== normalizeComparedText(base)) {
    return `${name} (${base})`;
  }

  return name || base || "";
}

function resolveComparedItemCategory(currentItem: ItemPayload | undefined, targetItem: ItemPayload | undefined): BuildCompareRow["itemCategory"] {
  const item = targetItem ?? currentItem;
  if (!item) {
    return "other";
  }

  if (isFlaskItem(item) || isTinctureItem(item)) {
    return "flask";
  }

  if (isClusterJewelItem(item)) {
    return "cluster-jewel";
  }

  if (isRegularJewelItem(item)) {
    return "regular-jewel";
  }

  if (isUniqueLikeItem(item)) {
    return "unique";
  }

  if (item.rarity === "Rare") {
    return "rare";
  }

  return "other";
}

function isFlaskItem(item: ItemPayload) {
  return /\bflask\b/i.test([item.base, item.name].filter((value): value is string => Boolean(value)).join("\n"));
}

function isMagicFlaskItem(item: ItemPayload) {
  return isFlaskItem(item) && item.rarity === "Magic";
}

function isTinctureItem(item: ItemPayload) {
  return /\btincture\b/i.test([item.base, item.name].filter((value): value is string => Boolean(value)).join("\n"));
}

function isPooledFlaskSectionItem(item: ItemPayload) {
  return isMagicFlaskItem(item) || isTinctureItem(item);
}

function isAggregatedClusterJewelItem(item: ItemPayload | undefined) {
  return Boolean(item && isClusterJewelItem(item) && (item.rarity === "Rare" || item.rarity === "Magic"));
}

function isClusterJewelItem(item: ItemPayload) {
  return /\bcluster jewel\b/i.test([item.base, item.name].filter((value): value is string => Boolean(value)).join("\n"));
}

function isRegularJewelItem(item: ItemPayload) {
  return isJewelItem(item) && !isClusterJewelItem(item);
}

function isJewelItem(item: ItemPayload) {
  return /\bjewel\b/i.test([item.base, item.name].filter((value): value is string => Boolean(value)).join("\n"));
}

function resolveComparedFlaskBaseName(item: ItemPayload) {
  const candidates = dedupePreserveOrder(
    [
      item.base?.trim(),
      item.name?.trim(),
      ...item.raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ].filter((value): value is string => Boolean(value)),
  );

  for (const candidate of candidates) {
    const resolvedBase = extractComparedFlaskBaseName(candidate);
    if (resolvedBase) {
      return resolvedBase;
    }
  }

  return item.base?.trim() || item.name?.trim() || "Flask";
}

function resolveComparedTinctureBaseName(item: ItemPayload) {
  return item.base?.trim() || item.name?.trim() || "Tincture";
}

function extractComparedFlaskBaseName(value: string) {
  if (!/\bflask\b/i.test(value)) {
    return undefined;
  }

  const trimmedValue = value.trim();
  const prefixSegment = trimmedValue.split(/\s+of\s+/i)[0]?.trim() ?? trimmedValue;
  const words = prefixSegment.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return undefined;
  }

  const trailingType = words.at(-2)?.toLowerCase();
  if (words.length >= 3 && trailingType && FLASK_BASE_MODIFIER_TYPES.has(trailingType)) {
    return words.slice(-3).join(" ");
  }

  if (words.length >= 2) {
    return words.slice(-2).join(" ");
  }

  return prefixSegment;
}

function capitalize(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function collectVariantDisplayLines(item: ItemPayload) {
  const lines: string[] = [];
  const synthesizedLines = dedupePreserveOrder((item.synthesizedMods ?? []).map((line) => line.trim()).filter(Boolean));
  const implicitLines = dedupePreserveOrder((item.implicits ?? []).map((line) => line.trim()).filter(Boolean));
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

  appendLabeledCompareSection(lines, "Synthesized Mods", synthesizedLines);
  appendLabeledCompareSection(lines, "Implicits", implicitLines);
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

function describeComparedItem(item: ItemPayload | undefined, comparedFieldName?: string) {
  if (!item) {
    return "Missing";
  }

  const label = buildComparedItemLabel(item);
  const includeLabel = !comparedFieldName || !isComparedItemLabelEquivalent(comparedFieldName, item, label);
  const variantDescription = describeItemVariant(item);

  if (variantDescription === "Different modifier set") {
    return includeLabel ? label || "Occupied" : "Present";
  }

  return [includeLabel ? label : undefined, variantDescription].filter(Boolean).join("\n");
}

function describeComparedPooledFlaskSectionBase(item: ItemPayload | undefined) {
  return item ? "Present" : "Missing";
}

function buildComparedItemLabel(item: ItemPayload) {
  const name = item.name?.trim();
  const base = item.base?.trim();
  if (name && base && normalizeComparedText(name) === normalizeComparedText(base)) {
    return name;
  }

  return [name, base].filter((value): value is string => Boolean(value)).join("\n");
}

function sameComparedItemIdentity(currentItem: ItemPayload | undefined, targetItem: ItemPayload | undefined) {
  if (!currentItem || !targetItem) {
    return currentItem === targetItem;
  }

  return buildComparedItemIdentityKey(currentItem) === buildComparedItemIdentityKey(targetItem);
}

function buildComparedItemIdentityKey(item: ItemPayload) {
  if (isTinctureItem(item)) {
    return `tincture:${normalizeComparedText(resolveComparedTinctureBaseName(item))}`;
  }

  if (isFlaskItem(item)) {
    return `flask:${normalizeComparedText(resolveComparedFlaskBaseName(item))}`;
  }

  if (item.rarity === "Rare") {
    return `rare:${normalizeComparedText(item.base ?? item.name)}`;
  }

  return [
    normalizeComparedText(item.rarity),
    normalizeComparedText(item.name),
    normalizeComparedText(item.base),
  ].join("|");
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

function isFlaskSectionSlotName(slotName: string) {
  return FLASK_SLOT_NAME_PATTERN.test(slotName) || TINCTURE_SLOT_NAME_PATTERN.test(slotName);
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
  return normalizeComparedText(line.replace(/\{[^}]+\}/g, " "));
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
