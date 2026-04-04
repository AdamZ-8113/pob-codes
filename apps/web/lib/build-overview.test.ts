import { describe, expect, it } from "vitest";

import { buildViewerPayloadFixture } from "../test/fixtures/build-viewer-fixture";
import { buildRecentBuildSnapshot, formatPatchVersionLabel, resolveBuildPatchVersion } from "./build-overview";

describe("build overview helpers", () => {
  it("builds the recent-build snapshot from the active loadout", () => {
    expect(buildRecentBuildSnapshot(buildViewerPayloadFixture)).toEqual({
      dps: "1,815,750",
      ehp: "640,068",
      energyShield: "1,289",
      guardAnnotation: undefined,
      level: 95,
      life: "4,123",
      mana: "938",
      patchVersion: "3.28 Mirage",
      resistances: "75%/75%/75%/12%",
      title: "Arc / Hierophant (Templar)",
    });
  });

  it("falls back to targetVersion when tree versions are unavailable", () => {
    expect(
      resolveBuildPatchVersion({
        ...buildViewerPayloadFixture,
        build: {
          ...buildViewerPayloadFixture.build,
          targetVersion: "3_27_2",
        },
        treeSpecs: buildViewerPayloadFixture.treeSpecs.map((treeSpec) => ({
          ...treeSpec,
          version: undefined,
        })),
      }),
    ).toBe("3.27 Keepers of the Flame");
  });

  it("formats a bare numeric version as a full patch label when a name mapping exists", () => {
    expect(formatPatchVersionLabel("3.28")).toBe("3.28 Mirage");
    expect(formatPatchVersionLabel("3.30")).toBe("3.30");
  });
});
