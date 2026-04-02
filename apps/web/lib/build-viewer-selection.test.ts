import { describe, expect, it } from "vitest";

import type { BuildPayload } from "@pobcodes/shared-types";

import {
  applyBuildLoadout,
  findMatchingBuildLoadout,
  getBuildLoadouts,
  getInitialBuildViewerSelection,
} from "./build-viewer-selection";

const basePayload: BuildPayload = {
  activeConfigSetId: 1,
  activeItemSetId: 1,
  activeSkillSetId: 1,
  activeTreeIndex: 0,
  build: {
    className: "Templar",
    level: 95,
    mainSocketGroup: 1,
  },
  config: {
    enemyIsBoss: false,
  },
  configSets: [
    {
      active: true,
      id: 1,
      inputs: {
        enemyIsBoss: false,
      },
      title: "Mapping",
    },
    {
      active: false,
      id: 2,
      inputs: {
        enemyIsBoss: true,
      },
      title: "Bossing {2}",
    },
    {
      active: false,
      id: 3,
      inputs: {
        enemyShocked: true,
      },
      title: "Bossing {3}",
    },
  ],
  gameVersion: "poe1",
  itemSets: [
    {
      active: true,
      id: 1,
      slots: [],
      title: "Mapping",
    },
    {
      active: false,
      id: 2,
      slots: [],
      title: "Bossing Items {2,3}",
    },
  ],
  items: [],
  meta: {
    source: "id",
  },
  notes: "",
  skillSets: [
    {
      active: true,
      groups: [],
      id: 1,
      title: "Mapping",
    },
    {
      active: false,
      groups: [],
      id: 2,
      title: "Bossing Skills {2}",
    },
    {
      active: false,
      groups: [],
      id: 3,
      title: "Bossing Skills {3}",
    },
  ],
  stats: {
    fullDpsSkills: [],
    minion: {},
    minionRows: [],
    player: {},
    playerRows: [],
  },
  treeSpecs: [
    {
      active: true,
      masteryEffects: [],
      nodes: [],
      overrides: [],
      sockets: [],
      title: "Mapping",
    },
    {
      active: false,
      masteryEffects: [],
      nodes: [],
      overrides: [],
      sockets: [],
      title: "Bossing Tree {2}",
    },
    {
      active: false,
      masteryEffects: [],
      nodes: [],
      overrides: [],
      sockets: [],
      title: "Bossing Tree {3}",
    },
  ],
};

describe("build viewer selection", () => {
  it("derives PoB-style exact-match and grouped loadouts", () => {
    const loadouts = getBuildLoadouts(basePayload);

    expect(loadouts).toEqual([
      {
        configSetId: 1,
        itemSetId: 1,
        key: "exact:0:Mapping",
        label: "Mapping",
        skillSetId: 1,
        treeIndex: 0,
      },
      {
        configSetId: 2,
        itemSetId: 2,
        key: "group:1:2",
        label: "Bossing Tree {2}",
        skillSetId: 2,
        treeIndex: 1,
      },
      {
        configSetId: 3,
        itemSetId: 2,
        key: "group:2:3",
        label: "Bossing Tree {3}",
        skillSetId: 3,
        treeIndex: 2,
      },
    ]);
  });

  it("applies a loadout across tree, items, skills, and config", () => {
    expect(applyBuildLoadout(basePayload, "group:1:2")).toEqual({
      configSetId: 2,
      itemSetId: 2,
      skillSetId: 2,
      treeIndex: 1,
    });
  });

  it("matches the current selection back to a loadout and falls back to custom when selectors drift", () => {
    const initialSelection = getInitialBuildViewerSelection(basePayload);
    expect(findMatchingBuildLoadout(basePayload, initialSelection)?.label).toBe("Mapping");

    expect(
      findMatchingBuildLoadout(basePayload, {
        configSetId: 3,
        itemSetId: 2,
        skillSetId: 2,
        treeIndex: 1,
      }),
    ).toBeUndefined();
  });

  it("uses a single config set across all derived loadouts", () => {
    const payload: BuildPayload = {
      ...basePayload,
      activeConfigSetId: 1,
      config: {
        enemyIsBoss: false,
      },
      configSets: [
        {
          active: true,
          id: 1,
          inputs: {
            enemyIsBoss: false,
          },
          title: "Default",
        },
      ],
    };

    const loadouts = getBuildLoadouts(payload);
    expect(loadouts).toEqual([
      {
        configSetId: 1,
        itemSetId: 1,
        key: "exact:0:Mapping",
        label: "Mapping",
        skillSetId: 1,
        treeIndex: 0,
      },
      {
        configSetId: 1,
        itemSetId: 2,
        key: "group:1:2",
        label: "Bossing Tree {2}",
        skillSetId: 2,
        treeIndex: 1,
      },
      {
        configSetId: 1,
        itemSetId: 2,
        key: "group:2:3",
        label: "Bossing Tree {3}",
        skillSetId: 3,
        treeIndex: 2,
      },
    ]);
  });
});
