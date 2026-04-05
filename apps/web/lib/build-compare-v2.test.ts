import { describe, expect, it } from "vitest";

import type { BuildPayload, ItemPayload, TreeSocketPayload } from "@pobcodes/shared-types";

import { buildViewerPayloadFixture } from "../test/fixtures/build-viewer-fixture";
import { getInitialBuildViewerSelection } from "./build-viewer-selection";
import { buildBuildComparisonReport } from "./build-compare-v2";

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

function makePayload(args: {
  items: ItemPayload[];
  sockets?: TreeSocketPayload[];
  slots: Array<{ itemId: number; name: string }>;
}): BuildPayload {
  return {
    ...buildViewerPayloadFixture,
    itemSets: [
      {
        active: true,
        id: 1,
        slots: args.slots.map((slot) => ({ active: true, ...slot })),
        title: "Compare",
      },
    ],
    items: args.items,
    treeSpecs: [
      {
        ...buildViewerPayloadFixture.treeSpecs[0],
        active: true,
        overrides: [],
        sockets: args.sockets ?? [],
      },
    ],
  };
}

describe("buildBuildComparisonReport v2", () => {
  it("matches reordered flasks and same-base jewels before reporting differences", () => {
    const quicksilver = makeItem({
      id: 1001,
      base: "Quicksilver Flask",
      name: "Chemist's Quicksilver Flask of Adrenaline",
      rarity: "Magic",
      raw: "Rarity: Magic\nChemist's Quicksilver Flask of Adrenaline\nQuicksilver Flask",
    });
    const granite = makeItem({
      id: 1002,
      base: "Granite Flask",
      name: "Granite Flask of the Armadillo",
      rarity: "Magic",
      raw: "Rarity: Magic\nGranite Flask of the Armadillo\nGranite Flask",
    });
    const fireResJewel = makeItem({
      id: 2001,
      base: "Cobalt Jewel",
      explicits: ["+48% to Fire Resistance"],
      raw: "Rarity: Rare\nCobalt Jewel",
    });
    const spellDamageJewel = makeItem({
      id: 2002,
      base: "Cobalt Jewel",
      explicits: ["14% increased Spell Damage"],
      raw: "Rarity: Rare\nCobalt Jewel",
    });
    const targetFireResJewel = makeItem({
      id: 2003,
      base: "Cobalt Jewel",
      explicits: ["+30% to Fire Resistance"],
      raw: "Rarity: Rare\nCobalt Jewel",
    });
    const targetSpellDamageJewel = makeItem({
      id: 2004,
      base: "Cobalt Jewel",
      explicits: ["14% increased Spell Damage"],
      raw: "Rarity: Rare\nCobalt Jewel",
    });

    const currentPayload = makePayload({
      items: [quicksilver, granite, fireResJewel, spellDamageJewel],
      slots: [
        { itemId: 1001, name: "Flask 1" },
        { itemId: 1002, name: "Flask 2" },
      ],
      sockets: [
        { itemId: 2001, nodeId: 100 },
        { itemId: 2002, nodeId: 101 },
      ],
    });
    const targetPayload = makePayload({
      items: [quicksilver, granite, targetFireResJewel, targetSpellDamageJewel],
      slots: [
        { itemId: 1002, name: "Flask 1" },
        { itemId: 1001, name: "Flask 2" },
      ],
      sockets: [
        { itemId: 2004, nodeId: 100 },
        { itemId: 2003, nodeId: 101 },
      ],
    });

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "items")).toBeUndefined();
    const rareFinding = report.findings.find((finding) => finding.key === "rare-item-mods");
    expect(rareFinding?.rows).toHaveLength(1);
    expect(rareFinding?.rows[0]).toEqual(
      expect.objectContaining({
        currentValue: expect.stringContaining("Explicit: +48% to Fire Resistance"),
        targetValue: expect.stringContaining("Explicit: +30% to Fire Resistance"),
      }),
    );
  });

  it("matches magic flasks by base instead of full item name", () => {
    const currentIronOne = makeItem({
      id: 1101,
      base: "Rationed Iron Flask of Tenaciousness",
      name: "Rationed Iron Flask of Tenaciousness",
      rarity: "Magic",
      raw: "Rarity: Magic\nRationed Iron Flask of Tenaciousness\nRationed Iron Flask of Tenaciousness",
    });
    const currentIronTwo = makeItem({
      id: 1102,
      base: "Alchemist's Iron Flask of Runeblazing",
      name: "Alchemist's Iron Flask of Runeblazing",
      rarity: "Magic",
      raw: "Rarity: Magic\nAlchemist's Iron Flask of Runeblazing\nAlchemist's Iron Flask of Runeblazing",
    });
    const targetIronOne = makeItem({
      id: 1103,
      base: "Experimenter's Iron Flask of the Bear",
      name: "Experimenter's Iron Flask of the Bear",
      rarity: "Magic",
      raw: "Rarity: Magic\nExperimenter's Iron Flask of the Bear\nExperimenter's Iron Flask of the Bear",
    });
    const targetIronTwo = makeItem({
      id: 1104,
      base: "Chemist's Iron Flask of the Lizard",
      name: "Chemist's Iron Flask of the Lizard",
      rarity: "Magic",
      raw: "Rarity: Magic\nChemist's Iron Flask of the Lizard\nChemist's Iron Flask of the Lizard",
    });

    const currentPayload = makePayload({
      items: [currentIronOne, currentIronTwo],
      slots: [
        { itemId: 1101, name: "Flask 1" },
        { itemId: 1102, name: "Flask 2" },
      ],
    });
    const targetPayload = makePayload({
      items: [targetIronOne, targetIronTwo],
      slots: [
        { itemId: 1103, name: "Flask 1" },
        { itemId: 1104, name: "Flask 2" },
      ],
    });

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "items")).toBeUndefined();
  });

  it("ignores unique roll-only differences but reports different unique mod templates", () => {
    const currentBoots = makeItem({
      id: 3001,
      base: "Riveted Boots",
      explicits: ["+25 to Intelligence", "Counts as having maximum Endurance Charges"],
      name: "Ralakesh's Impatience",
      rarity: "Unique",
      raw: "Rarity: Unique\nRalakesh's Impatience\nRiveted Boots",
    });
    const targetBoots = makeItem({
      id: 3002,
      base: "Riveted Boots",
      explicits: ["+21 to Intelligence", "Counts as having maximum Endurance Charges"],
      name: "Ralakesh's Impatience",
      rarity: "Unique",
      raw: "Rarity: Unique\nRalakesh's Impatience\nRiveted Boots",
    });
    const currentWatchersEye = makeItem({
      id: 3101,
      base: "Prismatic Jewel",
      explicits: ["Gain #% of Maximum Mana as Extra Maximum Energy Shield while affected by Clarity"],
      name: "Watcher's Eye",
      rarity: "Unique",
      raw: "Rarity: Unique\nWatcher's Eye\nPrismatic Jewel",
    });
    const targetWatchersEye = makeItem({
      id: 3102,
      base: "Prismatic Jewel",
      explicits: ["Damage Penetrates #% Lightning Resistance while affected by Wrath"],
      name: "Watcher's Eye",
      rarity: "Unique",
      raw: "Rarity: Unique\nWatcher's Eye\nPrismatic Jewel",
    });

    const currentPayload = makePayload({
      items: [currentBoots, currentWatchersEye],
      slots: [{ itemId: 3001, name: "Boots" }],
      sockets: [{ itemId: 3101, nodeId: 200 }],
    });
    const targetPayload = makePayload({
      items: [targetBoots, targetWatchersEye],
      slots: [{ itemId: 3002, name: "Boots" }],
      sockets: [{ itemId: 3102, nodeId: 200 }],
    });

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    const uniqueFinding = report.findings.find((finding) => finding.key === "unique-variants");
    expect(uniqueFinding?.rows).toHaveLength(1);
    expect(uniqueFinding?.rows[0]).toEqual(
      expect.objectContaining({
        currentValue: expect.stringContaining("Clarity"),
        itemCategory: "regular-jewel",
        name: "Watcher's Eye (Prismatic Jewel)",
        targetValue: expect.stringContaining("Wrath"),
      }),
    );
  });

  it("reports large unique roll differences above the 20% threshold", () => {
    const currentBoots = makeItem({
      id: 3201,
      base: "Riveted Boots",
      explicits: ["+25 to Intelligence", "Counts as having maximum Endurance Charges"],
      name: "Ralakesh's Impatience",
      rarity: "Unique",
      raw: "Rarity: Unique\nRalakesh's Impatience\nRiveted Boots",
    });
    const targetBoots = makeItem({
      id: 3202,
      base: "Riveted Boots",
      explicits: ["+15 to Intelligence", "Counts as having maximum Endurance Charges"],
      name: "Ralakesh's Impatience",
      rarity: "Unique",
      raw: "Rarity: Unique\nRalakesh's Impatience\nRiveted Boots",
    });

    const currentPayload = makePayload({
      items: [currentBoots],
      slots: [{ itemId: 3201, name: "Boots" }],
    });
    const targetPayload = makePayload({
      items: [targetBoots],
      slots: [{ itemId: 3202, name: "Boots" }],
    });

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "unique-variants")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: expect.stringContaining("Significant roll differences"),
          itemCategory: "unique",
          name: "Boots",
          targetValue: expect.stringContaining("Significant roll differences"),
        }),
      ]),
    );
  });

  it("ignores small rare roll differences and reports missing rare mods on the same base", () => {
    const currentBody = makeItem({
      id: 4001,
      base: "Saintly Chainmail",
      explicits: ["+60 to maximum Life", "+36% to Fire Resistance"],
      name: "Saint Shell",
      raw: "Rarity: Rare\nSaint Shell\nSaintly Chainmail",
    });
    const targetBody = makeItem({
      id: 4002,
      base: "Saintly Chainmail",
      explicits: ["+60 to maximum Life", "+40% to Fire Resistance"],
      name: "Cataclysm Mantle",
      raw: "Rarity: Rare\nCataclysm Mantle\nSaintly Chainmail",
    });
    const currentGloves = makeItem({
      id: 4011,
      base: "Slink Gloves",
      explicits: ["+70 to maximum Life"],
      name: "Rapture Nail",
      raw: "Rarity: Rare\nRapture Nail\nSlink Gloves",
    });
    const targetGloves = makeItem({
      id: 4012,
      base: "Slink Gloves",
      explicits: ["+70 to maximum Life", "+30% to Cold Resistance"],
      name: "Apocalypse Hand",
      raw: "Rarity: Rare\nApocalypse Hand\nSlink Gloves",
    });

    const currentPayload = makePayload({
      items: [currentBody, currentGloves],
      slots: [
        { itemId: 4001, name: "Body Armour" },
        { itemId: 4011, name: "Gloves" },
      ],
    });
    const targetPayload = makePayload({
      items: [targetBody, targetGloves],
      slots: [
        { itemId: 4002, name: "Body Armour" },
        { itemId: 4012, name: "Gloves" },
      ],
    });

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "items")).toBeUndefined();
    const rareFinding = report.findings.find((finding) => finding.key === "rare-item-mods");
    expect(rareFinding?.rows).toHaveLength(1);
    expect(rareFinding?.rows[0]).toEqual(
      expect.objectContaining({
        currentValue: "None",
        direction: "target-only",
        name: "Gloves",
        targetValue: expect.stringContaining("Explicit: +30% to Cold Resistance"),
      }),
    );
  });

  it("does not duplicate identical name and base lines in v2 item output", () => {
    const currentFlask = makeItem({
      id: 5001,
      base: "Bottomless Quicksilver Flask of the Cheetah",
      name: "Bottomless Quicksilver Flask of the Cheetah",
      rarity: "Magic",
      implicits: ["Restores Ward on use"],
      raw: "Rarity: Magic\nBottomless Quicksilver Flask of the Cheetah\nBottomless Quicksilver Flask of the Cheetah",
    });

    const currentPayload = makePayload({
      items: [currentFlask],
      slots: [{ itemId: 5001, name: "Flask 1" }],
    });
    const targetPayload = makePayload({
      items: [],
      slots: [],
    });

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
          name: "Quicksilver Flask",
        }),
      ]),
    );
  });

  it("reports same-base flask modifier differences above the 20% threshold", () => {
    const currentMagicFlask = makeItem({
      id: 5051,
      base: "Quicksilver Flask",
      explicits: ["25% increased effect"],
      name: "Chemist's Quicksilver Flask of Adrenaline",
      rarity: "Magic",
      raw: "Rarity: Magic\nChemist's Quicksilver Flask of Adrenaline\nQuicksilver Flask",
    });
    const targetMagicFlask = makeItem({
      id: 5052,
      base: "Quicksilver Flask",
      explicits: ["18% increased effect"],
      name: "Experimenter's Quicksilver Flask of the Cheetah",
      rarity: "Magic",
      raw: "Rarity: Magic\nExperimenter's Quicksilver Flask of the Cheetah\nQuicksilver Flask",
    });
    const currentUniqueFlask = makeItem({
      id: 5053,
      base: "Bismuth Flask",
      explicits: ["10% reduced Charges per use", "20% increased effect"],
      name: "Oriath's End",
      rarity: "Unique",
      raw: "Rarity: Unique\nOriath's End\nBismuth Flask",
    });
    const targetUniqueFlask = makeItem({
      id: 5054,
      base: "Bismuth Flask",
      explicits: ["10% reduced Charges per use", "15% increased effect"],
      name: "Oriath's End",
      rarity: "Unique",
      raw: "Rarity: Unique\nOriath's End\nBismuth Flask",
    });

    const currentPayload = makePayload({
      items: [currentMagicFlask, currentUniqueFlask],
      slots: [
        { itemId: 5051, name: "Flask 1" },
        { itemId: 5053, name: "Flask 2" },
      ],
    });
    const targetPayload = makePayload({
      items: [targetMagicFlask, targetUniqueFlask],
      slots: [
        { itemId: 5052, name: "Flask 1" },
        { itemId: 5054, name: "Flask 2" },
      ],
    });

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "items")).toBeUndefined();
    expect(report.findings.find((finding) => finding.key === "magic-flask-mods")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: expect.stringContaining("Significant roll differences"),
          itemCategory: "flask",
          name: "Magic Flask Modifier Pool",
          targetValue: expect.stringContaining("Significant roll differences"),
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "unique-variants")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: expect.stringContaining("Significant roll differences"),
          itemCategory: "flask",
          name: "Oriath's End (Bismuth Flask)",
          targetValue: expect.stringContaining("Significant roll differences"),
        }),
      ]),
    );
  });

  it("does not flag magic flask utility mods when they move to another flask base", () => {
    const currentQuicksilver = makeItem({
      id: 5061,
      base: "Quicksilver Flask",
      explicits: ["14% increased Movement Speed during Effect"],
      name: "Chemist's Quicksilver Flask of the Cheetah",
      rarity: "Magic",
      raw: "Rarity: Magic\nChemist's Quicksilver Flask of the Cheetah\nQuicksilver Flask",
    });
    const currentGold = makeItem({
      id: 5062,
      base: "Gold Flask",
      explicits: ["56% reduced Effect of Curses on you during Effect"],
      name: "Gold Flask of the Owl",
      rarity: "Magic",
      raw: "Rarity: Magic\nGold Flask of the Owl\nGold Flask",
    });
    const targetQuicksilver = makeItem({
      id: 5063,
      base: "Quicksilver Flask",
      explicits: ["56% reduced Effect of Curses on you during Effect"],
      name: "Quicksilver Flask of the Owl",
      rarity: "Magic",
      raw: "Rarity: Magic\nQuicksilver Flask of the Owl\nQuicksilver Flask",
    });
    const targetGold = makeItem({
      id: 5064,
      base: "Gold Flask",
      explicits: ["14% increased Movement Speed during Effect"],
      name: "Chemist's Gold Flask of the Cheetah",
      rarity: "Magic",
      raw: "Rarity: Magic\nChemist's Gold Flask of the Cheetah\nGold Flask",
    });

    const currentPayload = makePayload({
      items: [currentQuicksilver, currentGold],
      slots: [
        { itemId: 5061, name: "Flask 1" },
        { itemId: 5062, name: "Flask 2" },
      ],
    });
    const targetPayload = makePayload({
      items: [targetQuicksilver, targetGold],
      slots: [
        { itemId: 5063, name: "Flask 1" },
        { itemId: 5064, name: "Flask 2" },
      ],
    });

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "items")).toBeUndefined();
    expect(report.findings.find((finding) => finding.key === "magic-flask-mods")).toBeUndefined();
  });

  it("treats singular and plural charge flask mods as the same pooled template", () => {
    const currentQuicksilver = makeItem({
      id: 5071,
      base: "Quicksilver Flask",
      explicits: ["Gain 2 Charges when you are Hit by an Enemy"],
      name: "Masochist's Quicksilver Flask of the Kakapo",
      rarity: "Magic",
      raw: "Rarity: Magic\nMasochist's Quicksilver Flask of the Kakapo\nQuicksilver Flask",
    });
    const currentGold = makeItem({
      id: 5072,
      base: "Gold Flask",
      explicits: ["49% increased Critical Strike Chance during Effect"],
      name: "Gold Flask of the Falcon",
      rarity: "Magic",
      raw: "Rarity: Magic\nGold Flask of the Falcon\nGold Flask",
    });
    const targetQuicksilver = makeItem({
      id: 5073,
      base: "Quicksilver Flask",
      explicits: ["39% increased Critical Strike Chance during Effect"],
      name: "Quicksilver Flask of the Falcon",
      rarity: "Magic",
      raw: "Rarity: Magic\nQuicksilver Flask of the Falcon\nQuicksilver Flask",
    });
    const targetGold = makeItem({
      id: 5074,
      base: "Gold Flask",
      explicits: ["Gain 1 Charge when you are Hit by an Enemy"],
      name: "Masochist's Gold Flask of the Owl",
      rarity: "Magic",
      raw: "Rarity: Magic\nMasochist's Gold Flask of the Owl\nGold Flask",
    });

    const currentPayload = makePayload({
      items: [currentQuicksilver, currentGold],
      slots: [
        { itemId: 5071, name: "Flask 1" },
        { itemId: 5072, name: "Flask 2" },
      ],
    });
    const targetPayload = makePayload({
      items: [targetQuicksilver, targetGold],
      slots: [
        { itemId: 5073, name: "Flask 1" },
        { itemId: 5074, name: "Flask 2" },
      ],
    });

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "items")).toBeUndefined();
    expect(report.findings.find((finding) => finding.key === "magic-flask-mods")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: expect.stringContaining("Gain 2 Charges when you are Hit by an Enemy"),
          targetValue: expect.stringContaining("Gain 1 Charge when you are Hit by an Enemy"),
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "magic-flask-mods")?.rows?.[0]?.currentValue).not.toContain(
      "Only in current\n- Explicit: Gain 2 Charges when you are Hit by an Enemy",
    );
  });

  it("does not classify cluster jewels with flask-related text as flasks", () => {
    const currentCluster = makeItem({
      id: 5075,
      base: "Medium Cluster Jewel",
      explicits: [
        "Added Small Passive Skills also grant: 6% increased Flask Effect Duration",
        "1 Added Passive Skill is Fasting",
      ],
      name: "Brewer's Stone",
      raw: "Rarity: Rare\nBrewer's Stone\nMedium Cluster Jewel",
    });
    const targetCluster = makeItem({
      id: 5076,
      base: "Medium Cluster Jewel",
      explicits: [
        "Added Small Passive Skills also grant: 6% increased Flask Effect Duration",
        "1 Added Passive Skill is Spiked Concoction",
      ],
      name: "Brewer's Stone",
      raw: "Rarity: Rare\nBrewer's Stone\nMedium Cluster Jewel",
    });

    const currentPayload = makePayload({
      items: [currentCluster],
      slots: [],
      sockets: [{ itemId: 5075, nodeId: 200 }],
    });
    const targetPayload = makePayload({
      items: [targetCluster],
      slots: [],
      sockets: [{ itemId: 5076, nodeId: 200 }],
    });

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "items")).toBeUndefined();
    expect(report.findings.find((finding) => finding.key === "rare-item-mods")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          itemCategory: "cluster-jewel",
          name: "Brewer's Stone (Medium Cluster Jewel)",
        }),
      ]),
    );
  });

  it("shows missing magic flasks by base only and leaves moved suffixes to the pooled flask comparison", () => {
    const currentQuicksilver = makeItem({
      id: 5077,
      base: "Masochist's Quicksilver Flask of the Kakapo",
      explicits: ["Gain 2 Charges when you are Hit by an Enemy", "56% reduced Effect of Curses on you during Effect"],
      name: "Masochist's Quicksilver Flask of the Kakapo",
      rarity: "Magic",
      raw: "Rarity: Magic\nMasochist's Quicksilver Flask of the Kakapo\nMasochist's Quicksilver Flask of the Kakapo",
    });
    const currentGold = makeItem({
      id: 5078,
      base: "Gold Flask of the Falcon",
      explicits: ["49% increased Critical Strike Chance during Effect"],
      name: "Gold Flask of the Falcon",
      rarity: "Magic",
      raw: "Rarity: Magic\nGold Flask of the Falcon\nGold Flask of the Falcon",
    });
    const targetGold = makeItem({
      id: 5079,
      base: "Masochist's Gold Flask of the Kakapo",
      explicits: ["Gain 1 Charge when you are Hit by an Enemy", "56% reduced Effect of Curses on you during Effect"],
      name: "Masochist's Gold Flask of the Kakapo",
      rarity: "Magic",
      raw: "Rarity: Magic\nMasochist's Gold Flask of the Kakapo\nMasochist's Gold Flask of the Kakapo",
    });

    const currentPayload = makePayload({
      items: [currentQuicksilver, currentGold],
      slots: [
        { itemId: 5077, name: "Flask 1" },
        { itemId: 5078, name: "Flask 2" },
      ],
    });
    const targetPayload = makePayload({
      items: [targetGold],
      slots: [{ itemId: 5079, name: "Flask 1" }],
    });

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
          name: "Quicksilver Flask",
          targetValue: "Missing",
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "items")?.rows?.[0]?.currentValue).not.toContain(
      "reduced Effect of Curses on you during Effect",
    );
    expect(report.findings.find((finding) => finding.key === "magic-flask-mods")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: expect.stringContaining("Significant roll differences"),
          targetValue: expect.stringContaining("Significant roll differences"),
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "magic-flask-mods")?.rows?.[0]?.currentValue).not.toContain(
      "Only in current\n- Explicit: 56% reduced Effect of Curses on you during Effect",
    );
  });

  it("does not repeat unique jewel names in the source build column when the item column already identifies the jewel", () => {
    const currentJewel = makeItem({
      id: 5101,
      base: "Cobalt Jewel",
      explicits: ["+4% Chance to Block", "+10% to Critical Strike Multiplier if you've been Hit Recently"],
      name: "Replica Reckless Defence",
      rarity: "Unique",
      raw: "Rarity: Unique\nReplica Reckless Defence\nCobalt Jewel",
    });

    const currentPayload = makePayload({
      items: [currentJewel],
      slots: [],
      sockets: [{ itemId: 5101, nodeId: 200 }],
    });
    const targetPayload = makePayload({
      items: [],
      slots: [],
      sockets: [],
    });

    const report = buildBuildComparisonReport(
      currentPayload,
      getInitialBuildViewerSelection(currentPayload),
      targetPayload,
      getInitialBuildViewerSelection(targetPayload),
    );

    expect(report.findings.find((finding) => finding.key === "items")?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          currentValue: expect.stringContaining("Explicit Mods"),
          name: "Replica Reckless Defence (Cobalt Jewel)",
        }),
      ]),
    );
    expect(report.findings.find((finding) => finding.key === "items")?.rows?.[0]?.currentValue).not.toContain(
      "Replica Reckless Defence",
    );
    expect(report.findings.find((finding) => finding.key === "items")?.rows?.[0]?.currentValue).not.toContain(
      "Cobalt Jewel",
    );
  });

  it("groups missing support gems by support name in v2", () => {
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
});
