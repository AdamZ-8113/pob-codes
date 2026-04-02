import { readdirSync, readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@pobcodes/pob-parser", async () => {
  const actual = await vi.importActual<typeof import("@pobcodes/pob-parser")>("@pobcodes/pob-parser");
  return {
    ...actual,
    parseBuildCodeToPayload: vi.fn(actual.parseBuildCodeToPayload),
  };
});

import { parseBuildCodeToPayload } from "@pobcodes/pob-parser";

import worker, { type Env } from "./index";

interface MemoryKVRecord {
  expiresAt?: number;
  value: string;
}

class MemoryKV {
  private readonly store = new Map<string, MemoryKVRecord>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt != null && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
    const expirationTtl = options?.expirationTtl;
    this.store.set(key, {
      expiresAt:
        typeof expirationTtl === "number" && Number.isFinite(expirationTtl) && expirationTtl > 0
          ? Date.now() + expirationTtl * 1000
          : undefined,
      value,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  keys(): string[] {
    return [...this.store.keys()].sort();
  }
}

interface MemoryCachedResponse {
  body: string;
  headers: Array<[string, string]>;
  status: number;
  statusText: string;
}

class MemoryResponseCache {
  private readonly store = new Map<string, MemoryCachedResponse>();

  async match(request: Request | string): Promise<Response | null> {
    const entry = this.store.get(this.getKey(request));
    if (!entry) {
      return null;
    }

    return new Response(entry.body, {
      headers: entry.headers,
      status: entry.status,
      statusText: entry.statusText,
    });
  }

  async put(request: Request | string, response: Response): Promise<void> {
    const clone = response.clone();
    const headers: Array<[string, string]> = [];
    clone.headers.forEach((value, key) => {
      headers.push([key, value]);
    });
    this.store.set(this.getKey(request), {
      body: await clone.text(),
      headers,
      status: clone.status,
      statusText: clone.statusText,
    });
  }

  private getKey(request: Request | string): string {
    return typeof request === "string" ? request : request.url;
  }
}

function createEnv(
  overrides: Partial<Env> = {},
  kv = new MemoryKV(),
): { env: Env; kv: MemoryKV } {
  return {
    env: {
      BASE_URL: "https://example.test",
      BUILD_CODES: kv as unknown as KVNamespace,
      JSON_RESPONSE_EDGE_CACHE_ENABLED: "true",
      MAX_UPLOAD_SIZE: "200000",
      PARSED_PAYLOAD_CACHE_ENABLED: "true",
      PARSED_PAYLOAD_CACHE_VERSION: "1",
      PARSED_PAYLOAD_TTL_SECONDS: "2592000",
      ...overrides,
    },
    kv,
  };
}

async function encodeCode(xml: string): Promise<string> {
  return (await import("@pobcodes/pob-codec")).encodeBuildCode(xml);
}

const parseBuildCodeToPayloadMock = vi.mocked(parseBuildCodeToPayload);

describe("worker routes", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("stores raw code under the new key, precomputes payload cache, and fetches both views", async () => {
    const { env, kv } = createEnv();
    const xml = '<PathOfBuilding><Build level="1" className="Ranger" mainSocketGroup="1" /></PathOfBuilding>';
    const code = await encodeCode(xml);

    const uploadRes = await worker.fetch(
      new Request("https://example.test/pob", {
        body: code,
        method: "POST",
      }),
      env,
    );
    expect(uploadRes.status).toBe(201);

    const payload = (await uploadRes.json()) as { id: string };
    const uploadRes2 = await worker.fetch(
      new Request("https://example.test/pob", {
        body: code,
        method: "POST",
      }),
      env,
    );
    const payload2 = (await uploadRes2.json()) as { id: string };
    expect(payload2.id).toBe(payload.id);

    expect(kv.has(`raw:${payload.id}`)).toBe(true);
    expect(kv.has(`payload:1:${payload.id}`)).toBe(true);

    parseBuildCodeToPayloadMock.mockClear();

    const rawRes = await worker.fetch(new Request(`https://example.test/${payload.id}/raw`), env);
    expect(rawRes.status).toBe(200);
    expect(await rawRes.text()).toBe(code);

    const jsonRes = await worker.fetch(new Request(`https://example.test/${payload.id}/json`), env);
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers.get("x-payload-cache")).toBe("hit");

    const parsed = (await jsonRes.json()) as { build: { className: string }; meta: { id?: string } };
    expect(parsed.build.className).toBe("Ranger");
    expect(parsed.meta.id).toBe(payload.id);
    expect(parseBuildCodeToPayloadMock).not.toHaveBeenCalled();
  });

  it("rebuilds parsed payloads from raw code on cache miss", async () => {
    const { env, kv } = createEnv();
    const xml = '<PathOfBuilding><Build level="1" className="Templar" mainSocketGroup="1" /></PathOfBuilding>';
    const code = await encodeCode(xml);

    const uploadRes = await worker.fetch(
      new Request("https://example.test/pob", {
        body: code,
        method: "POST",
      }),
      env,
    );
    const payload = (await uploadRes.json()) as { id: string };

    await kv.delete(`payload:1:${payload.id}`);
    parseBuildCodeToPayloadMock.mockClear();

    const jsonRes = await worker.fetch(new Request(`https://example.test/${payload.id}/json`), env);
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers.get("x-payload-cache")).toBe("miss");
    expect(parseBuildCodeToPayloadMock).toHaveBeenCalledTimes(1);
    expect(kv.has(`payload:1:${payload.id}`)).toBe(true);
  });

  it("serves cached json responses from the edge cache even if storage is later unavailable", async () => {
    const { env, kv } = createEnv();
    const responseCache = new MemoryResponseCache();
    const xml = '<PathOfBuilding><Build level="1" className="Scion" mainSocketGroup="1" /></PathOfBuilding>';
    const code = await encodeCode(xml);

    vi.stubGlobal("caches", {
      default: responseCache,
    });

    const uploadRes = await worker.fetch(
      new Request("https://example.test/pob", {
        body: code,
        method: "POST",
      }),
      env,
    );
    const payload = (await uploadRes.json()) as { id: string };
    const jsonUrl = `https://example.test/${payload.id}/json`;

    const initialJsonRes = await worker.fetch(new Request(jsonUrl), env);
    expect(initialJsonRes.status).toBe(200);
    expect((await initialJsonRes.json()) as { build: { className: string } }).toMatchObject({
      build: {
        className: "Scion",
      },
    });

    await kv.delete(`raw:${payload.id}`);
    await kv.delete(`payload:1:${payload.id}`);
    parseBuildCodeToPayloadMock.mockClear();

    const cachedJsonRes = await worker.fetch(new Request(jsonUrl), env);
    expect(cachedJsonRes.status).toBe(200);
    expect((await cachedJsonRes.json()) as { build: { className: string } }).toMatchObject({
      build: {
        className: "Scion",
      },
    });
    expect(parseBuildCodeToPayloadMock).not.toHaveBeenCalled();
  });

  it("rebuilds payload cache entries when the cache version changes", async () => {
    const sharedKv = new MemoryKV();
    const { env: versionOneEnv } = createEnv({ PARSED_PAYLOAD_CACHE_VERSION: "1" }, sharedKv);
    const xml = '<PathOfBuilding><Build level="1" className="Shadow" mainSocketGroup="1" /></PathOfBuilding>';
    const code = await encodeCode(xml);

    const uploadRes = await worker.fetch(
      new Request("https://example.test/pob", {
        body: code,
        method: "POST",
      }),
      versionOneEnv,
    );
    const payload = (await uploadRes.json()) as { id: string };
    expect(sharedKv.has(`payload:1:${payload.id}`)).toBe(true);

    const { env: versionTwoEnv } = createEnv({ PARSED_PAYLOAD_CACHE_VERSION: "2" }, sharedKv);
    parseBuildCodeToPayloadMock.mockClear();

    const jsonRes = await worker.fetch(new Request(`https://example.test/${payload.id}/json`), versionTwoEnv);
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers.get("x-payload-cache")).toBe("miss");
    expect(parseBuildCodeToPayloadMock).toHaveBeenCalledTimes(1);
    expect(sharedKv.has(`payload:2:${payload.id}`)).toBe(true);
  });

  it("keeps parse-only requests stateless", async () => {
    const { env, kv } = createEnv();
    const xml = '<PathOfBuilding><Build level="1" className="Templar" mainSocketGroup="1" /></PathOfBuilding>';
    const code = await encodeCode(xml);

    const parseRes = await worker.fetch(
      new Request("https://example.test/pob/parse", {
        body: code,
        method: "POST",
      }),
      env,
    );

    expect(parseRes.status).toBe(200);
    const parsed = (await parseRes.json()) as { build: { className: string } };
    expect(parsed.build.className).toBe("Templar");
    expect(kv.keys()).toEqual([]);

    const missingRawRes = await worker.fetch(new Request("https://example.test/abcdefgh/raw"), env);
    expect(missingRawRes.status).toBe(404);
  });

  it("falls back to legacy unprefixed raw keys for existing builds", async () => {
    const { env, kv } = createEnv();
    const id = "legacyBuild1";
    const xml = '<PathOfBuilding><Build level="1" className="Duelist" mainSocketGroup="1" /></PathOfBuilding>';
    const code = await encodeCode(xml);

    await kv.put(id, code);
    parseBuildCodeToPayloadMock.mockClear();

    const rawRes = await worker.fetch(new Request(`https://example.test/${id}/raw`), env);
    expect(rawRes.status).toBe(200);
    expect(await rawRes.text()).toBe(code);

    const jsonRes = await worker.fetch(new Request(`https://example.test/${id}/json`), env);
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers.get("x-payload-cache")).toBe("miss");
    expect(parseBuildCodeToPayloadMock).toHaveBeenCalledTimes(1);
    expect(kv.has(`payload:1:${id}`)).toBe(true);
  });

  it("supports disabling parsed payload caching without breaking json responses", async () => {
    const { env, kv } = createEnv({ PARSED_PAYLOAD_CACHE_ENABLED: "false" });
    const xml = '<PathOfBuilding><Build level="1" className="Witch" mainSocketGroup="1" /></PathOfBuilding>';
    const code = await encodeCode(xml);

    const uploadRes = await worker.fetch(
      new Request("https://example.test/pob", {
        body: code,
        method: "POST",
      }),
      env,
    );
    const payload = (await uploadRes.json()) as { id: string };

    expect(kv.has(`raw:${payload.id}`)).toBe(true);
    expect(kv.has(`payload:1:${payload.id}`)).toBe(false);

    parseBuildCodeToPayloadMock.mockClear();

    const firstJsonRes = await worker.fetch(new Request(`https://example.test/${payload.id}/json`), env);
    const secondJsonRes = await worker.fetch(new Request(`https://example.test/${payload.id}/json`), env);

    expect(firstJsonRes.status).toBe(200);
    expect(secondJsonRes.status).toBe(200);
    expect(firstJsonRes.headers.get("x-payload-cache")).toBe("bypass");
    expect(secondJsonRes.headers.get("x-payload-cache")).toBe("bypass");
    expect(parseBuildCodeToPayloadMock).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid uploads", async () => {
    const { env } = createEnv();
    const res = await worker.fetch(
      new Request("https://example.test/pob", {
        body: "not-valid",
        method: "POST",
      }),
      env,
    );

    expect(res.status).toBe(400);
  });

  it("rejects unsupported non-poe1 builds", async () => {
    const { env } = createEnv();
    const xml =
      '<?xml version="1.0"?><UnsupportedBuild><Build level="12" className="Mercenary" mainSocketGroup="1" /></UnsupportedBuild>';
    const code = await encodeCode(xml);

    const res = await worker.fetch(
      new Request("https://example.test/pob", {
        body: code,
        method: "POST",
      }),
      env,
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { code?: string; error?: string };
    expect(body.code).toBe("UNSUPPORTED_BUILD");
    expect(body.error).toContain("Path of Exile 1");
  });

  it("rejects malformed ids", async () => {
    const { env } = createEnv();
    const res = await worker.fetch(new Request("https://example.test/@@@/raw"), env);
    expect(res.status).toBe(400);
  });

  it("imports a real PoB sample fixture", async () => {
    const { env } = createEnv();
    const sampleFile = readdirSync("../../data").find((entry) => entry.endsWith(".txt"));
    expect(sampleFile).toBeTruthy();
    const code = readFileSync(`../../data/${sampleFile}`, "utf8").trim();

    const uploadRes = await worker.fetch(
      new Request("https://example.test/pob", {
        body: code,
        method: "POST",
      }),
      env,
    );

    expect(uploadRes.status).toBe(201);
    const payload = (await uploadRes.json()) as { id: string };

    const jsonRes = await worker.fetch(new Request(`https://example.test/${payload.id}/json`), env);
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers.get("x-payload-cache")).toBe("hit");

    const parsed = (await jsonRes.json()) as {
      gameVersion: string;
      build: { className: string };
      treeSpecs: Array<{ nodes: number[] }>;
    };

    expect(parsed.gameVersion).toBe("poe1");
    expect(parsed.build.className.length).toBeGreaterThan(0);
    expect(parsed.treeSpecs.length).toBeGreaterThan(0);
    expect(parsed.treeSpecs[0]?.nodes.length).toBeGreaterThan(0);
  });

  it("imports supported build-site URLs such as pobb.in", async () => {
    const { env } = createEnv();
    const xml = '<PathOfBuilding><Build level="1" className="Ranger" mainSocketGroup="1" /></PathOfBuilding>';
    const code = await encodeCode(xml);
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://pobb.in/pob/demo123") {
        return new Response(code, { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const uploadRes = await worker.fetch(
      new Request("https://example.test/pob", {
        body: "https://pobb.in/demo123",
        method: "POST",
      }),
      env,
    );

    expect(uploadRes.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://pobb.in/pob/demo123",
      expect.objectContaining({
        redirect: "follow",
      }),
    );
  });

  it("imports Maxroll pages by following embedded PoB links", async () => {
    const { env } = createEnv();
    const xml = '<PathOfBuilding><Build level="1" className="Shadow" mainSocketGroup="1" /></PathOfBuilding>';
    const code = await encodeCode(xml);
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://maxroll.gg/poe/build-guides/test-build") {
        return new Response('<html><body><a href="/poe/pob/share42">Open in PoB</a></body></html>', {
          headers: {
            "Content-Type": "text/html",
          },
          status: 200,
        });
      }
      if (url === "https://maxroll.gg/poe/api/pob/share42") {
        return new Response(code, { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const uploadRes = await worker.fetch(
      new Request("https://example.test/pob", {
        body: "https://maxroll.gg/poe/build-guides/test-build",
        method: "POST",
      }),
      env,
    );

    expect(uploadRes.status).toBe(201);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://maxroll.gg/poe/build-guides/test-build",
      expect.objectContaining({
        redirect: "follow",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://maxroll.gg/poe/api/pob/share42",
      expect.objectContaining({
        redirect: "follow",
      }),
    );
  });

  it("imports Maxroll planner links through the planner API host", async () => {
    const { env } = createEnv();
    const xml = '<PathOfBuilding><Build level="1" className="Witch" mainSocketGroup="1" /></PathOfBuilding>';
    const code = await encodeCode(xml);
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://planners.maxroll.gg/plan42") {
        return new Response(JSON.stringify({ pobCode: code }), {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        });
      }
      return new Response("Not found", { status: 404 });
    });

    vi.stubGlobal("fetch", fetchMock);

    const uploadRes = await worker.fetch(
      new Request("https://example.test/pob", {
        body: "https://maxroll.gg/poe/planner/plan42",
        method: "POST",
      }),
      env,
    );

    expect(uploadRes.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://planners.maxroll.gg/plan42",
      expect.objectContaining({
        redirect: "follow",
      }),
    );
  });
});
