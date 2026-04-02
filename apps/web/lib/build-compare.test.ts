import { describe, expect, it } from "vitest";

import type { BuildPayload, ItemPayload } from "@pobcodes/shared-types";

import { buildViewerLayoutFixture, buildViewerPayloadFixture } from "../test/fixtures/build-viewer-fixture";
import { getInitialBuildViewerSelection } from "./build-viewer-selection";
import { buildBuildComparisonReport } from "./build-compare";

function makeItem(overrides: Partial<ItemPayload> & Pick<ItemPayload, "id" | "raw">): ItemPayload {
  return {
    anointments: [],
    corrupted: false,
    crafted: [],
    crucibleMods: [],
    enchantments: [],
    explicits: [],
    fractured: false,
    fracturedMods: [],
    implicits: [],
    influences: [],
    mirrored: false,
    orderedExplicitMods: undefined,
    rarity: "Rare",
    scourgedMods: [],
    split: false,
    synthesizedMods: [],
    synthesised: false,
    ...overrides,
  };
}

describe("buildBuildComparisonReport", () => {
  it("surfaces high-signal config, gem, anoint, unique, jewel, and tree differences", () => {
    const currentBoots = makeItem({
      id: 2001,
      raw: "Rarity: Unique\nRalakesh's Impatience\nRiveted Boots",
      base: "Riveted Boots",
      explicits: ["Counts as having maximum Endurance Charges"],
      name: "Ralakesh's Impatience",
      rarity: "Unique",
    });
    const targetBoots = makeItem({
      id: 2001,
      raw: "Rarity: Unique\nRalakesh's Impatience\nRiveted Boots",
      base: "Riveted Boots",
      explicits: ["Counts as having maximum Power Charges"],
      name: "Ralakesh's Impatience",
      rarity: "Unique",
    });
    const currentAmulet = makeItem({
      id: 2002,
      raw: "Rarity: Rare\nPandemonium Beads\nAgate Amulet",
      base: "Agate Amulet",
      name: "Pandemonium Beads",
    });
    const targetAmulet = makeItem({
      id: 2002,
      raw: "Rarity: Rare\nPandemonium Beads\nAgate Amulet",
      anointments: ["Tranquility"],
      base: "Agate Amulet",
      name: "Pandemonium Beads",
    });
    const currentWatchersEye = makeItem({
      id: 3001,
      raw: "Rarity: Unique\nWatcher's Eye\nPrismatic Jewel",
      base: "Prismatic Jewel",
      explicits: ["Gain #% of Maximum Mana as Extra Maximum Energy Shield while affected by Clarity"],
      name: "Watcher's Eye",
      rarity: "Unique",
    });
    const targetWatchersEye = makeItem({
      id: 3002,
      raw: "Rarity: Unique\nWatcher's Eye\nPrismatic Jewel",
      base: "Prismatic Jewel",
      explicits: ["Damage Penetrates #% Lightning Resistance while affected by Wrath"],
      name: "Watcher's Eye",
      rarity: "Unique",
    });

    const currentPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      config: {},
      configSets: [
        {
          active: true,
          id: 1,
          inputs: {
            projectileDistance: 20,
          },
          title: "Mapping",
        },
      ],
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            { active: true, itemId: 1001, name: "Weapon 1" },
            { active: true, itemId: 2001, name: "Boots" },
            { active: true, itemId: 2002, name: "Amulet" },
          ],
          title: "Default",
        },
      ],
      items: [buildViewerPayloadFixture.items[0], currentBoots, currentAmulet, currentWatchersEye],
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemArc",
                  level: 20,
                  nameSpec: "Arc",
                  quality: 0,
                  selected: true,
                  skillId: "Arc",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SupportGemLightningPenetration",
                  level: 20,
                  nameSpec: "Lightning Penetration Support",
                  quality: 20,
                  selected: false,
                  skillId: "SupportLightningPenetration",
                  support: true,
                },
              ],
              id: "main",
              mainActiveSkill: 1,
              selected: true,
              slot: "Weapon 1",
            },
            {
              enabled: true,
              gems: [
                {
                  enabled: false,
                  gemId: "Metadata/Items/Gems/SupportGemAddedLightningDamagePlus",
                  level: 5,
                  nameSpec: "Awakened Added Lightning Damage Support",
                  quality: 20,
                  selected: false,
                  skillId: "SupportAddedLightningDamagePlus",
                  support: true,
                },
              ],
              id: "disabled-upgrade",
              mainActiveSkill: 1,
              selected: true,
              slot: "Helmet",
            },
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SupportGemAddedLightningDamagePlus",
                  level: 5,
                  nameSpec: "Awakened Added Lightning Damage Support",
                  quality: 20,
                  selected: false,
                  skillId: "SupportAddedLightningDamagePlus",
                  support: true,
                },
              ],
              id: "swap-upgrade",
              mainActiveSkill: 1,
              selected: true,
              slot: "Weapon 1 Swap",
            },
          ],
          id: 1,
          title: "Mapping",
        },
      ],
      treeSpecs: [
        {
          ...buildViewerPayloadFixture.treeSpecs[0],
          active: true,
          masteryEffects: [],
          nodes: [6, 33, 37],
          sockets: [{ itemId: 3001, nodeId: 7001 }],
        },
      ],
    };

    const targetPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      config: {},
      configSets: [
        {
          active: true,
          id: 1,
          inputs: {
            conditionEnemyShocked: true,
            projectileDistance: 40,
            usePowerCharges: true,
          },
          title: "Bossing",
        },
      ],
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            { active: true, itemId: 1002, name: "Weapon 1" },
            { active: true, itemId: 2001, name: "Boots" },
            { active: true, itemId: 2002, name: "Amulet" },
          ],
          title: "Default",
        },
      ],
      items: [buildViewerPayloadFixture.items[1], targetBoots, targetAmulet, targetWatchersEye],
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemArc",
                  level: 21,
                  nameSpec: "Arc",
                  quality: 20,
                  selected: true,
                  skillId: "Arc",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SupportGemLightningPenetration",
                  level: 20,
                  nameSpec: "Lightning Penetration Support",
                  quality: 20,
                  selected: false,
                  skillId: "SupportLightningPenetration",
                  support: true,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SupportGemAddedLightningDamagePlus",
                  level: 5,
                  nameSpec: "Awakened Added Lightning Damage Support",
                  quality: 20,
                  selected: false,
                  skillId: "SupportAddedLightningDamagePlus",
                  support: true,
                },
              ],
              id: "main",
              mainActiveSkill: 1,
              selected: true,
              slot: "Weapon 1",
            },
          ],
          id: 1,
          title: "Bossing",
        },
      ],
      treeSpecs: [
        {
          ...buildViewerPayloadFixture.treeSpecs[0],
          active: true,
          masteryEffects: [[1001, 1]],
          nodes: [6, 33, 37, 1000, 1001],
          sockets: [{ itemId: 3002, nodeId: 7001 }],
        },
      ],
    };

    const keystoneNode = {
      ...buildViewerLayoutFixture.nodes[2],
      id: 1000,
      isKeystone: true,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Chaos Inoculation",
      out: [],
      reminderText: [],
      stats: ["Maximum Life becomes 1", "Immune to Chaos Damage"],
      x: 120,
      y: 120,
    };
    const masteryNode = {
      ...buildViewerLayoutFixture.nodes[1],
      id: 1001,
      isKeystone: false,
      isMastery: true,
      isNotable: false,
      masteryEffects: [
        {
          effect: 1,
          reminderText: [],
          stats: ["+1 to Maximum Power Charges"],
        },
      ],
      name: "Lightning Mastery",
      out: [],
      reminderText: [],
      stats: [],
      x: 150,
      y: 120,
    };

    const currentTree: NonNullable<Parameters<typeof buildBuildComparisonReport>[4]> = {
      nodeIndex: new Map(buildViewerLayoutFixture.nodes.map((node) => [node.id, node])),
      spec: currentPayload.treeSpecs[0],
    };
    const targetTree: NonNullable<Parameters<typeof buildBuildComparisonReport>[5]> = {
      nodeIndex: new Map(
        [...buildViewerLayoutFixture.nodes, keystoneNode, masteryNode].map((node) => [node.id, node]),
      ),
      spec: targetPayload.treeSpecs[0],
    };

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
      currentTree,
      targetTree,
    );

    expect(report.targetSummary).toContain("Templar / Hierophant");

    const titles = report.findings.map((finding) => finding.title);
    expect(titles).toEqual([
      "Configurations",
      "Missing Support Gems",
      "Gem Levels and Quality",
      "Items",
      "Anointments",
      "Unique Item Variants",
      "Passive Tree",
    ]);

    expect(report.findings.find((finding) => finding.key === "configs")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: "Disabled",
          name: "[For Effective DPS] Is the enemy Shocked",
          targetValue: "Enabled",
        }),
        expect.objectContaining({
          currentValue: "20",
          name: "[For Effective DPS] Projectile travel distance",
          targetValue: "Default",
        }),
        expect.objectContaining({
          currentValue: "Disabled",
          name: "[When In Combat] Do you use Power Charges",
          targetValue: "Enabled",
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "missing-support-gems")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: "Missing",
          name: "Arc --> Awakened Added Lightning Damage",
          targetValue: "5/20",
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "gem-progress")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: "20/0",
          name: "Arc",
          targetValue: "21/20",
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "items")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: expect.stringContaining("Tempest Hold"),
          highlight: true,
          name: "Weapon 1",
          targetValue: expect.stringContaining("Storm Whisper"),
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "anoints")?.rows).toContainEqual(
      expect.objectContaining({
        currentValue: "None",
        name: "Amulet",
        targetValue: "Tranquility",
      }),
    );
    expect(report.findings.find((finding) => finding.key === "unique-variants")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Ralakesh's Impatience (Boots)",
        }),
        expect.objectContaining({
          name: "Watcher's Eye",
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "tree")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: "Missing",
          name: "Keystone: Chaos Inoculation",
          targetValue: "Allocated",
        }),
        expect.objectContaining({
          currentValue: "Missing",
          name: "Mastery: Lightning Mastery: +1 to Maximum Power Charges",
          targetValue: "Allocated",
        }),
      ]),
    );
  });

  it("shows synthesized and corrupted implicits inside item variant comparisons", () => {
    const currentBody = makeItem({
      id: 4001,
      raw: "Rarity: Unique\nSkin of the Lords\nSimple Robe",
      base: "Simple Robe",
      corrupted: true,
      implicits: ["+1 to Level of Socketed Gems"],
      name: "Skin of the Lords",
      rarity: "Unique",
      synthesizedMods: ["+12% to all Elemental Resistances"],
    });
    const targetBody = makeItem({
      id: 4001,
      raw: "Rarity: Unique\nSkin of the Lords\nSimple Robe",
      base: "Simple Robe",
      corrupted: true,
      implicits: ["+2 to Level of Socketed Gems"],
      name: "Skin of the Lords",
      rarity: "Unique",
      synthesizedMods: ["+15% to all Elemental Resistances"],
    });

    const currentPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [{ active: true, itemId: 4001, name: "Body Armour" }],
          title: "Current",
        },
      ],
      items: [currentBody],
    };

    const targetPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [{ active: true, itemId: 4001, name: "Body Armour" }],
          title: "Target",
        },
      ],
      items: [targetBody],
    };

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "unique-variants")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: expect.stringMatching(
            /Synthesized and Corrupted Implicits[\s\S]*\+12% to all Elemental Resistances[\s\S]*\+1 to Level of Socketed Gems[\s\S]*Flags[\s\S]*Corrupted/,
          ),
          highlight: true,
          name: "Skin of the Lords (Body Armour)",
          targetValue: expect.stringMatching(
            /Synthesized and Corrupted Implicits[\s\S]*\+15% to all Elemental Resistances[\s\S]*\+2 to Level of Socketed Gems/,
          ),
        }),
      ]),
    );
  });

  it("hides enemy stat rows when the compared build only exports PoB default boss values", () => {
    const currentPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      config: {},
      configSets: [
        {
          active: true,
          id: 1,
          inputs: {},
          title: "Current",
        },
      ],
    };

    const targetPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      config: {},
      configSets: [
        {
          active: true,
          id: 1,
          inputs: {
            enemyChaosResist: 30,
            enemyColdResist: 50,
            enemyFireResist: 50,
            enemyIsBoss: "Guardian/Pinnacle Boss",
            enemyLevel: 84,
            enemyLightningResist: 50,
          },
          title: "Target",
        },
      ],
    };

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "configs")).toBeUndefined();
  });

  it("maps supports only to the compatible skill gems they can support", () => {
    const currentPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      config: {},
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemProjectileWeakness",
                  level: 19,
                  nameSpec: "Sniper's Mark",
                  quality: 0,
                  selected: true,
                  skillId: "ProjectileWeakness",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemSteelskin",
                  level: 20,
                  nameSpec: "Steelskin",
                  quality: 0,
                  selected: false,
                  skillId: "QuickGuard",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SupportGemLifetap",
                  level: 19,
                  nameSpec: "Lifetap Support",
                  quality: 0,
                  selected: false,
                  skillId: "SupportLifetap",
                  support: true,
                },
              ],
              id: "gloves",
              mainActiveSkill: 1,
              selected: true,
              slot: "Gloves",
            },
          ],
          id: 1,
          title: "Current",
        },
      ],
    };

    const targetPayload: BuildPayload = {
      ...currentPayload,
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemProjectileWeakness",
                  level: 20,
                  nameSpec: "Sniper's Mark",
                  quality: 20,
                  selected: true,
                  skillId: "ProjectileWeakness",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemSteelskin",
                  level: 20,
                  nameSpec: "Steelskin",
                  quality: 20,
                  selected: false,
                  skillId: "QuickGuard",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SupportGemLifetap",
                  level: 20,
                  nameSpec: "Lifetap Support",
                  quality: 20,
                  selected: false,
                  skillId: "SupportLifetap",
                  support: true,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SupportGemMarkOnHit",
                  level: 18,
                  nameSpec: "Mark On Hit Support",
                  quality: 20,
                  selected: false,
                  skillId: "SupportMarkOnHit",
                  support: true,
                },
              ],
              id: "gloves",
              mainActiveSkill: 1,
              selected: true,
              slot: "Gloves",
            },
          ],
          id: 1,
          title: "Target",
        },
      ],
    };

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "missing-support-gems")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: "Missing",
          name: "Sniper's Mark --> Mark On Hit",
          targetValue: "18/20",
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "missing-support-gems")?.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Steelskin --> Mark On Hit",
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "gem-progress")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: "19/0",
          name: "Lifetap",
          targetValue: "20/20",
        }),
      ]),
    );
  });

  it("surfaces missing skill gems and only maps supports to compatible reserved skills", () => {
    const currentPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      config: {},
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemFrostblink",
                  level: 20,
                  nameSpec: "Frostblink",
                  quality: 20,
                  selected: true,
                  skillId: "Frostblink",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SupportGemArrogance",
                  level: 20,
                  nameSpec: "Arrogance Support",
                  quality: 20,
                  selected: false,
                  skillId: "SupportArrogance",
                  support: true,
                },
              ],
              id: "boots",
              mainActiveSkill: 1,
              selected: true,
              slot: "Boots",
            },
          ],
          id: 1,
          title: "Current",
        },
      ],
    };

    const targetPayload: BuildPayload = {
      ...currentPayload,
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemFrostblink",
                  level: 20,
                  nameSpec: "Frostblink",
                  quality: 20,
                  selected: true,
                  skillId: "Frostblink",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemPrecision",
                  level: 20,
                  nameSpec: "Precision",
                  quality: 20,
                  selected: false,
                  skillId: "Precision",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SupportGemArrogance",
                  level: 20,
                  nameSpec: "Arrogance Support",
                  quality: 20,
                  selected: false,
                  skillId: "SupportArrogance",
                  support: true,
                },
              ],
              id: "boots",
              mainActiveSkill: 1,
              selected: true,
              slot: "Boots",
            },
          ],
          id: 1,
          title: "Target",
        },
      ],
    };

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "missing-skill-gems")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: "Missing",
          name: "Precision",
          targetValue: "20/20",
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "missing-support-gems")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: "Missing",
          name: "Precision --> Arrogance",
          targetValue: "20/20",
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "missing-support-gems")?.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Frostblink --> Arrogance",
        }),
      ]),
    );
  });
});
