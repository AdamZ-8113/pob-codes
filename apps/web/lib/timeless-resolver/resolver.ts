import type { TimelessJewelType } from "../timeless-jewel-descriptor";
import type {
  TimelessResolveBuildInput,
  TimelessResolvedBuild,
  TimelessResolvedJewel,
  TimelessResolvedNodeEffect,
} from "./types";
import {
  loadTimelessDataSet,
  type TimelessAlternatePassiveAdditionRecord,
  type TimelessAlternatePassiveSkillRecord,
  type TimelessAlternateTreeVersionRecord,
  type TimelessDataSet,
  type TimelessPassiveSkillRecord,
} from "./data";
import { TimelessNumberGenerator } from "./rng";
import { translateTimelessStatLine } from "./translate";

type PassiveSkillType = 0 | 1 | 2 | 3 | 4 | 5;

interface TimelessJewelConqueror {
  index: number;
  version: number;
}

interface AlternatePassiveSkillInformation {
  alternatePassiveAdditionInformations: AlternatePassiveAdditionInformation[];
  alternatePassiveSkill?: TimelessAlternatePassiveSkillRecord;
  statRolls: Map<number, number>;
}

interface AlternatePassiveAdditionInformation {
  alternatePassiveAddition?: TimelessAlternatePassiveAdditionRecord;
  statRolls: Map<number, number>;
}

const CONQUEROR_MAP: Record<TimelessJewelType, Record<string, TimelessJewelConqueror>> = {
  "Brutal Restraint": {
    Asenath: { index: 2, version: 0 },
    Balbala: { index: 1, version: 1 },
    Deshret: { index: 1, version: 0 },
    Nasima: { index: 3, version: 0 },
  },
  "Elegant Hubris": {
    Cadiro: { index: 1, version: 0 },
    Caspiro: { index: 3, version: 1 },
    Chitus: { index: 3, version: 0 },
    Victario: { index: 2, version: 0 },
  },
  "Glorious Vanity": {
    Ahuana: { index: 2, version: 1 },
    Doryani: { index: 3, version: 0 },
    Xibaqua: { index: 1, version: 0 },
    Zerphi: { index: 2, version: 0 },
  },
  "Lethal Pride": {
    Akoya: { index: 3, version: 1 },
    Kaom: { index: 1, version: 0 },
    Kiloava: { index: 3, version: 0 },
    Rakiata: { index: 2, version: 0 },
  },
  "Militant Faith": {
    Avarius: { index: 3, version: 0 },
    Dominus: { index: 2, version: 0 },
    Maxarius: { index: 1, version: 1 },
    Venarius: { index: 1, version: 0 },
  },
};

const TREE_VERSION_BY_JEWEL_TYPE: Record<TimelessJewelType, number> = {
  "Brutal Restraint": 3,
  "Elegant Hubris": 5,
  "Glorious Vanity": 1,
  "Lethal Pride": 2,
  "Militant Faith": 4,
};

const CALCULATION_CACHE = new Map<string, TimelessResolvedNodeEffect | undefined>();

export async function resolveTimelessBuild(input: TimelessResolveBuildInput): Promise<TimelessResolvedBuild> {
  if (input.jewels.length === 0) {
    return { jewels: [] };
  }

  const data = await loadTimelessDataSet();
  return {
    jewels: input.jewels.map((jewel) => resolveJewel(data, jewel)),
  };
}

function resolveJewel(data: TimelessDataSet, jewel: TimelessResolveBuildInput["jewels"][number]): TimelessResolvedJewel {
  const nodeEffects = jewel.nodeIds
    .map((nodeId) => resolveNodeEffect(data, jewel, nodeId))
    .filter((effect): effect is TimelessResolvedNodeEffect => Boolean(effect));

  return {
    conqueror: jewel.conqueror,
    itemId: jewel.itemId,
    jewelType: jewel.jewelType,
    nodeEffects,
    seed: jewel.seed,
    socketNodeId: jewel.socketNodeId,
  };
}

function resolveNodeEffect(
  data: TimelessDataSet,
  jewel: TimelessResolveBuildInput["jewels"][number],
  nodeId: number,
): TimelessResolvedNodeEffect | undefined {
  const cacheKey = `${jewel.jewelType}|${jewel.conqueror}|${jewel.seed}|${nodeId}`;
  if (CALCULATION_CACHE.has(cacheKey)) {
    return CALCULATION_CACHE.get(cacheKey);
  }

  const passiveSkillIndex = data.passiveSkillIndexByGraphId.get(nodeId);
  if (!passiveSkillIndex) {
    CALCULATION_CACHE.set(cacheKey, undefined);
    return undefined;
  }

  const passiveSkill = data.passiveSkillsByIndex.get(passiveSkillIndex);
  if (!passiveSkill || !isPassiveSkillValidForAlteration(passiveSkill)) {
    CALCULATION_CACHE.set(cacheKey, undefined);
    return undefined;
  }

  const calculation = calculateForPassive(data, passiveSkill, jewel.seed, jewel.jewelType, jewel.conqueror);
  const lines = dedupePreserveOrder([
    ...renderAlternatePassiveSkillLines(data, calculation.alternatePassiveSkill, calculation.statRolls),
    ...calculation.alternatePassiveAdditionInformations.flatMap((addition) =>
      renderAlternatePassiveAdditionLines(data, addition.alternatePassiveAddition, addition.statRolls),
    ),
  ]);

  const effect: TimelessResolvedNodeEffect = {
    isKeystone: passiveSkill.IsKeystone,
    isNotable: passiveSkill.IsNotable,
    lines,
    nodeId,
    originalName: passiveSkill.Name,
    replacedName: calculation.alternatePassiveSkill?.Name,
  };

  CALCULATION_CACHE.set(cacheKey, effect);
  return effect;
}

function calculateForPassive(
  data: TimelessDataSet,
  passiveSkill: TimelessPassiveSkillRecord,
  seed: number,
  jewelType: TimelessJewelType,
  conquerorName: string,
): AlternatePassiveSkillInformation {
  const passiveType = getPassiveSkillType(passiveSkill);
  const treeVersion = data.alternateTreeVersionsByIndex.get(TREE_VERSION_BY_JEWEL_TYPE[jewelType]);
  const conqueror = CONQUEROR_MAP[jewelType][conquerorName];
  if (!treeVersion || !conqueror) {
    return emptyCalculation();
  }

  const rng = new TimelessNumberGenerator();
  if (isPassiveSkillReplaced(passiveSkill, treeVersion, rng, seed, jewelType)) {
    return replacePassiveSkill(data, passiveSkill, treeVersion, rng, seed, jewelType, conqueror);
  }

  return {
    alternatePassiveAdditionInformations: augmentPassiveSkill(data, passiveSkill, treeVersion, rng, seed, jewelType),
    statRolls: new Map(),
  };
}

function isPassiveSkillReplaced(
  passiveSkill: TimelessPassiveSkillRecord,
  treeVersion: TimelessAlternateTreeVersionRecord,
  rng: TimelessNumberGenerator,
  seed: number,
  jewelType: TimelessJewelType,
) {
  if (passiveSkill.IsKeystone) {
    return true;
  }

  if (passiveSkill.IsNotable) {
    if (treeVersion.NotableReplacementSpawnWeight >= 100) {
      return true;
    }
    if (treeVersion.NotableReplacementSpawnWeight === 0) {
      return false;
    }

    rng.reset(passiveSkill.PassiveSkillGraphID, seed, jewelType);
    return rng.generate(0, 100) < treeVersion.NotableReplacementSpawnWeight;
  }

  if (passiveSkill.StatIndices.length === 1 && isSmallAttribute(passiveSkill.StatIndices[0])) {
    return treeVersion.AreSmallAttributePassiveSkillsReplaced;
  }

  return treeVersion.AreSmallNormalPassiveSkillsReplaced;
}

function augmentPassiveSkill(
  data: TimelessDataSet,
  passiveSkill: TimelessPassiveSkillRecord,
  treeVersion: TimelessAlternateTreeVersionRecord,
  rng: TimelessNumberGenerator,
  seed: number,
  jewelType: TimelessJewelType,
) {
  rng.reset(passiveSkill.PassiveSkillGraphID, seed, jewelType);
  if (getPassiveSkillType(passiveSkill) === 3) {
    rng.generate(0, 100);
  }

  return rollAdditions(
    data,
    passiveSkill,
    treeVersion,
    rng,
    treeVersion.MinimumAdditions,
    treeVersion.MaximumAdditions,
  );
}

function replacePassiveSkill(
  data: TimelessDataSet,
  passiveSkill: TimelessPassiveSkillRecord,
  treeVersion: TimelessAlternateTreeVersionRecord,
  rng: TimelessNumberGenerator,
  seed: number,
  jewelType: TimelessJewelType,
  conqueror: TimelessJewelConqueror,
): AlternatePassiveSkillInformation {
  if (passiveSkill.IsKeystone) {
    const keystoneSkill = getAlternatePassiveSkillKeystone(data, treeVersion.Index, conqueror);
    if (!keystoneSkill) {
      return emptyCalculation();
    }

    return {
      alternatePassiveAdditionInformations: [],
      alternatePassiveSkill: keystoneSkill,
      statRolls: new Map([[0, keystoneSkill.Stat1Min]]),
    };
  }

  const applicableSkills = getApplicableAlternatePassiveSkills(data, treeVersion.Index, getPassiveSkillType(passiveSkill))
    .filter(
      (skill) =>
        skill.ConquerorIndex === 0 ||
        (skill.ConquerorIndex === conqueror.index && skill.ConquerorVersion === conqueror.version),
    );
  if (applicableSkills.length === 0) {
    return emptyCalculation();
  }

  rng.reset(passiveSkill.PassiveSkillGraphID, seed, jewelType);
  if (getPassiveSkillType(passiveSkill) === 3) {
    rng.generate(0, 100);
  }

  let currentSpawnWeight = 0;
  let rolledSkill: TimelessAlternatePassiveSkillRecord | undefined;
  for (const skill of applicableSkills) {
    currentSpawnWeight += skill.SpawnWeight;
    if (rng.generateSingle(currentSpawnWeight) < skill.SpawnWeight) {
      rolledSkill = skill;
    }
  }

  if (!rolledSkill) {
    return emptyCalculation();
  }

  const statRolls = buildSkillStatRolls(rolledSkill, rng);
  if (rolledSkill.RandomMin === 0 && rolledSkill.RandomMax === 0) {
    return {
      alternatePassiveAdditionInformations: [],
      alternatePassiveSkill: rolledSkill,
      statRolls,
    };
  }

  return {
    alternatePassiveAdditionInformations: rollAdditions(
      data,
      passiveSkill,
      treeVersion,
      rng,
      treeVersion.MinimumAdditions + rolledSkill.RandomMin,
      treeVersion.MaximumAdditions + rolledSkill.RandomMax,
    ),
    alternatePassiveSkill: rolledSkill,
    statRolls,
  };
}

function buildSkillStatRolls(skill: TimelessAlternatePassiveSkillRecord, rng: TimelessNumberGenerator) {
  const statRolls = new Map<number, number>();
  const elements = Math.min(skill.StatsKeys.length, 4);
  for (let index = 0; index < elements; index += 1) {
    const min = getAlternatePassiveSkillStatMinMax(skill, true, index);
    const max = getAlternatePassiveSkillStatMinMax(skill, false, index);
    statRolls.set(index, max > min ? rng.generate(min, max) : min);
  }
  return statRolls;
}

function rollAdditions(
  data: TimelessDataSet,
  passiveSkill: TimelessPassiveSkillRecord,
  treeVersion: TimelessAlternateTreeVersionRecord,
  rng: TimelessNumberGenerator,
  minimumAdditions: number,
  maximumAdditions: number,
) {
  const results: AlternatePassiveAdditionInformation[] = [];
  const applicableAdditions = getApplicableAlternatePassiveAdditions(data, treeVersion.Index, getPassiveSkillType(passiveSkill));
  if (applicableAdditions.length === 0) {
    return results;
  }

  let additionCount = minimumAdditions;
  if (maximumAdditions > minimumAdditions) {
    additionCount = rng.generate(minimumAdditions, maximumAdditions);
  }

  for (let iteration = 0; iteration < additionCount; iteration += 1) {
    let rolledAddition: TimelessAlternatePassiveAdditionRecord | undefined;

    while (!rolledAddition) {
      rolledAddition = rollAlternatePassiveAddition(applicableAdditions, rng);
    }

    const statRolls = new Map<number, number>();
    const elements = Math.min(rolledAddition.StatsKeys.length, 2);
    for (let index = 0; index < elements; index += 1) {
      const min = getAlternatePassiveAdditionStatMinMax(rolledAddition, true, index);
      const max = getAlternatePassiveAdditionStatMinMax(rolledAddition, false, index);
      statRolls.set(index, max > min ? rng.generate(min, max) : min);
    }

    results.push({
      alternatePassiveAddition: rolledAddition,
      statRolls,
    });
  }

  return results;
}

function rollAlternatePassiveAddition(
  additions: TimelessAlternatePassiveAdditionRecord[],
  rng: TimelessNumberGenerator,
) {
  let totalSpawnWeight = 0;
  for (const addition of additions) {
    totalSpawnWeight += addition.SpawnWeight;
  }

  let roll = rng.generateSingle(totalSpawnWeight);
  for (const addition of additions) {
    if (addition.SpawnWeight > roll) {
      return addition;
    }
    roll -= addition.SpawnWeight;
  }

  return undefined;
}

function renderAlternatePassiveSkillLines(
  data: TimelessDataSet,
  skill: TimelessAlternatePassiveSkillRecord | undefined,
  statRolls: Map<number, number>,
) {
  if (!skill) {
    return [];
  }

  return skill.StatsKeys.map((statId, index) => translateTimelessStatLine(data, statId, statRolls.get(index))).filter(
    (line): line is string => Boolean(line),
  );
}

function renderAlternatePassiveAdditionLines(
  data: TimelessDataSet,
  addition: TimelessAlternatePassiveAdditionRecord | undefined,
  statRolls: Map<number, number>,
) {
  if (!addition) {
    return [];
  }

  return addition.StatsKeys.map((statId, index) => translateTimelessStatLine(data, statId, statRolls.get(index))).filter(
    (line): line is string => Boolean(line),
  );
}

function getAlternatePassiveSkillKeystone(
  data: TimelessDataSet,
  treeVersion: number,
  conqueror: TimelessJewelConqueror,
) {
  for (const skill of data.alternatePassiveSkillsByTreeVersionAndPassiveType.get(treeVersion)?.get(4) ?? []) {
    if (skill.ConquerorIndex === conqueror.index && skill.ConquerorVersion === conqueror.version) {
      return skill;
    }
  }

  return undefined;
}

function getApplicableAlternatePassiveSkills(
  data: TimelessDataSet,
  treeVersion: number,
  passiveType: PassiveSkillType,
) {
  return data.alternatePassiveSkillsByTreeVersionAndPassiveType.get(treeVersion)?.get(passiveType) ?? [];
}

function getApplicableAlternatePassiveAdditions(
  data: TimelessDataSet,
  treeVersion: number,
  passiveType: PassiveSkillType,
) {
  return data.alternatePassiveAdditionsByTreeVersionAndPassiveType.get(treeVersion)?.get(passiveType) ?? [];
}

function getPassiveSkillType(passiveSkill: TimelessPassiveSkillRecord): PassiveSkillType {
  if (passiveSkill.IsJewelSocket) {
    return 5;
  }
  if (passiveSkill.IsKeystone) {
    return 4;
  }
  if (passiveSkill.IsNotable) {
    return 3;
  }
  if (passiveSkill.StatIndices.length === 1 && isSmallAttribute(passiveSkill.StatIndices[0])) {
    return 1;
  }
  return 2;
}

function isPassiveSkillValidForAlteration(passiveSkill: TimelessPassiveSkillRecord) {
  const passiveType = getPassiveSkillType(passiveSkill);
  return passiveType !== 0 && passiveType !== 5;
}

function isSmallAttribute(statId: number) {
  const bitPosition = statId + 1 - 574;
  return bitPosition <= 6 && bitPosition >= 0 && (0x49 & (1 << bitPosition)) !== 0;
}

function getAlternatePassiveSkillStatMinMax(
  skill: TimelessAlternatePassiveSkillRecord,
  statMin: boolean,
  index: number,
) {
  if (statMin) {
    return [skill.Stat1Min, skill.Stat2Min, skill.Stat3Min, skill.Stat4Min][index] ?? 0;
  }

  return [skill.Stat1Max, skill.Stat2Max, skill.Stat3Max, skill.Stat4Max][index] ?? 0;
}

function getAlternatePassiveAdditionStatMinMax(
  addition: TimelessAlternatePassiveAdditionRecord,
  statMin: boolean,
  index: number,
) {
  if (statMin) {
    return [addition.Stat1Min, addition.Stat2Min][index] ?? 0;
  }

  return [addition.Stat1Max, addition.Stat2Max][index] ?? 0;
}

function dedupePreserveOrder(values: string[]) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }
  return result;
}

function emptyCalculation(): AlternatePassiveSkillInformation {
  return {
    alternatePassiveAdditionInformations: [],
    statRolls: new Map(),
  };
}
