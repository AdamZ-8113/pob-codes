export type GameVersion = "poe1";

export interface BuildSectionPayload {
  level: number;
  className: string;
  ascendClassName?: string;
  bandit?: string;
  pantheonMajorGod?: string;
  pantheonMinorGod?: string;
  mainSocketGroup: number;
  targetVersion?: string;
  viewMode?: string;
}

export interface TreeSocketPayload {
  nodeId: number;
  itemId: number;
}

export interface TreeOverridePayload {
  nodeId: number;
  name: string;
  effect: string;
}

export interface TreeSpecPayload {
  title?: string;
  version?: string;
  classId?: number;
  ascendancyId?: number;
  secondaryAscendancyId?: number;
  nodes: number[];
  masteryEffects: Array<[number, number]>;
  sockets: TreeSocketPayload[];
  overrides: TreeOverridePayload[];
  url?: string;
  active: boolean;
}

export type ItemRarity = "Normal" | "Magic" | "Rare" | "Unique" | "Relic";
export type ItemJewelRadius = "small" | "medium" | "large" | "veryLarge" | "massive";

export type ItemExplicitModKind = "explicit" | "crafted" | "fractured";

export interface ItemExplicitModPayload {
  text: string;
  kind: ItemExplicitModKind;
}

export interface ItemRequirementsPayload {
  level?: number;
  str?: number;
  dex?: number;
  int?: number;
  className?: string;
}

export interface ItemPayload {
  id: number;
  raw: string;
  name?: string;
  base?: string;
  rarity?: ItemRarity;
  foilType?: string;
  iconKey?: string;
  quality?: number;
  armour?: number;
  evasion?: number;
  energyShield?: number;
  ward?: number;
  sockets?: string;
  requirements?: ItemRequirementsPayload;
  jewelRadius?: ItemJewelRadius;
  implicits: string[];
  explicits: string[];
  anointments: string[];
  enchantments: string[];
  crafted: string[];
  fracturedMods: string[];
  scourgedMods: string[];
  crucibleMods: string[];
  synthesizedMods: string[];
  orderedExplicitMods?: ItemExplicitModPayload[];
  influences: string[];
  fractured: boolean;
  split?: boolean;
  synthesised?: boolean;
  corrupted: boolean;
  mirrored: boolean;
}

export interface ItemSlotPayload {
  name: string;
  itemId: number;
  active: boolean;
}

export interface ItemSetPayload {
  id: number;
  title?: string;
  slots: ItemSlotPayload[];
  active: boolean;
}

export interface GemPayload {
  nameSpec: string;
  gemId?: string;
  skillId?: string;
  level: number;
  quality: number;
  qualityId?: string;
  corrupted?: boolean;
  enabled: boolean;
  support: boolean;
  selected: boolean;
}

export interface SkillGroupPayload {
  id: string;
  label?: string;
  slot?: string;
  enabled: boolean;
  selected: boolean;
  mainActiveSkill: number;
  gems: GemPayload[];
}

export interface SkillSetPayload {
  id: number;
  title?: string;
  groups: SkillGroupPayload[];
  active: boolean;
}

export type ConfigValue = string | number | boolean;

export interface ConfigSetPayload {
  id: number;
  title?: string;
  inputs: Record<string, ConfigValue>;
  placeholders?: Record<string, ConfigValue>;
  active: boolean;
}

export interface StatsPayload {
  playerRows: Array<{
    stat: string;
    value: string;
  }>;
  player: Record<string, string>;
  minionRows: Array<{
    stat: string;
    value: string;
  }>;
  minion: Record<string, string>;
  fullDpsSkills: Array<{
    stat: string;
    value: string;
    source?: string;
    skillPart?: string;
  }>;
}

export interface BuildMetaPayload {
  source: "code" | "id";
  createdAt?: string;
  id?: string;
}

export interface BuildPayload {
  gameVersion: GameVersion;
  build: BuildSectionPayload;
  treeSpecs: TreeSpecPayload[];
  activeTreeIndex: number;
  itemSets: ItemSetPayload[];
  activeItemSetId?: number;
  items: ItemPayload[];
  skillSets: SkillSetPayload[];
  activeSkillSetId?: number;
  configSets: ConfigSetPayload[];
  activeConfigSetId?: number;
  stats: StatsPayload;
  notes: string;
  config: Record<string, ConfigValue>;
  configPlaceholders?: Record<string, ConfigValue>;
  meta: BuildMetaPayload;
}

export interface UploadResponse {
  id: string;
  shortUrl: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
}
