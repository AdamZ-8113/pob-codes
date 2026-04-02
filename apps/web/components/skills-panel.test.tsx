/* @vitest-environment jsdom */

import React from "react";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BuildPayload } from "@pobcodes/shared-types";

import { buildViewerPayloadFixture } from "../test/fixtures/build-viewer-fixture";
import { SkillsPanel } from "./skills-panel";

describe("SkillsPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("merges multiple socket groups from the same item into one box", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeSkillSetId: 1,
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  level: 20,
                  nameSpec: "Sniper's Mark",
                  quality: 20,
                  selected: true,
                  support: false,
                },
                {
                  enabled: true,
                  level: 20,
                  nameSpec: "Lifetap Support",
                  quality: 20,
                  selected: false,
                  support: true,
                },
              ],
              id: "mark-group",
              mainActiveSkill: 1,
              selected: true,
              slot: "Gloves",
            },
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  level: 20,
                  nameSpec: "Steelskin",
                  quality: 20,
                  selected: true,
                  support: false,
                },
              ],
              id: "guard-group",
              mainActiveSkill: 1,
              selected: true,
              slot: "Gloves",
            },
          ],
          id: 1,
          title: "Mapping",
        },
      ],
    };

    const { container } = render(<SkillsPanel payload={payload} />);
    const cards = Array.from(container.querySelectorAll(".skill-group-card"));
    const names = Array.from(container.querySelectorAll(".gem-name")).map((el) => el.textContent?.trim() ?? "");

    expect(cards).toHaveLength(1);
    expect(names).toEqual(["Sniper's Mark", "Lifetap Support", "Steelskin"]);

    // Support gem should have a connector; active gems should not
    const rows = Array.from(container.querySelectorAll(".gem-row"));
    expect(rows[0].querySelector(".gem-connector")).toBeNull(); // Sniper's Mark — active
    expect(rows[1].querySelector(".gem-connector-last")).not.toBeNull(); // Lifetap — last support
    expect(rows[2].querySelector(".gem-connector")).toBeNull(); // Steelskin — active
  });

  it("renders support gems with middle connector when followed by another support", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeSkillSetId: 1,
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  level: 20,
                  nameSpec: "Hydrosphere",
                  quality: 20,
                  selected: true,
                  support: false,
                },
                {
                  enabled: true,
                  level: 20,
                  nameSpec: "Tornado",
                  quality: 20,
                  selected: false,
                  support: false,
                },
                {
                  enabled: true,
                  level: 20,
                  nameSpec: "Power Charge On Critical Support",
                  quality: 20,
                  selected: false,
                  support: true,
                },
              ],
              id: "shared-support-group",
              mainActiveSkill: 1,
              selected: true,
              slot: "Helmet",
            },
          ],
          id: 1,
          title: "Mapping",
        },
      ],
    };

    const { container } = render(<SkillsPanel payload={payload} />);
    const names = Array.from(container.querySelectorAll(".gem-name")).map((el) => el.textContent?.trim() ?? "");

    expect(names).toEqual(["Hydrosphere", "Tornado", "Power Charge On Critical Support"]);

    const rows = Array.from(container.querySelectorAll(".gem-row"));
    expect(rows[0].querySelector(".gem-connector")).toBeNull(); // Hydrosphere — active
    expect(rows[1].querySelector(".gem-connector")).toBeNull(); // Tornado — active
    expect(rows[2].querySelector(".gem-connector-last")).not.toBeNull(); // PCoCrit — last (only) support
  });
  it("renders the gems panel in two columns with accessories at the bottom of the left column", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeSkillSetId: 1,
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [{ enabled: true, level: 20, nameSpec: "Arc", quality: 20, selected: true, support: false }],
              id: "weapon-main",
              mainActiveSkill: 1,
              selected: true,
              slot: "Weapon 1",
            },
            {
              enabled: true,
              gems: [{ enabled: true, level: 20, nameSpec: "Frostblink", quality: 20, selected: true, support: false }],
              id: "weapon-off",
              mainActiveSkill: 1,
              selected: true,
              slot: "Weapon 2",
            },
            {
              enabled: true,
              gems: [{ enabled: true, level: 20, nameSpec: "Molten Shell", quality: 20, selected: true, support: false }],
              id: "gloves",
              mainActiveSkill: 1,
              selected: true,
              slot: "Gloves",
            },
            {
              enabled: true,
              gems: [{ enabled: true, level: 20, nameSpec: "Precision", quality: 20, selected: true, support: false }],
              id: "amulet",
              mainActiveSkill: 1,
              selected: true,
              slot: "Amulet",
            },
            {
              enabled: true,
              gems: [{ enabled: true, level: 20, nameSpec: "Flame Dash", quality: 20, selected: true, support: false }],
              id: "ring",
              mainActiveSkill: 1,
              selected: true,
              slot: "Ring 1",
            },
            {
              enabled: true,
              gems: [{ enabled: true, level: 20, nameSpec: "Wrath", quality: 20, selected: true, support: false }],
              id: "helmet",
              mainActiveSkill: 1,
              selected: true,
              slot: "Helmet",
            },
            {
              enabled: true,
              gems: [{ enabled: true, level: 20, nameSpec: "Kinetic Blast", quality: 20, selected: true, support: false }],
              id: "body",
              mainActiveSkill: 1,
              selected: true,
              slot: "Body Armour",
            },
            {
              enabled: true,
              gems: [{ enabled: true, level: 20, nameSpec: "Grace", quality: 20, selected: true, support: false }],
              id: "boots",
              mainActiveSkill: 1,
              selected: true,
              slot: "Boots",
            },
          ],
          id: 1,
          title: "Mapping",
        },
      ],
    };

    const { container } = render(<SkillsPanel payload={payload} />);
    const leftSlots = Array.from(container.querySelectorAll(".skills-column-left .skill-group-slot-badge")).map(
      (node) => node.textContent?.trim() ?? "",
    );
    const rightSlots = Array.from(container.querySelectorAll(".skills-column-right .skill-group-slot-badge")).map(
      (node) => node.textContent?.trim() ?? "",
    );

    expect(leftSlots).toEqual(["Weapon 1", "Weapon 2", "Gloves", "Amulet", "Ring 1"]);
    expect(rightSlots).toEqual(["Helmet", "Body Armour", "Boots"]);
  });

  it("hides weapon swap gem groups by default and shows them when enabled", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeSkillSetId: 1,
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [{ enabled: true, level: 20, nameSpec: "Arc", quality: 20, selected: true, support: false }],
              id: "weapon-main",
              mainActiveSkill: 1,
              selected: true,
              slot: "Weapon 1",
            },
            {
              enabled: true,
              gems: [{ enabled: true, level: 20, nameSpec: "Frostblink", quality: 20, selected: true, support: false }],
              id: "weapon-swap",
              mainActiveSkill: 1,
              selected: true,
              slot: "Weapon 1 Swap",
            },
          ],
          id: 1,
          title: "Mapping",
        },
      ],
    };

    const hidden = render(<SkillsPanel payload={payload} />);
    const hiddenSlots = Array.from(hidden.container.querySelectorAll(".skill-group-slot-badge")).map(
      (node) => node.textContent?.trim() ?? "",
    );
    expect(hiddenSlots).toEqual(["Weapon 1"]);
    hidden.unmount();

    const visible = render(<SkillsPanel payload={payload} showWeaponSwap />);
    const visibleSlots = Array.from(visible.container.querySelectorAll(".skill-group-slot-badge")).map(
      (node) => node.textContent?.trim() ?? "",
    );
    expect(visibleSlots).toEqual(["Weapon 1", "Weapon 1 Swap"]);
  });

  it("does not render empty gem cards for groups with no enabled gems", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeSkillSetId: 1,
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [{ enabled: true, level: 20, nameSpec: "Arc", quality: 20, selected: true, support: false }],
              id: "weapon-main",
              mainActiveSkill: 1,
              selected: true,
              slot: "Weapon 1",
            },
            {
              enabled: true,
              gems: [{ enabled: false, level: 20, nameSpec: "Unused Gem", quality: 0, selected: false, support: false }],
              id: "empty-slot",
              mainActiveSkill: 1,
              selected: false,
              slot: "Ring 2",
            },
            {
              enabled: false,
              gems: [{ enabled: true, level: 20, nameSpec: "Also Hidden", quality: 0, selected: false, support: false }],
              id: "disabled-group",
              mainActiveSkill: 1,
              selected: false,
              slot: "Amulet",
            },
          ],
          id: 1,
          title: "Mapping",
        },
      ],
    };

    const { container } = render(<SkillsPanel payload={payload} />);
    const slots = Array.from(container.querySelectorAll(".skill-group-slot-badge")).map(
      (node) => node.textContent?.trim() ?? "",
    );

    expect(slots).toEqual(["Weapon 1"]);
    expect(container.querySelectorAll(".skill-group-card")).toHaveLength(1);
  });

  it("derives a gem name from gemId when nameSpec is blank", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeSkillSetId: 1,
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemFireball",
                  level: 30,
                  nameSpec: "",
                  quality: 0,
                  selected: true,
                  support: false,
                },
              ],
              id: "unnamed-fireball",
              mainActiveSkill: 1,
              selected: true,
            },
          ],
          id: 1,
          title: "Mapping",
        },
      ],
    };

    const { container } = render(<SkillsPanel payload={payload} />);
    const gemNames = Array.from(container.querySelectorAll(".gem-name")).map((node) => node.textContent?.trim() ?? "");
    const gemLevels = Array.from(container.querySelectorAll(".gem-lq")).map((node) => node.textContent?.trim() ?? "");

    expect(gemNames).toEqual(["Fireball"]);
    expect(gemLevels).toEqual(["30/0"]);
  });

  it("shows corrupted gems as corrupted in the tooltip without an inline row badge", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeSkillSetId: 1,
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  corrupted: true,
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemArc",
                  level: 21,
                  nameSpec: "Arc",
                  quality: 20,
                  selected: true,
                  support: false,
                },
                {
                  corrupted: true,
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SupportGemLightningPenetration",
                  level: 20,
                  nameSpec: "Lightning Penetration Support",
                  quality: 20,
                  selected: false,
                  support: true,
                },
              ],
              id: "corrupted-gems",
              mainActiveSkill: 1,
              selected: true,
              slot: "Weapon 1",
            },
          ],
          id: 1,
          title: "Mapping",
        },
      ],
    };

    const { container } = render(<SkillsPanel payload={payload} />);
    const corruptionTags = container.querySelectorAll(".gem-tag--corrupted");
    const tooltipCorruptionLines = container.querySelectorAll(".poe-gem-level-line--corrupted");

    expect(corruptionTags).toHaveLength(0);
    expect(tooltipCorruptionLines).toHaveLength(2);
  });

  it("infers corruption for gems that exceed their non-corrupted max level", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeSkillSetId: 1,
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SupportGemAdditionalXP",
                  level: 4,
                  nameSpec: "Enlighten",
                  quality: 20,
                  selected: false,
                  support: true,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SupportGemAdditionalXP",
                  level: 3,
                  nameSpec: "Enlighten",
                  quality: 20,
                  selected: false,
                  support: true,
                },
              ],
              id: "inferred-corruption-gems",
              mainActiveSkill: 1,
              selected: true,
              slot: "Weapon 1",
            },
          ],
          id: 1,
          title: "Mapping",
        },
      ],
    };

    const { container } = render(<SkillsPanel payload={payload} />);
    const corruptionTags = container.querySelectorAll(".gem-tag--corrupted");
    const tooltipCorruptionLines = container.querySelectorAll(".poe-gem-level-line--corrupted");

    expect(corruptionTags).toHaveLength(0);
    expect(tooltipCorruptionLines).toHaveLength(1);
  });

  it("hides nameless gems when no fallback metadata is available", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeSkillSetId: 1,
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  level: 30,
                  nameSpec: "",
                  quality: 0,
                  selected: true,
                  support: false,
                },
              ],
              id: "unknown-blank-gem",
              mainActiveSkill: 1,
              selected: true,
            },
          ],
          id: 1,
          title: "Mapping",
        },
      ],
    };

    const { container } = render(<SkillsPanel payload={payload} />);

    expect(container.querySelectorAll(".skill-group-card")).toHaveLength(0);
    expect(container.textContent).not.toContain("30/0");
  });

  it("composites active gem sprite art over the gem crystal in the tooltip", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeSkillSetId: 1,
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemHydrosphere",
                  level: 20,
                  nameSpec: "Hydrosphere",
                  quality: 20,
                  selected: true,
                  support: false,
                },
              ],
              id: "hydrosphere",
              mainActiveSkill: 1,
              selected: true,
              slot: "Weapon 1",
            },
          ],
          id: 1,
          title: "Mapping",
        },
      ],
    };

    const { container } = render(<SkillsPanel payload={payload} />);
    expect(container.querySelectorAll(".poe-gem-icon-sprite-base")).toHaveLength(1);
    expect(container.querySelectorAll(".poe-gem-icon-sprite-overlay")).toHaveLength(1);
  });

  it("renders gem tooltip stat lines with duplicate stat keys without React key warnings", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeSkillSetId: 1,
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemFrostBoltNova",
                  level: 20,
                  nameSpec: "Vortex of Projection",
                  quality: 20,
                  selected: true,
                  support: false,
                },
              ],
              id: "duplicate-stat-keys",
              mainActiveSkill: 1,
              selected: true,
              slot: "Weapon 1",
            },
          ],
          id: 1,
          title: "Mapping",
        },
      ],
    };

    const { container } = render(<SkillsPanel payload={payload} />);
    expect(container.querySelectorAll(".poe-gem-stat-line").length).toBeGreaterThan(0);
    expect(
      consoleErrorSpy.mock.calls.some(([message]) =>
        String(message).includes("Encountered two children with the same key"),
      ),
    ).toBe(false);
  });
});
