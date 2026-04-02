/* @vitest-environment jsdom */

import React from "react";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { buildViewerPayloadFixture } from "../test/fixtures/build-viewer-fixture";
import { NotesPanel } from "./notes-panel";

describe("NotesPanel", () => {
  it("renders note URLs as clickable links while preserving note text", () => {
    render(
      <NotesPanel
        payload={{
          ...buildViewerPayloadFixture,
          notes: "^5Guide: https://example.com/path?q=1.\nSee also www.pobcodes.test/help",
        }}
      />,
    );

    const primaryLink = screen.getByRole("link", { name: "https://example.com/path?q=1" });
    const secondaryLink = screen.getByRole("link", { name: "www.pobcodes.test/help" });

    expect(primaryLink.getAttribute("href")).toBe("https://example.com/path?q=1");
    expect(secondaryLink.getAttribute("href")).toBe("https://www.pobcodes.test/help");
    expect(screen.getByText(".")).toBeTruthy();
  });
});
