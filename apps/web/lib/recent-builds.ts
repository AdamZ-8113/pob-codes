export interface RecentBuildEntry {
  id: string;
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
    .filter((entry): entry is RecentBuildEntry => entry !== undefined)
    .filter((entry) => entry.id !== normalizedNextEntry.id);

  return [normalizedNextEntry, ...normalizedExistingEntries].slice(0, MAX_RECENT_BUILDS);
}

export function readRecentBuilds() {
  if (typeof window === "undefined") {
    return [] as RecentBuildEntry[];
  }

  return parseRecentBuilds(window.localStorage.getItem(RECENT_BUILDS_STORAGE_KEY));
}

export function recordRecentBuild(entry: Pick<RecentBuildEntry, "id" | "title">) {
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

  try {
    window.localStorage.setItem(RECENT_BUILDS_STORAGE_KEY, JSON.stringify(mergedEntries));
  } catch {
    return readRecentBuilds();
  }

  return mergedEntries;
}

function normalizeRecentBuildEntry(entry: unknown): RecentBuildEntry | undefined {
  if (!entry || typeof entry !== "object") {
    return undefined;
  }

  const candidate = entry as Partial<Record<"id" | "title" | "viewedAt", unknown>>;
  const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const viewedAt = typeof candidate.viewedAt === "string" ? candidate.viewedAt.trim() : "";
  if (!id || !title || !viewedAt) {
    return undefined;
  }

  return {
    id,
    title,
    viewedAt,
  };
}
