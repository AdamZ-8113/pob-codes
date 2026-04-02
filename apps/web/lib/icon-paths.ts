import type { GemPayload, ItemPayload } from "@pobcodes/shared-types";

import { GENERATED_ASSET_MANIFEST } from "./generated/asset-manifest";

const itemUniqueNameMap = GENERATED_ASSET_MANIFEST.items.byUniqueName as Record<string, string>;
const itemBaseNameMap = GENERATED_ASSET_MANIFEST.items.byBaseName as Record<string, string>;
const foulbornLowResolutionNameMap = GENERATED_ASSET_MANIFEST.items.foulbornLowResolutionByUniqueName as Record<
  string,
  string
>;
const foulbornUpscaledNameMap = GENERATED_ASSET_MANIFEST.items.foulbornUpscaledByUniqueName as Record<string, string>;
const normalizedItemUniqueNameMap = buildNormalizedLookup(itemUniqueNameMap);
const normalizedItemBaseNameMap = buildNormalizedLookup(itemBaseNameMap);
const normalizedFoulbornLowResolutionNameMap = buildNormalizedLookup(foulbornLowResolutionNameMap);
const normalizedFoulbornUpscaledNameMap = buildNormalizedLookup(foulbornUpscaledNameMap);
const knownBaseNames = Object.keys(itemBaseNameMap).sort((left, right) => right.length - left.length);
const knownUniqueNames = Object.keys(itemUniqueNameMap).sort((left, right) => right.length - left.length);
const SLOT_ICON_ALIASES: Record<string, string> = {
  "Ring 3": "Ring 1",
};

function firstMatch<T extends string>(
  map: Record<string, T>,
  candidates: Array<string | undefined>,
): T | undefined {
  for (const candidate of candidates) {
    if (candidate && map[candidate]) {
      return map[candidate];
    }
  }

  return undefined;
}

function firstNormalizedMatch<T extends string>(
  map: Record<string, T>,
  candidates: Array<string | undefined>,
): T | undefined {
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeItemLookupKey(candidate);
    if (normalizedCandidate && map[normalizedCandidate]) {
      return map[normalizedCandidate];
    }
  }

  return undefined;
}

export function resolveItemIconPath(item: ItemPayload, slotName?: string): string | undefined {
  return resolveItemIconCandidates(item, slotName)[0];
}

export function resolveItemIconCandidates(item: ItemPayload, slotName?: string): string[] {
  if (!isFoulbornItem(item)) {
    return compactUniquePaths([resolveBaseItemIconPath(item, slotName)]);
  }

  const normalizedPath = resolveBaseItemIconPath(stripFoulbornPrefix(item), slotName);
  const manifestUpscaledPath = resolveFoulbornManifestPath(foulbornUpscaledNameMap, item);
  const manifestLowResolutionPath = resolveFoulbornManifestPath(foulbornLowResolutionNameMap, item);

  if (manifestUpscaledPath || manifestLowResolutionPath) {
    return compactUniquePaths([manifestUpscaledPath, manifestLowResolutionPath, normalizedPath]);
  }

  return compactUniquePaths([
    deriveFoulbornUpscaledPath(normalizedPath),
    deriveFoulbornLowResolutionPath(normalizedPath),
    normalizedPath,
  ]);
}

function resolveBaseItemIconPath(item: ItemPayload, slotName?: string): string | undefined {
  const inferredBase = inferItemBaseName(item);
  const slotAlias = slotName ? SLOT_ICON_ALIASES[slotName] : undefined;

  return (
    firstMatch(itemUniqueNameMap, [item.name, item.iconKey]) ||
    firstNormalizedMatch(normalizedItemUniqueNameMap, [item.name, item.iconKey]) ||
    resolveUniqueIconPathFromRaw(item) ||
    resolvePrefixedUniqueIconPath(item) ||
    firstMatch(itemBaseNameMap, [item.base, item.iconKey, inferredBase]) ||
    firstNormalizedMatch(normalizedItemBaseNameMap, [item.base, item.iconKey, inferredBase]) ||
    firstMatch(GENERATED_ASSET_MANIFEST.items.bySlot, [slotName, slotAlias]) ||
    GENERATED_ASSET_MANIFEST.items.defaults.fallback
  );
}

function compactUniquePaths(candidates: Array<string | undefined>): string[] {
  return [...new Set(candidates.filter((candidate): candidate is string => Boolean(candidate)))];
}

export function resolveGemIconPath(gem: GemPayload): string | undefined {
  // Support gem gemIds use "SupportGem*" prefix in PoB XML, but the asset manifest
  // keys them as "SkillGemSupport*" (matching the Gems.lua table key format).
  const altGemId = gem.gemId?.replace(
    /^Metadata\/Items\/Gems\/SupportGem(.+)$/,
    "Metadata/Items/Gems/SkillGemSupport$1",
  );
  return (
    firstMatch(GENERATED_ASSET_MANIFEST.gems.byId, [gem.gemId, altGemId, gem.skillId]) ||
    (gem.support
      ? GENERATED_ASSET_MANIFEST.gems.defaults.support
      : GENERATED_ASSET_MANIFEST.gems.defaults.active)
  );
}

export function resolveInfluenceIconPath(influence: string): string | undefined {
  return (GENERATED_ASSET_MANIFEST.items.influences as Record<string, string | undefined>)[influence];
}

function inferItemBaseName(item: ItemPayload): string | undefined {
  if (item.base && itemBaseNameMap[item.base]) {
    return item.base;
  }

  const source = item.base || item.name;
  if (!source || item.rarity !== "Magic") {
    return undefined;
  }

  for (const baseName of knownBaseNames) {
    if (containsWholePhrase(source, baseName)) {
      return baseName;
    }
  }

  return undefined;
}

function isFoulbornItem(item: ItemPayload): boolean {
  return [item.name, item.iconKey].some((value) => value?.startsWith("Foulborn "));
}

function stripFoulbornPrefix(item: ItemPayload): ItemPayload {
  const nextName = stripFoulbornPrefixFromValue(item.name);
  const nextIconKey = stripFoulbornPrefixFromValue(item.iconKey);
  const nextBase = stripFoulbornPrefixFromValue(item.base);

  if (nextName === item.name && nextIconKey === item.iconKey && nextBase === item.base) {
    return item;
  }

  return {
    ...item,
    base: nextBase,
    iconKey: nextIconKey,
    name: nextName,
  };
}

function stripFoulbornPrefixFromValue(value?: string): string | undefined {
  return value?.replace(/^Foulborn\s+/, "");
}

function resolveFoulbornManifestPath(
  map: Record<string, string>,
  item: ItemPayload,
): string | undefined {
  const normalizedMap =
    map === foulbornUpscaledNameMap
      ? normalizedFoulbornUpscaledNameMap
      : map === foulbornLowResolutionNameMap
        ? normalizedFoulbornLowResolutionNameMap
        : buildNormalizedLookup(map);

  return (
    firstMatch(map, [
      item.name,
      item.iconKey,
      inferFoulbornUniqueNameFromDecoratedVariant(item.name),
      inferFoulbornUniqueNameFromDecoratedVariant(item.iconKey),
    ]) ||
    firstNormalizedMatch(normalizedMap, [
      item.name,
      item.iconKey,
      inferFoulbornUniqueNameFromDecoratedVariant(item.name),
      inferFoulbornUniqueNameFromDecoratedVariant(item.iconKey),
    ])
  );
}

function inferFoulbornUniqueNameFromDecoratedVariant(source?: string): string | undefined {
  const strippedSource = stripFoulbornPrefixFromValue(source);
  const inferredUniqueName = inferUniqueNameFromDecoratedVariant(strippedSource);
  return inferredUniqueName ? `Foulborn ${inferredUniqueName}` : undefined;
}

function deriveFoulbornLowResolutionPath(path?: string): string | undefined {
  if (!path?.startsWith("/assets/items/art/")) {
    return undefined;
  }

  const relativePath = path.slice("/assets/items/art/".length);
  return `/assets/items/art/Foulborn/LowResolution/${relativePath}`;
}

function deriveFoulbornUpscaledPath(path?: string): string | undefined {
  if (!path?.startsWith("/assets/items/art/")) {
    return undefined;
  }

  const relativePath = path.slice("/assets/items/art/".length);
  return `/assets/items/art/Foulborn/Upscaled/${relativePath}`;
}

function resolvePrefixedUniqueIconPath(item: ItemPayload): string | undefined {
  if (item.rarity !== "Unique" && item.rarity !== "Relic") {
    return undefined;
  }

  for (const source of [item.name, item.iconKey]) {
    const inferredUniqueName = inferUniqueNameFromDecoratedVariant(source);
    if (inferredUniqueName) {
      return itemUniqueNameMap[inferredUniqueName];
    }
  }

  return undefined;
}

function resolveUniqueIconPathFromRaw(item: ItemPayload): string | undefined {
  if (!item.raw) {
    return undefined;
  }

  const canRecoverFromRaw =
    item.rarity === "Unique" ||
    item.rarity === "Relic" ||
    item.name === "Timeless Jewel" ||
    item.base === "Timeless Jewel" ||
    item.iconKey === "Timeless Jewel";

  if (!canRecoverFromRaw) {
    return undefined;
  }

  const rawLines = item.raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  for (const line of rawLines) {
    const directMatch = itemUniqueNameMap[line];
    if (directMatch) {
      return directMatch;
    }

    const normalizedDirectMatch = firstNormalizedMatch(normalizedItemUniqueNameMap, [line]);
    if (normalizedDirectMatch) {
      return normalizedDirectMatch;
    }

    const inferredUniqueName = inferUniqueNameFromDecoratedVariant(line);
    if (inferredUniqueName) {
      return itemUniqueNameMap[inferredUniqueName];
    }
  }

  return undefined;
}

function inferUniqueNameFromDecoratedVariant(source?: string): string | undefined {
  if (!source) {
    return undefined;
  }

  for (const uniqueName of knownUniqueNames) {
    if (source !== uniqueName && source.endsWith(` ${uniqueName}`)) {
      return uniqueName;
    }

    if (startsWithDecoratedUniqueName(source, uniqueName)) {
      return uniqueName;
    }
  }

  return undefined;
}

function startsWithDecoratedUniqueName(source: string, uniqueName: string): boolean {
  return new RegExp(`^${escapeForRegex(uniqueName)}(?:\\s*[\\[(].+)?$`).test(source);
}

function containsWholePhrase(source: string, phrase: string): boolean {
  const escaped = escapeForRegex(phrase);
  return new RegExp(`(?:^|[^A-Za-z])${escaped}(?:$|[^A-Za-z])`, "i").test(source);
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildNormalizedLookup<T extends string>(map: Record<string, T>): Record<string, T> {
  const normalizedLookup: Record<string, T> = {};
  const ambiguousKeys = new Set<string>();

  for (const [key, value] of Object.entries(map)) {
    const normalizedKey = normalizeItemLookupKey(key);
    if (!normalizedKey || ambiguousKeys.has(normalizedKey)) {
      continue;
    }

    if (normalizedLookup[normalizedKey] && normalizedLookup[normalizedKey] !== value) {
      delete normalizedLookup[normalizedKey];
      ambiguousKeys.add(normalizedKey);
      continue;
    }

    normalizedLookup[normalizedKey] = value;
  }

  return normalizedLookup;
}

function normalizeItemLookupKey(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/['’]s\b/giu, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toLowerCase();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}
