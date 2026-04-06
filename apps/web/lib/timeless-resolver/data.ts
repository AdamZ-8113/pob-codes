import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

type PassiveSkillType = 0 | 1 | 2 | 3 | 4 | 5;

interface RawTimelessStatRecord {
  _key: number;
  Category?: number;
  Id: string;
  Text?: string;
}

interface RawTimelessPassiveSkillRecord {
  _key: number;
  Id: string;
  IsJewelSocket: boolean;
  IsKeystone: boolean;
  IsNotable: boolean;
  Name: string;
  PassiveSkillGraphId: number;
  Stats: number[];
}

interface RawTimelessAlternateTreeVersionRecord {
  _key: number;
  Id: string;
  Var1: boolean;
  Var2: boolean;
  Var5: number;
  Var6: number;
  Var9: number;
}

interface RawTimelessAlternatePassiveSkillRecord {
  _key: number;
  AlternateTreeVersionsKey: number;
  Id: string;
  Name: string;
  PassiveType: PassiveSkillType[];
  RandomMax: number;
  RandomMin: number;
  SpawnWeight: number;
  Stat1Max: number;
  Stat1Min: number;
  Stat2Max: number;
  Stat2Min: number;
  StatsKeys: number[];
  Var10: number;
  Var11: number;
  Var12: number;
  Var18: number;
  Var24: number;
  Var9: number;
}

interface RawTimelessAlternatePassiveAdditionRecord {
  _key: number;
  AlternateTreeVersionsKey: number;
  Id: string;
  PassiveType: PassiveSkillType[];
  SpawnWeight: number;
  Stat1Max: number;
  Stat1Min: number;
  StatsKeys: number[];
  Var6: number;
  Var7: number;
}

export interface TimelessStatRecord {
  Category?: number;
  ID: string;
  Index: number;
  Text: string;
}

export interface TimelessPassiveSkillRecord {
  ID: string;
  Index: number;
  IsJewelSocket: boolean;
  IsKeystone: boolean;
  IsNotable: boolean;
  Name: string;
  PassiveSkillGraphID: number;
  StatIndices: number[];
}

export interface TimelessAlternateTreeVersionRecord {
  AreSmallAttributePassiveSkillsReplaced: boolean;
  AreSmallNormalPassiveSkillsReplaced: boolean;
  ID: string;
  Index: number;
  MaximumAdditions: number;
  MinimumAdditions: number;
  NotableReplacementSpawnWeight: number;
}

export interface TimelessAlternatePassiveSkillRecord {
  AlternateTreeVersionsKey: number;
  ConquerorIndex: number;
  ConquerorVersion: number;
  ID: string;
  Index: number;
  Name: string;
  PassiveType: PassiveSkillType[];
  RandomMax: number;
  RandomMin: number;
  SpawnWeight: number;
  Stat1Max: number;
  Stat1Min: number;
  Stat2Max: number;
  Stat2Min: number;
  Stat3Max: number;
  Stat3Min: number;
  Stat4Max: number;
  Stat4Min: number;
  StatsKeys: number[];
}

export interface TimelessAlternatePassiveAdditionRecord {
  AlternateTreeVersionsKey: number;
  ID: string;
  Index: number;
  PassiveType: PassiveSkillType[];
  SpawnWeight: number;
  Stat1Max: number;
  Stat1Min: number;
  Stat2Max: number;
  Stat2Min: number;
  StatsKeys: number[];
}

export interface TimelessTranslationFile {
  descriptors: TimelessTranslationDescriptor[];
}

export interface TimelessTranslationDescriptor {
  ids: string[];
  list: TimelessTranslationEntry[];
}

export interface TimelessTranslationEntry {
  conditions?: Array<{
    max?: number;
    min?: number;
    negated?: boolean;
  }>;
  index_handlers?: string[][] | Record<string, unknown>;
  string: string;
}

export interface TimelessDataSet {
  alternatePassiveAdditionsByTreeVersionAndPassiveType: Map<number, Map<PassiveSkillType, TimelessAlternatePassiveAdditionRecord[]>>;
  alternatePassiveSkillsByTreeVersionAndPassiveType: Map<number, Map<PassiveSkillType, TimelessAlternatePassiveSkillRecord[]>>;
  alternateTreeVersionsByIndex: Map<number, TimelessAlternateTreeVersionRecord>;
  inverseTranslations: Map<string, TimelessTranslationDescriptor>;
  passiveSkillIndexByGraphId: Map<number, number>;
  passiveSkillsByIndex: Map<number, TimelessPassiveSkillRecord>;
  statsByIndex: Map<number, TimelessStatRecord>;
}

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../data/timeless-jewels");
const DATA_FILES = {
  alternatePassiveAdditions: "alternate_passive_additions.json.gz",
  alternatePassiveSkills: "alternate_passive_skills.json.gz",
  alternateTreeVersions: "alternate_tree_versions.json.gz",
  passiveSkillAuraStatTranslations: "passive_skill_aura_stat_descriptions.json.gz",
  passiveSkillStatTranslations: "passive_skill_stat_descriptions.json.gz",
  passiveSkills: "passive_skills.json.gz",
  statTranslations: "stat_descriptions.json.gz",
  stats: "stats.json.gz",
} as const;

let timelessDataPromise: Promise<TimelessDataSet> | undefined;

export async function loadTimelessDataSet(): Promise<TimelessDataSet> {
  timelessDataPromise ??= loadTimelessDataSetInternal();
  return timelessDataPromise;
}

async function loadTimelessDataSetInternal(): Promise<TimelessDataSet> {
  const [
    alternatePassiveAdditions,
    alternatePassiveSkills,
    alternateTreeVersions,
    passiveSkills,
    stats,
    statTranslations,
    passiveSkillStatTranslations,
    passiveSkillAuraStatTranslations,
  ] = await Promise.all([
    readGzipJson<RawTimelessAlternatePassiveAdditionRecord[]>(DATA_FILES.alternatePassiveAdditions),
    readGzipJson<RawTimelessAlternatePassiveSkillRecord[]>(DATA_FILES.alternatePassiveSkills),
    readGzipJson<RawTimelessAlternateTreeVersionRecord[]>(DATA_FILES.alternateTreeVersions),
    readGzipJson<RawTimelessPassiveSkillRecord[]>(DATA_FILES.passiveSkills),
    readGzipJson<RawTimelessStatRecord[]>(DATA_FILES.stats),
    readGzipJson<TimelessTranslationFile>(DATA_FILES.statTranslations),
    readGzipJson<TimelessTranslationFile>(DATA_FILES.passiveSkillStatTranslations),
    readGzipJson<TimelessTranslationFile>(DATA_FILES.passiveSkillAuraStatTranslations),
  ]);

  const normalizedAlternatePassiveAdditions = alternatePassiveAdditions.map<TimelessAlternatePassiveAdditionRecord>((entry) => ({
    AlternateTreeVersionsKey: entry.AlternateTreeVersionsKey,
    ID: entry.Id,
    Index: entry._key,
    PassiveType: entry.PassiveType ?? [],
    SpawnWeight: entry.SpawnWeight,
    Stat1Max: entry.Stat1Max ?? 0,
    Stat1Min: entry.Stat1Min ?? 0,
    Stat2Max: entry.Var7 ?? 0,
    Stat2Min: entry.Var6 ?? 0,
    StatsKeys: entry.StatsKeys ?? [],
  }));
  const normalizedAlternatePassiveSkills = alternatePassiveSkills.map<TimelessAlternatePassiveSkillRecord>((entry) => ({
    AlternateTreeVersionsKey: entry.AlternateTreeVersionsKey,
    ConquerorIndex: entry.Var18 ?? 0,
    ConquerorVersion: entry.Var24 ?? 0,
    ID: entry.Id,
    Index: entry._key,
    Name: entry.Name,
    PassiveType: entry.PassiveType ?? [],
    RandomMax: entry.RandomMax ?? 0,
    RandomMin: entry.RandomMin ?? 0,
    SpawnWeight: entry.SpawnWeight,
    Stat1Max: entry.Stat1Max ?? 0,
    Stat1Min: entry.Stat1Min ?? 0,
    Stat2Max: entry.Stat2Max ?? 0,
    Stat2Min: entry.Stat2Min ?? 0,
    Stat3Max: entry.Var10 ?? 0,
    Stat3Min: entry.Var9 ?? 0,
    Stat4Max: entry.Var12 ?? 0,
    Stat4Min: entry.Var11 ?? 0,
    StatsKeys: entry.StatsKeys ?? [],
  }));
  const normalizedAlternateTreeVersions = alternateTreeVersions.map<TimelessAlternateTreeVersionRecord>((entry) => ({
    AreSmallAttributePassiveSkillsReplaced: entry.Var1,
    AreSmallNormalPassiveSkillsReplaced: entry.Var2,
    ID: entry.Id,
    Index: entry._key,
    MaximumAdditions: entry.Var6 ?? 0,
    MinimumAdditions: entry.Var5 ?? 0,
    NotableReplacementSpawnWeight: entry.Var9 ?? 0,
  }));
  const normalizedPassiveSkills = passiveSkills.map<TimelessPassiveSkillRecord>((entry) => ({
    ID: entry.Id,
    Index: entry._key,
    IsJewelSocket: entry.IsJewelSocket,
    IsKeystone: entry.IsKeystone,
    IsNotable: entry.IsNotable,
    Name: entry.Name,
    PassiveSkillGraphID: entry.PassiveSkillGraphId,
    StatIndices: entry.Stats ?? [],
  }));
  const normalizedStats = stats.map<TimelessStatRecord>((entry) => ({
    Category: entry.Category,
    ID: entry.Id,
    Index: entry._key,
    Text: entry.Text ?? "",
  }));

  const alternateTreeVersionsByIndex = new Map(normalizedAlternateTreeVersions.map((entry) => [entry.Index, entry]));
  const passiveSkillsByIndex = new Map(normalizedPassiveSkills.map((entry) => [entry.Index, entry]));
  const passiveSkillIndexByGraphId = new Map(normalizedPassiveSkills.map((entry) => [entry.PassiveSkillGraphID, entry.Index]));
  const statsByIndex = new Map(normalizedStats.map((entry) => [entry.Index, entry]));
  const alternatePassiveAdditionsByTreeVersionAndPassiveType = new Map<number, Map<PassiveSkillType, TimelessAlternatePassiveAdditionRecord[]>>();
  const alternatePassiveSkillsByTreeVersionAndPassiveType = new Map<number, Map<PassiveSkillType, TimelessAlternatePassiveSkillRecord[]>>();

  for (const addition of normalizedAlternatePassiveAdditions) {
    for (const passiveType of addition.PassiveType ?? []) {
      setNestedListValue(
        alternatePassiveAdditionsByTreeVersionAndPassiveType,
        addition.AlternateTreeVersionsKey,
        passiveType,
        addition,
      );
    }
  }

  for (const skill of normalizedAlternatePassiveSkills) {
    for (const passiveType of skill.PassiveType ?? []) {
      setNestedListValue(
        alternatePassiveSkillsByTreeVersionAndPassiveType,
        skill.AlternateTreeVersionsKey,
        passiveType,
        skill,
      );
    }
  }

  const inverseTranslations = new Map<string, TimelessTranslationDescriptor>();
  for (const file of [passiveSkillStatTranslations, passiveSkillAuraStatTranslations, statTranslations]) {
    for (const descriptor of file.descriptors ?? []) {
      for (const id of descriptor.ids ?? []) {
        if (!inverseTranslations.has(id)) {
          inverseTranslations.set(id, descriptor);
        }
      }
    }
  }

  return {
    alternatePassiveAdditionsByTreeVersionAndPassiveType,
    alternatePassiveSkillsByTreeVersionAndPassiveType,
    alternateTreeVersionsByIndex,
    inverseTranslations,
    passiveSkillIndexByGraphId,
    passiveSkillsByIndex,
    statsByIndex,
  };
}

function setNestedListValue<T>(
  target: Map<number, Map<PassiveSkillType, T[]>>,
  outerKey: number,
  innerKey: PassiveSkillType,
  value: T,
) {
  let inner = target.get(outerKey);
  if (!inner) {
    inner = new Map();
    target.set(outerKey, inner);
  }

  const list = inner.get(innerKey) ?? [];
  list.push(value);
  inner.set(innerKey, list);
}

async function readGzipJson<T>(filename: string): Promise<T> {
  const buffer = await readFile(path.join(DATA_DIR, filename));
  return JSON.parse(gunzipSync(buffer).toString("utf8")) as T;
}
