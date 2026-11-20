import { describe, expect, it } from "vitest";
import {
  composite,
  contrast,
  hueDistance,
  oklchToRgb,
  parseHex,
  rgba,
  rgbToOklch,
  toCss,
  toHex,
} from "./color";

describe("color math", () => {
  it("parses and serialises hex", () => {
    expect(parseHex("#0071e3")).toEqual({ r: 0, g: 113, b: 227, a: 1 });
    expect(parseHex("#fff")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(toHex(parseHex("#0071E3"))).toBe("#0071e3");
    expect(() => parseHex("red")).toThrow();
    expect(() => parseHex("#12345")).toThrow();
  });

  it("serialises translucent colors as rgba()", () => {
    expect(toCss(rgba(60, 60, 67, 0.73))).toBe("rgba(60, 60, 67, 0.73)");
  });

  it("matches known WCAG contrast ratios", () => {
    const white = parseHex("#FFFFFF");
    expect(contrast(parseHex("#000000"), white)).toBeCloseTo(21, 5);
    expect(contrast(white, white)).toBeCloseTo(1, 5);
    expect(contrast(parseHex("#0071E3"), white)).toBeCloseTo(4.7, 1);
    expect(contrast(parseHex("#767676"), white)).toBeCloseTo(4.54, 2);
  });

  it("composites translucent text before measuring (the spec secondary label is 3.4:1)", () => {
    const white = parseHex("#FFFFFF");
    expect(toHex(composite(rgba(60, 60, 67, 0.6), white))).toBe("#8a8a8e");
    expect(contrast(rgba(60, 60, 67, 0.6), white)).toBeCloseTo(3.43, 1);
  });

  it("round-trips sRGB through OKLCH", () => {
    for (const hex of [
      "#0071E3",
      "#34C759",
      "#FF3B30",
      "#FFCC00",
      "#808080",
      "#000000",
      "#FFFFFF",
    ]) {
      expect(toHex(oklchToRgb(rgbToOklch(parseHex(hex))))).toBe(hex.toLowerCase());
    }
  });

  it("knows reference OKLCH values", () => {
    const white = rgbToOklch(parseHex("#FFFFFF"));
    expect(white.l).toBeCloseTo(1, 3);
    expect(white.c).toBeCloseTo(0, 3);
    const red = rgbToOklch(parseHex("#FF0000"));
    expect(red.l).toBeCloseTo(0.628, 2);
    expect(red.c).toBeCloseTo(0.258, 2);
    expect(red.h).toBeCloseTo(29.2, 0);
  });

  it("clamps out-of-gamut OKLCH colors by reducing chroma", () => {
    const c = oklchToRgb({ l: 0.9, c: 0.4, h: 260 });
    for (const v of [c.r, c.g, c.b]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    }
    expect(rgbToOklch(c).l).toBeCloseTo(0.9, 2);
  });

  it("measures hue distance around the circle", () => {
    expect(hueDistance(350, 10)).toBe(20);
    expect(hueDistance(10, 190)).toBe(180);
  });
});
