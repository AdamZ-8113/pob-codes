import type {
  BuildPayload,
  ConfigSetPayload,
  ItemSetPayload,
  SkillSetPayload,
  TreeSpecPayload,
} from "@pobcodes/shared-types";

const LOADOUT_GROUP_PATTERN = /\{([\w,]+)\}/;

export interface BuildViewerSelection {
  itemSetId?: number;
  skillSetId?: number;
  treeIndex: number;
  configSetId?: number;
}

export interface BuildLoadout {
  key: string;
  label: string;
  treeIndex: number;
  itemSetId?: number;
  skillSetId?: number;
  configSetId?: number;
}

interface NamedSetReference {
  id: number;
  title: string;
}

interface TreeSetReference {
  treeIndex: number;
  title: string;
}

interface GroupedTreeReference {
  treeIndex: number;
  linkId: string;
  setName: string;
}

interface ParsedLoadoutTitle {
  linkIds: string[];
  setName: string;
}

export function getInitialBuildViewerSelection(payload: BuildPayload): BuildViewerSelection {
  return {
    itemSetId: payload.activeItemSetId ?? payload.itemSets.find((set) => set.active)?.id ?? payload.itemSets[0]?.id,
    skillSetId: payload.activeSkillSetId ?? payload.skillSets.find((set) => set.active)?.id ?? payload.skillSets[0]?.id,
    treeIndex: clampTreeIndex(
      payload.treeSpecs.findIndex((spec) => spec.active) >= 0
        ? payload.treeSpecs.findIndex((spec) => spec.active)
        : payload.activeTreeIndex,
      payload.treeSpecs.length,
    ),
    configSetId:
      payload.activeConfigSetId ?? payload.configSets.find((configSet) => configSet.active)?.id ?? payload.configSets[0]?.id,
  };
}

export function getSelectedItemSet(payload: BuildPayload, itemSetId?: number): ItemSetPayload | undefined {
  return payload.itemSets.find((set) => set.id === itemSetId) ?? payload.itemSets.find((set) => set.active) ?? payload.itemSets[0];
}

export function getSelectedSkillSet(payload: BuildPayload, skillSetId?: number): SkillSetPayload | undefined {
  return payload.skillSets.find((set) => set.id === skillSetId) ?? payload.skillSets.find((set) => set.active) ?? payload.skillSets[0];
}

export function getSelectedTreeSpec(payload: BuildPayload, treeIndex?: number): TreeSpecPayload | undefined {
  return payload.treeSpecs[clampTreeIndex(treeIndex ?? payload.activeTreeIndex, payload.treeSpecs.length)] ?? payload.treeSpecs[0];
}

export function getSelectedConfigSet(payload: BuildPayload, configSetId?: number): ConfigSetPayload | undefined {
  return (
    payload.configSets.find((configSet) => configSet.id === configSetId) ??
    payload.configSets.find((configSet) => configSet.active) ??
    payload.configSets[0]
  );
}

export function getItemSetLabel(index: number, title?: string): string {
  return toDisplayTitle(title, `Item Set ${index + 1}`);
}

export function getSkillSetLabel(index: number, title?: string): string {
  return toDisplayTitle(title, `Skill Set ${index + 1}`);
}

export function getTreeSpecLabel(index: number, title?: string): string {
  return toDisplayTitle(title, `Spec ${index + 1}`);
}

export function getConfigSetLabel(index: number, title?: string): string {
  return toDisplayTitle(title, `Config Set ${index + 1}`);
}

export function getBuildLoadouts(payload: BuildPayload): BuildLoadout[] {
  const exactTreeSets: TreeSetReference[] = [];
  const groupedTreeSets: GroupedTreeReference[] = [];

  for (const [treeIndex, treeSpec] of payload.treeSpecs.entries()) {
    const title = getLoadoutTitle(treeSpec.title);
    const parsedTitle = parseLoadoutTitle(title);

    if (parsedTitle) {
      for (const linkId of parsedTitle.linkIds) {
        groupedTreeSets.push({
          treeIndex,
          linkId,
          setName: parsedTitle.setName,
        });
      }
      continue;
    }

    exactTreeSets.push({
      treeIndex,
      title,
    });
  }

  const items = identifyNamedSets(payload.itemSets);
  const skills = identifyNamedSets(payload.skillSets);
  const configs = identifyNamedSets(payload.configSets);
  const oneItem = payload.itemSets.length === 1 ? payload.itemSets[0]?.id : undefined;
  const oneSkill = payload.skillSets.length === 1 ? payload.skillSets[0]?.id : undefined;
  const oneConfig = payload.configSets.length === 1 ? payload.configSets[0]?.id : undefined;
  const loadouts: BuildLoadout[] = [];

  for (const tree of exactTreeSets) {
    if (!hasMatchingSet(oneItem, items.exactByTitle, tree.title)) {
      continue;
    }
    if (!hasMatchingSet(oneSkill, skills.exactByTitle, tree.title)) {
      continue;
    }
    if (!hasMatchingSet(oneConfig, configs.exactByTitle, tree.title)) {
      continue;
    }

    loadouts.push({
      key: `exact:${tree.treeIndex}:${tree.title}`,
      label: tree.title,
      treeIndex: tree.treeIndex,
      itemSetId: oneItem ?? items.exactByTitle.get(tree.title),
      skillSetId: oneSkill ?? skills.exactByTitle.get(tree.title),
      configSetId: oneConfig ?? configs.exactByTitle.get(tree.title),
    });
  }

  for (const tree of groupedTreeSets) {
    if (!hasMatchingSet(oneItem, items.groupedByLinkId, tree.linkId)) {
      continue;
    }
    if (!hasMatchingSet(oneSkill, skills.groupedByLinkId, tree.linkId)) {
      continue;
    }
    if (!hasMatchingSet(oneConfig, configs.groupedByLinkId, tree.linkId)) {
      continue;
    }

    loadouts.push({
      key: `group:${tree.treeIndex}:${tree.linkId}`,
      label: `${tree.setName} {${tree.linkId}}`,
      treeIndex: tree.treeIndex,
      itemSetId: oneItem ?? items.groupedByLinkId.get(tree.linkId),
      skillSetId: oneSkill ?? skills.groupedByLinkId.get(tree.linkId),
      configSetId: oneConfig ?? configs.groupedByLinkId.get(tree.linkId),
    });
  }

  return loadouts;
}

export function findMatchingBuildLoadout(payload: BuildPayload, selection: BuildViewerSelection): BuildLoadout | undefined {
  return getBuildLoadouts(payload).find(
    (loadout) =>
      loadout.treeIndex === clampTreeIndex(selection.treeIndex, payload.treeSpecs.length) &&
      loadout.itemSetId === selection.itemSetId &&
      loadout.skillSetId === selection.skillSetId &&
      loadout.configSetId === selection.configSetId,
  );
}

export function applyBuildLoadout(payload: BuildPayload, loadoutKey: string): BuildViewerSelection | undefined {
  const loadout = getBuildLoadouts(payload).find((entry) => entry.key === loadoutKey);
  if (!loadout) {
    return undefined;
  }

  return {
    itemSetId: loadout.itemSetId,
    skillSetId: loadout.skillSetId,
    treeIndex: clampTreeIndex(loadout.treeIndex, payload.treeSpecs.length),
    configSetId: loadout.configSetId,
  };
}

function identifyNamedSets(sets: Array<{ id: number; title?: string }>): {
  exactByTitle: Map<string, number>;
  groupedByLinkId: Map<string, number>;
} {
  const exactByTitle = new Map<string, number>();
  const groupedByLinkId = new Map<string, number>();

  for (const set of sets) {
    const title = getLoadoutTitle(set.title);
    const parsedTitle = parseLoadoutTitle(title);
    if (parsedTitle) {
      for (const linkId of parsedTitle.linkIds) {
        groupedByLinkId.set(linkId, set.id);
      }
      continue;
    }

    if (!exactByTitle.has(title)) {
      exactByTitle.set(title, set.id);
    }
  }

  return {
    exactByTitle,
    groupedByLinkId,
  };
}

function hasMatchingSet(singleSetId: number | undefined, exactOrGrouped: Map<string, number>, key: string): boolean {
  return singleSetId !== undefined || exactOrGrouped.has(key);
}

function parseLoadoutTitle(title: string): ParsedLoadoutTitle | undefined {
  const match = title.match(LOADOUT_GROUP_PATTERN);
  if (!match) {
    return undefined;
  }

  const linkIds = match[1]
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (linkIds.length === 0) {
    return undefined;
  }

  const setName = title.replace(match[0], "").trim() || "Default";
  return {
    linkIds,
    setName,
  };
}

function getLoadoutTitle(title?: string): string {
  return toDisplayTitle(title, "Default");
}

function toDisplayTitle(title: string | undefined, fallback: string): string {
  if (title && title.trim().length > 0) {
    return title;
  }

  return fallback;
}

function clampTreeIndex(treeIndex: number, totalTreeSpecs: number): number {
  if (totalTreeSpecs <= 0) {
    return 0;
  }

  return Math.min(Math.max(treeIndex, 0), totalTreeSpecs - 1);
}
