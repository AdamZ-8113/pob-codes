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
          energyShield: "1,289",
          guardAnnotation: "w/o Guard",
          id: "demo-build",
          level: 95,
          life: "4,123",
          mana: "938",
          patchVersion: "3.28",
          resistances: "75%/75%/75%/12%",
          title: "Arc / Hierophant (Templar)",
          viewedAt: "2026-04-02T06:12:00.000Z",
        },
      ]),
    );

    render(<RecentBuildsPanel />);

    const link = await screen.findByRole("link", { name: "Arc / Hierophant (Templar) (Level 95)" });
    expect(link.getAttribute("href")).toBe("/b/demo-build");
    expect(await screen.findByText((_, element) => element?.textContent === "Life:4,123")).toBeTruthy();
    expect(await screen.findByText((_, element) => element?.textContent === "ES:1,289")).toBeTruthy();
    expect(await screen.findByText((_, element) => element?.textContent === "Mana:938")).toBeTruthy();
    expect(await screen.findByText((_, element) => element?.textContent === "eHP:640,068(w/o Guard)")).toBeTruthy();
    expect(await screen.findByText((_, element) => element?.textContent === "DPS:1,815,750")).toBeTruthy();
    expect(await screen.findByText((_, element) => element?.textContent === "Res:75%/75%/75%/12%")).toBeTruthy();
    expect(screen.queryByText("/b/demo-build")).toBeNull();
    expect(await screen.findByText(/2026/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Copy link for Arc / Hierophant (Templar) (Level 95)" }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("http://localhost:3000/b/demo-build");
    });

    expect(await screen.findByText("Copied")).toBeTruthy();
  });

  it("supports pinning, renaming, and removing stored builds", async () => {
    window.localStorage.setItem(
      RECENT_BUILDS_STORAGE_KEY,
      JSON.stringify([
        {
          dps: "1,815,750",
          ehp: "640,068",
          energyShield: "1,289",
          id: "demo-build",
          level: 95,
          life: "4,123",
          mana: "938",
          patchVersion: "3.28",
          resistances: "75%/75%/75%/12%",
          title: "Arc / Hierophant (Templar)",
          viewedAt: "2026-04-02T06:12:00.000Z",
        },
        {
          dps: "915,000",
          ehp: "320,000",
          energyShield: "800",
          id: "second-build",
          level: 93,
          life: "3,850",
          mana: "620",
          patchVersion: "3.28",
          resistances: "75%/75%/75%/0%",
          title: "Storm Burst / Inquisitor (Templar)",
          viewedAt: "2026-04-01T06:12:00.000Z",
        },
      ]),
    );

    const { container } = render(<RecentBuildsPanel />);

    await screen.findByRole("heading", { name: "Recently Viewed" });

    fireEvent.click(screen.getByRole("button", { name: "Pin Arc / Hierophant (Templar) (Level 95)" }));

    expect(await screen.findByRole("heading", { name: "Pinned" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Unpin Arc / Hierophant (Templar) (Level 95)" })).toBeTruthy();
    expect(container.querySelectorAll(".panel.recent-builds-panel")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Rename Arc / Hierophant (Templar) (Level 95)" }));
    const renameInput = screen.getByRole("textbox", { name: "Nickname for Arc / Hierophant (Templar) (Level 95)" });
    await waitFor(() => {
      expect(document.activeElement).toBe(renameInput);
      expect((renameInput as HTMLInputElement).value).toBe("Arc / Hierophant (Templar) (Level 95)");
      expect((renameInput as HTMLInputElement).selectionStart).toBe(0);
      expect((renameInput as HTMLInputElement).selectionEnd).toBe(0);
    });
    fireEvent.change(renameInput, {
      target: { value: "Boss Farmer" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("link", { name: "Boss Farmer" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Remove Storm Burst / Inquisitor (Templar) (Level 93)" }));

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Storm Burst / Inquisitor (Templar) (Level 93)" })).toBeNull();
    });

    expect(JSON.parse(window.localStorage.getItem(RECENT_BUILDS_STORAGE_KEY) ?? "[]")).toEqual([
      expect.objectContaining({
        id: "demo-build",
        nickname: "Boss Farmer",
        pinned: true,
      }),
    ]);
  });

  it("cancels renaming when escape is pressed", async () => {
    window.localStorage.setItem(
      RECENT_BUILDS_STORAGE_KEY,
      JSON.stringify([
        {
          dps: "1,815,750",
          ehp: "640,068",
          energyShield: "1,289",
          id: "demo-build",
          level: 95,
          life: "4,123",
          mana: "938",
          patchVersion: "3.28",
          resistances: "75%/75%/75%/12%",
          title: "Arc / Hierophant (Templar)",
          viewedAt: "2026-04-02T06:12:00.000Z",
        },
      ]),
    );

    render(<RecentBuildsPanel />);

    fireEvent.click(await screen.findByRole("button", { name: "Rename Arc / Hierophant (Templar) (Level 95)" }));
    const renameInput = await screen.findByRole("textbox", { name: "Nickname for Arc / Hierophant (Templar) (Level 95)" });
    fireEvent.keyDown(renameInput, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("textbox", { name: "Nickname for Arc / Hierophant (Templar) (Level 95)" })).toBeNull();
    });
  });
});
