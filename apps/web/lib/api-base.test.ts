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
});
