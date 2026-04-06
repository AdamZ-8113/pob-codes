/* @vitest-environment jsdom */

import React from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildViewerPayloadFixture } from "../test/fixtures/build-viewer-fixture";
import { getInitialBuildViewerSelection } from "../lib/build-viewer-selection";
import { compareBuildAgainstInput } from "../lib/build-compare";
import { CompareBuildModal } from "./compare-build-modal";

vi.mock("../lib/build-compare", () => ({
  compareBuildAgainstInput: vi.fn(),
  DEFAULT_COMPARE_ENGINE: "v2",
}));

describe("CompareBuildModal", () => {
  beforeEach(() => {
    vi.mocked(compareBuildAgainstInput).mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens the compare modal, submits input, and renders findings", async () => {
    vi.mocked(compareBuildAgainstInput).mockResolvedValue({
      findings: [
        {
          key: "configs",
          rows: [
            {
              currentValue: "Disabled",
              highlight: true,
              key: "config:power",
              name: "[When In Combat] Do you use Power Charges",
              targetValue: "Enabled",
            },
          ],
          severity: "major",
          title: "Configurations",
        },
      ],
      targetSummary: "Templar / Hierophant (Level 95)",
    });

    render(
      <CompareBuildModal
        payload={buildViewerPayloadFixture}
        selection={getInitialBuildViewerSelection(buildViewerPayloadFixture)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Compare my POB" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: {
        value: "https://pob.codes/b/example123",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Compare Builds" }));

    await waitFor(() => {
      expect(compareBuildAgainstInput).toHaveBeenCalledWith(
        buildViewerPayloadFixture,
        getInitialBuildViewerSelection(buildViewerPayloadFixture),
        "https://pob.codes/b/example123",
        { engine: "v2" },
      );
    });

    expect(await screen.findByText("Compared against Templar / Hierophant (Level 95)")).toBeTruthy();
    expect(screen.getByText("Configurations")).toBeTruthy();
    expect(screen.getByText("[When In Combat] Do you use Power Charges")).toBeTruthy();
    expect(screen.getByDisplayValue("https://pob.codes/b/example123")).toBeTruthy();
    expect(document.querySelector("textarea")).toBeNull();
    expect(screen.getByText("Source Build")).toBeTruthy();
    expect(screen.getByText("Your Build")).toBeTruthy();
    expect(screen.getByText("Disabled")).toBeTruthy();
    expect(screen.getByText("Enabled")).toBeTruthy();
    expect(document.querySelector(".compare-finding-table-row--highlight")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Configurations/ }));
    expect(screen.queryByText("[When In Combat] Do you use Power Charges")).toBeNull();
  });

  it("hides compared-build-only item rows by default and reveals them when toggled", async () => {
    vi.mocked(compareBuildAgainstInput).mockResolvedValue({
      findings: [
        {
          kind: "item",
          key: "items",
          rows: [
            {
              currentValue: "Heatshiver",
              direction: "source-only",
              highlight: true,
              key: "item:helmet",
              name: "Helmet",
              targetValue: "Missing",
            },
            {
              currentValue: "None",
              direction: "target-only",
              highlight: true,
              key: "rare-item:gloves",
              name: "Gloves",
              targetValue: "Only in target\n- Explicit: +30% to Cold Resistance",
            },
          ],
          severity: "major",
          title: "Items",
        },
      ],
      targetSummary: "Templar / Hierophant (Level 95)",
    });

    render(
      <CompareBuildModal
        payload={buildViewerPayloadFixture}
        selection={getInitialBuildViewerSelection(buildViewerPayloadFixture)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Compare my POB" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: {
        value: "https://pob.codes/b/example123",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Compare Builds" }));

    expect(await screen.findByText("Compared against Templar / Hierophant (Level 95)")).toBeTruthy();
    expect(screen.getByText("Helmet")).toBeTruthy();
    expect(screen.queryByText("Gloves")).toBeNull();

    fireEvent.click(screen.getByLabelText("Show items and mods only found in my build"));

    expect(screen.getByText("Gloves")).toBeTruthy();
  });

  it("groups item findings into category sections in the requested order", async () => {
    vi.mocked(compareBuildAgainstInput).mockResolvedValue({
      findings: [
        {
          kind: "item",
          key: "unique-variants",
          rows: [
            {
              currentValue: "Only in current\n- Explicit: +25 to Intelligence",
              direction: "both",
              highlight: true,
              itemCategory: "unique",
              key: "unique-item:boots",
              name: "Ralakesh's Impatience (Riveted Boots)",
              targetValue: "Only in target\n- Explicit: +15 to Intelligence",
            },
          ],
          severity: "notable",
          title: "Unique Item Mods",
        },
        {
          kind: "item",
          key: "flask-item-mods",
          rows: [
            {
              currentValue: "Significant roll differences\n- Explicit: 25% increased effect",
              direction: "both",
              highlight: true,
              itemCategory: "flask",
              key: "flask-item:quicksilver",
              name: "Quicksilver Flask",
              targetValue: "Significant roll differences\n- Explicit: 18% increased effect",
            },
          ],
          severity: "notable",
          title: "Flask Item Mods",
        },
        {
          kind: "item",
          key: "rare-item-mods",
          rows: [
            {
              currentValue: "Only in current\n- Explicit: +70 to maximum Life",
              direction: "source-only",
              highlight: true,
              itemCategory: "rare",
              key: "rare-item:gloves",
              name: "Gloves",
              targetValue: "Missing",
            },
          ],
          severity: "notable",
          title: "Rare Item Mods",
        },
      ],
      targetSummary: "Templar / Hierophant (Level 95)",
    });

    render(
      <CompareBuildModal
        payload={buildViewerPayloadFixture}
        selection={getInitialBuildViewerSelection(buildViewerPayloadFixture)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Compare my POB" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: {
        value: "https://pob.codes/b/example123",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Compare Builds" }));

    expect(await screen.findByText("Unique Item Differences")).toBeTruthy();
    const categoryTitles = Array.from(document.querySelectorAll(".compare-finding-title")).map((element) => element.textContent?.replace(/[+-]/g, "").trim());
    expect(categoryTitles).toEqual(["Unique Item Differences", "Rare Item Differences", "Flask Differences"]);
  });

  it("renders support gem differences with a four-column table", async () => {
    vi.mocked(compareBuildAgainstInput).mockResolvedValue({
      findings: [
        {
          key: "missing-support-gems",
          rows: [
            {
              currentValue: "Missing",
              key: "missing-gem:support:empower:0",
              name: "Support: Empower\nSkills: Righteous Fire, Raise Spectre",
              nameDisplay: {
                skillNames: ["Righteous Fire", "Raise Spectre"],
                supportName: "Empower",
                type: "support-link-group",
              },
              targetValue: "3/23",
            },
          ],
          severity: "major",
          title: "Support Gem Differences",
        },
      ],
      targetSummary: "Templar / Hierophant (Level 95)",
    });

    render(
      <CompareBuildModal
        payload={buildViewerPayloadFixture}
        selection={getInitialBuildViewerSelection(buildViewerPayloadFixture)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Compare my POB" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: {
        value: "https://pob.codes/b/example123",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Compare Builds" }));

    expect(await screen.findByText("Support Gem Differences")).toBeTruthy();
    expect(screen.getByText("Support Gem")).toBeTruthy();
    expect(screen.getByText("Supported Skills")).toBeTruthy();
    expect(screen.getByText("Source Gem Level & Quality")).toBeTruthy();
    expect(screen.getByText("Your Build Gem Level & Quality")).toBeTruthy();
    expect(screen.getByText("Empower")).toBeTruthy();
    expect(
      screen.getByText((_, element) => element?.textContent === "Righteous Fire\nRaise Spectre"),
    ).toBeTruthy();
  });

  it("renders elegant hubris bonus differences with exclusive column headers", async () => {
    vi.mocked(compareBuildAgainstInput).mockResolvedValue({
      findings: [
        {
          key: "elegant-hubris-notables",
          rows: [
            {
              currentValue: "10% increased Damage per Frenzy Charge",
              key: "elegant-hubris-notables:allocated-bonuses",
              name: "Allocated notable bonuses",
              targetValue: "10% increased Damage per Power Charge",
            },
          ],
          severity: "major",
          title: "Elegant Hubris Notable Differences",
        },
      ],
      targetSummary: "Templar / Hierophant (Level 95)",
    });

    render(
      <CompareBuildModal
        payload={buildViewerPayloadFixture}
        selection={getInitialBuildViewerSelection(buildViewerPayloadFixture)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Compare my POB" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: {
        value: "https://pob.codes/b/example123",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Compare Builds" }));

    expect(await screen.findByText("Elegant Hubris Notable Differences")).toBeTruthy();
    expect(screen.getByText("Only in Source Build")).toBeTruthy();
    expect(screen.getByText("Only in Your Build")).toBeTruthy();
    expect(screen.getByText("10% increased Damage per Frenzy Charge")).toBeTruthy();
    expect(screen.getByText("10% increased Damage per Power Charge")).toBeTruthy();
  });
});
