import { describe, expect, it } from "vitest";
import { contrast, hueDistance, parseHex, rgbToOklch, toHex, type Rgba } from "./color";
import { DEMO_THEMES, DEMO_THEME_NAMES } from "./demo-themes";
import {
  accessibleFill,
  accessibleText,
  buildTheme,
  MIN_CONTRAST,
  tenantThemeSchema,
  themeToCss,
} from "./engine";
import { springEasing, SURFACES, textSurfaces, type Scheme } from "./tokens";

const SCHEMES: Scheme[] = ["light", "dark"];

/** Parse an emitted value back to a color (hex or rgba()). */
function fromCss(value: string): Rgba {
  if (value.startsWith("#")) return parseHex(value);
  const [r, g, b, a] = value.match(/[\d.]+/g)!.map(Number);
  return { r: r!, g: g!, b: b!, a: a ?? 1 };
}

/** Deterministic pseudo-random accents across the whole sRGB cube, plus hard cases. */
function sampleAccents(n: number): string[] {
  let seed = 7;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const out = [
    "#FFCC00",
    "#FF9500",
    "#FFFFFF",
    "#000000",
    "#00FF00",
    "#FFFF00",
    "#0000FF",
    "#777777",
  ];
  while (out.length < n) {
    out.push(toHex({ r: next() * 255, g: next() * 255, b: next() * 255, a: 1 }));
  }
  return out;
}

describe("base tokens (Section 7.2 with the P1 secondary-label fix)", () => {
  it.each(SCHEMES)("%s: label and secondary label reach 4.5:1 on every surface", (scheme) => {
    for (const bg of textSurfaces(scheme)) {
      expect(contrast(SURFACES[scheme].label, bg)).toBeGreaterThanOrEqual(MIN_CONTRAST);
      expect(contrast(SURFACES[scheme].labelSecondary, bg)).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });

  it("uses the lowest light secondary alpha that passes (two decimals)", () => {
    const { labelSecondary } = SURFACES.light;
    const lower = { ...labelSecondary, a: labelSecondary.a - 0.01 };
    const worst = Math.min(...textSurfaces("light").map((bg) => contrast(lower, bg)));
    expect(worst).toBeLessThan(MIN_CONTRAST);
  });
});

describe("theme engine", () => {
  it("rejects invalid input", () => {
    expect(() => buildTheme({ accent: "blue" })).toThrow();
    expect(() => buildTheme({ accent: "#0071E3", radius: "huge" as never })).toThrow();
    expect(() => tenantThemeSchema.parse({ accent: "#0071E3", css: "x" })).toThrow();
    expect(() => buildTheme({ accent: "#0071E3;}body{display:none" })).toThrow();
  });

  it("keeps the spec default accent fill when it already passes", () => {
    const built = buildTheme({ accent: "#0071E3" });
    expect(built.light["--accent-fill"]).toBe("#0071e3");
    expect(built.light["--on-accent"]).toBe("#ffffff");
  });

  it.each(sampleAccents(200))("accent %s passes every contrast pair in both schemes", (accent) => {
    const built = buildTheme({ accent });
    for (const scheme of SCHEMES) {
      const vars = built[scheme];
      const fill = fromCss(vars["--accent-fill"]!);
      const on = fromCss(vars["--on-accent"]!);
      expect(contrast(on, fill)).toBeGreaterThanOrEqual(MIN_CONTRAST);
      const text = fromCss(vars["--accent-text"]!);
      for (const bg of textSurfaces(scheme)) {
        expect(contrast(text, bg)).toBeGreaterThanOrEqual(MIN_CONTRAST);
      }
    }
    expect(built.report.filter((c) => !c.pass)).toEqual([]);
  });

  it("keeps the input hue for chromatic accents", () => {
    for (const accent of ["#FF9500", "#34C759", "#AF52DE", "#F25C2A"]) {
      const { fill } = accessibleFill(parseHex(accent));
      expect(hueDistance(rgbToOklch(fill).h, rgbToOklch(parseHex(accent)).h)).toBeLessThan(8);
    }
  });

  it("darkens accent text for light surfaces and lightens it for dark ones", () => {
    const orange = parseHex("#FF9500");
    const navy = parseHex("#1F3A93");
    expect(rgbToOklch(accessibleText(orange, textSurfaces("light"))).l).toBeLessThan(
      rgbToOklch(orange).l,
    );
    expect(rgbToOklch(accessibleText(navy, textSurfaces("dark"))).l).toBeGreaterThan(
      rgbToOklch(navy).l,
    );
  });

  it("switches to black on-accent text for very light accents in auto mode", () => {
    expect(toHex(accessibleFill(parseHex("#FFCC00")).on)).toBe("#000000");
    expect(toHex(accessibleFill(parseHex("#FFCC00"), "white").on)).toBe("#ffffff");
  });

  it("makes the destructive (red) fill pass with white text", () => {
    const built = buildTheme({ accent: "#0071E3" });
    expect(built.light["--on-red"]).toBe("#ffffff");
    const fill = fromCss(built.light["--red-fill"]!);
    expect(contrast(parseHex("#FFFFFF"), fill)).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });

  it.each(DEMO_THEME_NAMES)("demo theme %s passes every check", (name) => {
    expect(buildTheme(DEMO_THEMES[name]).report.filter((c) => !c.pass)).toEqual([]);
  });

  it("applies the radius scale", () => {
    const built = buildTheme({ accent: "#0071E3", radius: "rounded" });
    expect(built.base["--r-sheet"]).toBe("1.75rem");
  });
});

describe("spring easing", () => {
  it("settles within the Section 7.3 transition range and runs 0 to 1", () => {
    const { easing, durationMs } = springEasing();
    expect(durationMs).toBeGreaterThanOrEqual(200);
    expect(durationMs).toBeLessThanOrEqual(350);
    expect(easing).toMatch(/^linear\(0, .*, 1\)$/);
  });
});

describe("themeToCss", () => {
  it("emits only variable declarations and the scheme selectors", () => {
    const css = themeToCss(buildTheme(DEMO_THEMES.sunset));
    const stripped = css
      .replace(/@media \(prefers-color-scheme: dark\)\{/g, "")
      .replace(/:root(\[data-scheme="(light|dark)"\]|:not\(\[data-scheme="light"\]\))?\{/g, "")
      .replace(/--[a-z0-9-]+:[^;{}]+;/g, "")
      .replace(/color-scheme:(light|dark);/g, "")
      .replace(/[}\n]/g, "");
    expect(stripped).toBe("");
    expect(css).toContain('@media (prefers-color-scheme: dark){:root:not([data-scheme="light"]){');
  });

  it("honours a dark default scheme without the media query", () => {
    const css = themeToCss(buildTheme({ accent: "#0071E3", scheme: "dark" }));
    expect(css).not.toContain("prefers-color-scheme");
    expect(css.indexOf("--bg:#000000")).toBeLessThan(css.indexOf('[data-scheme="light"]'));
  });

  it("scopes to a custom root selector", () => {
    expect(themeToCss(buildTheme(), "[data-tenant]")).toMatch(/^\[data-tenant\]\{/);
  });
});
