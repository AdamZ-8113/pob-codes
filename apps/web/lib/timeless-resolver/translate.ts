import type {
  TimelessDataSet,
  TimelessStatRecord,
  TimelessTranslationDescriptor,
  TimelessTranslationEntry,
} from "./data";

const INDEX_HANDLERS: Record<string, number> = {
  "30%_of_value": 100 / 30,
  "60%_of_value": 100 / 60,
  affliction_reward_type: 1,
  canonical_stat: 1,
  deciseconds_to_seconds: 10,
  display_indexable_support: 1,
  divide_by_fifteen_0dp: 15,
  divide_by_fifty: 50,
  divide_by_five: 5,
  divide_by_four: 4,
  divide_by_one_hundred: 100,
  divide_by_one_hundred_2dp: 100,
  divide_by_one_hundred_2dp_if_required: 100,
  divide_by_one_hundred_and_negate: -100,
  divide_by_one_thousand: 1000,
  divide_by_six: 6,
  divide_by_ten_0dp: 10,
  divide_by_ten_1dp: 10,
  divide_by_ten_1dp_if_required: 10,
  divide_by_three: 3,
  divide_by_twelve: 12,
  divide_by_twenty_then_double_0dp: 10,
  divide_by_two_0dp: 2,
  double: 1 / 2,
  metamorphosis_reward_description: 1,
  milliseconds_to_seconds: 1000,
  milliseconds_to_seconds_0dp: 1000,
  milliseconds_to_seconds_1dp: 1000,
  milliseconds_to_seconds_2dp: 1000,
  milliseconds_to_seconds_2dp_if_required: 1000,
  mod_value_to_item_class: 1,
  multiplicative_damage_modifier: 1,
  negate: -1,
  negate_and_double: 1 / -2,
  old_leech_percent: 1,
  old_leech_permyriad: 10000,
  passive_hash: 1,
  per_minute_to_per_second: 60,
  per_minute_to_per_second_0dp: 60,
  per_minute_to_per_second_1dp: 60,
  per_minute_to_per_second_2dp: 60,
  per_minute_to_per_second_2dp_if_required: 60,
  times_one_point_five: 1 / 1.5,
  times_twenty: 1 / 20,
  tree_expansion_jewel_passive: 1,
};

export function translateTimelessStatLine(
  data: TimelessDataSet,
  statId: number,
  roll: number | undefined,
) {
  const stat = data.statsByIndex.get(statId);
  if (!stat) {
    return undefined;
  }

  const translation = data.inverseTranslations.get(stat.ID);
  if (translation && roll !== undefined) {
    return formatTranslation(translation, roll) ?? stat.ID;
  }

  return buildFallbackStatLine(stat, roll);
}

function formatTranslation(translation: TimelessTranslationDescriptor, statValue: number) {
  const entry = selectTranslationEntry(translation, statValue);
  if (!entry) {
    return undefined;
  }

  let finalStat = statValue;
  const handlers = normalizeIndexHandlers(entry);
  for (const handler of handlers) {
    finalStat = finalStat / (INDEX_HANDLERS[handler] || 1);
  }

  const fixedValue = parseFloat(finalStat.toFixed(2)).toString();
  return entry.string
    .replace(/\{0(?::(.*?)d(.*?))\}/, `$1${fixedValue}$2`)
    .replace("{0}", fixedValue);
}

function selectTranslationEntry(
  translation: TimelessTranslationDescriptor,
  statValue: number,
): TimelessTranslationEntry | undefined {
  for (const entry of translation.list ?? []) {
    if (!entry.conditions || entry.conditions.length === 0) {
      return entry;
    }

    const first = entry.conditions[0];
    let matches = true;

    if (first.min !== undefined && statValue < first.min) {
      matches = false;
    }
    if (first.max !== undefined && statValue > first.max) {
      matches = false;
    }
    if (first.negated) {
      matches = !matches;
    }

    if (matches) {
      return entry;
    }
  }

  return undefined;
}

function normalizeIndexHandlers(entry: TimelessTranslationEntry) {
  if (!entry.index_handlers) {
    return [];
  }

  if (Array.isArray(entry.index_handlers)) {
    return entry.index_handlers[0] ?? [];
  }

  return Object.keys(entry.index_handlers);
}

function buildFallbackStatLine(stat: TimelessStatRecord, roll: number | undefined) {
  if (roll === undefined) {
    return stat.Text || stat.ID;
  }

  if (stat.Text) {
    return `${stat.Text} (${roll})`;
  }

  return `${stat.ID} (${roll})`;
}
