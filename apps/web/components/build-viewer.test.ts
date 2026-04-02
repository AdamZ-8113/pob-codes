import { describe, expect, it } from "vitest";

import type { BuildPayload } from "@pobcodes/shared-types";

import { buildLoadoutTitle } from "../lib/build-overview";
import { buildViewerPayloadFixture } from "../test/fixtures/build-viewer-fixture";

describe("buildLoadoutTitle", () => {
  it("formats the selected skill first followed by ascendancy and base class", () => {
    expect(buildLoadoutTitle(buildViewerPayloadFixture, 1)).toBe("Arc / Hierophant (Templar)");
    expect(buildLoadoutTitle(buildViewerPayloadFixture, 2)).toBe("Ball Lightning / Hierophant (Templar)");
  });

  it("includes the secondary ascendancy at the end when present", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      build: {
        ...buildViewerPayloadFixture.build,
        ascendClassName: "Inquisitor",
      },
      skillSets: [
        {
          ...buildViewerPayloadFixture.skillSets[0],
          groups: [
            {
              ...buildViewerPayloadFixture.skillSets[0].groups[0],
              gems: [
                {
                  ...buildViewerPayloadFixture.skillSets[0].groups[0].gems[0],
                  gemId: "Metadata/Items/Gems/SkillGemSparkAltX",
                  nameSpec: "Spark of the Nova",
                },
                ...buildViewerPayloadFixture.skillSets[0].groups[0].gems.slice(1),
              ],
            },
          ],
        },
      ],
    };

    expect(buildLoadoutTitle(payload, 1, "Nameless Bloodline")).toBe(
      "Spark of the Nova / Inquisitor (Templar) / Nameless Bloodline",
    );
  });

  it("never uses a support gem as the displayed primary skill", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      skillSets: [
        {
          ...buildViewerPayloadFixture.skillSets[0],
          groups: [
            {
              ...buildViewerPayloadFixture.skillSets[0].groups[0],
              gems: [
                {
                  ...buildViewerPayloadFixture.skillSets[0].groups[0].gems[0],
                  selected: false,
                },
                {
                  ...buildViewerPayloadFixture.skillSets[0].groups[0].gems[1],
                  selected: true,
                },
              ],
              mainActiveSkill: 2,
            },
          ],
        },
      ],
    };

    expect(buildLoadoutTitle(payload, 1)).toBe("Arc / Hierophant (Templar)");
  });
});
