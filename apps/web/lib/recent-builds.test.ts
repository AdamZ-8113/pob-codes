import { describe, expect, it } from "vitest";

import { MAX_RECENT_BUILDS, mergeRecentBuilds, parseRecentBuilds } from "./recent-builds";

describe("recent-builds helpers", () => {
  it("parses only valid recent build entries", () => {
    expect(
      parseRecentBuilds(
        JSON.stringify([
          {
            id: "abc123",
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
        id: "abc123",
        title: "Arc / Hierophant (Templar)",
        viewedAt: "2026-04-02T06:12:00.000Z",
      },
    ]);
    expect(parseRecentBuilds("{bad json")).toEqual([]);
  });

  it("deduplicates by build id and caps the recent history size", () => {
    const existingEntries = Array.from({ length: MAX_RECENT_BUILDS }, (_, index) => ({
      id: `build-${index}`,
      title: `Build ${index}`,
      viewedAt: `2026-04-02T06:${String(index).padStart(2, "0")}:00.000Z`,
    }));

    expect(
      mergeRecentBuilds(existingEntries, {
        id: "build-3",
        title: "Build 3 Updated",
        viewedAt: "2026-04-03T01:00:00.000Z",
      }),
    ).toEqual([
      {
        id: "build-3",
        title: "Build 3 Updated",
        viewedAt: "2026-04-03T01:00:00.000Z",
      },
      ...existingEntries.filter((entry) => entry.id !== "build-3").slice(0, MAX_RECENT_BUILDS - 1),
    ]);
  });
});
