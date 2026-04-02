import { describe, expect, it } from "vitest";

import { renderPobNotes } from "./pob-notes";

describe("pob-notes", () => {
  it("renders PoB note color codes into colored line segments", () => {
    const lines = renderPobNotes("^xFF0000Boss plan^7\n^5Arcane Cloak");

    expect(lines).toEqual([
      {
        segments: [
          {
            color: "#FF0000",
            text: "Boss plan",
          },
        ],
      },
      {
        segments: [
          {
            color: "#8888ff",
            text: "Arcane Cloak",
          },
        ],
      },
    ]);
  });

  it("preserves blank lines and falls back to the default note color", () => {
    const lines = renderPobNotes("Line one\n\nLine two");

    expect(lines).toEqual([
      {
        segments: [
          {
            color: "#c8c8c8",
            text: "Line one",
          },
        ],
      },
      {
        segments: [],
      },
      {
        segments: [
          {
            color: "#c8c8c8",
            text: "Line two",
          },
        ],
      },
    ]);
  });
});
