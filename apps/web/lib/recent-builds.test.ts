import { describe, expect, it } from "vitest";

import { MAX_RECENT_BUILDS, mergeRecentBuilds, parseRecentBuilds } from "./recent-builds";

describe("recent-builds helpers", () => {
  it("parses only valid recent build entries", () => {
    expect(
      parseRecentBuilds(
        JSON.stringify([
          {
            dps: "1,234,567",
            ehp: "76,543",
            id: "abc123",
            level: 100,
            patchVersion: "3.28",
            title: "Arc / Hierophant (Templar)",
            viewedAt: "2026-04-02T06:12:00.000Z",
          },
          {
            id: "",
            title: "Invalid",
            viewedAt: "2026-04-02T06:12:00.000Z",
          },
          "invalid",
        ]),
      ),
    ).toEqual([
      {
        dps: "1,234,567",
        ehp: "76,543",
        id: "abc123",
        level: 100,
        patchVersion: "3.28 Mirage",
        title: "Arc / Hierophant (Templar)",
        viewedAt: "2026-04-02T06:12:00.000Z",
      },
    ]);
    expect(parseRecentBuilds("{bad json")).toEqual([]);
  });

  it("deduplicates by build id and caps the recent history size", () => {
    const existingEntries = Array.from({ length: MAX_RECENT_BUILDS }, (_, index) => ({
      dps: `${index}`,
      ehp: `${index}`,
      id: `build-${index}`,
      level: 90 + index,
      patchVersion: "3.28 Mirage",
      title: `Build ${index}`,
      viewedAt: `2026-04-02T06:${String(index).padStart(2, "0")}:00.000Z`,
    }));

    expect(
      mergeRecentBuilds(existingEntries, {
        dps: "123,456",
        ehp: "456,789",
        id: "build-3",
        level: 100,
        patchVersion: "3.29",
        title: "Build 3 Updated",
        viewedAt: "2026-04-03T01:00:00.000Z",
      }),
    ).toEqual([
      {
        dps: "123,456",
        ehp: "456,789",
        id: "build-3",
        level: 100,
        patchVersion: "3.29",
        title: "Build 3 Updated",
        viewedAt: "2026-04-03T01:00:00.000Z",
      },
      ...existingEntries.filter((entry) => entry.id !== "build-3").slice(0, MAX_RECENT_BUILDS - 1),
    ]);
  });
});
