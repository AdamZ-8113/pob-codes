import { describe, expect, it } from "vitest";

import { buildConfigDisplaySections, compactConfigDisplaySections } from "./pob-config-display";

describe("pob-config-display", () => {
  it("groups entries into PoB sections, resolves list labels, and keeps custom modifiers separate", () => {
    const sections = buildConfigDisplaySections({
      bandit: "Alira",
      conditionConsumedCorpseRecently: true,
      conditionEnemyShocked: true,
      enemyIsBoss: "Uber",
      customMods: "Enemies take 10% increased Damage\nNearby enemies are intimidated",
      projectileDistance: 40,
      useFrenzyCharges: true,
    });

    expect(sections).toEqual([
      {
        column: 1,
        key: "General",
        rows: [
          {
            key: "bandit",
            label: "Bandit quest",
            type: "value",
            value: "Help Alira",
          },
        ],
        title: "General",
      },
      {
        column: 1,
        key: "When In Combat",
        rows: [
          {
            key: "useFrenzyCharges",
            label: "Do you use Frenzy Charges",
            type: "toggle",
          },
          {
            key: "conditionConsumedCorpseRecently",
            label: "Consumed a corpse Recently",
            type: "toggle",
          },
        ],
        title: "When In Combat",
      },
      {
        column: 1,
        key: "For Effective DPS",
        rows: [
          {
            key: "projectileDistance",
            label: "Projectile travel distance",
            type: "value",
            value: "40",
          },
          {
            key: "conditionEnemyShocked",
            label: "Is the enemy Shocked",
            type: "toggle",
          },
        ],
        title: "For Effective DPS",
      },
      {
        column: 3,
        key: "Enemy Stats",
        rows: [
          {
            key: "enemyIsBoss",
            label: "Is the enemy a Boss",
            type: "value",
            value: "Uber Pinnacle Boss",
          },
        ],
        title: "Enemy Stats",
      },
      {
        column: 1,
        key: "Custom Modifiers",
        rows: [
          {
            key: "customMods:Enemies take 10% increased Damage",
            label: "Enemies take 10% increased Damage",
            type: "custom",
          },
          {
            key: "customMods:Nearby enemies are intimidated",
            label: "Nearby enemies are intimidated",
            type: "custom",
          },
        ],
        title: "Custom Modifiers",
      },
    ]);
  });

  it("hides empty and default-valued configs", () => {
    const sections = buildConfigDisplaySections({
      conditionConsumedCorpseRecently: false,
      customMods: "   ",
      enemyIsBoss: "Pinnacle",
      resistancePenalty: -60,
      usePowerCharges: false,
    });

    expect(sections).toEqual([]);
  });

  it("keeps unknown non-default entries in an Other section", () => {
    const sections = buildConfigDisplaySections({
      mysterySetting: "Enabled",
      weirdToggle: true,
    });

    expect(sections).toEqual([
      {
        key: "Other",
        rows: [
          {
            key: "mysterySetting",
            label: "Mystery Setting",
            type: "value",
            value: "Enabled",
          },
          {
            key: "weirdToggle",
            label: "Weird Toggle",
            type: "toggle",
          },
        ],
        title: "Other",
      },
    ]);
  });

  it("reorders sections row-first by interleaving PoB columns", () => {
    const sections = compactConfigDisplaySections([
      { column: 1, key: "General", rows: [], title: "General" },
      { column: 1, key: "When In Combat", rows: [], title: "When In Combat" },
      { column: 1, key: "For Effective DPS", rows: [], title: "For Effective DPS" },
      { column: 3, key: "Enemy Stats", rows: [], title: "Enemy Stats" },
      { column: 1, key: "Custom Modifiers", rows: [], title: "Custom Modifiers" },
    ]);

    expect(sections.map((section) => section.title)).toEqual([
      "General",
      "Enemy Stats",
      "When In Combat",
      "For Effective DPS",
      "Custom Modifiers",
    ]);
  });
});
