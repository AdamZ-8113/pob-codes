/* @vitest-environment jsdom */

import React from "react";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { RECENT_BUILDS_STORAGE_KEY } from "../lib/recent-builds";
import { RecentBuildsPanel } from "./recent-builds-panel";

describe("RecentBuildsPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("stays hidden when no recent builds are stored", () => {
    const { container } = render(<RecentBuildsPanel />);
    expect(container.textContent).toBe("");
  });

  it("renders stored recent builds as links", async () => {
    window.localStorage.setItem(
      RECENT_BUILDS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "demo-build",
          title: "Arc / Hierophant (Templar)",
          viewedAt: "2026-04-02T06:12:00.000Z",
        },
      ]),
    );

    render(<RecentBuildsPanel />);

    const link = await screen.findByRole("link", { name: "Arc / Hierophant (Templar)" });
    expect(link.getAttribute("href")).toBe("/b/demo-build");
    expect(await screen.findByText("/b/demo-build")).toBeTruthy();
    expect(await screen.findByText(/Viewed /)).toBeTruthy();
  });
});
