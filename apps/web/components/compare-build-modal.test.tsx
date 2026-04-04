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
          kind: "item",
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
      );
    });

    expect(await screen.findByText("Compared against Templar / Hierophant (Level 95)")).toBeTruthy();
    expect(screen.getByText("Configurations")).toBeTruthy();
    expect(screen.getByText("[When In Combat] Do you use Power Charges")).toBeTruthy();
    expect(screen.getByDisplayValue("https://pob.codes/b/example123")).toBeTruthy();
    expect(document.querySelector("textarea")).toBeNull();
    expect(screen.getByText("Disabled")).toBeTruthy();
    expect(screen.getByText("Enabled")).toBeTruthy();
    expect(document.querySelector(".compare-finding--item")).toBeTruthy();
    expect(document.querySelector(".compare-finding-table-row--highlight")).toBeTruthy();
  });
});
