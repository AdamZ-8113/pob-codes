/* @vitest-environment jsdom */

import React from "react";

import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BuildPayload } from "@pobcodes/shared-types";

import { buildViewerPayloadFixture } from "../test/fixtures/build-viewer-fixture";
import { ItemsPanel, resetFoulbornIconAvailabilityCacheForTests } from "./items-panel";

describe("ItemsPanel", () => {
  afterEach(() => {
    cleanup();
    resetFoulbornIconAvailabilityCacheForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders tooltip sections in PoB order and moves influence state to header icons", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 3001,
              name: "Body Armour",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          armour: 3021,
          anointments: [],
          base: "Sacred Chainmail",
          corrupted: true,
          crafted: ["+311 to Armour"],
          energyShield: 437,
          enchantments: ["Wrath has 19% increased Aura Effect"],
          evasion: undefined,
          explicits: ["126% increased Armour and Energy Shield", "+44% to Fire Resistance"],
          fractured: true,
          fracturedMods: ["+24% to Chaos Resistance"],
          id: 3001,
          implicits: ["+20% to Critical Strike Multiplier for Attack Damage"],
          influences: ["Searing Exarch Item", "Eater of Worlds Item"],
          mirrored: false,
          name: "Sol Sanctuary",
          orderedExplicitMods: [
            { text: "+24% to Chaos Resistance", kind: "fractured" },
            { text: "126% increased Armour and Energy Shield", kind: "explicit" },
            { text: "+44% to Fire Resistance", kind: "explicit" },
            { text: "+311 to Armour", kind: "crafted" },
          ],
          quality: 20,
          rarity: "Rare",
          raw: "",
          requirements: {
            level: 84,
            str: 173,
            int: 173,
          },
          scourgedMods: [],
          sockets: "B-R-B-R-G-R",
          split: false,
          synthesizedMods: [],
          synthesised: false,
          crucibleMods: [],
          ward: undefined,
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);
    const sections = Array.from(container.querySelectorAll(".poe-tooltip .poe-mods")).map((section) =>
      Array.from(section.children).map((line) => line.textContent?.trim() ?? ""),
    );
    const headerIcons = Array.from(container.querySelectorAll(".poe-tooltip .poe-header .poe-header-icon")).map((icon) =>
      icon.getAttribute("src"),
    );

    expect(sections).toEqual([
      ["Quality: +20%", "Armour: 3,021", "Energy Shield: 437", "Sockets: B=R=B=R=G=R"],
      ["Requires Level 84, 173 Str, 173 Int"],
      ["Wrath has 19% increased Aura Effect"],
      ["+20% to Critical Strike Multiplier for Attack Damage"],
      [
        "+24% to Chaos Resistance",
        "126% increased Armour and Energy Shield",
        "+44% to Fire Resistance",
        "+311 to Armour",
      ],
      ["Corrupted"],
    ]);
    expect(sections[2]).not.toContain("Fractured Item");
    expect(container.querySelector(".poe-tooltip")?.textContent).not.toContain("Searing Exarch Item");
    expect(container.querySelector(".poe-tooltip")?.textContent).not.toContain("Eater of Worlds Item");
    expect(container.querySelector(".poe-tooltip")?.textContent).not.toContain("Fractured Item");
    expect(headerIcons).toEqual([
      "/assets/ui/influences/exarchicon.png",
      "/assets/ui/influences/eatericon.png",
    ]);
  });

  it("renders jewellery quality in the tooltip", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 3004,
              name: "Ring 1",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Moonstone Ring",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: ["+250 to maximum Mana"],
          fractured: false,
          fracturedMods: [],
          id: 3004,
          implicits: ["+(15-25) to maximum Energy Shield"],
          influences: [],
          mirrored: false,
          name: "Shavronne's Revelation",
          quality: 20,
          rarity: "Unique",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);

    expect(container.querySelector(".poe-tooltip")?.textContent).toContain("Quality: +20%");
  });

  it("shows mirrored footer text and flips the icon for Kalandra's Touch even if cached payloads missed the flag", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 3005,
              name: "Ring 2",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Ring",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: ["Reflects opposite Ring"],
          fractured: false,
          fracturedMods: [],
          id: 3005,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Kalandra's Touch",
          quality: undefined,
          rarity: "Unique",
          raw: "Rarity: UNIQUE\nKalandra's Touch\nRing\nImplicits: 0\nReflects opposite Ring",
          scourgedMods: [],
          crucibleMods: [],
          split: false,
          synthesizedMods: [],
          synthesised: false,
          ward: undefined,
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);
    const icon = container.querySelector('.gear-slot img[alt="Kalandra\'s Touch"]');

    expect(container.querySelector(".poe-tooltip")?.textContent).toContain("Mirrored");
    expect(icon?.classList.contains("gear-item-icon--mirrored")).toBe(true);
  });

  it("falls back to raw split and mirrored tags for tooltip footer flags", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 3006,
              name: "Ring 1",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Iron Ring",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: ["+17 to Strength"],
          fractured: false,
          fracturedMods: [],
          id: 3006,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Doom Knot",
          quality: undefined,
          rarity: "Rare",
          raw: "Rarity: RARE\nDoom Knot\nIron Ring\nImplicits: 0\n+17 to Strength\nSplit Item\nMirrored Item",
          scourgedMods: [],
          crucibleMods: [],
          split: false,
          synthesizedMods: [],
          synthesised: false,
          ward: undefined,
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);

    expect(container.querySelector(".poe-tooltip")?.textContent).toContain("Split");
    expect(container.querySelector(".poe-tooltip")?.textContent).toContain("Mirrored");
    expect(container.querySelector(".gear-slot img")?.classList.contains("gear-item-icon--mirrored")).toBe(true);
  });

  it("does not repeat the base line for magic items whose name already includes the base type", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 3010,
              name: "Flask 1",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Gypsum Divine Life Flask of Sealing",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: ["22% increased Charges per use"],
          fractured: false,
          fracturedMods: [],
          id: 3010,
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
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);

    expect(container.querySelector(".poe-name")?.textContent).toBe("Gypsum Divine Life Flask of Sealing");
    expect(container.querySelector(".poe-base")).toBeNull();
  });

  it("renders relic items with the foil tooltip skin and foil color metadata", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 3012,
              name: "Flask 1",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Amethyst Flask",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: ["When Hit during effect, 25% of Life loss from Damage taken occurs over 4 seconds instead"],
          foilType: "Celestial Ruby",
          fractured: false,
          fracturedMods: [],
          id: 3012,
          implicits: ["Used when Charges reach full"],
          influences: [],
          mirrored: false,
          name: "Progenesis",
          quality: 20,
          rarity: "Relic",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);
    const tooltip = container.querySelector(".poe-tooltip-relic") as HTMLElement | null;

    expect(tooltip).toBeTruthy();
    expect(tooltip?.style.getPropertyValue("--foil-rgb")).toBe("204 77 51");
  });

  it("copies normalized raw item text when clicking an occupied item slot", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 9999,
              name: "Amulet",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Onyx Amulet",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 9999,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Yoke of Suffering",
          rarity: "Unique",
          raw: "\n\t\tRarity: UNIQUE\nYoke of Suffering\nOnyx Amulet\n--------\nItem Level: 85\n\t\t",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { getByRole, getByText } = render(<ItemsPanel payload={payload} />);
    const slot = getByRole("button", { name: "Copy Yoke of Suffering to clipboard" });
    fireEvent.click(slot);

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("Rarity: UNIQUE\nYoke of Suffering\nOnyx Amulet\nItem Level: 85"),
    );
    await waitFor(() => expect(getByText("Item copied to clipboard")).toBeTruthy());
    await waitFor(() => expect(slot.className).toContain("gear-slot--copied"));
  });

  it("renders anointments in their own section above implicits", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 3002,
              name: "Amulet",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: ["Allocates Prodigal Perfection"],
          base: "Citrine Amulet",
          corrupted: false,
          crafted: ["+46 to maximum Life"],
          enchantments: [],
          explicits: [
            "+43 to Strength",
            "+44 to maximum Energy Shield",
            "+9% to all Elemental Resistances",
            "+11% to Fire Resistance",
          ],
          fractured: false,
          fracturedMods: [],
          id: 3002,
          implicits: ["+16 to Strength and Dexterity"],
          influences: [],
          mirrored: false,
          name: "Apocalypse Noose",
          orderedExplicitMods: [
            { text: "+43 to Strength", kind: "explicit" },
            { text: "+44 to maximum Energy Shield", kind: "explicit" },
            { text: "+9% to all Elemental Resistances", kind: "explicit" },
            { text: "+11% to Fire Resistance", kind: "explicit" },
            { text: "+46 to maximum Life", kind: "crafted" },
          ],
          rarity: "Rare",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);
    const sections = Array.from(container.querySelectorAll(".poe-tooltip .poe-mods")).map((section) =>
      Array.from(section.children).map((line) => line.textContent?.trim() ?? ""),
    );

    expect(sections).toEqual([
      ["Allocates Prodigal Perfection"],
      ["+16 to Strength and Dexterity"],
      [
        "+43 to Strength",
        "+44 to maximum Energy Shield",
        "+9% to all Elemental Resistances",
        "+11% to Fire Resistance",
        "+46 to maximum Life",
      ],
    ]);
  });

  it("filters raw unique variant lines when ordered explicit mods are unavailable", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 3003,
              name: "Ring 1",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Moonstone Ring",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 3003,
          implicits: ["+(15-25) to maximum Energy Shield"],
          influences: [],
          mirrored: false,
          name: "Shavronne's Revelation",
          rarity: "Unique",
          raw: `
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
          `,
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);
    const sections = Array.from(container.querySelectorAll(".poe-tooltip .poe-mods")).map((section) =>
      Array.from(section.children).map((line) => line.textContent?.trim() ?? ""),
    );

    expect(sections).toEqual([
      ["+(15-25) to maximum Energy Shield"],
      [
        "+(60-75) to Intelligence",
        "Right ring slot: You cannot Regenerate Mana",
        "Right ring slot: Regenerate 6% of Energy Shield per second",
        "Right ring slot: +250 to maximum Mana",
      ],
    ]);
    expect(container.querySelector(".poe-tooltip")?.textContent).not.toContain(
      "Right ring slot: Regenerate 4% of Energy Shield per second",
    );
    expect(container.querySelector(".poe-tooltip")?.textContent).not.toContain(
      "Right ring slot: Regenerate 3% of Energy Shield per second",
    );
  });

  it("resolves raw range tags and filters Thread of Hope variant lines in the tooltip fallback", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 3011,
              name: "Socket 1",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Crimson Jewel",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 3011,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Thread of Hope",
          rarity: "Unique",
          raw: `
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
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);
    const tooltipText = container.querySelector(".poe-tooltip")?.textContent ?? "";

    expect(tooltipText).toContain("Only affects Passives in Massive Ring");
    expect(tooltipText).toContain("-10% to all Elemental Resistances");
    expect(tooltipText).not.toContain("Only affects Passives in Small Ring");
    expect(tooltipText).not.toContain("Only affects Passives in Medium Ring");
    expect(tooltipText).not.toContain("Only affects Passives in Large Ring");
    expect(tooltipText).not.toContain("Only affects Passives in Very Large Ring");
  });

  it("only renders occupied extra slots and keeps empty jewel-style placeholders hidden", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 4001,
              name: "Socket 1",
            },
            {
              active: true,
              itemId: 0,
              name: "Socket 2",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Crimson Jewel",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: ["+12% to Fire Damage"],
          fractured: false,
          fracturedMods: [],
          id: 4001,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Scintillating Shard",
          rarity: "Rare",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);
    const extraSlots = Array.from(container.querySelectorAll(".gear-extras-row .gear-slot"));

    expect(extraSlots).toHaveLength(1);
    expect(container.querySelectorAll(".gear-extras-row .gear-slot--empty")).toHaveLength(0);
    expect(container.querySelector(".gear-extras-row")).toBeTruthy();
  });

  it("renders tree socket jewels below flasks and deduplicates pseudo-slot copies", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 4001,
              name: "Socket 1",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Crimson Jewel",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: ["+12% to Fire Damage"],
          fractured: false,
          fracturedMods: [],
          id: 4001,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Scintillating Shard",
          rarity: "Rare",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
      treeSpecs: [
        {
          ...buildViewerPayloadFixture.treeSpecs[0],
          active: true,
          nodes: [...buildViewerPayloadFixture.treeSpecs[0].nodes],
          sockets: [
            {
              itemId: 4001,
              nodeId: 123,
            },
          ],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} treeIndex={0} />);
    const jewelSlots = Array.from(container.querySelectorAll(".gear-jewel-row .gear-slot"));

    expect(jewelSlots).toHaveLength(1);
    expect(container.querySelector(".gear-jewel-row")).toBeTruthy();
    expect(container.querySelector(".gear-extras-row")).toBeNull();
    expect(container.querySelector('.gear-jewel-row img[alt="Scintillating Shard"]')).toBeTruthy();
  });

  it("renders pobb.in bracket-annotated Lethal Pride art in the tree jewel row", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [],
          title: "Default",
        },
      ],
      items: [
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
          id: 4002,
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
            "Selected Variant: 1",
            "Commanded leadership over 10436 warriors under Kaom",
          ].join("\n"),
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
      treeSpecs: [
        {
          ...buildViewerPayloadFixture.treeSpecs[0],
          active: true,
          nodes: [...buildViewerPayloadFixture.treeSpecs[0].nodes],
          sockets: [
            {
              itemId: 4002,
              nodeId: 123,
            },
          ],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} treeIndex={0} />);
    const timelessJewelIcon = container.querySelector(".gear-jewel-row img");

    expect(timelessJewelIcon).toBeTruthy();
    expect(timelessJewelIcon?.getAttribute("src")).toBe("/assets/items/art/Jewels/KaruiCivilization.png");
  });

  it("hides weapon swap items by default and shows them when enabled", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 5001,
              name: "Weapon 1 Swap",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Opal Wand",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: ["+1 to Level of all Lightning Spell Skill Gems"],
          fractured: false,
          fracturedMods: [],
          id: 5001,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Storm Whisper",
          rarity: "Rare",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const hidden = render(<ItemsPanel payload={payload} />);
    expect(hidden.container.querySelector(".gear-extras-row")).toBeNull();
    hidden.unmount();

    const visible = render(<ItemsPanel payload={payload} showWeaponSwap />);
    expect(visible.container.querySelector(".gear-extras-row")).toBeTruthy();
    expect(visible.container.querySelector('.gear-extras-row img[alt="Storm Whisper"]')).toBeTruthy();
  });

  it("renders Ring 3 in the equipment grid when the active bloodline ascendancy enables the slot", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 6001,
              name: "Ring 3",
            },
          ],
          title: "Default",
        },
      ],
      treeSpecs: [
        {
          ...buildViewerPayloadFixture.treeSpecs[0],
          active: true,
          secondaryAscendancyId: 6,
        },
      ],
      items: [
        {
          anointments: [],
          base: "Totally Unknown Base",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 6001,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Third Ring",
          rarity: "Rare",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);

    expect(container.querySelector(".gear-extras-row")).toBeNull();
    expect(container.querySelector(".gear-slot--ring-third img[alt=\"Third Ring\"]")).toBeTruthy();
    expect(container.querySelector(".gear-equipment-grid")?.classList.contains("gear-equipment-grid--ring-third")).toBe(true);
  });

  it("hides Ring 3 when the slot is not enabled and no item is equipped there", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 6003,
              name: "Ring 1",
            },
          ],
          title: "Default",
        },
      ],
      treeSpecs: [
        {
          ...buildViewerPayloadFixture.treeSpecs[0],
          active: true,
          secondaryAscendancyId: undefined,
        },
      ],
      items: [
        {
          anointments: [],
          base: "Unset Ring",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 6003,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Ring One",
          rarity: "Rare",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);

    expect(container.querySelector(".gear-slot--ring-third")).toBeNull();
    expect(container.querySelector(".gear-equipment-grid")?.classList.contains("gear-equipment-grid--standard")).toBe(true);
    expect((container.querySelector(".gear-slot--ring-left") as HTMLElement | null)?.style.gridArea).toBe("ringl");
  });

  it("renders Ring 3 when an item is equipped there even without the bloodline ascendancy", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 6002,
              name: "Ring 3",
            },
          ],
          title: "Default",
        },
      ],
      treeSpecs: [
        {
          ...buildViewerPayloadFixture.treeSpecs[0],
          active: true,
          secondaryAscendancyId: undefined,
        },
      ],
      items: [
        {
          anointments: [],
          base: "Topaz Ring",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 6002,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Fallback Third Ring",
          rarity: "Rare",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);

    expect(container.querySelector(".gear-slot--ring-third img[alt=\"Fallback Third Ring\"]")).toBeTruthy();
    expect(container.querySelector(".gear-equipment-grid")?.classList.contains("gear-equipment-grid--ring-third")).toBe(true);
  });

  it("marks Foulborn items with the slot glow class so the variant is visible without hovering", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 7001,
              name: "Body Armour",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Saintly Chainmail",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 7001,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Foulborn Incandescent Heart",
          rarity: "Unique",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);

    expect(container.querySelector(".gear-slot--body-armour")?.classList.contains("gear-slot--foulborn")).toBe(true);
    expect(container.querySelector(".poe-header")?.classList.contains("poe-header--foulborn")).toBe(true);
    expect(container.querySelector('.gear-slot--body-armour img[alt="Foulborn Incandescent Heart"]')?.getAttribute("src")).toBe(
      "/assets/items/art/Foulborn/Upscaled/Armours/BodyArmours/Illuminatis.png",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to low-resolution foulborn art when the upscaled asset fails to load", async () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 7004,
              name: "Body Armour",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Cobalt Jewel",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 7004,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Foulborn The Blue Nightmare",
          rarity: "Unique",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);

    const icon = container.querySelector('.gear-slot--body-armour img[alt="Foulborn The Blue Nightmare"]');
    expect(icon?.getAttribute("src")).toBe("/assets/items/art/Foulborn/Upscaled/Jewels/TheBlueDreamUpgrade.png");

    fireEvent.error(icon as Element);

    await waitFor(() =>
      expect(container.querySelector('.gear-slot--body-armour img[alt="Foulborn The Blue Nightmare"]')?.getAttribute("src")).toBe(
        "/assets/items/art/Foulborn/LowResolution/Jewels/TheBlueDreamUpgrade.png",
      ),
    );
  });

  it("falls back to the base art when both foulborn jewel assets fail to load", async () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 7002,
              name: "Body Armour",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Cobalt Jewel",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 7002,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Foulborn The Blue Nightmare",
          rarity: "Unique",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);

    const icon = container.querySelector('.gear-slot--body-armour img[alt="Foulborn The Blue Nightmare"]');
    expect(icon?.getAttribute("src")).toBe("/assets/items/art/Foulborn/Upscaled/Jewels/TheBlueDreamUpgrade.png");

    fireEvent.error(icon as Element);
    await waitFor(() =>
      expect(container.querySelector('.gear-slot--body-armour img[alt="Foulborn The Blue Nightmare"]')?.getAttribute("src")).toBe(
        "/assets/items/art/Foulborn/LowResolution/Jewels/TheBlueDreamUpgrade.png",
      ),
    );

    fireEvent.error(container.querySelector('.gear-slot--body-armour img[alt="Foulborn The Blue Nightmare"]') as Element);

    await waitFor(() =>
      expect(container.querySelector('.gear-slot--body-armour img[alt="Foulborn The Blue Nightmare"]')?.getAttribute("src")).toBe(
        "/assets/items/art/Jewels/TheBlueDreamUpgrade.png",
      ),
    );
  });

  it("renders the guided-luma Aegis Aurora asset by default", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 7003,
              name: "Weapon 2",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Champion Kite Shield",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 7003,
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
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);

    expect(container.querySelector('.gear-slot--weapon-off img[alt="Foulborn Aegis Aurora"]')?.getAttribute("src")).toBe(
      "/assets/items/art/Foulborn/Upscaled/Armours/Shields/ShieldStrIntUnique7unique.png",
    );
  });

  it("marks corrupted items with the slot glow class so the corruption is visible without hovering", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 7101,
              name: "Gloves",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Hydrascale Gauntlets",
          corrupted: true,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 7101,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Void Talons",
          rarity: "Rare",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);

    expect(container.querySelector(".gear-slot--gloves")?.classList.contains("gear-slot--corrupted")).toBe(true);
    expect(container.querySelector(".poe-header")?.classList.contains("poe-header--foulborn")).toBe(false);
  });

  it("prefers the foulborn gear glow when an item is both foulborn and corrupted", () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      activeItemSetId: 1,
      itemSets: [
        {
          active: true,
          id: 1,
          slots: [
            {
              active: true,
              itemId: 7201,
              name: "Body Armour",
            },
          ],
          title: "Default",
        },
      ],
      items: [
        {
          anointments: [],
          base: "Saintly Chainmail",
          corrupted: true,
          crafted: [],
          enchantments: [],
          explicits: [],
          fractured: false,
          fracturedMods: [],
          id: 7201,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Foulborn Incandescent Heart",
          rarity: "Unique",
          raw: "",
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
    };

    const { container } = render(<ItemsPanel payload={payload} />);
    const slot = container.querySelector(".gear-slot--body-armour");

    expect(slot?.classList.contains("gear-slot--foulborn")).toBe(true);
    expect(slot?.classList.contains("gear-slot--corrupted")).toBe(false);
  });
});
