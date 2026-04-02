import { describe, expect, it } from "vitest";

import type { ItemPayload, TreeSpecPayload } from "@pobcodes/shared-types";

import type { PassiveTreeLayoutNode } from "./passive-tree";
import { TIMELESS_KEYSTONE_BY_CONQUEROR_NAME, TIMELESS_KEYSTONES } from "./generated/passive-tree-timeless-keystones";
import { resolveTimelessKeystoneTransformations } from "./passive-tree-timeless";

describe("resolveTimelessKeystoneTransformations", () => {
  it("resolves transformed keystones for multiple timeless jewel inscription formats", () => {
    const layoutNodeIndex = new Map<number, PassiveTreeLayoutNode>([
      [
        99,
        {
          flavourText: [],
          groupCenterX: 0,
          groupCenterY: 0,
          groupId: 1,
          id: 99,
          isJewelSocket: true,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Basic Jewel Socket",
          orbit: 1,
          orbitIndex: 0,
          orbitRadius: 82,
          out: [200],
          reminderText: [],
          stats: [],
          x: 0,
          y: -120,
        },
      ],
      [
        200,
        {
          flavourText: [],
          groupCenterX: 0,
          groupCenterY: 0,
          groupId: 1,
          id: 200,
          isJewelSocket: false,
          isKeystone: true,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Original Keystone",
          orbit: 2,
          orbitIndex: 0,
          orbitRadius: 220,
          out: [99],
          reminderText: [],
          stats: ["Original Keystone line"],
          x: 0,
          y: -420,
        },
      ],
    ]);

    const spec: TreeSpecPayload = {
      active: true,
      ascendancyId: 2,
      classId: 5,
      masteryEffects: [],
      nodes: [200],
      overrides: [],
      sockets: [
        {
          itemId: 9001,
          nodeId: 99,
        },
      ],
      title: "Main Tree",
      url: "https://example.com/trees/main",
      version: "3.28",
    };

    const cases = [
      {
        raw: [
          "Rarity: Unique",
          "Elegant Hubris",
          "Timeless Jewel",
          "Commissioned 80740 coins to commemorate Caspiro",
          "Passives in radius are Conquered by the Eternal Empire",
        ].join("\n"),
        expectedName: "Supreme Ostentation",
      },
      {
        raw: [
          "Rarity: Unique",
          "Lethal Pride",
          "Timeless Jewel",
          "Commanded leadership over 17240 warriors under Kaom",
          "Passives in radius are Conquered by the Karui",
        ].join("\n"),
        expectedName: "Strength of Blood",
      },
      {
        raw: [
          "Rarity: Unique",
          "Brutal Restraint",
          "Timeless Jewel",
          "Denoted service of 14567 dekhara in the akhara of Balbala",
          "Passives in radius are Conquered by the Maraketh",
        ].join("\n"),
        expectedName: "The Traitor",
      },
      {
        raw: [
          "Rarity: Unique",
          "Militant Faith",
          "Timeless Jewel",
          "Carved to glorify 5432 new faithful converted by High Templar Dominus",
          "Passives in radius are Conquered by the Templars",
        ].join("\n"),
        expectedName: "Inner Conviction",
      },
      {
        raw: [
          "Rarity: Unique",
          "Glorious Vanity",
          "Timeless Jewel",
          "Bathed in the blood of 8963 sacrificed in the name of Xibaqua",
          "Passives in radius are Conquered by the Vaal",
        ].join("\n"),
        expectedName: "Divine Flesh",
      },
    ] satisfies Array<{ expectedName: string; raw: string }>;

    for (const [index, testCase] of cases.entries()) {
      const itemsById = new Map<number, ItemPayload>([
        [
          9001,
          buildTimelessItem({
            id: 9001 + index,
            raw: testCase.raw,
          }),
        ],
      ]);

      const transformations = resolveTimelessKeystoneTransformations(spec, layoutNodeIndex, itemsById);
      expect(transformations.get(200)?.name).toBe(testCase.expectedName);
    }
  });

  it("covers every currently generated timeless conqueror name", () => {
    const layoutNodeIndex = new Map<number, PassiveTreeLayoutNode>([
      [
        99,
        {
          flavourText: [],
          groupCenterX: 0,
          groupCenterY: 0,
          groupId: 1,
          id: 99,
          isJewelSocket: true,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Basic Jewel Socket",
          orbit: 1,
          orbitIndex: 0,
          orbitRadius: 82,
          out: [200],
          reminderText: [],
          stats: [],
          x: 0,
          y: -120,
        },
      ],
      [
        200,
        {
          flavourText: [],
          groupCenterX: 0,
          groupCenterY: 0,
          groupId: 1,
          id: 200,
          isJewelSocket: false,
          isKeystone: true,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Original Keystone",
          orbit: 2,
          orbitIndex: 0,
          orbitRadius: 220,
          out: [99],
          reminderText: [],
          stats: ["Original Keystone line"],
          x: 0,
          y: -420,
        },
      ],
    ]);

    const spec: TreeSpecPayload = {
      active: true,
      ascendancyId: 2,
      classId: 5,
      masteryEffects: [],
      nodes: [200],
      overrides: [],
      sockets: [
        {
          itemId: 9001,
          nodeId: 99,
        },
      ],
      title: "Main Tree",
      url: "https://example.com/trees/main",
      version: "3.28",
    };

    for (const [conquerorName, keystoneId] of Object.entries(TIMELESS_KEYSTONE_BY_CONQUEROR_NAME)) {
      const itemsById = new Map<number, ItemPayload>([
        [
          9001,
          buildTimelessItem({
            id: 9001,
            raw: [
              "Rarity: Unique",
              "Timeless Jewel",
              "An inscription honouring " + toTitleCase(conquerorName),
              "Passives in radius are Conquered by the Ancients",
            ].join("\n"),
          }),
        ],
      ]);

      const transformations = resolveTimelessKeystoneTransformations(spec, layoutNodeIndex, itemsById);
      expect(transformations.get(200)?.name).toBe(TIMELESS_KEYSTONES[keystoneId]?.name);
    }
  });
});

function buildTimelessItem({ id, raw }: { id: number; raw: string }): ItemPayload {
  return {
    anointments: [],
    base: "Timeless Jewel",
    corrupted: false,
    crafted: [],
    crucibleMods: [],
    enchantments: [],
    explicits: ["Historic"],
    fractured: false,
    fracturedMods: [],
    id,
    implicits: [],
    influences: [],
    mirrored: false,
    name: "Timeless Jewel",
    rarity: "Unique",
    raw,
    scourgedMods: [],
    synthesizedMods: [],
  };
}

function toTitleCase(value: string) {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value;
}
