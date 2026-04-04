import { describe, expect, it } from "vitest";

import { buildPlayerMaxHitRowsForDisplay, buildPlayerStatRowsForDisplay } from "./pob-stat-layout";

function buildSkillPayload({
  gemId,
  nameSpec,
  supports = [],
  skillId,
  statValue = "3.21",
  triggerTime,
}: {
  gemId?: string;
  nameSpec: string;
  supports?: string[];
  skillId?: string;
  statValue?: string;
  triggerTime?: string;
}) {
  return {
    activeSkillSetId: 1,
    build: {
      mainSocketGroup: 1,
    },
    skillSets: [
      {
        active: true,
        groups: [
          {
            enabled: true,
            gems: [
              {
                enabled: true,
                gemId,
                level: 20,
                nameSpec,
                quality: 20,
                selected: true,
                skillId,
                support: false,
              },
              ...supports.map((supportName, index) => ({
                enabled: true,
                level: 20,
                nameSpec: supportName,
                quality: 20,
                selected: false,
                support: true,
                gemId: `support:${index}:${supportName}`,
              })),
            ],
            id: "1:0",
            mainActiveSkill: 1,
            selected: false,
          },
        ],
        id: 1,
      },
    ],
    stats: {
      playerRows: [{ stat: "Speed", value: statValue }],
      player: {
        Speed: statValue,
        ...(triggerTime == null ? {} : { TriggerTime: triggerTime }),
      },
      minionRows: [],
      minion: {},
      fullDpsSkills: [],
    },
  } as never;
}

describe("pob-stat-layout", () => {
  it("uses the short lightning max hit label when elemental caps differ", () => {
    const rows = buildPlayerStatRowsForDisplay({
      stats: {
        playerRows: [{ stat: "LightningMaximumHitTaken", value: "35560" }],
        player: {
          LightningMaximumHitTaken: "35560",
          FireMaximumHitTaken: "35560",
          ColdMaximumHitTaken: "43642",
        },
        minionRows: [],
        minion: {},
        fullDpsSkills: [],
      },
    } as never);

    expect(rows[0]?.label).toBe("Lightning Max Hit");
  });

  it("uses the elemental max hit label when all elemental caps are equal", () => {
    const rows = buildPlayerStatRowsForDisplay({
      stats: {
        playerRows: [{ stat: "LightningMaximumHitTaken", value: "35560" }],
        player: {
          LightningMaximumHitTaken: "35560",
          FireMaximumHitTaken: "35560",
          ColdMaximumHitTaken: "35560",
        },
        minionRows: [],
        minion: {},
        fullDpsSkills: [],
      },
    } as never);

    expect(rows[0]?.label).toBe("Elemental Max Hit");
  });

  it("extracts only maximum hit rows in the displayed order", () => {
    const rows = buildPlayerMaxHitRowsForDisplay({
      stats: {
        playerRows: [
          { stat: "Life", value: "4123" },
          { stat: "PhysicalMaximumHitTaken", value: "18976.2" },
          { stat: "FireMaximumHitTaken", value: "35560" },
          { stat: "ColdMaximumHitTaken", value: "43642" },
          { stat: "LightningMaximumHitTaken", value: "35560" },
          { stat: "ChaosMaximumHitTaken", value: "12874" },
        ],
        player: {
          Life: "4123",
          PhysicalMaximumHitTaken: "18976.2",
          FireMaximumHitTaken: "35560",
          ColdMaximumHitTaken: "43642",
          LightningMaximumHitTaken: "35560",
          ChaosMaximumHitTaken: "12874",
        },
        minionRows: [],
        minion: {},
        fullDpsSkills: [],
      },
    } as never);

    expect(rows.map((row) => row.label)).toEqual([
      "Phys Max Hit",
      "Fire Max Hit",
      "Cold Max Hit",
      "Lightning Max Hit",
      "Chaos Max Hit",
    ]);
  });

  it("abbreviates stat requirements as req", () => {
    const rows = buildPlayerStatRowsForDisplay({
      stats: {
        playerRows: [{ stat: "Str", value: "189" }],
        player: {
          ReqStr: "212",
          Str: "189",
        },
        minionRows: [],
        minion: {},
        fullDpsSkills: [],
      },
    } as never);

    expect(rows[0]?.value).toBe("189 (212 req)");
  });

  it("combines current and maximum charge values into one row", () => {
    const rows = buildPlayerStatRowsForDisplay({
      stats: {
        playerRows: [
          { stat: "PowerCharges", value: "5" },
          { stat: "PowerChargesMax", value: "5" },
        ],
        player: {
          PowerCharges: "5",
          PowerChargesMax: "5",
        },
        minionRows: [],
        minion: {},
        fullDpsSkills: [],
      },
    } as never);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      color: "#7070FF",
      label: "Power Charges",
      value: "5/5",
    });
  });

  it("uses PoB sidebar colors for mana and resistance rows", () => {
    const rows = buildPlayerStatRowsForDisplay({
      stats: {
        playerRows: [
          { stat: "ManaRegenRecovery", value: "120.5" },
          { stat: "FireResist", value: "75" },
        ],
        player: {
          ManaRegenRecovery: "120.5",
          FireResist: "75",
        },
        minionRows: [],
        minion: {},
        fullDpsSkills: [],
      },
    } as never);

    expect(rows[0]?.color).toBe("#7070FF");
    expect(rows[1]?.color).toBe("#B97123");
  });

  it("uses the PoB wisp label for MirageDPS when Sacred Wisps Support is active", () => {
    const rows = buildPlayerStatRowsForDisplay({
      activeSkillSetId: 1,
      build: {
        mainSocketGroup: 1,
      },
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
                  nameSpec: "Kinetic Blast",
                  quality: 20,
                  selected: true,
                  support: false,
                },
                {
                  enabled: true,
                  level: 20,
                  nameSpec: "Sacred Wisps Support",
                  quality: 20,
                  selected: false,
                  support: true,
                },
              ],
              id: "1:0",
              mainActiveSkill: 1,
              selected: false,
            },
          ],
          id: 1,
        },
      ],
      stats: {
        playerRows: [{ stat: "MirageDPS", value: "12345.6" }],
        player: {
          MirageDPS: "12345.6",
        },
        minionRows: [],
        minion: {},
        fullDpsSkills: [],
      },
    } as never);

    expect(rows[0]?.label).toBe("Total Wisp DPS");
  });

  it("uses the PoB wisp label for MirageDPS when the imported support gem is named Sacred Wisps", () => {
    const rows = buildPlayerStatRowsForDisplay({
      activeSkillSetId: 1,
      build: {
        mainSocketGroup: 1,
      },
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
                  nameSpec: "Kinetic Blast",
                  quality: 20,
                  selected: true,
                  support: false,
                },
                {
                  enabled: true,
                  level: 20,
                  nameSpec: "Sacred Wisps",
                  quality: 20,
                  selected: false,
                  support: true,
                },
              ],
              id: "1:0",
              mainActiveSkill: 1,
              selected: false,
            },
          ],
          id: 1,
        },
      ],
      stats: {
        playerRows: [{ stat: "MirageDPS", value: "12345.6" }],
        player: {
          MirageDPS: "12345.6",
        },
        minionRows: [],
        minion: {},
        fullDpsSkills: [],
      },
    } as never);

    expect(rows[0]?.label).toBe("Total Wisp DPS");
  });

  it("uses the PoB mirage label for MirageDPS when Mirage Archer Support is active", () => {
    const rows = buildPlayerStatRowsForDisplay({
      activeSkillSetId: 1,
      build: {
        mainSocketGroup: 1,
      },
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
                  nameSpec: "Lightning Arrow",
                  quality: 20,
                  selected: true,
                  support: false,
                },
                {
                  enabled: true,
                  level: 20,
                  nameSpec: "Mirage Archer Support",
                  quality: 20,
                  selected: false,
                  support: true,
                },
              ],
              id: "1:0",
              mainActiveSkill: 1,
              selected: false,
            },
          ],
          id: 1,
        },
      ],
      stats: {
        playerRows: [{ stat: "MirageDPS", value: "12345.6" }],
        player: {
          MirageDPS: "12345.6",
        },
        minionRows: [],
        minion: {},
        fullDpsSkills: [],
      },
    } as never);

    expect(rows[0]?.label).toBe("Total Mirage DPS");
  });

  it("uses Attack Rate for attack skills when TriggerTime is absent", () => {
    const rows = buildPlayerStatRowsForDisplay(
      buildSkillPayload({
        gemId: "Metadata/Items/Gems/SkillGemWhirlingBlades",
        nameSpec: "Whirling Blades",
      }),
    );

    expect(rows[0]?.label).toBe("Attack Rate");
  });

  it("uses Cast Rate for spell skills when TriggerTime is absent", () => {
    const rows = buildPlayerStatRowsForDisplay(
      buildSkillPayload({
        gemId: "Metadata/Items/Gems/SkillGemFireball",
        nameSpec: "Fireball",
      }),
    );

    expect(rows[0]?.label).toBe("Cast Rate");
  });

  it("uses Effective Trigger Rate when TriggerTime is present", () => {
    const rows = buildPlayerStatRowsForDisplay(
      buildSkillPayload({
        gemId: "Metadata/Items/Gems/SkillGemWhirlingBlades",
        nameSpec: "Whirling Blades",
        triggerTime: "0.3",
      }),
    );

    expect(rows[0]?.label).toBe("Effective Trigger Rate");
  });

  it("keeps Cast Rate for Automation-triggered spells even when TriggerTime is present", () => {
    const rows = buildPlayerStatRowsForDisplay(
      buildSkillPayload({
        gemId: "Metadata/Items/Gems/SkillGemFireball",
        nameSpec: "Fireball",
        supports: ["Automation Support"],
        triggerTime: "0.3",
      }),
    );

    expect(rows[0]?.label).toBe("Cast Rate");
  });

  it("keeps Cast Rate when mainActiveSkill points at a support gem in an Automation trigger setup", () => {
    const rows = buildPlayerStatRowsForDisplay({
      activeSkillSetId: 1,
      build: {
        mainSocketGroup: 1,
      },
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
                  level: 20,
                  nameSpec: "Fireball",
                  quality: 20,
                  selected: false,
                  skillId: "Fireball",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemAutomation",
                  level: 20,
                  nameSpec: "Automation Support",
                  quality: 20,
                  selected: false,
                  skillId: "SupportAutomation",
                  support: true,
                },
              ],
              id: "1:0",
              mainActiveSkill: 2,
              selected: false,
            },
          ],
          id: 1,
        },
      ],
      stats: {
        playerRows: [{ stat: "Speed", value: "3.21" }],
        player: {
          Speed: "3.21",
          TriggerTime: "0.3",
        },
        minionRows: [],
        minion: {},
        fullDpsSkills: [],
      },
    } as never);

    expect(rows[0]?.label).toBe("Cast Rate");
  });
});
