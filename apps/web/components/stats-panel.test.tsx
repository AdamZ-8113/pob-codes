/* @vitest-environment jsdom */

import React from "react";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildViewerPayloadFixture } from "../test/fixtures/build-viewer-fixture";
import { StatsPanel } from "./stats-panel";

describe("StatsPanel", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders duplicate minion stat rows without React key warnings", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <StatsPanel
        payload={{
          ...buildViewerPayloadFixture,
          stats: {
            ...buildViewerPayloadFixture.stats,
            minionRows: [
              { stat: "Speed", value: "4.39" },
              { stat: "Speed", value: "4.39" },
            ],
            minion: {
              Speed: "4.39",
            },
          },
        }}
      />,
    );

    expect(screen.getByText("Minion")).toBeTruthy();
    expect(screen.getAllByText("Attack/Cast Rate:")).toHaveLength(2);
    expect(screen.getAllByText("4.39")).toHaveLength(2);
    expect(
      consoleErrorSpy.mock.calls.some(([message]) =>
        String(message).includes("Encountered two children with the same key"),
      ),
    ).toBe(false);
  });
});
