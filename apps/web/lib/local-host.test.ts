import { describe, expect, it } from "vitest";

import { getRequestHostname, isLocalHostname, isLocalRequest } from "./local-host";

describe("local-host helpers", () => {
  it("recognizes localhost-style hostnames", () => {
    expect(isLocalHostname("localhost")).toBe(true);
    expect(isLocalHostname("127.0.0.1")).toBe(true);
    expect(isLocalHostname("0.0.0.0:3000")).toBe(true);
    expect(isLocalHostname("[::1]")).toBe(true);
    expect(isLocalHostname("pob.codes")).toBe(false);
  });

  it("prefers forwarded host headers when resolving requests", () => {
    const request = new Request("https://pob.codes/api/pob-samples/demo", {
      headers: {
        host: "pob.codes",
        "x-forwarded-host": "localhost:3000",
      },
    });

    expect(getRequestHostname(request)).toBe("localhost:3000");
    expect(isLocalRequest(request)).toBe(true);
  });

  it("rejects non-local sample requests", () => {
    const request = new Request("https://pob.codes/api/pob-samples/demo");
    expect(isLocalRequest(request)).toBe(false);
  });
});
