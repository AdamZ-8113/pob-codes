/* @vitest-environment jsdom */

import React from "react";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText,
      },
    });

    window.localStorage.setItem(
      RECENT_BUILDS_STORAGE_KEY,
      JSON.stringify([
        {
          dps: "1,815,750",
          ehp: "640,068",
          id: "demo-build",
          level: 95,
          patchVersion: "3.28",
          title: "Arc / Hierophant (Templar)",
          viewedAt: "2026-04-02T06:12:00.000Z",
        },
      ]),
    );

    render(<RecentBuildsPanel />);

    const link = await screen.findByRole("link", { name: "Arc / Hierophant (Templar) (Level 95)" });
    expect(link.getAttribute("href")).toBe("/b/demo-build");
    expect(await screen.findByText("eHP:640,068")).toBeTruthy();
    expect(await screen.findByText("DPS:1,815,750")).toBeTruthy();
    expect(await screen.findByText("3.28 Mirage")).toBeTruthy();
    expect(await screen.findByText("/b/demo-build")).toBeTruthy();
    expect(await screen.findByText(/Viewed /)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Share Arc / Hierophant (Templar) (Level 95)" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("http://localhost:3000/b/demo-build");
    });

    expect(await screen.findByText("Copied")).toBeTruthy();
  });
});
