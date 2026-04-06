import type { ItemPayload } from "@pobcodes/shared-types";

export const TIMELESS_JEWEL_TYPE_ORDER = [
  "Glorious Vanity",
  "Lethal Pride",
  "Brutal Restraint",
  "Militant Faith",
  "Elegant Hubris",
] as const;

export type TimelessJewelType = (typeof TIMELESS_JEWEL_TYPE_ORDER)[number];

export interface TimelessJewelDescriptor {
  conqueror: string;
  jewelType: TimelessJewelType;
  seed: number;
}

const TIMELESS_JEWEL_PATTERNS: Array<{
  jewelType: TimelessJewelType;
  pattern: RegExp;
}> = [
  {
    jewelType: "Glorious Vanity",
    pattern: /^Bathed in the blood of (\d+) sacrificed in the name of (.+)$/i,
  },
  {
    jewelType: "Lethal Pride",
    pattern: /^Commanded leadership over (\d+) warriors under (.+)$/i,
  },
  {
    jewelType: "Brutal Restraint",
    pattern: /^Denoted service of (\d+) dekhara in the akhara of (.+)$/i,
  },
  {
    jewelType: "Militant Faith",
    pattern: /^Carved to glorify (\d+) new faithful converted by High Templar (.+)$/i,
  },
  {
    jewelType: "Elegant Hubris",
    pattern: /^Commissioned (\d+) coins to commemorate (.+)$/i,
  },
];

export function parseTimelessJewelDescriptor(item: ItemPayload): TimelessJewelDescriptor | undefined {
  for (const line of item.raw.split(/\r?\n/).map((entry) => stripLineTags(entry).trim()).filter(Boolean)) {
    for (const entry of TIMELESS_JEWEL_PATTERNS) {
      const match = entry.pattern.exec(line);
      if (!match) {
        continue;
      }

      const seed = Number(match[1]);
      const conqueror = match[2]?.trim();
      if (!Number.isFinite(seed) || seed <= 0 || !conqueror) {
        continue;
      }

      return {
        conqueror,
        jewelType: entry.jewelType,
        seed,
      };
    }
  }

  return undefined;
}

export function isTimelessJewelItem(item: ItemPayload) {
  if (/\bTimeless Jewel\b/i.test([item.base, item.name].filter((value): value is string => Boolean(value)).join("\n"))) {
    return true;
  }

  return parseTimelessJewelDescriptor(item) !== undefined;
}

export function isElegantHubrisItem(item: ItemPayload) {
  return parseTimelessJewelDescriptor(item)?.jewelType === "Elegant Hubris";
}

export function isMilitantFaithItem(item: ItemPayload) {
  return parseTimelessJewelDescriptor(item)?.jewelType === "Militant Faith";
}

function stripLineTags(line: string) {
  return line.replace(/\{[^}]+\}/g, "");
}
