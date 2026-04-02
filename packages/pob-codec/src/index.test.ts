import { describe, expect, it } from "vitest";

import { BuildCodecError, decodeBuildCode, encodeBuildCode } from "./index";

describe("pob-codec", () => {
  it("round-trips xml", () => {
    const xml = '<PathOfBuilding><Build level="98" className="Ranger" /></PathOfBuilding>';
    const encoded = encodeBuildCode(xml);
    const decoded = decodeBuildCode(encoded);
    expect(decoded).toContain("<PathOfBuilding>");
    expect(decoded).toContain('className="Ranger"');
  });

  it("throws on empty input", () => {
    expect(() => decodeBuildCode("   ")).toThrowError(BuildCodecError);
  });

  it("throws on invalid input", () => {
    expect(() => decodeBuildCode("not-a-valid-pob-code")).toThrowError(BuildCodecError);
  });
});