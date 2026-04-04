import { afterEach, describe, expect, it, vi } from "vitest";

import { encodeBuildCode } from "@pobcodes/pob-codec";

import { resolveBuildInput } from "./import-resolver";

describe("resolveBuildInput", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("follows supported redirects manually", async () => {
    const xml = '<PathOfBuilding><Build level="1" className="Ranger" mainSocketGroup="1" /></PathOfBuilding>';
    const code = await encodeBuildCode(xml);
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "https://pastebin.com/raw/demo123") {
        return new Response(null, {
          headers: {
            location: "https://pastebin.com/raw/final123",
          },
          status: 302,
        });
      }
      if (url === "https://pastebin.com/raw/final123") {
        return new Response(code, { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });

    await expect(resolveBuildInput("https://pastebin.com/demo123", fetchMock as typeof fetch)).resolves.toBe(code);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://pastebin.com/raw/demo123",
      expect.objectContaining({
        redirect: "manual",
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://pastebin.com/raw/final123",
      expect.objectContaining({
        redirect: "manual",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("rejects redirects to unsupported hosts", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(null, {
        headers: {
          location: "https://example.com/redirected",
        },
        status: 302,
      }),
    );

    await expect(resolveBuildInput("https://pastebin.com/demo123", fetchMock as typeof fetch)).rejects.toThrow(
      "unsupported host",
    );
  });

  it("rejects oversized imported responses", async () => {
    const fetchMock = vi.fn(async () =>
      new Response("small", {
        headers: {
          "content-length": "1048577",
        },
        status: 200,
      }),
    );

    await expect(resolveBuildInput("https://pastebin.com/demo123", fetchMock as typeof fetch)).rejects.toThrow(
      "maximum fetch size",
    );
  });

  it("times out slow imports", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_: string | URL | Request, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise<Response>((_, reject) => {
        signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      });
    });

    const pendingResolution = expect(
      resolveBuildInput("https://pastebin.com/demo123", fetchMock as typeof fetch),
    ).rejects.toThrow("Build import timed out");
    await vi.advanceTimersByTimeAsync(8_000);

    await pendingResolution;
  });

  it("does not resolve removed importer hosts", async () => {
    const fetchMock = vi.fn();

    await expect(resolveBuildInput("https://pastebinp.com/demo123", fetchMock as typeof fetch)).resolves.toBe(
      "https://pastebinp.com/demo123",
    );
    await expect(resolveBuildInput("https://rentry.co/demo123", fetchMock as typeof fetch)).resolves.toBe(
      "https://rentry.co/demo123",
    );
    await expect(resolveBuildInput("pob://pastebinproxy/demo123", fetchMock as typeof fetch)).resolves.toBe(
      "pob://pastebinproxy/demo123",
    );
    await expect(resolveBuildInput("pob://rentry/demo123", fetchMock as typeof fetch)).resolves.toBe(
      "pob://rentry/demo123",
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
