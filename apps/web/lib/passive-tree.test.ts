import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { ItemPayload } from "@pobcodes/shared-types";
import { parseBuildCodeToPayload } from "../../../packages/pob-parser/src/index";

import {
  augmentPassiveTreeLayoutWithClusters,
  buildPassiveTreeJewelRadiusOverlays,
  buildPassiveTreeLinks,
  getPassiveTreeLinkPath,
  buildAllocatedPassiveTreeLinks,
  buildPassiveTreeViewBox,
  describePassiveTreeNode,
  getPassiveTreeCenteredViewport,
  getPassiveTreeDisplayLayout,
  getPassiveTreeInitialViewport,
  getPassiveTreeNodeKind,
  getVisiblePassiveTreeNodeIds,
  getPassiveTreeViewBounds,
  pickPassiveTreeVariant,
  resolvePassiveTreeSprite,
  type PassiveTreeLayout,
  type PassiveTreeLayoutNode,
  type PassiveTreeManifest,
  type PassiveTreeSpriteManifest,
} from "./passive-tree";

const manifest: PassiveTreeManifest = {
  passiveTreeAssetRoot: "/assets/passive-tree/default",
  spriteManifestPath: "/assets/passive-tree/default/sprite-manifest.json",
  variants: {
    alternate: {
      bounds: { maxX: 1000, maxY: 1000, minX: -1000, minY: -1000 },
      classCount: 7,
      groupCount: 2,
      layoutPath: "/assets/passive-tree/default/layout-alternate.json",
      nodeCount: 4,
      nodeIds: [10, 40, 50],
      positionedNodeCount: 3,
      publicAssetRoot: "/assets/passive-tree/default",
      sourceFile: "alternate.json",
      treeName: "Alternate",
      unpositionedNodeCount: 1,
    },
    default: {
      bounds: { maxX: 1000, maxY: 1000, minX: -1000, minY: -1000 },
      classCount: 7,
      groupCount: 2,
      layoutPath: "/assets/passive-tree/default/layout-default.json",
      nodeCount: 4,
      nodeIds: [10, 20, 30],
      positionedNodeCount: 3,
      publicAssetRoot: "/assets/passive-tree/default",
      sourceFile: "default.json",
      treeName: "Default",
      unpositionedNodeCount: 1,
    },
  },
};

const layout: PassiveTreeLayout = {
  bounds: { maxX: 1200, maxY: 1200, minX: -1200, minY: -1200 },
  groups: [
    { id: 1, x: 0, y: 0 },
    { id: 2, x: 1000, y: 0 },
  ],
  nodes: [
    {
      icon: "Art/2DArt/SkillIcons/passives/blankStr.png",
      classStartIndex: 1,
      flavourText: [],
      groupId: 1,
      groupCenterX: 0,
      groupCenterY: 0,
      id: 10,
      isJewelSocket: false,
      isKeystone: false,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Start",
      orbit: 0,
      orbitIndex: 0,
      orbitRadius: 0,
      out: [20],
      reminderText: [],
      stats: [],
      x: 0,
      y: 0,
    },
    {
      flavourText: [],
      groupId: 1,
      groupCenterX: 0,
      groupCenterY: 0,
      id: 20,
      icon: "Art/2DArt/SkillIcons/passives/AreaDmgNotable.png",
      isJewelSocket: false,
      isKeystone: false,
      isMastery: false,
      isNotable: true,
      masteryEffects: [],
      name: "Notable",
      orbit: 1,
      orbitIndex: 0,
      orbitRadius: 500,
      out: [10, 30],
      reminderText: [],
      stats: ["10% increased Damage"],
      x: 500,
      y: 0,
    },
    {
      activeIcon: "Art/2DArt/SkillIcons/passives/MasteryPassiveIcons/PassiveMasteryAreaActive.png",
      flavourText: [],
      groupId: 2,
      groupCenterX: 1000,
      groupCenterY: 0,
      id: 30,
      inactiveIcon: "Art/2DArt/SkillIcons/passives/MasteryPassiveIcons/PassiveMasteryAreaInactive.png",
      isJewelSocket: false,
      isKeystone: false,
      isMastery: true,
      isNotable: false,
      masteryEffects: [
        {
          effect: 777,
          reminderText: ["Recently refers to the past 4 seconds"],
          stats: ["15% increased Area of Effect"],
        },
      ],
      name: "Mastery",
      orbit: 0,
      orbitIndex: 0,
      orbitRadius: 0,
      out: [20],
      reminderText: [],
      stats: [],
      x: 1000,
      y: 300,
    },
  ],
  unpositionedNodeIds: [40],
};

const arcLayout: PassiveTreeLayout = {
  bounds: { maxX: 800, maxY: 800, minX: -800, minY: -800 },
  groups: [{ id: 1, x: 0, y: 0 }],
  nodes: [
    {
      flavourText: [],
      groupId: 1,
      groupCenterX: 0,
      groupCenterY: 0,
      id: 101,
      isJewelSocket: false,
      isKeystone: false,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Top",
      orbit: 1,
      orbitIndex: 0,
      orbitRadius: 200,
      out: [102],
      reminderText: [],
      stats: [],
      x: 0,
      y: -200,
    },
    {
      flavourText: [],
      groupId: 1,
      groupCenterX: 0,
      groupCenterY: 0,
      id: 102,
      isJewelSocket: false,
      isKeystone: false,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Bottom",
      orbit: 1,
      orbitIndex: 1,
      orbitRadius: 200,
      out: [101],
      reminderText: [],
      stats: [],
      x: 0,
      y: 200,
    },
  ],
  unpositionedNodeIds: [],
};

const impossibleEscapeLayout: PassiveTreeLayout = {
  bounds: { maxX: 1200, maxY: 1200, minX: -1200, minY: -1200 },
  groups: [{ id: 1, x: 0, y: 0 }],
  nodes: [
    {
      flavourText: [],
      groupId: 1,
      groupCenterX: 0,
      groupCenterY: 0,
      id: 101,
      isJewelSocket: true,
      isKeystone: false,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Jewel Socket",
      orbit: 1,
      orbitIndex: 0,
      orbitRadius: 82,
      out: [],
      reminderText: [],
      stats: [],
      x: 120,
      y: -80,
    },
    {
      flavourText: [],
      groupId: 1,
      groupCenterX: 0,
      groupCenterY: 0,
      id: 202,
      icon: "Art/2DArt/SkillIcons/passives/KeystoneChaosInoculation.png",
      isJewelSocket: false,
      isKeystone: true,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Chaos Inoculation",
      orbit: 2,
      orbitIndex: 0,
      orbitRadius: 200,
      out: [],
      reminderText: [],
      stats: ["Maximum Life becomes 1, Immune to Chaos Damage"],
      x: -420,
      y: 260,
    },
  ],
  unpositionedNodeIds: [],
};

const ascendancyLayout: PassiveTreeLayout = {
  bounds: { maxX: 1000, maxY: 1000, minX: -1000, minY: -1000 },
  groups: [{ id: 1, x: 0, y: 0 }],
  nodes: [
    {
      flavourText: [],
      groupId: 1,
      groupCenterX: 700,
      groupCenterY: 20,
      id: 10,
      isJewelSocket: false,
      isKeystone: false,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Large Jewel Socket",
      orbit: 0,
      orbitIndex: 0,
      orbitRadius: 0,
      out: [],
      reminderText: [],
      stats: [],
      x: 700,
      y: 20,
    },
    {
      flavourText: [],
      groupId: 1,
      groupCenterX: 300,
      groupCenterY: -600,
      id: 11,
      isJewelSocket: false,
      isKeystone: false,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Large Jewel Socket",
      orbit: 0,
      orbitIndex: 0,
      orbitRadius: 0,
      out: [],
      reminderText: [],
      stats: [],
      x: 300,
      y: -600,
    },
    {
      flavourText: [],
      groupId: 1,
      groupCenterX: -750,
      groupCenterY: 40,
      id: 12,
      isJewelSocket: false,
      isKeystone: false,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Large Jewel Socket",
      orbit: 0,
      orbitIndex: 0,
      orbitRadius: 0,
      out: [],
      reminderText: [],
      stats: [],
      x: -750,
      y: 40,
    },
    {
      flavourText: [],
      groupId: 1,
      groupCenterX: -250,
      groupCenterY: -650,
      id: 13,
      isJewelSocket: false,
      isKeystone: false,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Large Jewel Socket",
      orbit: 0,
      orbitIndex: 0,
      orbitRadius: 0,
      out: [],
      reminderText: [],
      stats: [],
      x: -250,
      y: -650,
    },
    {
      flavourText: [],
      groupId: 1,
      groupCenterX: 0,
      groupCenterY: 0,
      id: 1,
      isJewelSocket: false,
      isKeystone: false,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Templar",
      orbit: 0,
      orbitIndex: 0,
      orbitRadius: 0,
      out: [],
      reminderText: [],
      stats: [],
      x: 0,
      y: 0,
    },
    {
      flavourText: [],
      groupId: 1,
      groupCenterX: -500,
      groupCenterY: 200,
      id: 2,
      isAscendancyStart: true,
      isJewelSocket: false,
      isKeystone: false,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Inquisitor",
      orbit: 0,
      orbitIndex: 0,
      orbitRadius: 0,
      out: [3],
      reminderText: [],
      stats: [],
      x: -500,
      y: 200,
    },
    {
      flavourText: [],
      groupId: 1,
      groupCenterX: -500,
      groupCenterY: 200,
      id: 3,
      isJewelSocket: false,
      isKeystone: false,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Primary Node",
      orbit: 2,
      orbitIndex: 0,
      orbitRadius: 162,
      out: [2],
      reminderText: [],
      stats: [],
      x: -338,
      y: 200,
    },
    {
      flavourText: [],
      groupId: 1,
      groupCenterX: 500,
      groupCenterY: 300,
      id: 4,
      isAscendancyStart: true,
      isJewelSocket: false,
      isKeystone: false,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Lycia Bloodline",
      orbit: 0,
      orbitIndex: 0,
      orbitRadius: 0,
      out: [5],
      reminderText: [],
      stats: [],
      x: 500,
      y: 300,
    },
    {
      flavourText: [],
      groupId: 1,
      groupCenterX: 500,
      groupCenterY: 300,
      id: 5,
      isJewelSocket: false,
      isKeystone: false,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Secondary Node",
      orbit: 2,
      orbitIndex: 0,
      orbitRadius: 162,
      out: [4],
      reminderText: [],
      stats: [],
      x: 662,
      y: 300,
    },
  ],
  unpositionedNodeIds: [],
};

const spriteManifest: PassiveTreeSpriteManifest = {
  atlases: {
    masteryActiveSelected: {
      coords: {
        "Art/2DArt/SkillIcons/passives/MasteryPassiveIcons/PassiveMasteryAreaActive.png": {
          h: 113,
          w: 113,
          x: 0,
          y: 0,
        },
      },
      imagePath: "/assets/passive-tree/default/mastery-active-selected-4.png",
      size: {
        height: 1130,
        width: 1130,
      },
    },
    masteryConnected: {
      coords: {
        "Art/2DArt/SkillIcons/passives/MasteryPassiveIcons/PassiveMasteryAreaInactive.png": {
          h: 113,
          w: 113,
          x: 0,
          y: 0,
        },
      },
      imagePath: "/assets/passive-tree/default/mastery-connected-4.png",
      size: {
        height: 1130,
        width: 1130,
      },
    },
    masteryInactive: {
      coords: {
        "Art/2DArt/SkillIcons/passives/MasteryPassiveIcons/PassiveMasteryAreaInactive.png": {
          h: 113,
          w: 113,
          x: 0,
          y: 0,
        },
      },
      imagePath: "/assets/passive-tree/default/mastery-disabled-4.png",
      size: {
        height: 1130,
        width: 1130,
      },
    },
    notableActive: {
      coords: {
        "Art/2DArt/SkillIcons/passives/AreaDmgNotable.png": {
          h: 48,
          w: 48,
          x: 120,
          y: 96,
        },
      },
      imagePath: "/assets/passive-tree/default/skills-4.jpg",
      size: {
        height: 1837,
        width: 1248,
      },
    },
    notableInactive: {
      coords: {
        "Art/2DArt/SkillIcons/passives/AreaDmgNotable.png": {
          h: 48,
          w: 48,
          x: 120,
          y: 96,
        },
      },
      imagePath: "/assets/passive-tree/default/skills-disabled-4.jpg",
      size: {
        height: 1837,
        width: 1248,
      },
    },
    normalActive: {
      coords: {
        "Art/2DArt/SkillIcons/passives/blankStr.png": {
          h: 32,
          w: 32,
          x: 0,
          y: 0,
        },
      },
      imagePath: "/assets/passive-tree/default/skills-4.jpg",
      size: {
        height: 1837,
        width: 1248,
      },
    },
    normalInactive: {
      coords: {
        "Art/2DArt/SkillIcons/passives/blankStr.png": {
          h: 32,
          w: 32,
          x: 0,
          y: 0,
        },
      },
      imagePath: "/assets/passive-tree/default/skills-disabled-4.jpg",
      size: {
        height: 1837,
        width: 1248,
      },
    },
  },
};

describe("passive-tree helpers", () => {
  it("selects the best matching tree variant by node overlap", () => {
    expect(
      pickPassiveTreeVariant(
        {
          active: true,
          masteryEffects: [],
          nodes: [10, 20, 30],
          overrides: [],
          sockets: [],
        },
        manifest,
      ),
    ).toBe("default");

    expect(
      pickPassiveTreeVariant(
        {
          active: true,
          masteryEffects: [],
          nodes: [10, 40, 50],
          overrides: [],
          sockets: [],
        },
        manifest,
      ),
    ).toBe("alternate");
  });

  it("deduplicates allocated links", () => {
    const links = buildAllocatedPassiveTreeLinks(layout.nodes, new Set([10, 20, 30]));

    expect(links).toEqual([{ sourceId: 10, targetId: 20 }]);
  });

  it("highlights allocated paths that pass through position proxies", () => {
    const proxyLayout: PassiveTreeLayout = {
      bounds: { maxX: 400, maxY: 400, minX: -400, minY: -400 },
      groups: [{ id: 1, x: 0, y: 0 }],
      nodes: [
        {
          classStartIndex: 1,
          flavourText: [],
          groupId: 1,
          id: 1,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Start",
          orbit: 0,
          orbitIndex: 0,
          out: [2],
          reminderText: [],
          stats: [],
          x: 0,
          y: 0,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 2,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Position Proxy",
          orbit: 1,
          orbitIndex: 0,
          orbitRadius: 82,
          out: [3],
          reminderText: [],
          stats: [],
          x: 0,
          y: -82,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 3,
          isJewelSocket: true,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Large Jewel Socket",
          orbit: 2,
          orbitIndex: 0,
          orbitRadius: 162,
          out: [],
          reminderText: [],
          stats: [],
          x: 0,
          y: -162,
        },
      ],
      unpositionedNodeIds: [],
    };

    expect(buildAllocatedPassiveTreeLinks(proxyLayout.nodes, new Set([1, 3]))).toEqual([
      { sourceId: 1, targetId: 2 },
      { sourceId: 2, targetId: 3 },
    ]);
  });

  it("builds the full visible link map", () => {
    expect(buildPassiveTreeLinks(layout.nodes)).toEqual([{ sourceId: 10, targetId: 20 }]);
  });

  it("does not draw visible links to masteries", () => {
    const masteryLinkLayout: PassiveTreeLayout = {
      bounds: { maxX: 400, maxY: 400, minX: -400, minY: -400 },
      groups: [{ id: 1, x: 0, y: 0 }],
      nodes: [
        {
          flavourText: [],
          groupId: 1,
          groupCenterX: 0,
          groupCenterY: 0,
          id: 1,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: true,
          masteryEffects: [],
          name: "Notable",
          orbit: 1,
          orbitIndex: 0,
          orbitRadius: 120,
          out: [2],
          reminderText: [],
          stats: ["10% increased Damage"],
          x: 0,
          y: -120,
        },
        {
          activeIcon: "Art/2DArt/SkillIcons/passives/MasteryPassiveIcons/PassiveMasteryAreaActive.png",
          flavourText: [],
          groupId: 1,
          groupCenterX: 0,
          groupCenterY: 0,
          id: 2,
          inactiveIcon: "Art/2DArt/SkillIcons/passives/MasteryPassiveIcons/PassiveMasteryAreaInactive.png",
          isJewelSocket: false,
          isKeystone: false,
          isMastery: true,
          isNotable: false,
          masteryEffects: [],
          name: "Mastery",
          orbit: 2,
          orbitIndex: 0,
          orbitRadius: 220,
          out: [1],
          reminderText: [],
          stats: [],
          x: 0,
          y: -220,
        },
      ],
      unpositionedNodeIds: [],
    };

    expect(buildPassiveTreeLinks(masteryLinkLayout.nodes)).toEqual([]);
  });

  it("prunes unsocketed cluster jewel branches from the visible node graph", () => {
    const clusterLayout: PassiveTreeLayout = {
      bounds: { maxX: 400, maxY: 400, minX: -400, minY: -400 },
      groups: [{ id: 1, x: 0, y: 0 }],
      nodes: [
        {
          classStartIndex: 1,
          flavourText: [],
          groupId: 1,
          id: 1,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Start",
          orbit: 0,
          orbitIndex: 0,
          out: [2],
          reminderText: [],
          stats: [],
          x: 0,
          y: 0,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 2,
          isJewelSocket: true,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Large Jewel Socket",
          orbit: 1,
          orbitIndex: 0,
          orbitRadius: 82,
          out: [3],
          reminderText: [],
          stats: [],
          x: 0,
          y: -82,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 3,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Added Passive",
          orbit: 2,
          orbitIndex: 0,
          orbitRadius: 162,
          out: [],
          reminderText: [],
          stats: ["12% increased Damage"],
          x: 0,
          y: -162,
        },
      ],
      unpositionedNodeIds: [],
    };

    expect(
      getVisiblePassiveTreeNodeIds(clusterLayout.nodes, {
        active: true,
        masteryEffects: [],
        nodes: [1, 2],
        overrides: [],
        sockets: [],
      }),
    ).toEqual(new Set([1, 2]));

    expect(
      getVisiblePassiveTreeNodeIds(clusterLayout.nodes, {
        active: true,
        masteryEffects: [],
        nodes: [1, 2, 3],
        overrides: [],
        sockets: [{ itemId: 1001, nodeId: 2 }],
      }),
    ).toEqual(new Set([1, 2, 3]));
  });

  it("reveals cluster branches wired through incoming socket edges when occupied", () => {
    const incomingClusterLayout: PassiveTreeLayout = {
      bounds: { maxX: 400, maxY: 400, minX: -400, minY: -400 },
      groups: [{ id: 1, x: 0, y: 0 }],
      nodes: [
        {
          classStartIndex: 1,
          flavourText: [],
          groupId: 1,
          id: 1,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Start",
          orbit: 0,
          orbitIndex: 0,
          out: [2],
          reminderText: [],
          stats: [],
          x: 0,
          y: 0,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 2,
          isJewelSocket: true,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Large Jewel Socket",
          orbit: 1,
          orbitIndex: 0,
          orbitRadius: 82,
          out: [],
          reminderText: [],
          stats: [],
          x: 0,
          y: -82,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 3,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Added Passive",
          orbit: 2,
          orbitIndex: 0,
          orbitRadius: 162,
          out: [2, 4],
          reminderText: [],
          stats: ["12% increased Damage"],
          x: 0,
          y: -162,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 4,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Added Passive 2",
          orbit: 3,
          orbitIndex: 0,
          orbitRadius: 244,
          out: [],
          reminderText: [],
          stats: ["12% increased Damage"],
          x: 0,
          y: -244,
        },
      ],
      unpositionedNodeIds: [],
    };

    const clusterJewel: ItemPayload = {
      anointments: [],
      base: "Large Cluster Jewel",
      corrupted: false,
      crafted: [],
      enchantments: [],
      explicits: [],
      fractured: false,
      fracturedMods: [],
      id: 3001,
      implicits: [],
      influences: [],
      mirrored: false,
      name: "Incoming Cluster",
      rarity: "Rare",
      raw: "",
      scourgedMods: [],
      crucibleMods: [],
      synthesizedMods: [],
    };

    expect(
      getVisiblePassiveTreeNodeIds(
        incomingClusterLayout.nodes,
        {
          active: true,
          masteryEffects: [],
          nodes: [1, 2],
          overrides: [],
          sockets: [],
        },
      ),
    ).toEqual(new Set([1, 2]));

    expect(
      getVisiblePassiveTreeNodeIds(
        incomingClusterLayout.nodes,
        {
          active: true,
          masteryEffects: [],
          nodes: [1, 2, 3, 4],
          overrides: [],
          sockets: [{ itemId: 3001, nodeId: 2 }],
        },
        new Map([[3001, clusterJewel]]),
      ),
    ).toEqual(new Set([1, 2, 3, 4]));
  });

  it("seeds visibility from allocated nodes when class-start scaffold edges are filtered out", () => {
    const scaffoldLayout: PassiveTreeLayout = {
      bounds: { maxX: 400, maxY: 400, minX: -400, minY: -400 },
      groups: [{ id: 1, x: 0, y: 0 }],
      nodes: [
        {
          classStartIndex: 0,
          flavourText: [],
          groupId: 1,
          id: 1,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Scion Start",
          orbit: 0,
          orbitIndex: 0,
          out: [2],
          reminderText: [],
          stats: [],
          x: 0,
          y: 0,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 2,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Travel Node",
          orbit: 1,
          orbitIndex: 0,
          orbitRadius: 82,
          out: [3],
          reminderText: [],
          stats: [],
          x: 0,
          y: -82,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 3,
          isJewelSocket: true,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Large Jewel Socket",
          orbit: 2,
          orbitIndex: 0,
          orbitRadius: 162,
          out: [4],
          reminderText: [],
          stats: [],
          x: 0,
          y: -162,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 4,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Added Passive",
          orbit: 3,
          orbitIndex: 0,
          orbitRadius: 244,
          out: [],
          reminderText: [],
          stats: ["12% increased Damage"],
          x: 0,
          y: -244,
        },
      ],
      unpositionedNodeIds: [],
    };

    const clusterJewel: ItemPayload = {
      anointments: [],
      base: "Large Cluster Jewel",
      corrupted: false,
      crafted: [],
      enchantments: [],
      explicits: [],
      fractured: false,
      fracturedMods: [],
      id: 3002,
      implicits: [],
      influences: [],
      mirrored: false,
      name: "Scaffold Cluster",
      rarity: "Rare",
      raw: "",
      scourgedMods: [],
      crucibleMods: [],
      synthesizedMods: [],
    };

    expect(
      getVisiblePassiveTreeNodeIds(
        scaffoldLayout.nodes,
        {
          active: true,
          masteryEffects: [],
          nodes: [2, 3, 4],
          overrides: [],
          sockets: [{ itemId: 3002, nodeId: 3 }],
        },
        new Map([[3002, clusterJewel]]),
      ),
    ).toEqual(new Set([2, 3, 4]));
  });

  it("keeps non-cluster jewels from opening cluster branches", () => {
    const branchLayout: PassiveTreeLayout = {
      bounds: { maxX: 400, maxY: 400, minX: -400, minY: -400 },
      groups: [{ id: 1, x: 0, y: 0 }],
      nodes: [
        {
          classStartIndex: 1,
          flavourText: [],
          groupId: 1,
          id: 1,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Start",
          orbit: 0,
          orbitIndex: 0,
          out: [2],
          reminderText: [],
          stats: [],
          x: 0,
          y: 0,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 2,
          isJewelSocket: true,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Basic Jewel Socket",
          orbit: 1,
          orbitIndex: 0,
          orbitRadius: 82,
          out: [3],
          reminderText: [],
          stats: [],
          x: 0,
          y: -82,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 3,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Phantom Branch",
          orbit: 2,
          orbitIndex: 0,
          orbitRadius: 162,
          out: [],
          reminderText: [],
          stats: [],
          x: 0,
          y: -162,
        },
      ],
      unpositionedNodeIds: [],
    };

    const normalJewel: ItemPayload = {
      anointments: [],
      base: "Crimson Jewel",
      corrupted: false,
      crafted: [],
      enchantments: [],
      explicits: ["+12% to Fire Damage"],
      fractured: false,
      fracturedMods: [],
      id: 2001,
      implicits: [],
      influences: [],
      mirrored: false,
      name: "Scintillating Shard",
      rarity: "Rare",
      raw: "",
      scourgedMods: [],
      crucibleMods: [],
      synthesizedMods: [],
    };

    const clusterJewel: ItemPayload = {
      ...normalJewel,
      base: "Large Cluster Jewel",
      id: 2002,
      name: "Large Cluster Jewel",
    };

    expect(
      getVisiblePassiveTreeNodeIds(
        branchLayout.nodes,
        {
          active: true,
          masteryEffects: [],
          nodes: [1, 2],
          overrides: [],
          sockets: [{ itemId: 2001, nodeId: 2 }],
        },
        new Map([[2001, normalJewel]]),
      ),
    ).toEqual(new Set([1, 2]));

    expect(
      getVisiblePassiveTreeNodeIds(
        branchLayout.nodes,
        {
          active: true,
          masteryEffects: [],
          nodes: [1, 2, 3],
          overrides: [],
          sockets: [{ itemId: 2002, nodeId: 2 }],
        },
        new Map([[2002, clusterJewel]]),
      ),
    ).toEqual(new Set([1, 2, 3]));
  });

  it("routes same-orbit links as arcs", () => {
    const arcPath = getPassiveTreeLinkPath(
      {
        flavourText: [],
        groupCenterX: 0,
        groupCenterY: 0,
        groupId: 1,
        id: 1,
        isJewelSocket: false,
        isKeystone: false,
        isMastery: false,
        isNotable: false,
        masteryEffects: [],
        name: "Left",
        orbit: 2,
        orbitIndex: 0,
        orbitRadius: 100,
        out: [2],
        reminderText: [],
        stats: [],
        x: 0,
        y: -100,
      },
      {
        flavourText: [],
        groupCenterX: 0,
        groupCenterY: 0,
        groupId: 1,
        id: 2,
        isJewelSocket: false,
        isKeystone: false,
        isMastery: false,
        isNotable: false,
        masteryEffects: [],
        name: "Right",
        orbit: 2,
        orbitIndex: 1,
        orbitRadius: 100,
        out: [1],
        reminderText: [],
        stats: [],
        x: 100,
        y: 0,
      },
    );

    expect(arcPath).toContain(" A ");
  });

  it("routes same-group radial links as straight connectors", () => {
    const intraGroupPath = getPassiveTreeLinkPath(
      {
        flavourText: [],
        groupCenterX: 0,
        groupCenterY: 0,
        groupId: 1,
        id: 1,
        isJewelSocket: false,
        isKeystone: false,
        isMastery: false,
        isNotable: false,
        masteryEffects: [],
        name: "Inner",
        orbit: 0,
        orbitIndex: 0,
        orbitRadius: 0,
        out: [2],
        reminderText: [],
        stats: [],
        x: 0,
        y: 0,
      },
      {
        flavourText: [],
        groupCenterX: 0,
        groupCenterY: 0,
        groupId: 1,
        id: 2,
        isJewelSocket: false,
        isKeystone: false,
        isMastery: false,
        isNotable: false,
        masteryEffects: [],
        name: "Outer",
        orbit: 2,
        orbitIndex: 0,
        orbitRadius: 100,
        out: [1],
        reminderText: [],
        stats: [],
        x: 0,
        y: -100,
      },
    );

    expect(intraGroupPath).toContain(" L ");
  });

  it("routes inter-group links as straight connectors", () => {
    const interGroupPath = getPassiveTreeLinkPath(
      {
        flavourText: [],
        groupCenterX: 0,
        groupCenterY: 0,
        groupId: 1,
        id: 1,
        isJewelSocket: false,
        isKeystone: false,
        isMastery: false,
        isNotable: false,
        masteryEffects: [],
        name: "Left Cluster",
        orbit: 0,
        orbitIndex: 0,
        orbitRadius: 0,
        out: [2],
        reminderText: [],
        stats: [],
        x: -300,
        y: 0,
      },
      {
        flavourText: [],
        groupCenterX: 600,
        groupCenterY: 100,
        groupId: 2,
        id: 2,
        isJewelSocket: false,
        isKeystone: false,
        isMastery: false,
        isNotable: false,
        masteryEffects: [],
        name: "Right Cluster",
        orbit: 0,
        orbitIndex: 0,
        orbitRadius: 0,
        out: [1],
        reminderText: [],
        stats: [],
        x: 500,
        y: 140,
      },
    );

    expect(interGroupPath).toContain(" L ");
  });

  it("hides ascendancy bridge edges from the visible tree graph", () => {
    const bridgeLayout: PassiveTreeLayout = {
      bounds: { maxX: 100, maxY: 100, minX: -100, minY: -100 },
      groups: [{ id: 1, x: 0, y: 0 }],
      nodes: [
        {
          classStartIndex: 1,
          flavourText: [],
          groupId: 1,
          id: 1,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Class Start",
          orbit: 0,
          orbitIndex: 0,
          out: [2],
          reminderText: [],
          stats: [],
          x: 0,
          y: 0,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 2,
          isAscendancyStart: true,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Ascendancy Start",
          orbit: 0,
          orbitIndex: 0,
          out: [1],
          reminderText: [],
          stats: [],
          x: 50,
          y: 0,
        },
      ],
      unpositionedNodeIds: [],
    };

    expect(buildPassiveTreeLinks(bridgeLayout.nodes)).toEqual([]);
  });

  it("keeps internal ascendancy links while removing the boundary to the main tree", () => {
    const bridgeLayout: PassiveTreeLayout = {
      bounds: { maxX: 100, maxY: 100, minX: -100, minY: -100 },
      groups: [{ id: 1, x: 0, y: 0 }],
      nodes: [
        {
          classStartIndex: 1,
          flavourText: [],
          groupId: 1,
          id: 1,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Class Start",
          orbit: 0,
          orbitIndex: 0,
          out: [2],
          reminderText: [],
          stats: [],
          x: 0,
          y: 0,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 2,
          isAscendancyStart: true,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Ascendancy Start",
          orbit: 0,
          orbitIndex: 0,
          out: [1, 3],
          reminderText: [],
          stats: [],
          x: 50,
          y: 0,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 3,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Ascendancy Minor",
          orbit: 0,
          orbitIndex: 0,
          out: [2],
          reminderText: [],
          stats: [],
          x: 100,
          y: 0,
        },
      ],
      unpositionedNodeIds: [],
    };

    expect(buildPassiveTreeLinks(bridgeLayout.nodes)).toEqual([{ sourceId: 2, targetId: 3 }]);
  });

  it("removes the scion start scaffold links from the visible graph", () => {
    const scionLayout: PassiveTreeLayout = {
      bounds: { maxX: 100, maxY: 100, minX: -100, minY: -100 },
      groups: [{ id: 1, x: 0, y: 0 }],
      nodes: [
        {
          classStartIndex: 0,
          flavourText: [],
          groupId: 1,
          id: 1,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Seven",
          orbit: 0,
          orbitIndex: 0,
          out: [],
          reminderText: [],
          stats: [],
          x: 0,
          y: 0,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 2,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Life and Strength",
          orbit: 0,
          orbitIndex: 0,
          out: [1, 3],
          reminderText: [],
          stats: [],
          x: -40,
          y: 0,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 3,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Outer Passive",
          orbit: 0,
          orbitIndex: 0,
          out: [2],
          reminderText: [],
          stats: [],
          x: -80,
          y: 0,
        },
      ],
      unpositionedNodeIds: [],
    };

    expect(buildPassiveTreeLinks(scionLayout.nodes)).toEqual([{ sourceId: 2, targetId: 3 }]);
  });

  it("hides ascendant class-path spokes into the main tree while keeping their local passive-point link", () => {
    const scionPathLayout: PassiveTreeLayout = {
      bounds: { maxX: 100, maxY: 100, minX: -100, minY: -100 },
      groups: [{ id: 1, x: 0, y: 0 }],
      nodes: [
        {
          flavourText: [],
          groupId: 1,
          id: 1,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Passive Point",
          orbit: 0,
          orbitIndex: 0,
          out: [2],
          reminderText: [],
          stats: [],
          x: 0,
          y: 0,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 2,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: true,
          masteryEffects: [],
          name: "Path of the Witch",
          orbit: 0,
          orbitIndex: 0,
          out: [3],
          reminderText: [],
          stats: [
            "Can Allocate Passives from the Witch's starting point",
            "Grants 2 Passive Skill Points",
          ],
          x: 50,
          y: 0,
        },
        {
          flavourText: [],
          groupId: 1,
          id: 3,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Spell Damage and Mana",
          orbit: 0,
          orbitIndex: 0,
          out: [],
          reminderText: [],
          stats: [],
          x: 500,
          y: 0,
        },
      ],
      unpositionedNodeIds: [],
    };

    expect(buildPassiveTreeLinks(scionPathLayout.nodes)).toEqual([{ sourceId: 1, targetId: 2 }]);
  });

  it("describes overrides and selected mastery effects", () => {
    const overrideNode = describePassiveTreeNode(layout.nodes[1], {
      active: true,
      masteryEffects: [],
      nodes: [20],
      overrides: [{ effect: "Tattooed effect", name: "Tattoo of Testing", nodeId: 20 }],
      sockets: [],
    });

    expect(overrideNode.title).toBe("Tattoo of Testing");
    expect(overrideNode.lines).toEqual(["Tattooed effect"]);
    expect(overrideNode.overridden).toBe(true);

    const masteryNode = describePassiveTreeNode(layout.nodes[2], {
      active: true,
      masteryEffects: [[30, 777]],
      nodes: [30],
      overrides: [],
      sockets: [],
    });

    expect(masteryNode.kind).toBe("Mastery");
    expect(masteryNode.lines).toEqual(["15% increased Area of Effect"]);
    expect(masteryNode.reminderText).toEqual(["Recently refers to the past 4 seconds"]);
  });

  it("focuses the initial viewport on allocated nodes", () => {
    const viewBounds = getPassiveTreeViewBounds(layout.bounds);
    const viewport = getPassiveTreeInitialViewport(layout, [20, 30], viewBounds);
    const viewBox = buildPassiveTreeViewBox(viewBounds, viewport);

    expect(viewport.zoom).toBeGreaterThan(1);
    expect(viewBox.width).toBeLessThan(viewBounds.width);
    expect(viewBox.x + viewBox.width / 2).toBeGreaterThan(viewBounds.centerX);
  });

  it("repositions active ascendancy regions to fixed left and right anchors", () => {
    const displayLayout = getPassiveTreeDisplayLayout(ascendancyLayout, new Set([2, 3, 4, 5]));
    const primaryStart = displayLayout.nodes.find((node) => node.id === 2);
    const secondaryStart = displayLayout.nodes.find((node) => node.id === 4);
    const primaryNode = displayLayout.nodes.find((node) => node.id === 3);
    const secondaryNode = displayLayout.nodes.find((node) => node.id === 5);

    expect(primaryStart?.x).toBeCloseTo(700, 5);
    expect(primaryStart?.y).toBeCloseTo(-600, 5);
    expect(secondaryStart?.x).toBeCloseTo(-750, 5);
    expect(secondaryStart?.y).toBeCloseTo(-650, 5);
    expect(primaryNode?.x).toBeCloseTo(862, 5);
    expect(secondaryNode?.x).toBeCloseTo(-588, 5);
  });

  it("centers the default viewport on the visible tree nodes", () => {
    const viewBounds = getPassiveTreeViewBounds(layout.bounds);
    const viewport = getPassiveTreeCenteredViewport(layout, [10, 20, 30], 1.25, viewBounds);
    const viewBox = buildPassiveTreeViewBox(viewBounds, viewport);

    expect(viewport.zoom).toBe(1.25);
    expect(viewport.panX).toBe(440);
    expect(viewBox.x + viewBox.width / 2).toBeCloseTo(440, 5);
    expect(viewBox.y + viewBox.height / 2).toBeGreaterThan(120);
    expect(viewBox.y + viewBox.height / 2).toBeLessThan(150);
  });

  it("anchors Impossible Escape radius overlays on the named keystone instead of the jewel socket", () => {
    const item: ItemPayload = {
      anointments: [],
      base: "Viridian Jewel",
      corrupted: true,
      crafted: [],
      enchantments: [],
      explicits: ["Passive Skills in radius of Chaos Inoculation can be allocated without being connected to your tree"],
      fractured: false,
      fracturedMods: [],
      id: 9001,
      implicits: [],
      influences: [],
      mirrored: false,
      name: "Impossible Escape",
      rarity: "Unique",
      raw: [
        "Rarity: Unique",
        "Impossible Escape",
        "Viridian Jewel",
        "Radius: Small",
        "Selected Variant: 1",
        "Passive Skills in Radius of Chaos Inoculation can be Allocated",
        "without being connected to your tree",
        "Corrupted",
      ].join("\n"),
      scourgedMods: [],
      crucibleMods: [],
      synthesizedMods: [],
    };

    const overlays = buildPassiveTreeJewelRadiusOverlays(
      impossibleEscapeLayout,
      {
        active: true,
        masteryEffects: [],
        nodes: [],
        overrides: [],
        sockets: [{ itemId: 9001, nodeId: 101 }],
      },
      new Map([[9001, item]]),
    );

    expect(overlays).toEqual([
      {
        itemId: 9001,
        innerRadius: 0,
        nodeId: 202,
        socketNodeId: 101,
        outerRadius: 960,
        x: -420,
        y: 260,
      },
    ]);
  });

  it("builds annulus overlays for Thread of Hope using the selected ring size", () => {
    const item: ItemPayload = {
      anointments: [],
      base: "Crimson Jewel",
      corrupted: true,
      crafted: [],
      enchantments: [],
      explicits: ["Only affects Passives in Very Large Ring", "-12% to all Elemental Resistances"],
      fractured: false,
      fracturedMods: [],
      id: 9002,
      implicits: [],
      influences: [],
      mirrored: false,
      name: "Thread of Hope",
      rarity: "Unique",
      raw: [
        "Rarity: Unique",
        "Thread of Hope",
        "Crimson Jewel",
        "Radius: Variable",
        "Variant: Small Ring",
        "Variant: Medium Ring",
        "Variant: Large Ring",
        "Variant: Very Large Ring",
        "Variant: Massive Ring (Uber)",
        "Selected Variant: 4",
        "{variant:4}Only affects Passives in Very Large Ring",
        "Corrupted",
      ].join("\n"),
      scourgedMods: [],
      crucibleMods: [],
      synthesizedMods: [],
      jewelRadius: "veryLarge",
    };

    const overlays = buildPassiveTreeJewelRadiusOverlays(
      impossibleEscapeLayout,
      {
        active: true,
        masteryEffects: [],
        nodes: [],
        overrides: [],
        sockets: [{ itemId: 9002, nodeId: 101 }],
      },
      new Map([[9002, item]]),
    );

    expect(overlays).toEqual([
      {
        itemId: 9002,
        innerRadius: 2040,
        nodeId: 101,
        socketNodeId: 101,
        outerRadius: 2400,
        x: 120,
        y: -80,
      },
    ]);
  });

  it("prefers jewel socket styling when a jewel node is also marked notable", () => {
    expect(
      getPassiveTreeNodeKind({
        ...layout.nodes[1],
        isJewelSocket: true,
        isNotable: true,
      }),
    ).toBe("jewel-socket");
  });

  it("accounts for orbit arc extents when centering the full tree", () => {
    const viewBounds = getPassiveTreeViewBounds(arcLayout.bounds);
    const viewport = getPassiveTreeCenteredViewport(arcLayout, [101, 102], 1.25, viewBounds);
    const viewBox = buildPassiveTreeViewBox(viewBounds, viewport);

    expect(viewport.panX).toBeGreaterThan(0);
    expect(viewBox.x + viewBox.width / 2).toBeGreaterThan(60);
    expect(viewBox.x + viewBox.width / 2).toBeLessThan(100);
  });

  it("adds dynamic cluster jewel passives and notables for occupied cluster sockets", () => {
    const sampleCode = readFileSync(
      new URL("../../../data/kinetic blast of clustering necromancer 328.txt", import.meta.url),
      "utf8",
    ).trim();
    const clusterLayout = JSON.parse(
      readFileSync(
        new URL("../../../apps/web/public/assets/passive-tree/default/layout-default.json", import.meta.url),
        "utf8",
      ),
    ) as PassiveTreeLayout;
    const payload = parseBuildCodeToPayload(sampleCode);
    const activeTree = payload.treeSpecs[payload.activeTreeIndex];
    const itemsById = new Map(payload.items.map((item) => [item.id, item]));

    const augmentedLayout = augmentPassiveTreeLayoutWithClusters(clusterLayout, activeTree, itemsById, "default");
    const augmentedNodeIds = new Set(augmentedLayout.nodes.map((node) => node.id));
    const visibleNodeIds = getVisiblePassiveTreeNodeIds(augmentedLayout.nodes, activeTree, itemsById);

    expect(activeTree.nodes.filter((nodeId) => !augmentedNodeIds.has(nodeId))).toEqual([]);
    expect(visibleNodeIds.has(65888)).toBe(true);
    expect(visibleNodeIds.has(65890)).toBe(true);
    expect(visibleNodeIds.has(66896)).toBe(true);
    expect(augmentedLayout.nodes.find((node) => node.id === 65890)?.name).toBe("Unspeakable Gifts");
    expect(augmentedLayout.nodes.find((node) => node.id === 66899)?.name).toBe("Overwhelming Malice");
    expect(augmentedLayout.nodes.find((node) => node.id === 65888)?.stats).toContain(
      "Wand Attacks deal 12% increased Damage with Hits and Ailments",
    );
  });

  it("renders nested medium and small cluster jewels inside Voices", () => {
    const sampleCode = readFileSync(new URL("../../../data/voices nested clusters 328.txt", import.meta.url), "utf8").trim();
    const clusterLayout = JSON.parse(
      readFileSync(
        new URL("../../../apps/web/public/assets/passive-tree/default/layout-default.json", import.meta.url),
        "utf8",
      ),
    ) as PassiveTreeLayout;
    const payload = parseBuildCodeToPayload(sampleCode);
    const activeTree = payload.treeSpecs[payload.activeTreeIndex];
    const itemsById = new Map(payload.items.map((item) => [item.id, item]));

    const augmentedLayout = augmentPassiveTreeLayoutWithClusters(clusterLayout, activeTree, itemsById, "default");
    const augmentedNodeIds = new Set(augmentedLayout.nodes.map((node) => node.id));
    const visibleNodeIds = getVisiblePassiveTreeNodeIds(augmentedLayout.nodes, activeTree, itemsById);
    const dynamicActiveNodeIds = activeTree.nodes.filter((nodeId) => nodeId >= 65536);
    const activeDynamicNodes = augmentedLayout.nodes.filter((node) => dynamicActiveNodeIds.includes(node.id));
    const allDynamicNodes = augmentedLayout.nodes.filter((node) => node.id >= 65536);

    expect(dynamicActiveNodeIds.filter((nodeId) => !augmentedNodeIds.has(nodeId))).toEqual([]);
    expect(dynamicActiveNodeIds.filter((nodeId) => !visibleNodeIds.has(nodeId))).toEqual([]);
    expect(activeDynamicNodes.some((node) => node.name === "Peak Vigour")).toBe(true);
    expect(activeDynamicNodes.some((node) => node.name === "Spiked Concoction")).toBe(true);
    expect(activeDynamicNodes.some((node) => node.name === "Fasting")).toBe(true);
    expect(activeDynamicNodes.some((node) => node.name === "Expert Sabotage")).toBe(true);
    expect(activeDynamicNodes.some((node) => node.name === "Guerilla Tactics")).toBe(true);
    expect(allDynamicNodes.some((node) => node.name === "Enduring Composure")).toBe(true);
    expect(
      activeDynamicNodes.some(
        (node) => node.name === "Small Passive" && node.stats.includes("6% increased Flask Effect Duration"),
      ),
    ).toBe(true);
    expect(
      allDynamicNodes.some((node) => node.name === "Small Passive" && node.stats.includes("15% increased Armour")),
    ).toBe(true);
    expect(
      allDynamicNodes.find((node) => node.name === "Enduring Composure")?.orbitRadius,
    ).toBeGreaterThan(82);
    expect(
      allDynamicNodes.find((node) => node.name === "Small Passive" && node.stats.includes("15% increased Armour"))?.orbitRadius,
    ).toBeGreaterThan(82);
  });

  it("resolves atlas-backed sprites for regular and mastery nodes", () => {
    const notableSprite = resolvePassiveTreeSprite(layout.nodes[1], true, false, spriteManifest);
    expect(notableSprite?.atlas.imagePath).toBe("/assets/passive-tree/default/skills-4.jpg");
    expect(notableSprite?.entry.w).toBe(48);

    const masterySprite = resolvePassiveTreeSprite(layout.nodes[2], true, true, spriteManifest);
    expect(masterySprite?.atlas.imagePath).toBe("/assets/passive-tree/default/mastery-active-selected-4.png");
    expect(masterySprite?.entry.w).toBe(113);
  });

  it("falls back to the notable atlas for transformed keystone icons", () => {
    const transformedKeystoneSpriteManifest: PassiveTreeSpriteManifest = {
      atlases: {
        notableActive: {
          coords: {
            "Art/2DArt/SkillIcons/passives/SupremeProdigy.png": {
              h: 48,
              w: 48,
              x: 512,
              y: 256,
            },
          },
          imagePath: "/assets/passive-tree/default/skills-4.jpg",
          size: {
            height: 1837,
            width: 1248,
          },
        },
      },
    };

    const transformedKeystoneNode: PassiveTreeLayoutNode = {
      flavourText: [],
      groupId: 1,
      groupCenterX: 0,
      groupCenterY: 0,
      id: 999,
      icon: "Art/2DArt/SkillIcons/passives/SupremeProdigy.png",
      isJewelSocket: false,
      isKeystone: true,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "The Agnostic",
      orbit: 1,
      orbitIndex: 0,
      orbitRadius: 500,
      out: [],
      reminderText: [],
      stats: [],
      x: 500,
      y: 0,
    };

    const transformedSprite = resolvePassiveTreeSprite(transformedKeystoneNode, true, false, transformedKeystoneSpriteManifest);
    expect(transformedSprite?.atlas.imagePath).toBe("/assets/passive-tree/default/skills-4.jpg");
    expect(transformedSprite?.entry.w).toBe(48);
  });

  it("falls back to legacy timeless keystone atlases with dds sprite keys", () => {
    const timelessSpriteManifest: PassiveTreeSpriteManifest = {
      atlases: {
        legacyKeystoneActive: {
          coords: {
            "Art/2DArt/SkillIcons/passives/DivineFlesh.dds": {
              h: 64,
              w: 64,
              x: 128,
              y: 64,
            },
          },
          imagePath: "/assets/passive-tree/default/keystone-additional-3.png",
          size: {
            height: 512,
            width: 512,
          },
        },
      },
    };

    const timelessKeystoneNode: PassiveTreeLayoutNode = {
      flavourText: [],
      groupId: 1,
      groupCenterX: 0,
      groupCenterY: 0,
      id: 1001,
      icon: "Art/2DArt/SkillIcons/passives/DivineFlesh.png",
      isJewelSocket: false,
      isKeystone: true,
      isMastery: false,
      isNotable: false,
      masteryEffects: [],
      name: "Divine Flesh",
      orbit: 1,
      orbitIndex: 0,
      orbitRadius: 500,
      out: [],
      reminderText: [],
      stats: [],
      x: 500,
      y: 0,
    };

    const timelessSprite = resolvePassiveTreeSprite(timelessKeystoneNode, true, false, timelessSpriteManifest);
    expect(timelessSprite?.atlas.imagePath).toBe("/assets/passive-tree/default/keystone-additional-3.png");
    expect(timelessSprite?.entry.w).toBe(64);
  });
});
