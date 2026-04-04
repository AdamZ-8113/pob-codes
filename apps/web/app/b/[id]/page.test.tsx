/* @vitest-environment jsdom */

import React from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildViewerLayoutFixture, buildViewerPayloadFixture } from "../../../test/fixtures/build-viewer-fixture";
import { fetchBuildPayload } from "../../../lib/fetch-build";
import BuildPage from "./page";

vi.mock("../../../lib/fetch-build", () => ({
  fetchBuildPayload: vi.fn(),
}));

const mockedFetchBuildPayload = vi.mocked(fetchBuildPayload);

describe("/b/[id] page", () => {
  beforeEach(() => {
    mockedFetchBuildPayload.mockReset();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.includes("/assets/passive-tree/default/layout-default.json")) {
          return new Response(JSON.stringify(buildViewerLayoutFixture), {
            headers: {
              "Content-Type": "application/json",
            },
            status: 200,
          });
        }

        if (url.includes("/demo-build/raw")) {
          return new Response("RAW_POB_CODE", {
            headers: {
              "Content-Type": "text/plain",
            },
            status: 200,
          });
        }

        return new Response("Not found", { status: 404 });
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

  it("renders the build viewer panels and simplified tree", async () => {
    mockedFetchBuildPayload.mockResolvedValue(buildViewerPayloadFixture);

    const { container } = render(await BuildPage({ params: Promise.resolve({ id: "demo-build" }) }));

    expect(mockedFetchBuildPayload).toHaveBeenCalledWith("demo-build");
    expect(container.querySelector(".build-loadout-title")?.textContent).toContain("Arc / Hierophant (Templar)");
    expect(screen.getByText(/Level 95/)).toBeTruthy();
    expect(container.querySelector(".build-loadout-version")?.textContent).toBe("3.28 Mirage");
    expect(screen.getByText("Stats")).toBeTruthy();
    expect(screen.getByText("Gear")).toBeTruthy();
    expect(screen.getByText("Gems")).toBeTruthy();
    expect(screen.getByText("Configs")).toBeTruthy();
    expect(screen.getByText("Passive Tree")).toBeTruthy();
    expect(screen.getByText("Notes")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Compare my POB" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy Link" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy Full PoB Code" })).toBeTruthy();
    expect(screen.queryByText("Notes & Config")).toBeNull();
    expect(screen.getByText("Boss setup enabled")).toBeTruthy();
    expect(screen.getByText("Keep Arcane Cloak up")).toBeTruthy();

    expect(screen.getByText("Average Damage:")).toBeTruthy();
    expect(screen.getByText("Effective Crit Chance:")).toBeTruthy();
    expect(screen.getByText("Crit Multiplier:")).toBeTruthy();
    expect(screen.getAllByText("Hit DPS:").length).toBeGreaterThan(0);
    expect(screen.getByText("Strength:")).toBeTruthy();
    expect(screen.getByText("Spell Block Chance:")).toBeTruthy();
    expect(screen.getByText("Fire Resistance:")).toBeTruthy();
    expect(screen.queryByText("Average Burst Damage:")).toBeNull();
    expect(screen.queryByText("DoT DPS:")).toBeNull();
    expect(screen.queryByText("Total DPS inc. Poison:")).toBeNull();
    expect(screen.queryByText("Strength Required:")).toBeNull();
    expect(screen.queryByText("Fire Res. Over Max:")).toBeNull();
    expect(screen.queryByText("Selected Skill DPS")).toBeNull();
    expect(screen.queryByText("Active Item Set")).toBeNull();
    expect(screen.queryByText("Mirrors Path of Building loadouts across tree, gear, skills, and config sets.")).toBeNull();
    expect(screen.getByText("62,767.9")).toBeTruthy();
    expect(screen.getByText("520%")).toBeTruthy();
    expect(screen.getAllByText("1,815,749.5").length).toBeGreaterThan(0);
    expect(screen.getByText("202 (180 req)")).toBeTruthy();
    expect(screen.getByText("78% (+2%)")).toBeTruthy();
    expect(screen.getByText("75% (+28%)")).toBeTruthy();
    const summaryLines = Array.from(container.querySelectorAll(".build-loadout-stats-line")).map(
      (node) => node.textContent ?? "",
    );
    expect(summaryLines[0]).toContain("Life:");
    expect(summaryLines[0]).toContain("ES:");
    expect(summaryLines[0]).toContain("Mana:");
    expect(summaryLines[0]).toContain("eHP:");
    expect(summaryLines[0]).toContain("DPS:");
    expect(summaryLines[0]).toContain("1,815,750");
    expect(summaryLines[0]).toContain("Res:");
    expect(summaryLines[0]).toContain("75%/75%/75%/12%");
    expect(summaryLines).toHaveLength(1);

    const playerStatRows = Array.from(container.querySelectorAll(".pob-stats-panel .pob-stat-list:first-of-type .pob-stat-row"));
    expect(playerStatRows[0]?.textContent).toContain("Average Damage:");
    expect(playerStatRows[1]?.textContent).toContain("Effective Crit Chance:");
    expect(playerStatRows[2]?.textContent).toContain("Crit Multiplier:");
    expect(playerStatRows[3]?.textContent).toContain("Hit DPS:");
    expect(playerStatRows[4]?.textContent).toContain("Strength:");
    expect(playerStatRows[4]?.className).toContain("pob-stat-row-gap");

    expect(screen.getByAltText("Tempest Hold")).toBeTruthy();
    expect(screen.getAllByText("Arc").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lightning Penetration Support").length).toBeGreaterThan(0);
    const configSections = Array.from(container.querySelectorAll(".config-summary-section"));
    const configSectionTitles = configSections.map(
      (node) => node.querySelector(".config-summary-heading")?.textContent?.trim() ?? "",
    );
    expect(configSectionTitles).toContain("When In Combat");
    expect(configSectionTitles).toContain("For Effective DPS");
    expect(configSectionTitles.slice(0, 3)).toEqual(["When In Combat", "For Effective DPS", "Custom Modifiers"]);
    expect(container.querySelector(".build-layout-top-side .config-summary-panel")).toBeNull();
    expect(screen.getByText("Is the enemy Shocked")).toBeTruthy();
    expect(screen.getByText("Do you use Power Charges")).toBeTruthy();
    expect(screen.getByText("Do you use Frenzy Charges")).toBeTruthy();
    expect(screen.getByText("Do you use Endurance Charges")).toBeTruthy();
    expect(screen.getByText("Projectile travel distance")).toBeTruthy();
    expect(screen.getByText("40")).toBeTruthy();
    expect(screen.getAllByText("Enemies take 10% increased Damage").length).toBeGreaterThan(0);

    expect(screen.queryByText(/Layout nodes:/)).toBeNull();
    expect(await screen.findByText("Current zoom: 1.40x")).toBeTruthy();
    expect(await screen.findByText("Fit Build")).toBeTruthy();
    expect(screen.getByText("Fit Tree")).toBeTruthy();

    const itemSetSelect = screen.getByLabelText("Item Set");
    const skillSetSelect = screen.getByLabelText("Skill Set");
    const treeSpecSelect = screen.getByLabelText("Tree Spec") as HTMLSelectElement;
    const configSetSelect = screen.getByLabelText("Config Set") as HTMLSelectElement;

    fireEvent.change(itemSetSelect, { target: { value: "2" } });
    expect((itemSetSelect as HTMLSelectElement).value).toBe("2");
    expect(screen.getByAltText("Storm Whisper")).toBeTruthy();
    expect(screen.getAllByText("Arc").length).toBeGreaterThan(0);
    expect(treeSpecSelect.value).toBe("0");
    expect(screen.getAllByText("Main Tree").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Arc").length).toBeGreaterThan(0);

    fireEvent.change(skillSetSelect, { target: { value: "2" } });
    expect((itemSetSelect as HTMLSelectElement).value).toBe("2");
    expect(screen.getAllByText("Ball Lightning").length).toBeGreaterThan(0);

    fireEvent.change(configSetSelect, { target: { value: "2" } });
    expect(configSetSelect.value).toBe("2");
    expect(screen.getByText("Is the enemy a Boss")).toBeTruthy();
    expect(screen.getByText("Uber Pinnacle Boss")).toBeTruthy();
    expect(screen.getByText("Projectile travel distance")).toBeTruthy();
    expect(screen.getByText("18")).toBeTruthy();
    expect(screen.getAllByText("Nearby enemies are intimidated").length).toBeGreaterThan(0);

    const fetchCalls = vi.mocked(fetch).mock.calls.map(([input]) => String(input));
    expect(fetchCalls).toHaveLength(2);
    expect(fetchCalls.some((url) => url.includes("/assets/passive-tree/default/layout-default.json"))).toBe(true);
    expect(fetchCalls.some((url) => url.includes("/assets/passive-tree/default/sprite-manifest.json"))).toBe(true);
  });

  it("renders an error box when the build cannot be loaded", async () => {
    mockedFetchBuildPayload.mockRejectedValue(new Error("Could not load build (404)"));

    render(await BuildPage({ params: Promise.resolve({ id: "missing-build" }) }));

    expect(screen.getByText("Could not load build (404)")).toBeTruthy();
  });

  it("uses Combined DPS for the title summary when Full DPS is missing, and falls back to Hit DPS when Combined DPS is zero", async () => {
    mockedFetchBuildPayload
      .mockResolvedValueOnce({
        ...buildViewerPayloadFixture,
        stats: {
          ...buildViewerPayloadFixture.stats,
          player: {
            ...buildViewerPayloadFixture.stats.player,
            CombinedDPS: "2345678.9",
            FullDPS: "",
            TotalDPS: "1111111.1",
          },
        },
      })
      .mockResolvedValueOnce({
        ...buildViewerPayloadFixture,
        stats: {
          ...buildViewerPayloadFixture.stats,
          player: {
            ...buildViewerPayloadFixture.stats.player,
            CombinedDPS: "0",
            FullDPS: "",
            TotalDPS: "1111111.1",
          },
        },
      });

    const first = render(await BuildPage({ params: Promise.resolve({ id: "combined-dps" }) }));
    const firstSummaryLines = Array.from(first.container.querySelectorAll(".build-loadout-stats-line")).map(
      (node) => node.textContent ?? "",
    );
    expect(firstSummaryLines[0]).toContain("DPS:");
    expect(firstSummaryLines[0]).toContain("2,345,679");
    first.unmount();

    const second = render(await BuildPage({ params: Promise.resolve({ id: "hit-dps" }) }));
    const secondSummaryLines = Array.from(second.container.querySelectorAll(".build-loadout-stats-line")).map(
      (node) => node.textContent ?? "",
    );
    expect(secondSummaryLines[0]).toContain("DPS:");
    expect(secondSummaryLines[0]).toContain("1,111,111");
  });

  it("renders exported Full DPS breakdown details under the Full DPS row", async () => {
    mockedFetchBuildPayload.mockResolvedValue({
      ...buildViewerPayloadFixture,
      stats: {
        ...buildViewerPayloadFixture.stats,
        fullDpsSkills: [
          {
            skillPart: "All Projectiles",
            stat: "7x Kinetic Fusillade",
            value: "14339122",
          },
          {
            source: "Kinetic Fusillade",
            stat: "Best Ignite DPS",
            value: "815",
          },
        ],
        playerRows: [
          {
            stat: "FullDPS",
            value: "14339937",
          },
          {
            stat: "FullDotDPS",
            value: "814.6",
          },
        ],
        player: {
          ...buildViewerPayloadFixture.stats.player,
          FullDPS: "14339937",
          FullDotDPS: "814.6",
          TotalDPS: "1815749.5",
        },
      },
    });

    const { container } = render(await BuildPage({ params: Promise.resolve({ id: "full-dps-breakdown" }) }));
    const statsPanel = container.querySelector(".pob-stats-panel");

    expect(statsPanel?.textContent).toContain("Full DPS:");
    expect(statsPanel?.textContent).toContain("14,339,937");
    expect(statsPanel?.textContent).toContain("7x Kinetic Fusillade:");
    expect(statsPanel?.textContent).toContain("14,339,122");
    expect(statsPanel?.textContent).toContain("All Projectiles");
    expect(statsPanel?.textContent).toContain("Best Ignite DPS:");
    expect(statsPanel?.textContent).toContain("815");
    expect(statsPanel?.textContent).toContain("from Kinetic Fusillade");

    const details = container.querySelector(".pob-full-dps-details");
    expect(details).toBeTruthy();
    expect(details?.textContent).toContain("7x Kinetic Fusillade:");
    expect(details?.textContent).toContain("Best Ignite DPS:");
  });

  it("annotates eHP with guard skill enabled state for the selected skill set", async () => {
    mockedFetchBuildPayload.mockResolvedValue({
      ...buildViewerPayloadFixture,
      activeSkillSetId: 1,
      skillSets: [
        {
          active: true,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: true,
                  gemId: "Metadata/Items/Gems/SkillGemMoltenShell",
                  level: 20,
                  nameSpec: "Molten Shell",
                  quality: 20,
                  selected: true,
                  support: false,
                },
              ],
              id: "guard-on",
              mainActiveSkill: 1,
              selected: true,
              slot: "Boots",
            },
          ],
          id: 1,
          title: "Guard On",
        },
        {
          active: false,
          groups: [
            {
              enabled: true,
              gems: [
                {
                  enabled: false,
                  gemId: "Metadata/Items/Gems/SkillGemMoltenShell",
                  level: 20,
                  nameSpec: "Molten Shell",
                  quality: 20,
                  selected: true,
                  support: false,
                },
              ],
              id: "guard-off",
              mainActiveSkill: 1,
              selected: true,
              slot: "Boots",
            },
          ],
          id: 2,
          title: "Guard Off",
        },
      ],
    });

    const { container } = render(await BuildPage({ params: Promise.resolve({ id: "guard-annotation" }) }));

    const getSummaryLine = () => container.querySelector(".build-loadout-stats-line")?.textContent ?? "";

    expect(getSummaryLine()).toContain("eHP:");
    expect(getSummaryLine()).toContain("640,068");
    expect(getSummaryLine()).toContain("(w/Guard)");

    fireEvent.change(screen.getByLabelText("Skill Set"), { target: { value: "2" } });
    expect(getSummaryLine()).toContain("(w/o Guard)");
  });

  it("copies the current short build URL from Copy Link", async () => {
    mockedFetchBuildPayload.mockResolvedValue(buildViewerPayloadFixture);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
      },
    });

    render(await BuildPage({ params: Promise.resolve({ id: "demo-build" }) }));

    fireEvent.click(await screen.findByRole("button", { name: "Copy Link" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("http://localhost:3000/b/demo-build");
    });

    expect(await screen.findByText("Share URL copied to clipboard")).toBeTruthy();
  });

  it("copies the saved raw PoB code from Copy Full PoB Code", async () => {
    mockedFetchBuildPayload.mockResolvedValue(buildViewerPayloadFixture);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
      },
    });

    render(await BuildPage({ params: Promise.resolve({ id: "demo-build" }) }));

    fireEvent.click(await screen.findByRole("button", { name: "Copy Full PoB Code" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("RAW_POB_CODE");
    });

    expect(await screen.findByText("Full PoB code copied to clipboard")).toBeTruthy();
  });
});
