import { describe, expect, it } from "vitest";

import { resolveGemIconPath, resolveInfluenceIconPath, resolveItemIconCandidates, resolveItemIconPath } from "./icon-paths";

describe("icon-paths", () => {
  it("prefers generated unique art when available", () => {
    const path = resolveItemIconPath(
      {
        anointments: [],
        base: "Champion Kite Shield",
        corrupted: false,
        crafted: [],
        enchantments: [],
        explicits: [],
        fractured: false,
        fracturedMods: [],
        id: 1,
        implicits: [],
        influences: [],
        mirrored: false,
        name: "Aegis Aurora",
        rarity: "Unique",
        raw: "",
        scourgedMods: [],
        crucibleMods: [],
        synthesizedMods: [],
      },
      "Off Hand",
    );

    expect(path).toBe("/assets/items/art/Armours/Shields/ShieldStrIntUnique7unique.png");
  });

  it("resolves base item icons from generated manifest", () => {
    const path = resolveItemIconPath(
      {
        anointments: [],
        base: "Gold Amulet",
        corrupted: false,
        crafted: [],
        enchantments: [],
        explicits: [],
        fractured: false,
        fracturedMods: [],
        id: 1,
        implicits: [],
        influences: [],
        mirrored: false,
        raw: "",
        scourgedMods: [],
        crucibleMods: [],
        synthesizedMods: [],
      },
      "Amulet",
    );

    expect(path).toBe("/assets/items/art/Amulets/Amulet6.png");
  });

  it("resolves pob-data-only rare bases through generated fallback art mappings", () => {
    expect(
      resolveItemIconPath(
        {
          anointments: [],
          base: "Kinetic Wand",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 1,
          implicits: [],
          influences: [],
          mirrored: false,
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
        "Weapon 1",
      ),
    ).toBe("/assets/items/art/Weapons/OneHandWeapons/Wands/Wand3.png");

    expect(
      resolveItemIconPath(
        {
          anointments: [],
          base: "Cord Belt",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 2,
          implicits: [],
          influences: [],
          mirrored: false,
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
        "Belt",
      ),
    ).toBe("/assets/items/art/Belts/SoulcordBelt.png");
  });

  it("resolves newer ring bases from the synced art manifest", () => {
    expect(
      resolveItemIconPath(
        {
          anointments: [],
          base: "Enthalpic Ring",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 5,
          implicits: [],
          influences: [],
          mirrored: false,
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
        "Ring 3",
      ),
    ).toBe("/assets/items/art/Rings/BreachlordRing_Xoph.png");
  });

  it("resolves Energy Blade pseudo-weapon items to their generated sword art instead of slot placeholders", () => {
    expect(
      resolveItemIconPath(
        {
          anointments: [],
          base: "Energy Blade One Handed",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 5,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Energy Blade One Handed",
          rarity: "Normal",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
        "Weapon 1",
      ),
    ).toBe("/assets/items/art/Weapons/OneHandWeapons/OneHandSwords/OneHandSwordStormBlade.png");

    expect(
      resolveItemIconPath(
        {
          anointments: [],
          base: "Energy Blade Two Handed",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 6,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Energy Blade Two Handed",
          rarity: "Normal",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
        "Weapon 1",
      ),
    ).toBe("/assets/items/art/Weapons/TwoHandWeapons/TwoHandSwords/TwoHandSwordStormBlade.png");
  });

  it("prefers upscaled foulborn art, then low-resolution foulborn art, then the non-foulborn art", () => {
    const item = {
      anointments: [],
      base: "Saintly Chainmail",
      corrupted: false,
      crafted: [],
      enchantments: [],
      explicits: [],
      fractured: false,
      fracturedMods: [],
      id: 6,
      implicits: [],
      influences: [],
      mirrored: false,
      name: "Foulborn Incandescent Heart",
      rarity: "Unique" as const,
      raw: "",
      scourgedMods: [],
      crucibleMods: [],
      synthesizedMods: [],
    };

    expect(resolveItemIconPath(item, "Body Armour")).toBe("/assets/items/art/Foulborn/Upscaled/Armours/BodyArmours/Illuminatis.png");
    expect(resolveItemIconCandidates(item, "Body Armour")).toEqual([
      "/assets/items/art/Foulborn/Upscaled/Armours/BodyArmours/Illuminatis.png",
      "/assets/items/art/Foulborn/LowResolution/Armours/BodyArmours/Illuminatis.png",
      "/assets/items/art/Armours/BodyArmours/Illuminatis.png",
    ]);
  });

  it("prefers the upscaled foulborn Aegis Aurora asset before low-res and base fallbacks", () => {
    expect(
      resolveItemIconCandidates(
        {
          anointments: [],
          base: "Champion Kite Shield",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 16,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Foulborn Aegis Aurora",
          rarity: "Unique",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
        "Weapon 2",
      ),
    ).toEqual([
      "/assets/items/art/Foulborn/Upscaled/Armours/Shields/ShieldStrIntUnique7unique.png",
      "/assets/items/art/Foulborn/LowResolution/Armours/Shields/ShieldStrIntUnique7unique.png",
      "/assets/items/art/Armours/Shields/ShieldStrIntUnique7unique.png",
    ]);
  });

  it("resolves unique art from the synced manifest when available", () => {
    expect(
      resolveItemIconPath(
        {
          anointments: [],
          base: "Spectral Axe",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 6,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "The Grey Wind",
          rarity: "Unique",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
        "Weapon 1",
      ),
    ).toBe("/assets/items/art/Weapons/OneHandWeapons/OneHandAxes/SeethingWraith.png");
  });

  it("resolves unique art through normalized name aliases when the item name drops diacritics or adds possessive punctuation", () => {
    expect(
      resolveItemIconPath(
        {
          anointments: [],
          base: "Sadist Garb",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 17,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Doppelganger's Guise",
          rarity: "Unique",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
        "Body Armour",
      ),
    ).toBe("/assets/items/art/Armours/BodyArmours/CollectorsGarbDiff.png");
  });

  it("recovers specific timeless jewel art from raw item text before falling back to generic Timeless Jewel art", () => {
    expect(
      resolveItemIconPath(
        {
          anointments: [],
          base: "Timeless Jewel",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 9,
          iconKey: "Timeless Jewel",
          implicits: [],
          influences: [],
          mirrored: false,
          rarity: "Unique",
          raw: "Rarity: UNIQUE\nLethal Pride\nTimeless Jewel\n--------\nCommanded leadership over 12345 warriors under Kaom",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
        "Jewel 1",
      ),
    ).toBe("/assets/items/art/Jewels/KaruiCivilization.png");
  });

  it("recovers timeless jewel art from pobb.in bracket-annotated timeless jewel names", () => {
    expect(
      resolveItemIconPath(
        {
          anointments: [],
          base: "Timeless Jewel",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          iconKey: "Lethal Pride [10436; 4; Duelist]",
          id: 10,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Lethal Pride [10436; 4; Duelist]",
          rarity: "Unique",
          raw: [
            "Rarity: UNIQUE",
            "Lethal Pride [10436; 4; Duelist]",
            "Timeless Jewel",
            "League: Legion",
            "Variant: Kaom (Strength of Blood)",
            "Variant: Rakiata (Tempered by War)",
          ].join("\n"),
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
        "Jewel 1",
      ),
    ).toBe("/assets/items/art/Jewels/KaruiCivilization.png");
  });

  it("infers magic flask base types so real flask art is used", () => {
    expect(
      resolveItemIconPath(
        {
          anointments: [],
          base: "Gypsum Divine Life Flask of Sealing",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 7,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Gypsum Divine Life Flask of Sealing",
          rarity: "Magic",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
        "Flask 1",
      ),
    ).toBe("/assets/items/art/Flasks/lifeflask11.png");

    expect(
      resolveItemIconPath(
        {
          anointments: [],
          base: "Masochist's Quicksilver Flask of the Kakapo",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 8,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Masochist's Quicksilver Flask of the Kakapo",
          rarity: "Magic",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
        "Flask 3",
      ),
    ).toBe("/assets/items/art/Flasks/sprint.png");
  });

  it("falls back to slot icons when the base name is unknown", () => {
    const path = resolveItemIconPath(
      {
        anointments: [],
        base: "Totally Unknown Base",
        corrupted: false,
        crafted: [],
        enchantments: [],
        explicits: [],
        fractured: false,
        fracturedMods: [],
        id: 1,
        implicits: [],
        influences: [],
        mirrored: false,
        raw: "",
        scourgedMods: [],
        crucibleMods: [],
        synthesizedMods: [],
      },
      "Ring 2",
    );

    expect(path).toBe("/assets/items/slots/icon-ring-right.png");
  });

  it("aliases Ring 3 slot fallbacks to the left ring icon", () => {
    const path = resolveItemIconPath(
      {
        anointments: [],
        base: "Totally Unknown Base",
        corrupted: false,
        crafted: [],
        enchantments: [],
        explicits: [],
        fractured: false,
        fracturedMods: [],
        id: 2,
        implicits: [],
        influences: [],
        mirrored: false,
        raw: "",
        scourgedMods: [],
        crucibleMods: [],
        synthesizedMods: [],
      },
      "Ring 3",
    );

    expect(path).toBe("/assets/items/slots/icon-ring-left.png");
  });

  it("resolves active and support gems to real art when available", () => {
    expect(
      resolveGemIconPath({
        enabled: true,
        level: 20,
        gemId: "Metadata/Items/Gems/SupportGemAddedColdDamage",
        nameSpec: "Added Cold Damage Support",
        quality: 20,
        selected: false,
        support: true,
      }),
    ).toBe("/assets/items/art/Gems/Support/AddedColdDamage.png");

    expect(
      resolveGemIconPath({
        enabled: true,
        gemId: "Metadata/Items/Gems/SkillGemAbsolution",
        level: 20,
        nameSpec: "Absolution",
        quality: 20,
        selected: true,
        support: false,
      }),
    ).toBe("/assets/items/art/Gems/AbsolutionBlastGem.png");
  });

  it("falls back from alternate and skill ids to the resolved base gem art", () => {
    expect(
      resolveGemIconPath({
        enabled: true,
        gemId: "Metadata/Items/Gems/SkillGemAbsolutionAltX",
        level: 20,
        nameSpec: "Absolution of Inspiring",
        quality: 20,
        selected: true,
        support: false,
      }),
    ).toBe("/assets/items/art/Gems/AbsolutionBlastGem.png");

    expect(
      resolveGemIconPath({
        enabled: true,
        level: 5,
        nameSpec: "Awakened Elemental Damage with Attacks Support",
        quality: 20,
        selected: false,
        skillId: "SupportAwakenedElementalDamageWithAttacks",
        support: true,
      }),
    ).toBe("/assets/items/art/Gems/Support/SupportPlus/WeaponElementalDamagePlus.png");
  });

  it("returns no icon for item-granted skills without a real gem item id", () => {
    expect(
      resolveGemIconPath({
        enabled: true,
        level: 20,
        nameSpec: "Aspect of the Cat",
        quality: 0,
        selected: true,
        skillId: "AspectOfTheCat",
        support: false,
      }),
    ).toBeUndefined();
  });

  it("resolves known influence icons", () => {
    expect(resolveInfluenceIconPath("Shaper Item")).toBe("/assets/ui/influences/shapericon.png");
  });
});
