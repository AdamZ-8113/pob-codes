import { parseBuildCodeToPayload } from "@pobcodes/pob-parser";

type FetchImpl = typeof fetch;

const KNOWN_IMPORT_HOSTS = [
  "maxroll.gg",
  "pobb.in",
  "poe.ninja",
  "pastebin.com",
  "pastebinp.com",
  "rentry.co",
  "poedb.tw",
];

const SUPPORTED_LINK_PATTERN =
  /\b(?:https?:\/\/|pob:\/\/|www\.)[^\s"'<>]+|(?:\/poe\/pob\/[A-Za-z0-9_-]+|\/poe\/planner\/[A-Za-z0-9_-]+|\/pob\/[A-Za-z0-9_-]+|\/poe1\/pob\/[A-Za-z0-9_-]+)\b/g;

export async function resolveBuildInput(input: string, fetchImpl: FetchImpl = fetch): Promise<string> {
  const trimmed = input.trim();
  if (!looksLikeImportUrl(trimmed)) {
    return trimmed;
  }

  const normalizedUrl = normalizeImportUrl(trimmed);
  if (!normalizedUrl) {
    return trimmed;
  }

  return resolveBuildFromUrl(normalizedUrl, fetchImpl, new Set<string>());
}

async function resolveBuildFromUrl(url: string, fetchImpl: FetchImpl, visited: Set<string>): Promise<string> {
  if (visited.has(url)) {
    throw new Error("Build import redirected in a loop");
  }

  visited.add(url);

  const directDownloadUrl = getDirectDownloadUrl(url);
  const response = await fetchImportSource(directDownloadUrl ?? url, fetchImpl);
  const responseText = (await response.text()).trim();

  if (!responseText) {
    throw new Error("Imported build was empty");
  }

  const embeddedCode = extractEmbeddedBuildCode(responseText);
  if (embeddedCode) {
    return embeddedCode;
  }

  const embeddedLink = extractEmbeddedBuildLink(responseText, response.url || directDownloadUrl || url);
  if (embeddedLink) {
    return resolveBuildFromUrl(embeddedLink, fetchImpl, visited);
  }

  throw new Error("Could not extract a Path of Building code from that link");
}

async function fetchImportSource(url: string, fetchImpl: FetchImpl): Promise<Response> {
  const response = await fetchImpl(url, {
    headers: {
      accept: "text/plain, text/html, application/json;q=0.9, */*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Build import failed (${response.status})`);
  }

  return response;
}

function extractEmbeddedBuildCode(source: string): string | undefined {
  if (isBuildCode(source)) {
    return source;
  }

  try {
    const parsed = JSON.parse(source) as unknown;
    return findBuildCodeInJson(parsed);
  } catch {
    return undefined;
  }
}

function findBuildCodeInJson(value: unknown, seen = new Set<unknown>()): string | undefined {
  if (typeof value === "string") {
    return isBuildCode(value) ? value.trim() : undefined;
  }

  if (!value || typeof value !== "object" || seen.has(value)) {
    return undefined;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = findBuildCodeInJson(entry, seen);
      if (nested) {
        return nested;
      }
    }
    return undefined;
  }

  for (const entry of Object.values(value)) {
    const nested = findBuildCodeInJson(entry, seen);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function extractEmbeddedBuildLink(source: string, baseUrl: string): string | undefined {
  const normalizedSource = source.replace(/\\\//g, "/");
  const matches = normalizedSource.match(SUPPORTED_LINK_PATTERN) ?? [];

  for (const match of matches) {
    const normalized = normalizeImportUrl(match, baseUrl);
    if (normalized) {
      return normalized;
    }
  }

  try {
    const parsed = JSON.parse(source) as unknown;
    return findBuildLinkInJson(parsed, baseUrl);
  } catch {
    return undefined;
  }
}

function findBuildLinkInJson(value: unknown, baseUrl: string, seen = new Set<unknown>()): string | undefined {
  if (typeof value === "string") {
    return normalizeImportUrl(value, baseUrl);
  }

  if (!value || typeof value !== "object" || seen.has(value)) {
    return undefined;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = findBuildLinkInJson(entry, baseUrl, seen);
      if (nested) {
        return nested;
      }
    }
    return undefined;
  }

  for (const entry of Object.values(value)) {
    const nested = findBuildLinkInJson(entry, baseUrl, seen);
    if (nested) {
      return nested;
    }
  }

  return undefined;
}

function getDirectDownloadUrl(importUrl: string): string | undefined {
  const url = new URL(importUrl);
  const host = stripWww(url.hostname);
  const segments = url.pathname.split("/").filter((segment) => segment.length > 0);

  if (host === "maxroll.gg") {
    const maxrollPobId = getPathMatch(segments, ["poe", "pob"]) ?? getPathMatch(segments, ["poe", "api", "pob"]);
    if (maxrollPobId) {
      return `https://maxroll.gg/poe/api/pob/${maxrollPobId}`;
    }
    const maxrollPlannerId = getPathMatch(segments, ["poe", "planner"]);
    if (maxrollPlannerId) {
      return `https://planners.maxroll.gg/${maxrollPlannerId}`;
    }
    return undefined;
  }

  if (host === "pobb.in") {
    if (segments[0] === "pob" && segments[1]) {
      return `https://pobb.in/pob/${segments[1]}`;
    }
    if (segments[0]) {
      return `https://pobb.in/pob/${segments[0]}`;
    }
    return undefined;
  }

  if (host === "poe.ninja") {
    const rawId = getPathMatch(segments, ["poe1", "pob", "raw"]);
    if (rawId) {
      return `https://poe.ninja/poe1/pob/raw/${rawId}`;
    }

    const pobId = getPathMatch(segments, ["poe1", "pob"]) ?? getPathMatch(segments, ["pob"]);
    if (pobId) {
      return `https://poe.ninja/poe1/pob/raw/${pobId}`;
    }

    return undefined;
  }

  if (host === "pastebin.com") {
    const id = getPathMatch(segments, ["raw"]) ?? segments[0];
    return id ? `https://pastebin.com/raw/${id}` : undefined;
  }

  if (host === "pastebinp.com") {
    const id = getPathMatch(segments, ["raw"]) ?? segments[0];
    return id ? `https://pastebinp.com/raw/${id}` : undefined;
  }

  if (host === "rentry.co") {
    const id = getPathMatch(segments, ["paste"]) ?? segments[0];
    return id ? `https://rentry.co/paste/${id}/raw` : undefined;
  }

  if (host === "poedb.tw") {
    const id = getPathMatch(segments, ["pob"]);
    return id ? `https://poedb.tw/pob/${id}/raw` : undefined;
  }

  return undefined;
}

function normalizeImportUrl(input: string, baseUrl?: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }

  const protocolUrl = parseProtocolImportUrl(trimmed);
  if (protocolUrl) {
    return protocolUrl;
  }

  const source =
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("www.")
      ? trimmed
      : KNOWN_IMPORT_HOSTS.some((host) => trimmed.toLowerCase().startsWith(host))
        ? `https://${trimmed}`
        : trimmed;

  try {
    const url = source.startsWith("/") ? new URL(source, baseUrl ?? "https://maxroll.gg") : new URL(source);
    if (!isSupportedImportHost(url.hostname)) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function parseProtocolImportUrl(input: string): string | undefined {
  const match = input.match(/^pob:\/*([^/]+)\/(.+)$/i);
  if (!match) {
    return undefined;
  }

  const siteId = match[1].toLowerCase();
  const buildId = match[2].trim();
  if (!buildId) {
    return undefined;
  }

  if (siteId === "maxroll") {
    return `https://maxroll.gg/poe/pob/${buildId}`;
  }
  if (siteId === "pobbin") {
    return `https://pobb.in/${buildId}`;
  }
  if (siteId === "poeninja") {
    return `https://poe.ninja/poe1/pob/${buildId}`;
  }
  if (siteId === "pastebin") {
    return `https://pastebin.com/${buildId}`;
  }
  if (siteId === "pastebinproxy") {
    return `https://pastebinp.com/${buildId}`;
  }
  if (siteId === "rentry") {
    return `https://rentry.co/${buildId}`;
  }
  if (siteId === "poedb") {
    return `https://poedb.tw/pob/${buildId}`;
  }

  return undefined;
}

function looksLikeImportUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return false;
  }

  return trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("pob://") || trimmed.startsWith("www.")
    || KNOWN_IMPORT_HOSTS.some((host) => trimmed.toLowerCase().startsWith(host));
}

function isSupportedImportHost(hostname: string): boolean {
  const stripped = stripWww(hostname.toLowerCase());
  return KNOWN_IMPORT_HOSTS.includes(stripped);
}

function stripWww(hostname: string): string {
  return hostname.replace(/^www\./i, "");
}

function getPathMatch(segments: string[], prefix: string[]): string | undefined {
  if (segments.length <= prefix.length) {
    return undefined;
  }

  const prefixMatches = prefix.every((segment, index) => segments[index] === segment);
  return prefixMatches ? segments[prefix.length] : undefined;
}

function isBuildCode(value: string): boolean {
  try {
    parseBuildCodeToPayload(value.trim(), "code");
    return true;
  } catch {
    return false;
  }
}
