import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApiUrl, getApiBase, normalizeApiBase } from "./api-base";

describe("api base helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("trims whitespace and trailing slashes from configured bases", () => {
    expect(normalizeApiBase(" http://localhost:8787/ \r\n")).toBe("http://localhost:8787");
  });

  it("builds valid URLs from normalized bases", () => {
    expect(buildApiUrl("/pob", " http://localhost:8787/ ")).toBe("http://localhost:8787/pob");
    expect(buildApiUrl("abc123/json", "http://localhost:8787///")).toBe("http://localhost:8787/abc123/json");
  });

  it("normalizes NEXT_PUBLIC_API_BASE from the environment", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE", " http://localhost:8787/ ");
    expect(getApiBase()).toBe("http://localhost:8787");
  });

  it("defaults pob.codes browser clients to the api subdomain", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
    vi.stubGlobal(
      "window",
      {
        location: {
          origin: "https://pob.codes",
          hostname: "pob.codes",
        },
      } as Window & typeof globalThis,
    );

    expect(getApiBase()).toBe("https://api.pob.codes");
  });

  it("keeps local browser clients pointed at the local worker in production mode", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
    vi.stubGlobal(
      "window",
      {
        location: {
          origin: "http://localhost:3000",
          hostname: "localhost",
        },
      } as Window & typeof globalThis,
    );

    expect(getApiBase()).toBe("http://localhost:8787");
  });

  it("keeps non-pob.codes browser clients on the current origin when no env override is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_BASE", "");
    vi.stubGlobal(
      "window",
      {
        location: {
          origin: "https://preview.example.com",
          hostname: "preview.example.com",
        },
      } as Window & typeof globalThis,
    );

    expect(getApiBase()).toBe("https://preview.example.com");
  });
});
