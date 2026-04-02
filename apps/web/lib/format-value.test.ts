import { describe, expect, it } from "vitest";

import { formatDisplayValue } from "./format-value";

describe("format-display-value", () => {
  it("formats integers with separators", () => {
    expect(formatDisplayValue("1234567")).toBe("1,234,567");
  });

  it("trims noisy decimals to a readable precision", () => {
    expect(formatDisplayValue("123.4567890123")).toBe("123.46");
    expect(formatDisplayValue("0.1234567890123")).toBe("0.1235");
  });

  it("preserves non-numeric exported strings", () => {
    expect(formatDisplayValue("45%")).toBe("45%");
    expect(formatDisplayValue("3_27")).toBe("3_27");
  });

  it("formats booleans consistently", () => {
    expect(formatDisplayValue(true)).toBe("True");
    expect(formatDisplayValue(false)).toBe("False");
  });
});
