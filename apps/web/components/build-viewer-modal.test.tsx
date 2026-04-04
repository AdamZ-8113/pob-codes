/* @vitest-environment jsdom */

import React from "react";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BuildPayload } from "@pobcodes/shared-types";

import { buildPlayerMaxHitRowsForDisplay } from "../lib/pob-stat-layout";
import { buildViewerPayloadFixture } from "../test/fixtures/build-viewer-fixture";
import { BuildViewer } from "./build-viewer";

vi.mock("../lib/recent-builds", () => ({
  recordRecentBuild: vi.fn(),
}));

vi.mock("./compare-build-modal", () => ({
  CompareBuildModal: () => <div data-testid="compare-build-modal" />,
}));

vi.mock("./configs-panel", () => ({
  ConfigsPanel: () => <div data-testid="configs-panel" />,
}));

vi.mock("./items-panel", () => ({
  ItemsPanel: () => <div data-testid="items-panel" />,
}));

vi.mock("./notes-panel", () => ({
  NotesPanel: () => <div data-testid="notes-panel" />,
}));

vi.mock("./passive-tree-panel", () => ({
  PassiveTreePanel: () => <div data-testid="passive-tree-panel" />,
}));

vi.mock("./skills-panel", () => ({
  SkillsPanel: () => <div data-testid="skills-panel" />,
}));

vi.mock("./stats-panel", () => ({
  StatsPanel: () => <div data-testid="stats-panel" />,
}));

function createMatchMediaResult(matches: boolean): MediaQueryList {
  return {
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches,
    media: "",
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  } as MediaQueryList;
}

function buildPayloadWithMaxHits(): BuildPayload {
  return {
    ...buildViewerPayloadFixture,
    stats: {
      ...buildViewerPayloadFixture.stats,
      playerRows: [
        ...buildViewerPayloadFixture.stats.playerRows,
        { stat: "PhysicalMaximumHitTaken", value: "18976.2" },
        { stat: "FireMaximumHitTaken", value: "35560" },
        { stat: "ColdMaximumHitTaken", value: "43642" },
        { stat: "LightningMaximumHitTaken", value: "35560" },
        { stat: "ChaosMaximumHitTaken", value: "12874" },
      ],
      player: {
        ...buildViewerPayloadFixture.stats.player,
        PhysicalMaximumHitTaken: "18976.2",
        FireMaximumHitTaken: "35560",
        ColdMaximumHitTaken: "43642",
        LightningMaximumHitTaken: "35560",
        ChaosMaximumHitTaken: "12874",
      },
    },
  };
}

describe("BuildViewer eHP modal", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => {
        if (query.includes("pointer: coarse") || query.includes("hover: none")) {
          return createMatchMediaResult(false);
        }

        return createMatchMediaResult(false);
      }),
    });

    Object.defineProperty(window.navigator, "maxTouchPoints", {
      configurable: true,
      value: 0,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("uses the lightweight mobile tooltip flow for eHP max hit details", () => {
    const payload = buildPayloadWithMaxHits();
    const maxHitRows = buildPlayerMaxHitRowsForDisplay(payload);

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => {
        if (query.includes("max-width: 1180px") || query.includes("pointer: coarse") || query.includes("hover: none")) {
          return createMatchMediaResult(true);
        }

        return createMatchMediaResult(false);
      }),
    });

    Object.defineProperty(window.navigator, "maxTouchPoints", {
      configurable: true,
      value: 1,
    });

    render(<BuildViewer payload={payload} />);

    fireEvent.click(screen.getByRole("button", { name: /show max hit details for ehp:/i }));

    expect(document.querySelector(".gear-tooltip-backdrop")).toBeTruthy();
    expect(document.querySelector(".ehp-max-hit-tooltip-panel--mobile-active")).toBeTruthy();

    for (const row of maxHitRows) {
      const label = screen.getByText(`${row.label}:`);
      expect(label.parentElement?.textContent).toContain(row.value);
    }

    fireEvent.click(screen.getByRole("button", { name: "Close max hit details" }));

    expect(document.querySelector(".gear-tooltip-backdrop")).toBeNull();
    expect(document.querySelector(".ehp-max-hit-tooltip-panel--mobile-active")).toBeNull();
  });
});
