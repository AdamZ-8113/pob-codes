import { parseBuildCodeToPayload } from "@pobcodes/pob-parser";
import type { BuildPayload, ErrorResponse, UploadResponse } from "@pobcodes/shared-types";

import { resolveBuildInput } from "./import-resolver";

export interface Env {
  BUILD_CODES: KVNamespace;
  BASE_URL?: string;
  JSON_RESPONSE_EDGE_CACHE_ENABLED?: string;
  MAX_UPLOAD_SIZE?: string;
  PARSED_PAYLOAD_CACHE_ENABLED?: string;
  PARSED_PAYLOAD_CACHE_VERSION?: string;
  PARSED_PAYLOAD_TTL_SECONDS?: string;
}

const DEFAULT_MAX_UPLOAD_BYTES = 150 * 1024;
const DEFAULT_JSON_RESPONSE_EDGE_CACHE_ENABLED = true;
const DEFAULT_PARSED_PAYLOAD_CACHE_ENABLED = true;
const DEFAULT_PARSED_PAYLOAD_CACHE_VERSION = "1";
const DEFAULT_PARSED_PAYLOAD_TTL_SECONDS = 30 * 24 * 60 * 60;
const ID_PATTERN = /^[A-Za-z0-9_-]{8,40}$/;
const JSON_RESPONSE_CACHE_VERSION_PARAM = "__payloadCacheVersion";
const JSON_SUCCESS_CACHE_CONTROL = "public, max-age=31536000, immutable";
const RAW_CODE_PREFIX = "raw:";
const PARSED_PAYLOAD_PREFIX = "payload:";
const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      const method = request.method.toUpperCase();

      if (method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            ...CORS_HEADERS,
            "cache-control": "public, max-age=86400",
          },
        });
      }

      if (method === "POST" && url.pathname === "/pob") {
        return handleUpload(request, env);
      }

      if (method === "POST" && url.pathname === "/pob/parse") {
        return handleParse(request, env);
      }

      if (method === "GET") {
        const pobMatch = url.pathname.match(/^\/pob\/([^/]+)$/);
        if (pobMatch) {
          return handleRawById(pobMatch[1], env);
        }

        const rawMatch = url.pathname.match(/^\/([^/]+)\/raw$/);
        if (rawMatch) {
          return handleRawById(rawMatch[1], env);
        }

        const jsonMatch = url.pathname.match(/^\/([^/]+)\/json$/);
        if (jsonMatch) {
          return handleJsonById(request, jsonMatch[1], env, ctx);
        }
      }

      return jsonError("Not found", 404, "NOT_FOUND");
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Unexpected error",
        500,
        "INTERNAL_ERROR",
      );
    }
  },
};

async function handleUpload(request: Request, env: Env): Promise<Response> {
  const resolved = await resolveParsedBuildRequest(request, env);
  if ("error" in resolved) {
    return resolved.error;
  }
  const { code } = resolved;

  let id = await shortHash(code, 11);
  let existing = await getStoredRawCode(id, env);

  if (existing && existing !== code) {
    id = await shortHash(code, 20);
    existing = await getStoredRawCode(id, env);
  }

  await storeRawCode(id, code, env);
  await storeParsedPayload(id, withBuildId(resolved.payload, id), env);

  const baseUrl = env.BASE_URL?.trim() || new URL(request.url).origin;
  const body: UploadResponse = {
    id,
    shortUrl: `${baseUrl}/b/${id}`,
  };

  return json(body, 201, {
    "cache-control": "no-store",
  });
}

async function handleParse(request: Request, env: Env): Promise<Response> {
  const resolved = await resolveParsedBuildRequest(request, env);
  if ("error" in resolved) {
    return resolved.error;
  }

  return json(resolved.payload, 200, {
    "cache-control": "no-store",
  });
}

async function handleRawById(id: string, env: Env): Promise<Response> {
  if (!isValidId(id)) {
    return jsonError("Invalid id", 400, "INVALID_ID");
  }

  const code = await getStoredRawCode(id, env);
  if (!code) {
    return jsonError("Build not found", 404, "NOT_FOUND");
  }

  return new Response(code, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": JSON_SUCCESS_CACHE_CONTROL,
      ...CORS_HEADERS,
    },
  });
}

async function handleJsonById(
  request: Request,
  id: string,
  env: Env,
  ctx?: ExecutionContext,
): Promise<Response> {
  if (!isValidId(id)) {
    return jsonError("Invalid id", 400, "INVALID_ID");
  }

  const cachedJsonResponse = await getCachedJsonResponse(request, env);
  if (cachedJsonResponse) {
    return cachedJsonResponse;
  }

  const cachedPayload = await getStoredParsedPayload(id, env);
  if (cachedPayload) {
    const response = jsonText(cachedPayload, 200, {
      "cache-control": JSON_SUCCESS_CACHE_CONTROL,
      "x-payload-cache": "hit",
    });
    await storeCachedJsonResponse(request, response, env, ctx);
    return response;
  }

  const code = await getStoredRawCode(id, env);
  if (!code) {
    return jsonError("Build not found", 404, "NOT_FOUND");
  }

  const payload = withBuildId(parseBuildCodeToPayload(code, "id"), id);
  await storeParsedPayload(id, payload, env);
  const response = json(payload, 200, {
    "cache-control": JSON_SUCCESS_CACHE_CONTROL,
    "x-payload-cache": isParsedPayloadCacheEnabled(env) ? "miss" : "bypass",
  });
  await storeCachedJsonResponse(request, response, env, ctx);
  return response;
}

async function resolveParsedBuildRequest(
  request: Request,
  env: Env,
): Promise<{ code: string; payload: ReturnType<typeof parseBuildCodeToPayload> } | { error: Response }> {
  const source = (await request.text()).trim();
  if (!source) {
    return {
      error: jsonError("Request body must contain a PoB code or supported build URL", 400, "EMPTY_BODY"),
    };
  }

  const maxUpload = Number(env.MAX_UPLOAD_SIZE ?? DEFAULT_MAX_UPLOAD_BYTES);
  const sourceBytes = new TextEncoder().encode(source).byteLength;
  if (sourceBytes > maxUpload) {
    return {
      error: jsonError("Paste too large", 413, "PAYLOAD_TOO_LARGE"),
    };
  }

  let code: string;
  try {
    code = await resolveBuildInput(source);
  } catch (error) {
    return {
      error: jsonError(error instanceof Error ? error.message : "Invalid build URL", 400, "INVALID_IMPORT_URL"),
    };
  }

  const sizeBytes = new TextEncoder().encode(code).byteLength;
  if (sizeBytes > maxUpload) {
    return {
      error: jsonError("Paste too large", 413, "PAYLOAD_TOO_LARGE"),
    };
  }

  try {
    return {
      code,
      payload: parseBuildCodeToPayload(code, "code"),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Path of Exile 1")) {
      return {
        error: jsonError(error.message, 400, "UNSUPPORTED_BUILD"),
      };
    }

    return {
      error: jsonError("Invalid PoB code or unsupported import link", 400, "INVALID_POB"),
    };
  }
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return jsonText(JSON.stringify(body), status, headers);
}

function jsonText(body: string, status: number, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

function jsonError(message: string, status: number, code: string): Response {
  const body: ErrorResponse = { error: message, code };
  return json(body, status, {
    "cache-control": "no-store",
  });
}

function withBuildId(payload: BuildPayload, id: string): BuildPayload {
  return {
    ...payload,
    meta: {
      ...payload.meta,
      id,
    },
  };
}

async function getCachedJsonResponse(request: Request, env: Env): Promise<Response | null> {
  if (!isJsonResponseEdgeCacheEnabled(env)) {
    return null;
  }

  const cache = getDefaultEdgeCache();
  if (!cache) {
    return null;
  }

  return (await cache.match(getJsonResponseCacheKey(request, env))) ?? null;
}

async function getStoredRawCode(id: string, env: Env): Promise<string | null> {
  const rawCode = await env.BUILD_CODES.get(getRawCodeKey(id));
  if (rawCode != null) {
    return rawCode;
  }

  // Backward compatibility for builds stored before raw/payload key namespacing.
  return env.BUILD_CODES.get(getLegacyRawCodeKey(id));
}

async function storeRawCode(id: string, code: string, env: Env): Promise<void> {
  await env.BUILD_CODES.put(getRawCodeKey(id), code);
}

async function getStoredParsedPayload(id: string, env: Env): Promise<string | null> {
  if (!isParsedPayloadCacheEnabled(env)) {
    return null;
  }

  return env.BUILD_CODES.get(getParsedPayloadKey(id, env));
}

async function storeParsedPayload(id: string, payload: BuildPayload, env: Env): Promise<void> {
  if (!isParsedPayloadCacheEnabled(env)) {
    return;
  }

  await env.BUILD_CODES.put(getParsedPayloadKey(id, env), JSON.stringify(payload), {
    expirationTtl: getParsedPayloadCacheTtlSeconds(env),
  });
}

async function storeCachedJsonResponse(
  request: Request,
  response: Response,
  env: Env,
  ctx?: ExecutionContext,
): Promise<void> {
  if (!isJsonResponseEdgeCacheEnabled(env) || response.status !== 200) {
    return;
  }

  const cache = getDefaultEdgeCache();
  if (!cache) {
    return;
  }

  const cachePromise = cache.put(getJsonResponseCacheKey(request, env), response.clone());
  if (ctx?.waitUntil) {
    ctx.waitUntil(cachePromise);
    return;
  }

  await cachePromise;
}

function getDefaultEdgeCache(): Cache | null {
  return (globalThis.caches as (CacheStorage & { default?: Cache }) | undefined)?.default ?? null;
}

function getLegacyRawCodeKey(id: string): string {
  return id;
}

function getRawCodeKey(id: string): string {
  return `${RAW_CODE_PREFIX}${id}`;
}

function getParsedPayloadKey(id: string, env: Env): string {
  return `${PARSED_PAYLOAD_PREFIX}${getParsedPayloadCacheVersion(env)}:${id}`;
}

function getJsonResponseCacheKey(request: Request, env: Env): Request {
  const url = new URL(request.url);
  url.searchParams.set(JSON_RESPONSE_CACHE_VERSION_PARAM, getParsedPayloadCacheVersion(env));
  return new Request(url.toString(), {
    headers: request.headers,
    method: "GET",
  });
}

function isJsonResponseEdgeCacheEnabled(env: Env): boolean {
  return parseBooleanEnv(env.JSON_RESPONSE_EDGE_CACHE_ENABLED, DEFAULT_JSON_RESPONSE_EDGE_CACHE_ENABLED);
}

function isParsedPayloadCacheEnabled(env: Env): boolean {
  return parseBooleanEnv(env.PARSED_PAYLOAD_CACHE_ENABLED, DEFAULT_PARSED_PAYLOAD_CACHE_ENABLED);
}

function getParsedPayloadCacheVersion(env: Env): string {
  return env.PARSED_PAYLOAD_CACHE_VERSION?.trim() || DEFAULT_PARSED_PAYLOAD_CACHE_VERSION;
}

function getParsedPayloadCacheTtlSeconds(env: Env): number {
  const value = Number(env.PARSED_PAYLOAD_TTL_SECONDS ?? DEFAULT_PARSED_PAYLOAD_TTL_SECONDS);
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_PARSED_PAYLOAD_TTL_SECONDS;
  }

  return Math.floor(value);
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  const normalizedValue = value?.trim().toLowerCase();
  if (!normalizedValue) {
    return defaultValue;
  }

  return !["0", "false", "no", "off"].includes(normalizedValue);
}

async function shortHash(input: string, length: number): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  const digestBytes = new Uint8Array(digest);
  const base64 = bytesToBase64(digestBytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return base64.slice(0, length);
}

function bytesToBase64(input: Uint8Array): string {
  let binary = "";
  for (const byte of input) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function isValidId(id: string): boolean {
  return ID_PATTERN.test(id);
}
