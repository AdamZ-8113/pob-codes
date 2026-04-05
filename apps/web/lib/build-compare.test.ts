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
      "Support Gem Differences",
      "Gem Levels and Quality",
      "Items",
      "Anointments",
      "Unique Item Mods",
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
          nameDisplay: expect.objectContaining({
            skillNames: ["Arc"],
            supportName: "Awakened Added Lightning Damage",
            type: "support-link-group",
          }),
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
          itemCategory: "unique",
          name: "Boots",
        }),
        expect.objectContaining({
          itemCategory: "regular-jewel",
          name: "Watcher's Eye (Prismatic Jewel)",
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
          currentValue: expect.stringMatching(/Significant roll differences[\s\S]*Implicit: \+1 to Level of Socketed Gems/),
          highlight: true,
          itemCategory: "unique",
          name: "Body Armour",
          targetValue: expect.stringMatching(/Significant roll differences[\s\S]*Implicit: \+2 to Level of Socketed Gems/),
        }),
      ]),
    );
  });

  it("marks compared-build-only item rows so the UI can hide them by default", () => {
    const targetBoots = makeItem({
      id: 5001,
      raw: "Rarity: Rare\nStorm March\nTitan Greaves",
      base: "Titan Greaves",
      name: "Storm March",
    });

    const currentPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [],
          title: "Current",
        },
      ],
      items: [],
    };

    const targetPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [{ active: true, itemId: 5001, name: "Boots" }],
          title: "Target",
        },
      ],
      items: [targetBoots],
    };

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "items")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: "Missing",
          direction: "target-only",
          name: "Boots",
        }),
      ]),
    );
  });

  it("does not duplicate identical name and base lines in item output", () => {
    const currentFlask = makeItem({
      id: 5002,
      raw: "Rarity: Magic\nRationed Iron Flask of Tenaciousness\nRationed Iron Flask of Tenaciousness",
      base: "Rationed Iron Flask of Tenaciousness",
      name: "Rationed Iron Flask of Tenaciousness",
      rarity: "Magic",
    });

    const currentPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [{ active: true, itemId: 5002, name: "Flask 1" }],
          title: "Current",
        },
      ],
      items: [currentFlask],
    };

    const targetPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [],
          title: "Target",
        },
      ],
      items: [],
    };

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "items")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: "Present",
          itemCategory: "flask",
          name: "Iron Flask",
        }),
      ]),
    );
  });

  it("compares tattoos explicitly in passive tree findings", () => {
    const currentPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      treeSpecs: [
        {
          ...buildViewerPayloadFixture.treeSpecs[0],
          active: true,
          overrides: [
            { effect: "+4 to Dexterity", name: "Tattoo of the Ramako Scout", nodeId: 11 },
            { effect: "+4 to Dexterity", name: "Tattoo of the Ramako Scout", nodeId: 12 },
          ],
        },
      ],
    };

    const targetPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      treeSpecs: [
        {
          ...buildViewerPayloadFixture.treeSpecs[0],
          active: true,
          overrides: [
            { effect: "+4 to Dexterity", name: "Tattoo of the Ramako Scout", nodeId: 11 },
            { effect: "+4 to Strength", name: "Tattoo of the Tukohama Warrior", nodeId: 13 },
          ],
        },
      ],
    };

    const currentTree: NonNullable<Parameters<typeof buildBuildComparisonReport>[4]> = {
      nodeIndex: new Map(buildViewerLayoutFixture.nodes.map((node) => [node.id, node])),
      spec: currentPayload.treeSpecs[0],
    };
    const targetTree: NonNullable<Parameters<typeof buildBuildComparisonReport>[5]> = {
      nodeIndex: new Map(buildViewerLayoutFixture.nodes.map((node) => [node.id, node])),
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

    expect(report.findings.find((finding) => finding.key === "tree")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: "Allocated x2",
          name: "Tattoo: Tattoo of the Ramako Scout",
          targetValue: "Allocated",
        }),
        expect.objectContaining({
          currentValue: "Missing",
          name: "Tattoo: Tattoo of the Tukohama Warrior",
          targetValue: "Allocated",
        }),
      ]),
    );
  });

  it("compares runegrafts explicitly in passive tree findings", () => {
    const currentPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      treeSpecs: [
        {
          ...buildViewerPayloadFixture.treeSpecs[0],
          active: true,
          overrides: [
            { effect: "Banner Skills have 20% increased Aura Effect", name: "Runegraft of Rallying", nodeId: 13 },
            { effect: "Banner Skills have 20% increased Aura Effect", name: "Runegraft of Rallying", nodeId: 14 },
          ],
        },
      ],
    };

    const targetPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
      treeSpecs: [
        {
          ...buildViewerPayloadFixture.treeSpecs[0],
          active: true,
          overrides: [
            { effect: "Banner Skills have 20% increased Aura Effect", name: "Runegraft of Rallying", nodeId: 13 },
            { effect: "Auras from your Skills have 8% increased Effect on you", name: "Runegraft of Bellows", nodeId: 15 },
          ],
        },
      ],
    };

    const currentTree: NonNullable<Parameters<typeof buildBuildComparisonReport>[4]> = {
      nodeIndex: new Map(buildViewerLayoutFixture.nodes.map((node) => [node.id, node])),
      spec: currentPayload.treeSpecs[0],
    };
    const targetTree: NonNullable<Parameters<typeof buildBuildComparisonReport>[5]> = {
      nodeIndex: new Map(buildViewerLayoutFixture.nodes.map((node) => [node.id, node])),
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

    expect(report.findings.find((finding) => finding.key === "tree")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: "Allocated x2",
          name: "Runegraft: Runegraft of Rallying",
          targetValue: "Allocated",
        }),
        expect.objectContaining({
          currentValue: "Missing",
          name: "Runegraft: Runegraft of Bellows",
          targetValue: "Allocated",
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
          nameDisplay: expect.objectContaining({
            skillNames: ["Sniper's Mark"],
            supportName: "Mark On Hit",
            type: "support-link-group",
          }),
          targetValue: "18/20",
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "missing-support-gems")?.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameDisplay: expect.objectContaining({
            skillNames: expect.arrayContaining(["Steelskin"]),
            supportName: "Mark On Hit",
          }),
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
          nameDisplay: expect.objectContaining({
            skillNames: ["Precision"],
            supportName: "Arrogance",
            type: "support-link-group",
          }),
          targetValue: "20/20",
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "missing-support-gems")?.rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nameDisplay: expect.objectContaining({
            skillNames: expect.arrayContaining(["Frostblink"]),
            supportName: "Arrogance",
          }),
        }),
      ]),
    );
  });

  it("groups missing support gems by support name and lists all affected skills together", () => {
    const currentPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
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
                  quality: 20,
                  selected: true,
                  skillId: "Arc",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemRighteousFire",
                  level: 20,
                  nameSpec: "Righteous Fire",
                  quality: 20,
                  selected: false,
                  skillId: "RighteousFire",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemRaiseSpectre",
                  level: 20,
                  nameSpec: "Raise Spectre",
                  quality: 20,
                  selected: false,
                  skillId: "RaiseSpectre",
                  support: false,
                },
              ],
              id: "body-armour",
              mainActiveSkill: 1,
              selected: true,
              slot: "Body Armour",
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
                  gemId: "Metadata/Items/Gems/SkillGemArc",
                  level: 20,
                  nameSpec: "Arc",
                  quality: 20,
                  selected: true,
                  skillId: "Arc",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemRighteousFire",
                  level: 20,
                  nameSpec: "Righteous Fire",
                  quality: 20,
                  selected: false,
                  skillId: "RighteousFire",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemRaiseSpectre",
                  level: 20,
                  nameSpec: "Raise Spectre",
                  quality: 20,
                  selected: false,
                  skillId: "RaiseSpectre",
                  support: false,
                },
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SupportGemEmpower",
                  level: 3,
                  nameSpec: "Empower Support",
                  quality: 23,
                  selected: false,
                  skillId: "SupportEmpower",
                  support: true,
                },
              ],
              id: "body-armour",
              mainActiveSkill: 1,
              selected: true,
              slot: "Body Armour",
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

    expect(report.findings.find((finding) => finding.key === "missing-support-gems")?.rows).toEqual([
      expect.objectContaining({
        currentValue: "Missing",
        nameDisplay: {
          skillNames: ["Arc", "Righteous Fire", "Raise Spectre"],
          supportName: "Empower",
          type: "support-link-group",
        },
        targetValue: "3/23",
      }),
    ]);
  });

  it("does not report item-granted skills with skill-id-only payloads as missing", () => {
    const currentPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
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
                  nameSpec: "",
                  quality: 0,
                  selected: true,
                  skillId: "SummonSpectralTiger",
                  support: false,
                },
                {
                  enabled: true,
                  level: 20,
                  nameSpec: "",
                  quality: 0,
                  selected: false,
                  skillId: "SummonElementalRelic",
                  support: false,
                },
              ],
              id: "item-granted-current",
              mainActiveSkill: 1,
              selected: true,
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
                  level: 20,
                  nameSpec: "",
                  quality: 0,
                  selected: true,
                  skillId: "SummonSpectralTiger",
                  support: false,
                },
                {
                  enabled: true,
                  level: 20,
                  nameSpec: "",
                  quality: 0,
                  selected: false,
                  skillId: "SummonElementalRelic",
                  support: false,
                },
              ],
              id: "item-granted-target",
              mainActiveSkill: 1,
              selected: true,
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

    expect(report.findings.find((finding) => finding.key === "missing-skill-gems")).toBeUndefined();
    expect(report.findings.find((finding) => finding.key === "missing-support-gems")).toBeUndefined();
  });

  it("normalizes item-granted skill name casing between nameSpec and skillId fallbacks", () => {
    const currentPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
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
                  nameSpec: "Summon Sentinel of Radiance",
                  quality: 0,
                  selected: true,
                  support: false,
                },
              ],
              id: "sentinel-current",
              mainActiveSkill: 1,
              selected: true,
            },
          ],
          id: 1,
          title: "Current",
        },
      ],
    };

    const targetPayload: BuildPayload = {
      ...buildViewerPayloadFixture,
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
                  nameSpec: "",
                  quality: 0,
                  selected: true,
                  skillId: "SummonSentinelOfRadiance",
                  support: false,
                },
              ],
              id: "sentinel-target",
              mainActiveSkill: 1,
              selected: true,
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

    expect(report.findings.find((finding) => finding.key === "missing-skill-gems")).toBeUndefined();
  });
});
