import { decodeBuildCode } from "@pobcodes/pob-codec";
import type {
  BuildPayload,
  BuildSectionPayload,
  ConfigSetPayload,
  ConfigValue,
  GameVersion,
  GemPayload,
  ItemPayload,
  ItemSetPayload,
  SkillGroupPayload,
  SkillSetPayload,
  TreeSpecPayload,
} from "@pobcodes/shared-types";
import { XMLParser } from "fast-xml-parser";

import { parseRawItem } from "./item-parser";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  trimValues: false,
});

export function parseBuildCodeToPayload(code: string, source: "code" | "id" = "code"): BuildPayload {
  const xml = decodeBuildCode(code);
  return parseBuildXmlToPayload(xml, source);
}

export function parseBuildXmlToPayload(xml: string, source: "code" | "id" = "code"): BuildPayload {
  const parsed = xmlParser.parse(xml) as Record<string, unknown>;
  const root = asRecord(parsed.PathOfBuilding);

  if (!parsed.PathOfBuilding) {
    throw new Error("Only Path of Exile 1 Path of Building exports are supported");
  }

  const buildNode = asRecord(root.Build);
  const itemsNode = asRecord(root.Items);
  const skillsNode = asRecord(root.Skills);
  const treeNode = asRecord(root.Tree);
  const configNode = asRecord(root.Config);

  const gameVersion: GameVersion = "poe1";

  const items = parseItems(itemsNode);
  const itemSets = parseItemSets(itemsNode);
  const activeItemSetId = itemSets.find((set) => set.active)?.id;

  const skillSets = parseSkillSets(skillsNode);
  const activeSkillSetId = skillSets.find((set) => set.active)?.id ?? (skillSets[0]?.id ?? 1);

  const treeSpecs = parseTreeSpecs(treeNode);
  const activeTreeIndex = Math.max(
    treeSpecs.findIndex((spec) => spec.active),
    0,
  );
  const parsedConfig = parseConfig(configNode);

  return {
    gameVersion,
    build: parseBuildSection(buildNode),
    treeSpecs,
    activeTreeIndex,
    itemSets,
    activeItemSetId,
    items,
    skillSets,
    activeSkillSetId,
    stats: parseStats(buildNode),
    notes: extractNotes(root.Notes),
    configSets: parsedConfig.configSets,
    activeConfigSetId: parsedConfig.activeConfigSetId,
    config: parsedConfig.activeConfig,
    configPlaceholders: parsedConfig.activeConfigPlaceholders,
    meta: {
      source,
      createdAt: new Date().toISOString(),
    },
  };
}

function parseBuildSection(node: Record<string, unknown>): BuildSectionPayload {
  return {
    level: toNum(node.level) ?? 1,
    className: toStr(node.className) ?? "Unknown",
    ascendClassName: nilToUndefined(toStr(node.ascendClassName)),
    bandit: nilToUndefined(toStr(node.bandit)),
    pantheonMajorGod: nilToUndefined(toStr(node.pantheonMajorGod)),
    pantheonMinorGod: nilToUndefined(toStr(node.pantheonMinorGod)),
    mainSocketGroup: toNum(node.mainSocketGroup) ?? toNum(node.mainSkillIndex) ?? 1,
    targetVersion: nilToUndefined(toStr(node.targetVersion)),
    viewMode: nilToUndefined(toStr(node.viewMode)),
  };
}

function parseStats(node: Record<string, unknown>): BuildPayload["stats"] {
  const player: Record<string, string> = {};
  const playerRows: BuildPayload["stats"]["playerRows"] = [];
  const minion: Record<string, string> = {};
  const minionRows: BuildPayload["stats"]["minionRows"] = [];
  const fullDpsSkills: BuildPayload["stats"]["fullDpsSkills"] = [];

  const playerStats = asArray(node.PlayerStat);
  for (const stat of playerStats) {
    const s = asRecord(stat);
    const name = toStr(s.stat);
    const value = toStr(s.value);
    if (name && value != null) {
      playerRows.push({ stat: name, value });
      player[name] = value;
    }
  }

  const minionStats = asArray(node.MinionStat);
  for (const stat of minionStats) {
    const s = asRecord(stat);
    const name = toStr(s.stat);
    const value = toStr(s.value);
    if (name && value != null) {
      minionRows.push({ stat: name, value });
      minion[name] = value;
    }
  }

  const fullDps = asArray(node.FullDPSSkill);
  for (const row of fullDps) {
    const r = asRecord(row);
    const stat = toStr(r.stat);
    const value = toStr(r.value);
    if (!stat || value == null) {
      continue;
    }
    fullDpsSkills.push({
      stat,
      value,
      source: nilToUndefined(toStr(r.source)),
      skillPart: nilToUndefined(toStr(r.skillPart)),
    });
  }

  return { playerRows, player, minionRows, minion, fullDpsSkills };
}

function parseTreeSpecs(node: Record<string, unknown>): TreeSpecPayload[] {
  const activeSpecIndex = Math.max((toNum(node.activeSpec) ?? 1) - 1, 0);
  const specs = asArray(node.Spec).map((spec, index) => {
    const s = asRecord(spec);

    return {
      title: nilToUndefined(toStr(s.title)),
      version: nilToUndefined(toStr(s.treeVersion)),
      classId: toNum(s.classId),
      ascendancyId: toNum(s.ascendClassId),
      secondaryAscendancyId: toNum(s.secondaryAscendClassId),
      nodes: parseNodeList(toStr(s.nodes)),
      masteryEffects: parseMasteryEffects(toStr(s.masteryEffects)),
      sockets: parseSockets(asRecord(s.Sockets)),
      overrides: parseOverrides(asRecord(s.Overrides)),
      url: nilToUndefined(extractText(s.URL)),
      active: activeSpecIndex === index,
    };
  });

  if (specs.length > 0 && !specs.some((spec) => spec.active)) {
    specs[0] = { ...specs[0], active: true };
  }

  return specs;
}

function parseSockets(node: Record<string, unknown>): TreeSpecPayload["sockets"] {
  return asArray(node.Socket)
    .map((socket) => asRecord(socket))
    .map((socket) => ({
      nodeId: toNum(socket.nodeId) ?? 0,
      itemId: toNum(socket.itemId) ?? 0,
    }))
    .filter((socket) => socket.nodeId > 0 && socket.itemId > 0);
}

function parseOverrides(node: Record<string, unknown>): TreeSpecPayload["overrides"] {
  return asArray(node.Override)
    .map((override) => asRecord(override))
    .map((override) => ({
      nodeId: toNum(override.nodeId) ?? 0,
      name: toStr(override.dn) ?? "",
      effect: extractText(override) ?? "",
    }))
    .filter((override) => override.nodeId > 0 && override.name.length > 0);
}

function parseItems(node: Record<string, unknown>): ItemPayload[] {
  return asArray(node.Item).map((itemNode) => {
    const item = asRecord(itemNode);
    const id = toNum(item.id) ?? 0;
    const raw = extractText(item) ?? "";
    return parseRawItem(raw, id);
  });
}

function parseItemSets(node: Record<string, unknown>): ItemSetPayload[] {
  const activeSet = toNum(node.activeItemSet);

  const sets = asArray(node.ItemSet).map((setNode) => {
    const set = asRecord(setNode);
    const id = toNum(set.id) ?? 0;
    const slots = asArray(set.Slot)
      .map((slotNode) => asRecord(slotNode))
      .map((slot) => ({
        name: toStr(slot.name) ?? "",
        itemId: toNum(slot.itemId) ?? 0,
        active: slot.active == null ? true : toBool(slot.active),
      }))
      .filter((slot) => slot.name.length > 0);

    return {
      id,
      title: nilToUndefined(toStr(set.title)),
      slots,
      active: activeSet === id,
    };
  });

  if (sets.length > 0 && !sets.some((set) => set.active)) {
    sets[0] = { ...sets[0], active: true };
  }

  return sets;
}

function parseSkillSets(node: Record<string, unknown>): SkillSetPayload[] {
  const activeSkillSet = toNum(node.activeSkillSet);

  const skillSetNodes = asArray(node.SkillSet);
  if (skillSetNodes.length > 0) {
    const sets = skillSetNodes.map((setNode) => {
      const set = asRecord(setNode);
      const id = toNum(set.id) ?? 0;
      return {
        id,
        title: nilToUndefined(toStr(set.title)),
        groups: parseSkillGroups(asArray(set.Skill), id),
        active: activeSkillSet === id,
      };
    });

    if (sets.length > 0 && !sets.some((set) => set.active)) {
      sets[0] = { ...sets[0], active: true };
    }

    return sets;
  }

  const legacyGroups = parseSkillGroups(asArray(node.Skill), 1);
  return [
    {
      id: 1,
      title: "Default",
      groups: legacyGroups,
      active: true,
    },
  ];
}

function parseSkillGroups(groups: unknown[], skillSetId: number): SkillGroupPayload[] {
  return groups.map((groupNode, idx) => {
    const group = asRecord(groupNode);
    const enabled =
      group.enabled != null ? toBool(group.enabled) : group.active != null ? toBool(group.active) : true;

    return {
      id: `${skillSetId}:${idx}`,
      label: nilToUndefined(toStr(group.label)),
      slot: nilToUndefined(toStr(group.slot)),
      enabled,
      selected: false,
      mainActiveSkill: toNum(group.mainActiveSkill) ?? 1,
      gems: parseGems(group),
    };
  });
}

function parseGems(group: Record<string, unknown>): GemPayload[] {
  const main = toNum(group.mainActiveSkill) ?? 1;

  return asArray(group.Gem).map((gemNode, idx) => {
    const gem = asRecord(gemNode);
    const skillId = nilToUndefined(toStr(gem.skillId));
    const gemId = nilToUndefined(toStr(gem.gemId));
    const nameSpec = toStr(gem.nameSpec) ?? "";
    const support = inferSupportGem(nameSpec, skillId, gemId);
    const selected = !support && idx + 1 === main;

    return {
      nameSpec,
      gemId,
      skillId,
      level: toNum(gem.level) ?? 1,
      quality: toNum(gem.quality) ?? 0,
      qualityId: nilToUndefined(toStr(gem.qualityId)),
      corrupted: gem.corrupted != null ? toBool(gem.corrupted) : false,
      enabled: gem.enabled == null ? true : toBool(gem.enabled),
      support,
      selected,
    };
  });
}

function parseConfig(node: Record<string, unknown>): {
  configSets: ConfigSetPayload[];
  activeConfigSetId?: number;
  activeConfig: Record<string, ConfigValue>;
  activeConfigPlaceholders: Record<string, ConfigValue>;
} {
  const activeConfigSetId = toNum(node.activeConfigSet) ?? 1;
  const configSetNodes = asArray(node.ConfigSet);
  const topLevelInputs = parseConfigEntries(asArray(node.Input));
  const topLevelPlaceholders = parseConfigEntries(asArray(node.Placeholder));

  if (configSetNodes.length > 0) {
    let configSets = configSetNodes.map((configSetNode, index) => {
      const configSet = asRecord(configSetNode);
      const id = toNum(configSet.id) ?? index + 1;
      return {
        id,
        title: nilToUndefined(toStr(configSet.title)),
        inputs: parseConfigEntries(asArray(configSet.Input)),
        placeholders: parseConfigEntries(asArray(configSet.Placeholder)),
        active: id === activeConfigSetId,
      };
    });

    if (configSets.length > 0 && !configSets.some((configSet) => configSet.active)) {
      configSets[0] = { ...configSets[0], active: true };
    }

    const activeConfigIndex = configSets.findIndex((configSet) => configSet.active);
    if (activeConfigIndex >= 0 && Object.keys(topLevelInputs).length > 0) {
      configSets = configSets.map((configSet, index) =>
        index === activeConfigIndex
          ? {
              ...configSet,
              inputs: { ...configSet.inputs, ...topLevelInputs },
            }
          : configSet,
      );
    }

    if (activeConfigIndex >= 0 && Object.keys(topLevelPlaceholders).length > 0) {
      configSets = configSets.map((configSet, index) =>
        index === activeConfigIndex
          ? {
              ...configSet,
              placeholders: { ...(configSet.placeholders ?? {}), ...topLevelPlaceholders },
            }
          : configSet,
      );
    }

    const activeConfig = configSets.find((configSet) => configSet.active) ?? configSets[0];
    return {
      configSets,
      activeConfigSetId: activeConfig?.id,
      activeConfig: { ...(activeConfig?.inputs ?? {}) },
      activeConfigPlaceholders: { ...(activeConfig?.placeholders ?? {}) },
    };
  }

  const defaultInputs = topLevelInputs;
  const defaultPlaceholders = topLevelPlaceholders;
  const defaultConfigSet: ConfigSetPayload = {
    id: 1,
    title: "Default",
    inputs: defaultInputs,
    placeholders: defaultPlaceholders,
    active: true,
  };

  return {
    configSets: [defaultConfigSet],
    activeConfigSetId: defaultConfigSet.id,
    activeConfig: { ...defaultInputs },
    activeConfigPlaceholders: { ...defaultPlaceholders },
  };
}

function parseConfigEntries(inputs: unknown[]): Record<string, ConfigValue> {
  const out: Record<string, ConfigValue> = {};

  for (const input of inputs) {
    const value = asRecord(input);
    const name = toStr(value.name);
    if (!name) {
      continue;
    }

    if (value.number != null && Number.isFinite(Number(value.number))) {
      out[name] = Number(value.number);
    } else if (value.boolean != null) {
      out[name] = toBool(value.boolean);
    } else if (value.string != null) {
      out[name] = String(value.string);
    }
  }

  return out;
}

function extractNotes(node: unknown): string {
  return extractText(node) ?? "";
}

function parseNodeList(raw?: string): number[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0);
}

function parseMasteryEffects(raw?: string): Array<[number, number]> {
  if (!raw) {
    return [];
  }

  const matches = [...raw.matchAll(/\{(\d+),(\d+)\}/g)];
  return matches.map((m) => [Number(m[1]), Number(m[2])]);
}

function inferSupportGem(nameSpec: string, skillId?: string, gemId?: string): boolean {
  if (gemId?.startsWith("Metadata/Items/Gems/Support")) {
    return true;
  }
  if (skillId?.startsWith("Support") || skillId?.endsWith("Support")) {
    return true;
  }
  return nameSpec.includes("Support");
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toStr(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }
  const out = String(value);
  return out.length > 0 ? out : undefined;
}

function toNum(value: unknown): number | undefined {
  if (value == null) {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value === "true" || value === "1";
  }
  return Boolean(value);
}

function extractText(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  const node = asRecord(value);
  const text = node["#text"] ?? node["__cdata"];
  if (typeof text === "string") {
    return text;
  }

  return undefined;
}

function nilToUndefined<T>(value: T | undefined): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string" && (value === "nil" || value === "None" || value.length === 0)) {
    return undefined;
  }

  return value;
}

export { parseRawItem } from "./item-parser";
