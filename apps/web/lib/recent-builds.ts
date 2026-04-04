import { formatPatchVersionLabel } from "./build-overview";

export interface RecentBuildEntry {
  dps?: string;
  ehp?: string;
  energyShield?: string;
  guardAnnotation?: string;
  id: string;
  level?: number;
  life?: string;
  mana?: string;
  nickname?: string;
  patchVersion?: string;
  pinned?: boolean;
  resistances?: string;
  title: string;
  viewedAt: string;
}

export const MAX_RECENT_BUILDS = 10;
export const RECENT_BUILDS_STORAGE_KEY = "pob-codes.recent-builds";

export function parseRecentBuilds(raw: string | null | undefined): RecentBuildEntry[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeRecentBuildEntry)
      .filter((entry): entry is RecentBuildEntry => entry !== undefined)
      .slice(0, MAX_RECENT_BUILDS);
  } catch {
    return [];
  }
}

export function mergeRecentBuilds(existingEntries: RecentBuildEntry[], nextEntry: RecentBuildEntry): RecentBuildEntry[] {
  const normalizedNextEntry = normalizeRecentBuildEntry(nextEntry);
  if (!normalizedNextEntry) {
    return existingEntries;
  }

  const normalizedExistingEntries = existingEntries
    .map(normalizeRecentBuildEntry)
    .filter((entry): entry is RecentBuildEntry => entry !== undefined);
  const existingEntry = normalizedExistingEntries.find((entry) => entry.id === normalizedNextEntry.id);
  const mergedEntry: RecentBuildEntry = {
    ...normalizedNextEntry,
    nickname: existingEntry?.nickname,
    pinned: existingEntry?.pinned ?? false,
  };

  return pruneRecentBuilds([mergedEntry, ...normalizedExistingEntries.filter((entry) => entry.id !== normalizedNextEntry.id)]);
}

export function readRecentBuilds() {
  if (typeof window === "undefined") {
    return [] as RecentBuildEntry[];
  }

  return parseRecentBuilds(window.localStorage.getItem(RECENT_BUILDS_STORAGE_KEY));
}

export function recordRecentBuild(
  entry: Pick<RecentBuildEntry, "id" | "title"> &
    Partial<
      Pick<
        RecentBuildEntry,
        "dps" | "ehp" | "energyShield" | "guardAnnotation" | "level" | "life" | "mana" | "patchVersion" | "resistances"
      >
    >,
) {
  if (typeof window === "undefined") {
    return [] as RecentBuildEntry[];
  }

  const nextEntry = normalizeRecentBuildEntry({
    ...entry,
    viewedAt: new Date().toISOString(),
  });
  if (!nextEntry) {
    return readRecentBuilds();
  }

  const mergedEntries = mergeRecentBuilds(readRecentBuilds(), nextEntry);
  return persistRecentBuilds(mergedEntries);
}

export function removeRecentBuild(id: string) {
  return updateRecentBuilds((entries) => entries.filter((entry) => entry.id !== id));
}

export function setRecentBuildPinned(id: string, pinned: boolean) {
  return updateRecentBuilds((entries) =>
    entries.map((entry) => (entry.id === id ? { ...entry, pinned } : entry)),
  );
}

export function setRecentBuildNickname(id: string, nickname: string) {
  const trimmedNickname = nickname.trim();

  return updateRecentBuilds((entries) =>
    entries.map((entry) => (entry.id === id ? { ...entry, nickname: trimmedNickname || undefined } : entry)),
  );
}

function normalizeRecentBuildEntry(entry: unknown): RecentBuildEntry | undefined {
  if (!entry || typeof entry !== "object") {
    return undefined;
  }

  const candidate = entry as Partial<
    Record<
      | "dps"
      | "ehp"
      | "energyShield"
      | "guardAnnotation"
      | "id"
      | "level"
      | "life"
      | "mana"
      | "nickname"
      | "patchVersion"
      | "pinned"
      | "resistances"
      | "title"
      | "viewedAt",
      unknown
    >
  >;
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const viewedAt = typeof candidate.viewedAt === "string" ? candidate.viewedAt.trim() : "";
  if (!id || !title || !viewedAt) {
    return undefined;
  }

  const level =
    typeof candidate.level === "number" && Number.isFinite(candidate.level) && candidate.level > 0
      ? Math.trunc(candidate.level)
      : typeof candidate.level === "string" && Number.isFinite(Number(candidate.level)) && Number(candidate.level) > 0
        ? Math.trunc(Number(candidate.level))
        : undefined;
  const ehp = typeof candidate.ehp === "string" ? candidate.ehp.trim() : "";
  const dps = typeof candidate.dps === "string" ? candidate.dps.trim() : "";
  const energyShield = typeof candidate.energyShield === "string" ? candidate.energyShield.trim() : "";
  const guardAnnotation = typeof candidate.guardAnnotation === "string" ? candidate.guardAnnotation.trim() : "";
  const nickname = typeof candidate.nickname === "string" ? candidate.nickname.trim() : "";
  const life = typeof candidate.life === "string" ? candidate.life.trim() : "";
  const mana = typeof candidate.mana === "string" ? candidate.mana.trim() : "";
  const patchVersion =
    typeof candidate.patchVersion === "string" ? formatPatchVersionLabel(candidate.patchVersion.trim()) : undefined;
  const pinned = candidate.pinned === true;
  const resistances = typeof candidate.resistances === "string" ? candidate.resistances.trim() : "";

  return {
    dps: dps || undefined,
    ehp: ehp || undefined,
    energyShield: energyShield || undefined,
    guardAnnotation: guardAnnotation || undefined,
    id,
    level,
    life: life || undefined,
    mana: mana || undefined,
    nickname: nickname || undefined,
    patchVersion,
    pinned,
    resistances: resistances || undefined,
    title,
    viewedAt,
  };
}

function persistRecentBuilds(entries: RecentBuildEntry[]) {
  if (typeof window === "undefined") {
    return entries;
  }

  try {
    window.localStorage.setItem(RECENT_BUILDS_STORAGE_KEY, JSON.stringify(pruneRecentBuilds(entries)));
  } catch {
    return readRecentBuilds();
  }

  return readRecentBuilds();
}

function updateRecentBuilds(mutator: (entries: RecentBuildEntry[]) => RecentBuildEntry[]) {
  if (typeof window === "undefined") {
    return [] as RecentBuildEntry[];
  }

  return persistRecentBuilds(mutator(readRecentBuilds()));
}

function pruneRecentBuilds(entries: RecentBuildEntry[]) {
  const nextEntries = entries
    .map(normalizeRecentBuildEntry)
    .filter((entry): entry is RecentBuildEntry => entry !== undefined);

  if (nextEntries.length <= MAX_RECENT_BUILDS) {
    return nextEntries;
  }

  const trimmedEntries = [...nextEntries];
  for (let index = trimmedEntries.length - 1; index >= 0 && trimmedEntries.length > MAX_RECENT_BUILDS; index -= 1) {
    if (!trimmedEntries[index]?.pinned) {
      trimmedEntries.splice(index, 1);
    }
  }

  return trimmedEntries.slice(0, MAX_RECENT_BUILDS);
}
