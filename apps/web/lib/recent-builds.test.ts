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
            energyShield: "2,468",
            guardAnnotation: "w/Guard",
            id: "abc123",
            level: 100,
            life: "5,432",
            mana: "876",
            nickname: "Bossing Setup",
            patchVersion: "3.28",
            pinned: true,
            resistances: "80%/75%/75%/33%",
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
        energyShield: "2,468",
        guardAnnotation: "w/Guard",
        id: "abc123",
        level: 100,
        life: "5,432",
        mana: "876",
        nickname: "Bossing Setup",
        patchVersion: "3.28 Mirage",
        pinned: true,
        resistances: "80%/75%/75%/33%",
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
        energyShield: undefined,
        guardAnnotation: undefined,
        id: "build-3",
        level: 100,
        life: undefined,
        mana: undefined,
        nickname: undefined,
        patchVersion: "3.29",
        pinned: false,
        resistances: undefined,
        title: "Build 3 Updated",
        viewedAt: "2026-04-03T01:00:00.000Z",
      },
      ...existingEntries
        .filter((entry) => entry.id !== "build-3")
        .slice(0, MAX_RECENT_BUILDS - 1)
        .map((entry) => ({
          ...entry,
          energyShield: undefined,
          guardAnnotation: undefined,
          life: undefined,
          mana: undefined,
          nickname: undefined,
          pinned: false,
          resistances: undefined,
        })),
    ]);
  });

  it("preserves pin and nickname state when a build is re-recorded", () => {
    expect(
      mergeRecentBuilds(
        [
          {
            dps: "3,000,000",
            ehp: "120,000",
            energyShield: "1,500",
            guardAnnotation: "w/o Guard",
            id: "demo-build",
            level: 97,
            life: "4,500",
            mana: "820",
            nickname: "Mapping Setup",
            patchVersion: "3.28",
            pinned: true,
            resistances: "75%/75%/75%/20%",
            title: "Arc / Hierophant (Templar)",
            viewedAt: "2026-04-02T06:12:00.000Z",
          },
        ],
        {
          dps: "4,000,000",
          ehp: "125,000",
          id: "demo-build",
          level: 98,
          patchVersion: "3.28",
          title: "Arc / Hierophant (Templar)",
          viewedAt: "2026-04-03T01:00:00.000Z",
        },
      ),
    ).toEqual([
      {
        dps: "4,000,000",
        ehp: "125,000",
        energyShield: undefined,
        guardAnnotation: undefined,
        id: "demo-build",
        level: 98,
        life: undefined,
        mana: undefined,
        nickname: "Mapping Setup",
        patchVersion: "3.28 Mirage",
        pinned: true,
        resistances: undefined,
        title: "Arc / Hierophant (Templar)",
        viewedAt: "2026-04-03T01:00:00.000Z",
      },
    ]);
  });
});
