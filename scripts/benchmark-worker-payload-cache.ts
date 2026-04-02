import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import worker, { type Env } from "../apps/worker/src/index.ts";

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
}

interface TimedResponse {
  bytes: number;
  cacheHeader: string | null;
  ms: number;
  status: number;
}

interface SampleBenchmarkResult {
  coldJson: TimedResponse;
  sample: string;
  upload: TimedResponse;
  warmJson: TimedResponse;
}

function createEnv(cacheEnabled: boolean, kv: MemoryKV): Env {
  return {
    BASE_URL: "https://example.test",
    BUILD_CODES: kv as unknown as KVNamespace,
    MAX_UPLOAD_SIZE: "200000",
    PARSED_PAYLOAD_CACHE_ENABLED: cacheEnabled ? "true" : "false",
    PARSED_PAYLOAD_CACHE_VERSION: "bench",
    PARSED_PAYLOAD_TTL_SECONDS: "2592000",
  };
}

async function measureResponse(requestFactory: () => Promise<Response>): Promise<TimedResponse> {
  const start = performance.now();
  const response = await requestFactory();
  const body = await response.text();
  const end = performance.now();

  return {
    bytes: Buffer.byteLength(body, "utf8"),
    cacheHeader: response.headers.get("x-payload-cache"),
    ms: end - start,
    status: response.status,
  };
}

async function benchmarkSample(sampleFile: string, cacheEnabled: boolean): Promise<SampleBenchmarkResult> {
  const samplePath = path.join("data", sampleFile);
  const code = readFileSync(samplePath, "utf8").trim();
  const kv = new MemoryKV();
  const env = createEnv(cacheEnabled, kv);

  const uploadStart = performance.now();
  const uploadResponse = await worker.fetch(
    new Request("https://example.test/pob", {
      body: code,
      method: "POST",
    }),
    env,
  );
  const uploadBodyText = await uploadResponse.text();
  const uploadEnd = performance.now();
  const upload: TimedResponse = {
    bytes: Buffer.byteLength(uploadBodyText, "utf8"),
    cacheHeader: uploadResponse.headers.get("x-payload-cache"),
    ms: uploadEnd - uploadStart,
    status: uploadResponse.status,
  };

  if (upload.status !== 201) {
    throw new Error(`Upload failed for ${sampleFile} (${upload.status})`);
  }

  const uploadBody = JSON.parse(uploadBodyText) as { id: string };
  const id = uploadBody.id;

  await kv.delete(`payload:bench:${id}`);

  const coldJson = await measureResponse(() =>
    worker.fetch(new Request(`https://example.test/${id}/json`), env),
  );
  const warmJson = await measureResponse(() =>
    worker.fetch(new Request(`https://example.test/${id}/json`), env),
  );

  return {
    coldJson,
    sample: sampleFile,
    upload,
    warmJson,
  };
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function main() {
  const args = process.argv.slice(2);
  const limitIndex = args.findIndex((arg) => arg === "--limit");
  const requestedLimit =
    limitIndex >= 0 && args[limitIndex + 1] ? Number.parseInt(args[limitIndex + 1]!, 10) : undefined;
  const filterIndex = args.findIndex((arg) => arg === "--sample");
  const sampleFilter = filterIndex >= 0 ? args[filterIndex + 1]?.toLowerCase() : undefined;

  const sampleFiles = readdirSync("data")
    .filter((entry) => entry.endsWith(".txt"))
    .filter((entry) => (sampleFilter ? entry.toLowerCase().includes(sampleFilter) : true))
    .slice(0, requestedLimit && Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : undefined);

  if (sampleFiles.length === 0) {
    throw new Error("No sample PoB files matched the requested benchmark filter.");
  }

  const withoutCache = await Promise.all(sampleFiles.map((sample) => benchmarkSample(sample, false)));
  const withCache = await Promise.all(sampleFiles.map((sample) => benchmarkSample(sample, true)));

  const summary = {
    samples: sampleFiles,
    withCache: {
      avgColdJsonMs: average(withCache.map((result) => result.coldJson.ms)),
      avgUploadMs: average(withCache.map((result) => result.upload.ms)),
      avgWarmJsonMs: average(withCache.map((result) => result.warmJson.ms)),
      results: withCache,
    },
    withoutCache: {
      avgColdJsonMs: average(withoutCache.map((result) => result.coldJson.ms)),
      avgUploadMs: average(withoutCache.map((result) => result.upload.ms)),
      avgWarmJsonMs: average(withoutCache.map((result) => result.warmJson.ms)),
      results: withoutCache,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
