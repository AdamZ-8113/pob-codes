/* @vitest-environment jsdom */

import React from "react";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BuildPayload } from "@pobcodes/shared-types";

import { buildViewerPayloadFixture } from "../test/fixtures/build-viewer-fixture";
import { PassiveTreePanel } from "./passive-tree-panel";

function stubInteractiveTreeSvg(svg: SVGSVGElement) {
  const capturedPointerIds = new Set<number>();

  Object.defineProperty(svg, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      bottom: 600,
      height: 600,
      left: 0,
      right: 800,
      top: 0,
      width: 800,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });

  Object.defineProperty(svg, "setPointerCapture", {
    configurable: true,
    value: (pointerId: number) => {
      capturedPointerIds.add(pointerId);
    },
  });

  Object.defineProperty(svg, "releasePointerCapture", {
    configurable: true,
    value: (pointerId: number) => {
      capturedPointerIds.delete(pointerId);
    },
  });

  Object.defineProperty(svg, "hasPointerCapture", {
    configurable: true,
    value: (pointerId: number) => capturedPointerIds.has(pointerId),
  });
}

describe("PassiveTreePanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            bounds: {
              maxX: 400,
              maxY: 300,
              minX: -400,
              minY: -300,
            },
            groups: [
              {
                id: 1,
                x: 0,
                y: 0,
              },
            ],
            nodes: [
              {
                classStartIndex: 5,
                flavourText: [],
                groupCenterX: 0,
                groupCenterY: 0,
                groupId: 1,
                id: 6,
                isJewelSocket: false,
                isKeystone: false,
                isMastery: false,
                isNotable: false,
                masteryEffects: [],
                name: "Templar Start",
                orbit: 0,
                orbitIndex: 0,
                orbitRadius: 0,
                out: [99],
                reminderText: [],
                startArt: "centertemplar",
                stats: ["+10 to Strength"],
                x: 0,
                y: 0,
              },
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
                name: "Large Jewel Socket",
                orbit: 1,
                orbitIndex: 0,
                orbitRadius: 82,
                out: [100],
                reminderText: [],
                stats: [],
                x: 0,
                y: -82,
              },
              {
                flavourText: [],
                groupCenterX: 0,
                groupCenterY: 0,
                groupId: 1,
                id: 100,
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
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
            status: 200,
          },
        );
      }),
    );

    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      return window.setTimeout(() => callback(performance.now()), 0);
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      window.clearTimeout(id);
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("defers passive tree asset fetches until the panel is near the viewport when IntersectionObserver is available", async () => {
    const instances: Array<{
      callback: IntersectionObserverCallback;
      disconnect: ReturnType<typeof vi.fn>;
      observed: Element[];
    }> = [];

    class MockIntersectionObserver {
      readonly callback: IntersectionObserverCallback;
      readonly disconnect = vi.fn();
      readonly observed: Element[] = [];
      readonly observe = vi.fn((element: Element) => {
        this.observed.push(element);
      });
      readonly root = null;
      readonly rootMargin: string;
      readonly thresholds = [0];
      readonly unobserve = vi.fn();

      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        this.callback = callback;
        this.rootMargin = options?.rootMargin ?? "";
        instances.push({
          callback,
          disconnect: this.disconnect,
          observed: this.observed,
        });
      }

      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver as unknown as typeof IntersectionObserver);

    render(<PassiveTreePanel payload={buildViewerPayloadFixture} treeIndex={0} />);

    expect(await screen.findByText("Passive tree assets will load when this panel scrolls into view.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    expect(instances).toHaveLength(1);
    expect(instances[0]?.observed.length).toBe(1);

    instances[0]?.callback(
      [
        {
          intersectionRatio: 1,
          isIntersecting: true,
          target: instances[0].observed[0] as Element,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    );

    expect(await screen.findByText("Current zoom: 1.40x")).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(instances[0]?.disconnect.mock.calls.length ?? 0).toBeGreaterThanOrEqual(1);
  });

  it("shows a socketed jewel item tooltip when hovering an allocated jewel socket", async () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      items: [
        {
          anointments: [],
          base: "Crimson Jewel",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: ["+12% to Fire Damage", "+10% to Spell Damage"],
          fractured: false,
          fracturedMods: [],
          id: 5001,
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
          active: true,
          ascendancyId: 2,
          classId: 5,
          masteryEffects: [],
          nodes: [6, 99],
          overrides: [],
          sockets: [
            {
              itemId: 5001,
              nodeId: 99,
            },
          ],
          title: "Main Tree",
          url: "https://example.com/trees/main",
          version: "3.28",
        },
      ],
    };

    const { container } = render(<PassiveTreePanel payload={payload} treeIndex={0} />);

    await waitFor(() => {
      expect(container.querySelector(".tree-node-jewel-socket.tree-node-allocated")).toBeTruthy();
    });

    const jewelNode = container.querySelector(".tree-node-jewel-socket.tree-node-allocated");
    expect(jewelNode).toBeTruthy();

    fireEvent.mouseEnter(jewelNode as Element, { clientX: 180, clientY: 220 });

    expect(await screen.findByText("Scintillating Shard")).toBeTruthy();
    expect(screen.getByText("Crimson Jewel")).toBeTruthy();
    expect(screen.getByText("+12% to Fire Damage")).toBeTruthy();
    expect(container.querySelector(".tree-tooltip.tree-tooltip-item .poe-tooltip")).toBeTruthy();
    expect(container.querySelector(".tree-tooltip.tree-tooltip-follow")).toBeTruthy();
    expect(container.querySelector(".tree-tooltip")?.getAttribute("style")).toContain("left: 180px");
  });

  it("renders a circular radius overlay for socketed jewels with radius metadata", async () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      items: [
        {
          anointments: [],
          base: "Timeless Jewel",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: ["Historic"],
          fractured: false,
          fracturedMods: [],
          iconKey: "Lethal Pride",
          id: 5002,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Lethal Pride",
          rarity: "Unique",
          raw: ["Rarity: Unique", "Lethal Pride", "Timeless Jewel", "Radius: Large", "Historic"].join("\n"),
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
      treeSpecs: [
        {
          active: true,
          ascendancyId: 2,
          classId: 5,
          masteryEffects: [],
          nodes: [6, 99],
          overrides: [],
          sockets: [
            {
              itemId: 5002,
              nodeId: 99,
            },
          ],
          title: "Main Tree",
          url: "https://example.com/trees/main",
          version: "3.28",
        },
      ],
    };

    const { container } = render(<PassiveTreePanel payload={payload} treeIndex={0} />);

    await waitFor(() => {
      expect(container.querySelector(".tree-jewel-radius-circle")).toBeTruthy();
    });

    const circle = container.querySelector(".tree-jewel-radius-circle");
    expect(circle?.getAttribute("cx")).toBe("0");
    expect(circle?.getAttribute("cy")).toBe("-82");
    expect(circle?.getAttribute("r")).toBe("1800");
  });

  it("anchors Impossible Escape radius overlays on the named keystone", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            bounds: {
              maxX: 500,
              maxY: 400,
              minX: -500,
              minY: -400,
            },
            groups: [
              {
                id: 1,
                x: 0,
                y: 0,
              },
            ],
            nodes: [
              {
                classStartIndex: 5,
                flavourText: [],
                groupCenterX: 0,
                groupCenterY: 0,
                groupId: 1,
                id: 6,
                isJewelSocket: false,
                isKeystone: false,
                isMastery: false,
                isNotable: false,
                masteryEffects: [],
                name: "Templar Start",
                orbit: 0,
                orbitIndex: 0,
                orbitRadius: 0,
                out: [99],
                reminderText: [],
                startArt: "centertemplar",
                stats: ["+10 to Strength"],
                x: 0,
                y: 0,
              },
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
                groupCenterX: 0,
                groupCenterY: 0,
                groupId: 1,
                id: 200,
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
                x: -240,
                y: 180,
              },
            ],
            unpositionedNodeIds: [],
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
            status: 200,
          },
        );
      }),
    );

    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      items: [
        {
          anointments: [],
          base: "Viridian Jewel",
          corrupted: true,
          crafted: [],
          enchantments: [],
          explicits: ["Passive Skills in radius of Chaos Inoculation can be allocated without being connected to your tree"],
          fractured: false,
          fracturedMods: [],
          id: 7002,
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
        },
      ],
      treeSpecs: [
        {
          active: true,
          ascendancyId: 2,
          classId: 5,
          masteryEffects: [],
          nodes: [6, 99],
          overrides: [],
          sockets: [
            {
              itemId: 7002,
              nodeId: 99,
            },
          ],
          title: "Main Tree",
          url: "https://example.com/trees/main",
          version: "3.28",
        },
      ],
    };

    const { container } = render(<PassiveTreePanel payload={payload} treeIndex={0} />);

    await waitFor(() => {
      expect(container.querySelector(".tree-jewel-radius-circle")).toBeTruthy();
    });

    const circle = container.querySelector(".tree-jewel-radius-circle");
    expect(circle?.getAttribute("cx")).toBe("-240");
    expect(circle?.getAttribute("cy")).toBe("180");
    expect(circle?.getAttribute("r")).toBe("960");
  });

  it("renders Thread of Hope as an annulus overlay", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            bounds: {
              maxX: 500,
              maxY: 400,
              minX: -500,
              minY: -400,
            },
            groups: [
              {
                id: 1,
                x: 0,
                y: 0,
              },
            ],
            nodes: [
              {
                classStartIndex: 5,
                flavourText: [],
                groupCenterX: 0,
                groupCenterY: 0,
                groupId: 1,
                id: 6,
                isJewelSocket: false,
                isKeystone: false,
                isMastery: false,
                isNotable: false,
                masteryEffects: [],
                name: "Templar Start",
                orbit: 0,
                orbitIndex: 0,
                orbitRadius: 0,
                out: [99],
                reminderText: [],
                startArt: "centertemplar",
                stats: ["+10 to Strength"],
                x: 0,
                y: 0,
              },
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
            ],
            unpositionedNodeIds: [],
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
            status: 200,
          },
        );
      }),
    );

    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      items: [
        {
          anointments: [],
          base: "Crimson Jewel",
          corrupted: true,
          crafted: [],
          enchantments: [],
          explicits: ["Only affects Passives in Very Large Ring", "-12% to all Elemental Resistances"],
          fractured: false,
          fracturedMods: [],
          id: 7003,
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
        },
      ],
      treeSpecs: [
        {
          active: true,
          ascendancyId: 2,
          classId: 5,
          masteryEffects: [],
          nodes: [6, 99],
          overrides: [],
          sockets: [
            {
              itemId: 7003,
              nodeId: 99,
            },
          ],
          title: "Main Tree",
          url: "https://example.com/trees/main",
          version: "3.28",
        },
      ],
    };

    const { container } = render(<PassiveTreePanel payload={payload} treeIndex={0} />);

    await waitFor(() => {
      expect(container.querySelector(".tree-jewel-radius-annulus-fill")).toBeTruthy();
    });

    const annulusFill = container.querySelector(".tree-jewel-radius-annulus-fill");
    const annulusRings = Array.from(container.querySelectorAll(".tree-jewel-radius-annulus-ring"));
    expect(annulusFill?.getAttribute("fill-rule")).toBe("evenodd");
    expect(annulusFill?.getAttribute("d")).toContain("a 2400 2400");
    expect(annulusFill?.getAttribute("d")).toContain("a 2040 2040");
    expect(annulusRings).toHaveLength(2);
    expect(annulusRings[0]?.getAttribute("r")).toBe("2400");
    expect(annulusRings[1]?.getAttribute("r")).toBe("2040");
    expect(container.querySelector(".tree-jewel-radius-circle")).toBeNull();
  });

  it("does not render an unsocketed cluster jewel branch", async () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      items: [],
      treeSpecs: [
        {
          active: true,
          ascendancyId: 2,
          classId: 5,
          masteryEffects: [],
          nodes: [6, 99],
          overrides: [],
          sockets: [],
          title: "Main Tree",
          url: "https://example.com/trees/main",
          version: "3.28",
        },
      ],
    };

    const { container } = render(<PassiveTreePanel payload={payload} treeIndex={0} />);

    await waitFor(() => {
      expect(container.querySelectorAll(".tree-node").length).toBeGreaterThan(0);
    });

    expect(container.querySelectorAll(".tree-node-passive")).toHaveLength(0);
  });

  it("renders allocated keystones and selected masteries in the summary panel", async () => {
    vi.mocked(fetch).mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          bounds: {
            maxX: 500,
            maxY: 300,
            minX: -500,
            minY: -300,
          },
          groups: [
            {
              id: 1,
              x: 0,
              y: 0,
            },
          ],
          nodes: [
            {
              classStartIndex: 5,
              flavourText: [],
              groupCenterX: 0,
              groupCenterY: 0,
              groupId: 1,
              id: 6,
              isJewelSocket: false,
              isKeystone: false,
              isMastery: false,
              isNotable: false,
              masteryEffects: [],
              name: "Templar Start",
              orbit: 0,
              orbitIndex: 0,
              orbitRadius: 0,
              out: [200],
              reminderText: [],
              startArt: "centertemplar",
              stats: ["+10 to Strength"],
              x: 0,
              y: 0,
            },
            {
              flavourText: [],
              groupCenterX: 0,
              groupCenterY: 0,
              groupId: 1,
              icon: "Art/2DArt/SkillIcons/passives/AcrobaticsNode.png",
              id: 200,
              isJewelSocket: false,
              isKeystone: true,
              isMastery: false,
              isNotable: false,
              masteryEffects: [],
              name: "Keystone of Testing",
              orbit: 1,
              orbitIndex: 0,
              orbitRadius: 120,
              out: [6, 300],
              reminderText: [],
              stats: ["Your test damage is lucky"],
              x: 0,
              y: -120,
            },
            {
              activeIcon: "Art/2DArt/SkillIcons/passives/MasteryPassiveIcons/PassiveMasteryAreaActive.png",
              flavourText: [],
              groupCenterX: 0,
              groupCenterY: 0,
              groupId: 1,
              id: 300,
              inactiveIcon: "Art/2DArt/SkillIcons/passives/MasteryPassiveIcons/PassiveMasteryAreaInactive.png",
              isJewelSocket: false,
              isKeystone: false,
              isMastery: true,
              isNotable: false,
              masteryEffects: [
                {
                  effect: 777,
                  reminderText: [],
                  stats: ["15% increased Area of Effect"],
                },
              ],
              name: "Area Mastery",
              orbit: 2,
              orbitIndex: 0,
              orbitRadius: 220,
              out: [200],
              reminderText: [],
              stats: [],
              x: 0,
              y: -220,
            },
          ],
          unpositionedNodeIds: [],
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    });

    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      items: [],
      treeSpecs: [
        {
          active: true,
          ascendancyId: 2,
          classId: 5,
          masteryEffects: [[300, 777]],
          nodes: [6, 200, 300],
          overrides: [],
          sockets: [],
          title: "Main Tree",
          url: "https://example.com/trees/main",
          version: "3.28",
        },
      ],
    };

    const { container } = render(<PassiveTreePanel payload={payload} treeIndex={0} />);

    expect(await screen.findByText("Keystones")).toBeTruthy();
    expect(screen.getByText("Keystone of Testing")).toBeTruthy();
    expect(screen.getByText("Your test damage is lucky")).toBeTruthy();
    expect(screen.getAllByText("Masteries")).toHaveLength(2);
    expect(screen.getByText("Area Mastery (1)")).toBeTruthy();
    expect(screen.getByText("15% increased Area of Effect")).toBeTruthy();
    expect(container.querySelector(".tree-summary-icon-placeholder")).toBeTruthy();
  });

  it("shows tattoo and runegraft counts in the passive tree summary", async () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      items: [],
      treeSpecs: [
        {
          active: true,
          ascendancyId: 2,
          classId: 5,
          masteryEffects: [],
          nodes: [6],
          overrides: [
            { effect: "+4 to Strength", name: "Tattoo of the Tukohama Warrior", nodeId: 11 },
            { effect: "+4 to Dexterity", name: "Tattoo of the Ramako Scout", nodeId: 12 },
            { effect: "Banner Skills have 20% increased Aura Effect", name: "Runegraft of Rallying", nodeId: 13 },
          ],
          sockets: [],
          title: "Main Tree",
          url: "https://example.com/trees/main",
          version: "3.28",
        },
      ],
    };

    render(<PassiveTreePanel payload={payload} treeIndex={0} />);

    const tattoosEntry = (await screen.findAllByText("Tattoos"))[0];
    const runegraftsEntry = screen.getAllByText("Runegrafts")[0];

    expect(within(tattoosEntry.parentElement as HTMLElement).getByText("2")).toBeTruthy();
    expect(within(runegraftsEntry.parentElement as HTMLElement).getByText("1")).toBeTruthy();
  });

  it("separates masteries, runegrafts, and tattoos in the side panel and groups duplicate tattoos", async () => {
    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      items: [],
      treeSpecs: [
        {
          active: true,
          ascendancyId: 2,
          classId: 5,
          masteryEffects: [],
          nodes: [6],
          overrides: [
            { effect: "+4 to Strength", name: "Tattoo of the Tukohama Warrior", nodeId: 11 },
            { effect: "+4 to Strength", name: "Tattoo of the Tukohama Warrior", nodeId: 12 },
            { effect: "Banner Skills have 20% increased Aura Effect", name: "Runegraft of Rallying", nodeId: 13 },
          ],
          sockets: [],
          title: "Main Tree",
          url: "https://example.com/trees/main",
          version: "3.28",
        },
      ],
    };

    const { container } = render(<PassiveTreePanel payload={payload} treeIndex={0} />);

    await screen.findByText("Runegrafts");

    expect(Array.from(container.querySelectorAll(".tree-summary-heading")).map((node) => node.textContent)).toEqual([
      "Keystones",
      "Masteries",
      "Runegrafts",
      "Tattoos",
    ]);
    expect(screen.getByText("Runegraft of Rallying")).toBeTruthy();
    expect(screen.getByText("Tattoo of the Tukohama Warrior (x2)")).toBeTruthy();
  });

  it("applies runegraft styling to allocated mastery override nodes", async () => {
    vi.mocked(fetch).mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          bounds: {
            maxX: 400,
            maxY: 300,
            minX: -400,
            minY: -300,
          },
          groups: [
            {
              id: 1,
              x: 0,
              y: 0,
            },
          ],
          nodes: [
            {
              classStartIndex: 5,
              flavourText: [],
              groupCenterX: 0,
              groupCenterY: 0,
              groupId: 1,
              id: 6,
              isJewelSocket: false,
              isKeystone: false,
              isMastery: false,
              isNotable: false,
              masteryEffects: [],
              name: "Templar Start",
              orbit: 0,
              orbitIndex: 0,
              orbitRadius: 0,
              out: [13],
              reminderText: [],
              startArt: "centertemplar",
              stats: ["+10 to Strength"],
              x: 0,
              y: 0,
            },
            {
              activeIcon: "Art/2DArt/SkillIcons/passives/MasteryPassiveIcons/PassiveMasteryAreaActive.png",
              flavourText: [],
              groupCenterX: 0,
              groupCenterY: 0,
              groupId: 1,
              id: 13,
              inactiveIcon: "Art/2DArt/SkillIcons/passives/MasteryPassiveIcons/PassiveMasteryAreaInactive.png",
              isJewelSocket: false,
              isKeystone: false,
              isMastery: true,
              isNotable: false,
              masteryEffects: [],
              name: "Aura Mastery",
              orbit: 1,
              orbitIndex: 0,
              orbitRadius: 82,
              out: [6],
              reminderText: [],
              stats: [],
              x: 0,
              y: -82,
            },
          ],
          unpositionedNodeIds: [],
        }),
      );
    });

    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      items: [],
      treeSpecs: [
        {
          active: true,
          ascendancyId: 2,
          classId: 5,
          masteryEffects: [],
          nodes: [6, 13],
          overrides: [{ effect: "Banner Skills have 20% increased Aura Effect", name: "Runegraft of Rallying", nodeId: 13 }],
          sockets: [],
          title: "Main Tree",
          url: "https://example.com/trees/main",
          version: "3.28",
        },
      ],
    };

    const { container } = render(<PassiveTreePanel payload={payload} treeIndex={0} />);

    await waitFor(() => {
      expect(container.querySelector(".tree-node-runegraft.tree-node-mastery.tree-node-allocated")).toBeTruthy();
    });
  });

  it("marks tattooed passives with a dedicated node class", async () => {
    vi.mocked(fetch).mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          bounds: {
            maxX: 600,
            maxY: 300,
            minX: -600,
            minY: -300,
          },
          groups: [
            {
              id: 1,
              x: 0,
              y: 0,
            },
          ],
          nodes: [
            {
              classStartIndex: 5,
              flavourText: [],
              groupCenterX: 0,
              groupCenterY: 0,
              groupId: 1,
              id: 6,
              isJewelSocket: false,
              isKeystone: false,
              isMastery: false,
              isNotable: false,
              masteryEffects: [],
              name: "Templar Start",
              orbit: 0,
              orbitIndex: 0,
              orbitRadius: 0,
              out: [11],
              reminderText: [],
              startArt: "centertemplar",
              stats: ["+10 to Strength"],
              x: 0,
              y: 0,
            },
            {
              flavourText: [],
              groupCenterX: 0,
              groupCenterY: 0,
              groupId: 1,
              id: 11,
              isJewelSocket: false,
              isKeystone: false,
              isMastery: false,
              isNotable: false,
              masteryEffects: [],
              name: "Strength Passive",
              orbit: 1,
              orbitIndex: 0,
              orbitRadius: 82,
              out: [],
              reminderText: [],
              stats: ["+10 to Strength"],
              x: 0,
              y: -82,
            },
          ],
          unpositionedNodeIds: [],
        }),
      );
    });

    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      items: [],
      treeSpecs: [
        {
          active: true,
          ascendancyId: 2,
          classId: 5,
          masteryEffects: [],
          nodes: [6, 11],
          overrides: [{ effect: "+4 to Dexterity", name: "Tattoo of the Ramako Scout", nodeId: 11 }],
          sockets: [],
          title: "Main Tree",
          url: "https://example.com/trees/main",
          version: "3.28",
        },
      ],
    };

    const { container } = render(<PassiveTreePanel payload={payload} treeIndex={0} />);

    await waitFor(() => {
      expect(container.querySelector(".tree-node-tattoo.tree-node-passive.tree-node-allocated")).toBeTruthy();
    });
  });

  it("shows transformed timeless keystones with the original keystone in parentheses", async () => {
    vi.mocked(fetch).mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          bounds: {
            maxX: 600,
            maxY: 300,
            minX: -600,
            minY: -300,
          },
          groups: [
            {
              id: 1,
              x: 0,
              y: 0,
            },
          ],
          nodes: [
            {
              classStartIndex: 5,
              flavourText: [],
              groupCenterX: 0,
              groupCenterY: 0,
              groupId: 1,
              id: 6,
              isJewelSocket: false,
              isKeystone: false,
              isMastery: false,
              isNotable: false,
              masteryEffects: [],
              name: "Templar Start",
              orbit: 0,
              orbitIndex: 0,
              orbitRadius: 0,
              out: [99],
              reminderText: [],
              startArt: "centertemplar",
              stats: ["+10 to Strength"],
              x: 0,
              y: 0,
            },
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
              out: [6, 200],
              reminderText: [],
              stats: [],
              x: 0,
              y: -120,
            },
            {
              flavourText: [],
              groupCenterX: 0,
              groupCenterY: 0,
              groupId: 1,
              icon: "Art/2DArt/SkillIcons/passives/MiracleOfThaumaturgy.png",
              id: 200,
              isJewelSocket: false,
              isKeystone: true,
              isMastery: false,
              isNotable: false,
              masteryEffects: [],
              name: "The Agnostic",
              orbit: 2,
              orbitIndex: 0,
              orbitRadius: 220,
              out: [99],
              reminderText: [],
              stats: ["Maximum Energy Shield is 0"],
              x: 0,
              y: -420,
            },
          ],
          unpositionedNodeIds: [],
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    });

    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      items: [
        {
          anointments: [],
          base: "Timeless Jewel",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: ["Historic"],
          fractured: false,
          fracturedMods: [],
          iconKey: "Elegant Hubris",
          id: 9001,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Elegant Hubris",
          rarity: "Unique",
          raw: [
            "Rarity: Unique",
            "Elegant Hubris",
            "Timeless Jewel",
            "Radius: Large",
            "Commissioned 80740 coins to commemorate Caspiro",
            "Passives in radius are Conquered by the Eternal Empire",
          ].join("\n"),
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
      treeSpecs: [
        {
          active: true,
          ascendancyId: 2,
          classId: 5,
          masteryEffects: [],
          nodes: [6, 99, 200],
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
        },
      ],
    };

    render(<PassiveTreePanel payload={payload} treeIndex={0} />);

    expect(await screen.findByText("Supreme Ostentation (The Agnostic)")).toBeTruthy();
    expect(screen.getByText("Ignore Attribute Requirements")).toBeTruthy();
    expect(screen.getByText("Gain no inherent bonuses from Attributes")).toBeTruthy();
  });

  it("shows Divine Flesh when Glorious Vanity transforms Elemental Equilibrium", async () => {
    const layoutResponse = {
      bounds: {
        maxX: 600,
        maxY: 300,
        minX: -600,
        minY: -300,
      },
      groups: [
        {
          id: 1,
          x: 0,
          y: 0,
        },
      ],
      nodes: [
        {
          classStartIndex: 5,
          flavourText: [],
          groupCenterX: 0,
          groupCenterY: 0,
          groupId: 1,
          id: 6,
          isJewelSocket: false,
          isKeystone: false,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Templar Start",
          orbit: 0,
          orbitIndex: 0,
          orbitRadius: 0,
          out: [99],
          reminderText: [],
          startArt: "centertemplar",
          stats: ["+10 to Strength"],
          x: 0,
          y: 0,
        },
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
          out: [6, 200],
          reminderText: [],
          stats: [],
          x: 0,
          y: -120,
        },
        {
          flavourText: [],
          groupCenterX: 0,
          groupCenterY: 0,
          groupId: 1,
          icon: "Art/2DArt/SkillIcons/passives/ElementalEquilibriumNode.png",
          id: 200,
          isJewelSocket: false,
          isKeystone: true,
          isMastery: false,
          isNotable: false,
          masteryEffects: [],
          name: "Elemental Equilibrium",
          orbit: 2,
          orbitIndex: 0,
          orbitRadius: 220,
          out: [99],
          reminderText: [],
          stats: ["Enemies you Hit with Elemental Damage temporarily get +25% Resistance to those Elements and -50% Resistance to other Elements"],
          x: 0,
          y: -420,
        },
      ],
      unpositionedNodeIds: [],
    };

    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : String(input);
      const body = url.includes("sprite-manifest.json")
        ? {
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
                  height: 384,
                  width: 384,
                },
              },
            },
          }
        : layoutResponse;

      return new Response(JSON.stringify(body), {
        headers: {
          "Content-Type": "application/json",
        },
        status: 200,
      });
    });

    const payload: BuildPayload = {
      ...buildViewerPayloadFixture,
      items: [
        {
          anointments: [],
          base: "Timeless Jewel",
          corrupted: false,
          crafted: [],
          enchantments: [],
          explicits: ["Historic"],
          fractured: false,
          fracturedMods: [],
          iconKey: "Glorious Vanity",
          id: 9002,
          implicits: [],
          influences: [],
          mirrored: false,
          name: "Glorious Vanity",
          rarity: "Unique",
          raw: [
            "Rarity: Unique",
            "Glorious Vanity",
            "Timeless Jewel",
            "Radius: Large",
            "Bathed in the blood of 8963 sacrificed in the name of Xibaqua",
            "Passives in radius are Conquered by the Vaal",
            "Historic",
          ].join("\n"),
          scourgedMods: [],
          crucibleMods: [],
          synthesizedMods: [],
        },
      ],
      treeSpecs: [
        {
          active: true,
          ascendancyId: 2,
          classId: 5,
          masteryEffects: [],
          nodes: [6, 99, 200],
          overrides: [],
          sockets: [
            {
              itemId: 9002,
              nodeId: 99,
            },
          ],
          title: "Main Tree",
          url: "https://example.com/trees/main",
          version: "3.28",
        },
      ],
    };

    const { container } = render(<PassiveTreePanel payload={payload} treeIndex={0} />);

    expect(await screen.findByText("Divine Flesh (Elemental Equilibrium)")).toBeTruthy();
    expect(screen.getByText("50% of Elemental Damage taken as Chaos Damage")).toBeTruthy();
    await waitFor(() => {
      const icon = container.querySelector(".tree-summary-card-keystone .tree-summary-icon");
      expect(icon).toBeTruthy();
      expect(icon?.classList.contains("tree-summary-icon-placeholder")).toBe(false);
      expect(icon?.getAttribute("style")).toContain("keystone-additional-3.png");
    });
  });

  it("lets page scrolling continue when the tree is already at its minimum zoom", async () => {
    const { container } = render(<PassiveTreePanel payload={buildViewerPayloadFixture} treeIndex={0} />);

    await waitFor(() => {
      expect(container.querySelector(".tree-canvas-shell")).toBeTruthy();
    });

    const shell = container.querySelector(".tree-canvas-shell");
    expect(shell).toBeTruthy();

    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 160,
      clientY: 180,
      deltaY: 120,
    });

    const dispatchResult = shell?.dispatchEvent(event);

    expect(dispatchResult).toBe(true);
    expect(event.defaultPrevented).toBe(false);
  });

  it("does not pan the tree with touch drag while zoom is locked", async () => {
    const { container } = render(<PassiveTreePanel payload={buildViewerPayloadFixture} treeIndex={0} />);

    await waitFor(() => {
      expect(container.querySelector(".tree-canvas-shell")).toBeTruthy();
    });

    const shell = container.querySelector(".tree-canvas-shell");
    const svg = container.querySelector(".tree-canvas");
    expect(shell).toBeTruthy();
    expect(svg).toBeTruthy();

    stubInteractiveTreeSvg(svg as SVGSVGElement);

    await waitFor(() => {
      expect(container.querySelector(".tree-canvas > g")?.getAttribute("transform")).toBeTruthy();
    });

    const initialTransform = container.querySelector(".tree-canvas > g")?.getAttribute("transform");

    fireEvent.pointerDown(svg as SVGSVGElement, {
      button: 0,
      clientX: 160,
      clientY: 180,
      pointerId: 1,
      pointerType: "touch",
    });
    fireEvent.pointerMove(svg as SVGSVGElement, {
      clientX: 240,
      clientY: 260,
      pointerId: 1,
      pointerType: "touch",
    });
    fireEvent.pointerUp(svg as SVGSVGElement, {
      clientX: 240,
      clientY: 260,
      pointerId: 1,
      pointerType: "touch",
    });

    expect(shell?.classList.contains("tree-canvas-shell-dragging")).toBe(false);
    expect(container.querySelector(".tree-canvas > g")?.getAttribute("transform")).toBe(initialTransform);
  });

  it("still captures wheel input when zooming in on the tree", async () => {
    const { container } = render(<PassiveTreePanel payload={buildViewerPayloadFixture} treeIndex={0} />);

    await waitFor(() => {
      expect(container.querySelector(".tree-canvas-shell")).toBeTruthy();
    });

    const shell = container.querySelector(".tree-canvas-shell");
    expect(shell).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Unlock passive tree zoom" }));

    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 160,
      clientY: 180,
      deltaY: -120,
    });

    const dispatchResult = shell?.dispatchEvent(event);

    expect(dispatchResult).toBe(false);
    expect(event.defaultPrevented).toBe(true);
  });

  it("supports touch pinch zoom when the tree is unlocked", async () => {
    const { container } = render(<PassiveTreePanel payload={buildViewerPayloadFixture} treeIndex={0} />);

    await waitFor(() => {
      expect(container.querySelector(".tree-canvas-shell")).toBeTruthy();
    });

    const shell = container.querySelector(".tree-canvas-shell");
    const svg = container.querySelector(".tree-canvas");
    expect(shell).toBeTruthy();
    expect(svg).toBeTruthy();

    stubInteractiveTreeSvg(svg as SVGSVGElement);

    fireEvent.click(screen.getByRole("button", { name: "Unlock passive tree zoom" }));

    expect(shell?.classList.contains("tree-canvas-shell-interactive")).toBe(true);

    fireEvent.pointerDown(svg as SVGSVGElement, {
      button: 0,
      clientX: 160,
      clientY: 180,
      pointerId: 1,
      pointerType: "touch",
    });
    fireEvent.pointerDown(svg as SVGSVGElement, {
      button: 0,
      clientX: 240,
      clientY: 180,
      pointerId: 2,
      pointerType: "touch",
    });
    fireEvent.pointerMove(svg as SVGSVGElement, {
      clientX: 300,
      clientY: 180,
      pointerId: 2,
      pointerType: "touch",
    });

    await waitFor(() => {
      expect(screen.getByText(/^Current zoom:/).textContent).not.toContain("1.40x");
    });
  });

  it("lets page scrolling continue when the tree is already at its maximum zoom", async () => {
    const { container } = render(<PassiveTreePanel payload={buildViewerPayloadFixture} treeIndex={0} />);

    await waitFor(() => {
      expect(container.querySelector(".tree-canvas-shell")).toBeTruthy();
    });

    const shell = container.querySelector(".tree-canvas-shell");
    expect(shell).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Unlock passive tree zoom" }));
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    Object.defineProperty(svg, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        bottom: 600,
        height: 600,
        left: 0,
        right: 800,
        top: 0,
        width: 800,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    let reachedZoomCap = false;
    for (let index = 0; index < 12; index += 1) {
      const event = new WheelEvent("wheel", {
        bubbles: true,
        cancelable: true,
        clientX: 160,
        clientY: 180,
        deltaY: -120,
      });

      const dispatchResult = shell?.dispatchEvent(event);
      if (dispatchResult === true && event.defaultPrevented === false) {
        reachedZoomCap = true;
        break;
      }
    }

    expect(reachedZoomCap).toBe(true);
  });
});
