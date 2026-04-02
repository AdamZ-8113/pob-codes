import { describe, expect, it } from "vitest";

import { parseRawItem } from "./item-parser";

describe("item-parser", () => {
  it("parses indented rare exports with the correct base type", () => {
    const item = parseRawItem(
      `
        Rarity: RARE
        Rift Locket
        Heavy Belt
        Item Level: 83
        --------
        +168 to maximum Life
      `,
      1,
    );

    expect(item.rarity).toBe("Rare");
    expect(item.name).toBe("Rift Locket");
    expect(item.base).toBe("Heavy Belt");
    expect(item.explicits).toEqual(["+168 to maximum Life"]);
  });

  it("parses indented magic flasks without leaking separator lines into mods", () => {
    const item = parseRawItem(
      `
        Rarity: MAGIC
        Gypsum Divine Life Flask of Sealing
        Item Level: 84
        --------
        22% increased Charges per use
      `,
      2,
    );

    expect(item.rarity).toBe("Magic");
    expect(item.name).toBe("Gypsum Divine Life Flask of Sealing");
    expect(item.base).toBe("Gypsum Divine Life Flask of Sealing");
    expect(item.explicits).toEqual(["22% increased Charges per use"]);
  });

  it("preserves explicit display order and keeps footer state lines out of modifiers", () => {
    const item = parseRawItem(
      `
        Rarity: RARE
        Sol Sanctuary
        Sacred Chainmail
        Armour: 3021
        ArmourBasePercentile: 0.7315
        Energy Shield: 437
        EnergyShieldBasePercentile: 0.7315
        Quality: 20
        Sockets: B-R-B-R-G-R
        LevelReq: 84
        Implicits: 2
        {enchant}Wrath has 19% increased Aura Effect
        +20% to Critical Strike Multiplier for Attack Damage
        126% increased Armour and Energy Shield
        +44% to Fire Resistance
        +31% to Lightning Resistance
        17% increased Stun and Block Recovery
        {fractured}+24% to Chaos Resistance
        {crafted}+311 to Armour
        Searing Exarch Item
        Eater of Worlds Item
        Fractured Item
      `,
      3,
    );

    expect(item.enchantments).toEqual(["Wrath has 19% increased Aura Effect"]);
    expect(item.quality).toBe(20);
    expect(item.armour).toBe(3021);
    expect(item.energyShield).toBe(437);
    expect(item.sockets).toBe("B-R-B-R-G-R");
    expect(item.requirements).toEqual({
      level: 84,
      str: 173,
      int: 173,
    });
    expect(item.implicits).toEqual(["+20% to Critical Strike Multiplier for Attack Damage"]);
    expect(item.explicits).toEqual([
      "126% increased Armour and Energy Shield",
      "+44% to Fire Resistance",
      "+31% to Lightning Resistance",
      "17% increased Stun and Block Recovery",
    ]);
    expect(item.fracturedMods).toEqual(["+24% to Chaos Resistance"]);
    expect(item.crafted).toEqual(["+311 to Armour"]);
    expect(item.orderedExplicitMods).toEqual([
      { text: "+24% to Chaos Resistance", kind: "fractured" },
      { text: "126% increased Armour and Energy Shield", kind: "explicit" },
      { text: "+44% to Fire Resistance", kind: "explicit" },
      { text: "+31% to Lightning Resistance", kind: "explicit" },
      { text: "17% increased Stun and Block Recovery", kind: "explicit" },
      { text: "+311 to Armour", kind: "crafted" },
    ]);
    expect(item.fractured).toBe(true);
    expect(item.explicits).not.toContain("Fractured Item");
    expect(item.influences).toEqual(["Searing Exarch Item", "Eater of Worlds Item"]);
  });

  it("treats PoB-style crafted anoints inside the implicit block as anointments, not explicits", () => {
    const item = parseRawItem(
      `
        Rarity: RARE
        Apocalypse Noose
        Citrine Amulet
        Item Level: 83
        LevelReq: 59
        Implicits: 2
        {crafted}Allocates Prodigal Perfection
        +16 to Strength and Dexterity
        +43 to Strength
        +44 to maximum Energy Shield
        +9% to all Elemental Resistances
        +11% to Fire Resistance
        {crafted}+46 to maximum Life
      `,
      4,
    );

    expect(item.anointments).toEqual(["Allocates Prodigal Perfection"]);
    expect(item.enchantments).toEqual([]);
    expect(item.implicits).toEqual(["+16 to Strength and Dexterity"]);
    expect(item.crafted).toEqual(["+46 to maximum Life"]);
    expect(item.explicits).toEqual([
      "+43 to Strength",
      "+44 to maximum Energy Shield",
      "+9% to all Elemental Resistances",
      "+11% to Fire Resistance",
    ]);
    expect(item.orderedExplicitMods).toEqual([
      { text: "+43 to Strength", kind: "explicit" },
      { text: "+44 to maximum Energy Shield", kind: "explicit" },
      { text: "+9% to all Elemental Resistances", kind: "explicit" },
      { text: "+11% to Fire Resistance", kind: "explicit" },
      { text: "+46 to maximum Life", kind: "crafted" },
    ]);
  });

  it("treats catalyst quality as item quality for jewellery tooltips", () => {
    const item = parseRawItem(
      `
        Rarity: UNIQUE
        Marylene's Fallacy
        Lapis Amulet
        Catalyst: Unstable
        CatalystQuality: 20
        Implicits: 1
        +20 to Intelligence
        +100 to Accuracy Rating
      `,
      7,
    );

    expect(item.quality).toBe(20);
    expect(item.implicits).toEqual(["+20 to Intelligence"]);
    expect(item.explicits).toEqual(["+100 to Accuracy Rating"]);
  });

  it("treats decorated quality lines as item quality for jewellery tooltips", () => {
    const item = parseRawItem(
      `
        Rarity: UNIQUE
        Marylene's Fallacy
        Lapis Amulet
        Quality (Attribute Modifiers): +20%
        Implicits: 1
        +20 to Intelligence
        +100 to Accuracy Rating
      `,
      8,
    );

    expect(item.quality).toBe(20);
    expect(item.implicits).toEqual(["+20 to Intelligence"]);
    expect(item.explicits).toEqual(["+100 to Accuracy Rating"]);
  });

  it("promotes foil uniques to relic rarity and keeps the foil type", () => {
    const item = parseRawItem(
      `
        Rarity: UNIQUE
        Progenesis
        Amethyst Flask
        Implicits: 1
        Lasts 8.20 Seconds
        Foil Unique (Celestial Ruby)
      `,
      9,
    );

    expect(item.rarity).toBe("Relic");
    expect(item.foilType).toBe("Celestial Ruby");
  });

  it("only keeps the selected unique variant lines and preserves implicit counts", () => {
    const item = parseRawItem(
      `
        Rarity: UNIQUE
        Shavronne's Revelation
        Moonstone Ring
        Variant: Pre 1.2.0
        Variant: Pre 2.6.0
        Variant: Pre 3.19.0
        Variant: Current
        Selected Variant: 4
        Implicits: 1
        +(15-25) to maximum Energy Shield
        +(60-75) to Intelligence
        Right ring slot: You cannot Regenerate Mana
        {variant:1}Right ring slot: Regenerate 4% of Energy Shield per second
        {variant:2,3}Right ring slot: Regenerate 3% of Energy Shield per second
        {variant:4}Right ring slot: Regenerate 6% of Energy Shield per second
        {variant:3}Right ring slot: +100 to maximum Mana
        {variant:4}Right ring slot: +250 to maximum Mana
        Left ring slot: You cannot Recharge or Regenerate Energy Shield
        {variant:4,3}Left ring slot: Regenerate 40 Mana per Second
        {variant:3}Left ring slot: +100 to maximum Energy Shield
        {variant:4}Left ring slot: +250 to maximum Energy Shield
        {variant:1,2}Left ring slot: 100% increased Mana Regeneration Rate
      `,
      5,
    );

    expect(item.implicits).toEqual(["+(15-25) to maximum Energy Shield"]);
    expect(item.explicits).toEqual([
      "+(60-75) to Intelligence",
      "Right ring slot: You cannot Regenerate Mana",
      "Right ring slot: Regenerate 6% of Energy Shield per second",
      "Right ring slot: +250 to maximum Mana",
      "Left ring slot: You cannot Recharge or Regenerate Energy Shield",
      "Left ring slot: Regenerate 40 Mana per Second",
      "Left ring slot: +250 to maximum Energy Shield",
    ]);
    expect(item.orderedExplicitMods).toEqual([
      { text: "+(60-75) to Intelligence", kind: "explicit" },
      { text: "Right ring slot: You cannot Regenerate Mana", kind: "explicit" },
      { text: "Right ring slot: Regenerate 6% of Energy Shield per second", kind: "explicit" },
      { text: "Right ring slot: +250 to maximum Mana", kind: "explicit" },
      { text: "Left ring slot: You cannot Recharge or Regenerate Energy Shield", kind: "explicit" },
      { text: "Left ring slot: Regenerate 40 Mana per Second", kind: "explicit" },
      { text: "Left ring slot: +250 to maximum Energy Shield", kind: "explicit" },
    ]);
  });

  it("keeps only the selected variant implicit on uniques with variant-gated implicits", () => {
    const item = parseRawItem(
      `
        Rarity: UNIQUE
        Rearguard
        Blunt Arrow Quiver
        Variant: Pre 3.17.0
        Variant: Current
        Selected Variant: 2
        Implicits: 2
        {variant:1}6 to 12 Added Physical Damage with Bow Attacks
        {variant:2}(7-9) to (13-16) Added Physical Damage with Bow Attacks
        (20-24)% Chance to Block Attack Damage
        (12-15)% Chance to Block Spell Damage
        +(400-450) to Armour
      `,
      6,
    );

    expect(item.implicits).toEqual([
      "(7-9) to (13-16) Added Physical Damage with Bow Attacks",
      "(20-24)% Chance to Block Attack Damage",
    ]);
    expect(item.explicits).toEqual(["(12-15)% Chance to Block Spell Damage", "+(400-450) to Armour"]);
  });

  it("applies range tags to display the rolled values from PoB exports", () => {
    const item = parseRawItem(
      `
        Rarity: UNIQUE
        Nimis
        Topaz Ring
        CatalystQuality: 20
        LevelReq: 48
        Implicits: 1
        {tags:jewellery_resistance}{range:1}+(20-30)% to Lightning Resistance
        {tags:jewellery_attribute}{range:0.5}+(30-50) to Dexterity
        {range:0.5}(25-35)% increased Projectile Damage
        Projectiles Return to you at end of flight
        Projectiles are fired in random directions
      `,
      9,
    );

    expect(item.implicits).toEqual(["+30% to Lightning Resistance"]);
    expect(item.explicits).toEqual([
      "+40 to Dexterity",
      "30% increased Projectile Damage",
      "Projectiles Return to you at end of flight",
      "Projectiles are fired in random directions",
    ]);
  });

  it("rounds ranged unique item rolls the same way PoB displays them", () => {
    const item = parseRawItem(
      `
        Rarity: UNIQUE
        Yoke of Suffering
        Onyx Amulet
        Variant: Pre 3.24.0
        Variant: Current
        Selected Variant: 2
        LevelReq: 70
        Implicits: 2
        {crafted}Allocates Prism Weave
        {tags:jewellery_attribute}{range:1}+(10-16) to all Attributes
        {tags:jewellery_resistance}{range:0.768}+(10-20)% to Fire Resistance
        {tags:jewellery_resistance}{range:0.756}+(10-20)% to Cold Resistance
        {tags:jewellery_resistance}{range:0.854}+(20-40)% to Lightning Resistance
        30% reduced Duration of Ailments on Enemies
        {range:0.5}(5-10)% chance to Shock
        {variant:2}{range:1}Enemies take (5-10)% increased Damage for each type of Ailment you have inflicted on them
        Your Elemental Damage can Shock
      `,
      11,
    );

    expect(item.anointments).toEqual(["Allocates Prism Weave"]);
    expect(item.implicits).toEqual(["+16 to all Attributes"]);
    expect(item.explicits).toEqual([
      "+18% to Fire Resistance",
      "+18% to Cold Resistance",
      "+37% to Lightning Resistance",
      "30% reduced Duration of Ailments on Enemies",
      "8% chance to Shock",
      "Enemies take 10% increased Damage for each type of Ailment you have inflicted on them",
      "Your Elemental Damage can Shock",
    ]);
  });

  it("keeps only the selected Thread of Hope variant and resolves its rolled resistance", () => {
    const item = parseRawItem(
      `
        Rarity: UNIQUE
        Thread of Hope
        Crimson Jewel
        Variant: Small Ring
        Variant: Medium Ring
        Variant: Large Ring
        Variant: Very Large Ring
        Variant: Massive Ring (Uber)
        Selected Variant: 5
        Radius: Variable
        Implicits: 0
        {variant:1}Only affects Passives in Small Ring
        {variant:2}Only affects Passives in Medium Ring
        {variant:3}Only affects Passives in Large Ring
        {variant:4}Only affects Passives in Very Large Ring
        {variant:5}Only affects Passives in Massive Ring
        Passives in Radius can be Allocated without being connected to your tree
        {range:1}-(20-10)% to all Elemental Resistances
      `,
      10,
    );

    expect(item.implicits).toEqual([]);
    expect(item.jewelRadius).toBe("massive");
    expect(item.explicits).toEqual([
      "Only affects Passives in Massive Ring",
      "Passives in Radius can be Allocated without being connected to your tree",
      "-10% to all Elemental Resistances",
    ]);
  });

  it("parses Lethal Pride with its specific timeless jewel identity", () => {
    const item = parseRawItem(
      `
        Rarity: UNIQUE
        Lethal Pride
        Timeless Jewel
        Unique ID: be9e4c528e3d6868a7b77adc19740df6c0bf00411eeda42f31e85e85755b624f
        Item Level: 84
        Radius: Large
        Implicits: 0
        Commanded leadership over 17240 warriors under Kaom
        Passives in radius are Conquered by the Karui
        Historic
      `,
      12,
    );

    expect(item.rarity).toBe("Unique");
    expect(item.name).toBe("Lethal Pride");
    expect(item.base).toBe("Timeless Jewel");
    expect(item.iconKey).toBe("Lethal Pride");
    expect(item.jewelRadius).toBe("large");
    expect(item.explicits).toEqual([
      "Commanded leadership over 17240 warriors under Kaom",
      "Passives in radius are Conquered by the Karui",
      "Historic",
    ]);
  });

  it("marks Kalandra's Touch as mirrored even when PoB omits the mirrored line", () => {
    const item = parseRawItem(
      `
        Rarity: UNIQUE
        Kalandra's Touch
        Ring
        Unique ID: 233dc9fcf25e2bb23602c055fc4517fb3abb4e082733b9ee762d15cba051e6de
        Item Level: 83
        Implicits: 0
        Reflects opposite Ring
      `,
      13,
    );

    expect(item.mirrored).toBe(true);
    expect(item.split).toBe(false);
    expect(item.explicits).toEqual(["Reflects opposite Ring"]);
  });

  it("parses standalone split and mirrored flags without treating them as explicit mods", () => {
    const item = parseRawItem(
      `
        Rarity: RARE
        Doom Knot
        Iron Ring
        Implicits: 0
        +17 to Strength
        {variant:1}Split Item
        Mirrored
      `,
      14,
    );

    expect(item.split).toBe(true);
    expect(item.mirrored).toBe(true);
    expect(item.explicits).toEqual(["+17 to Strength"]);
  });
});
