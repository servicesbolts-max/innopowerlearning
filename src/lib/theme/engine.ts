import { z } from "zod";
import {
  composite,
  contrast,
  isHex,
  oklchToRgb,
  parseHex,
  relativeLuminance,
  rgba,
  rgbToOklch,
  toCss,
  type Rgba,
} from "./color";
import {
  DEFAULT_ACCENT,
  FONT_STACKS,
  RADIUS_SCALES,
  SHADOWS,
  STATUS,
  STATUS_NAMES,
  SURFACES,
  springEasing,
  textSurfaces,
  type Scheme,
} from "./tokens";

/** WCAG 2.2 AA for normal text. */
export const MIN_CONTRAST = 4.5;
/** Alpha of tinted surfaces (tinted buttons, chips, selected rows). */
const TINT_ALPHA = 0.15;
/** "auto" keeps white on-accent text unless the fill would need darkening by more than this. */
const MAX_WHITE_SHIFT = 0.15;
const WHITE = parseHex("#FFFFFF");
const BLACK = parseHex("#000000");

const hex = z.string().trim().refine(isHex, { message: "Use a hex color such as #0071E3." });

/** What a tenant may change (Section 7.5). Logos, hero imagery and fonts files live elsewhere. */
export const tenantThemeSchema = z.strictObject({
  accent: hex,
  accentSecondary: hex.optional(),
  onAccent: z.enum(["auto", "white", "black"]).default("auto"),
  radius: z.enum(["compact", "standard", "rounded"]).default("standard"),
  scheme: z.enum(["system", "light", "dark"]).default("system"),
  font: z.enum(["system", "inter"]).default("system"),
});
export type TenantThemeInput = z.input<typeof tenantThemeSchema>;
export type TenantTheme = z.output<typeof tenantThemeSchema>;

export const DEFAULT_THEME: TenantTheme = tenantThemeSchema.parse({ accent: DEFAULT_ACCENT });

export interface ContrastCheck {
  scheme: Scheme;
  pair: string;
  ratio: number;
  pass: boolean;
}

export interface BuiltTheme {
  theme: TenantTheme;
  /** Variables shared by both schemes. */
  base: Record<string, string>;
  light: Record<string, string>;
  dark: Record<string, string>;
  report: ContrastCheck[];
}

const minContrast = (fg: Rgba, bgs: Rgba[]) => Math.min(...bgs.map((bg) => contrast(fg, bg)));

/**
 * Move a color's OKLCH lightness (hue kept, chroma gamut-clamped) in small steps until `ok` holds.
 * Returns the first passing color, or the end of the range (black or white) which always passes
 * the checks this module uses.
 */
function shiftLightness(color: Rgba, direction: -1 | 1, ok: (c: Rgba) => boolean): Rgba {
  const start = rgbToOklch(color);
  for (let step = 0; step <= 200; step++) {
    const l = start.l + direction * step * 0.005;
    // Quantise to 8-bit channels first: the check must hold for the color we actually emit.
    const exact = oklchToRgb({ ...start, l: Math.min(1, Math.max(0, l)) });
    const candidate = {
      r: Math.round(exact.r),
      g: Math.round(exact.g),
      b: Math.round(exact.b),
      a: 1,
    };
    if (ok(candidate)) return candidate;
    if ((direction < 0 && l <= 0) || (direction > 0 && l >= 1)) return candidate;
  }
  return direction < 0 ? BLACK : WHITE;
}

/** A text color derived from `base` that reaches 4.5:1 on every surface in `bgs`. */
export function accessibleText(base: Rgba, bgs: Rgba[]): Rgba {
  const avgLum = bgs.reduce((sum, bg) => sum + relativeLuminance(bg), 0) / bgs.length;
  const direction = avgLum > 0.18 ? -1 : 1;
  return shiftLightness(base, direction, (c) => minContrast(c, bgs) >= MIN_CONTRAST);
}

/** A fill derived from `base` and the on-fill text color that reaches 4.5:1 on it. */
export function accessibleFill(
  base: Rgba,
  prefer: "auto" | "white" | "black" = "auto",
): { fill: Rgba; on: Rgba } {
  const withWhite = shiftLightness(base, -1, (c) => contrast(WHITE, c) >= MIN_CONTRAST);
  const withBlack = shiftLightness(base, 1, (c) => contrast(BLACK, c) >= MIN_CONTRAST);
  if (prefer === "white") return { fill: withWhite, on: WHITE };
  if (prefer === "black") return { fill: withBlack, on: BLACK };
  const shift = rgbToOklch(base).l - rgbToOklch(withWhite).l;
  return shift <= MAX_WHITE_SHIFT ? { fill: withWhite, on: WHITE } : { fill: withBlack, on: BLACK };
}

/** OKLCH lightness targets for the decorative accent scale. Not for text: use `--accent-text`. */
const SCALE_STEPS: Array<[number, number]> = [
  [50, 0.97],
  [100, 0.93],
  [200, 0.87],
  [300, 0.79],
  [400, 0.7],
  [500, 0.62],
  [600, 0.54],
  [700, 0.46],
  [800, 0.38],
  [900, 0.3],
  [950, 0.22],
];

export function accentScale(base: Rgba): Record<number, Rgba> {
  const { c, h } = rgbToOklch(base);
  return Object.fromEntries(SCALE_STEPS.map(([step, l]) => [step, oklchToRgb({ l, c, h })]));
}

interface AccentVars {
  vars: Record<string, string>;
  report: ContrastCheck[];
}

/** Fill, text, tint and text-on-tint for one accent (or status) color in one scheme. */
function accentVars(
  prefix: string,
  base: Rgba,
  scheme: Scheme,
  prefer: "auto" | "white" | "black",
  label: string,
): AccentVars {
  const surfaces = textSurfaces(scheme);
  const { fill, on } = accessibleFill(base, prefer);
  const text = accessibleText(base, surfaces);
  const tint = rgba(fill.r, fill.g, fill.b, TINT_ALPHA);
  const tintSurfaces = surfaces.map((s) => composite(tint, s));
  const textOnTint = accessibleText(text, tintSurfaces);
  const report: ContrastCheck[] = [
    check(scheme, `on-${label} on ${label} fill`, contrast(on, fill)),
    check(scheme, `${label} text on surfaces`, minContrast(text, surfaces)),
    check(scheme, `${label} text on ${label} tint`, minContrast(textOnTint, tintSurfaces)),
  ];
  return {
    vars: {
      [`--${prefix}-fill`]: toCss(fill),
      [`--on-${prefix}`]: toCss(on),
      [`--${prefix}-text`]: toCss(text),
      [`--${prefix}-tint`]: toCss(tint),
      [`--${prefix}-text-on-tint`]: toCss(textOnTint),
    },
    report,
  };
}

function check(scheme: Scheme, pair: string, ratio: number): ContrastCheck {
  return { scheme, pair, ratio: Math.round(ratio * 100) / 100, pass: ratio >= MIN_CONTRAST };
}

function schemeVars(theme: TenantTheme, scheme: Scheme): AccentVars {
  const s = SURFACES[scheme];
  const vars: Record<string, string> = {
    "--bg": toCss(s.bg),
    "--bg-secondary": toCss(s.bgSecondary),
    "--bg-tertiary": toCss(s.bgTertiary),
    "--bg-grouped": toCss(s.bgGrouped),
    "--bg-grouped-row": toCss(s.bgGroupedRow),
    "--label": toCss(s.label),
    "--label-secondary": toCss(s.labelSecondary),
    "--label-tertiary": toCss(s.labelTertiary),
    "--separator": toCss(s.separator),
    "--fill": toCss(s.fill),
    "--elevation": SHADOWS[scheme],
  };
  const surfaces = textSurfaces(scheme);
  const report: ContrastCheck[] = [
    check(scheme, "label on surfaces", minContrast(s.label, surfaces)),
    check(scheme, "secondary label on surfaces", minContrast(s.labelSecondary, surfaces)),
  ];

  const accent = parseHex(theme.accent);
  const primary = accentVars("accent", accent, scheme, theme.onAccent, "accent");
  Object.assign(vars, primary.vars);
  report.push(...primary.report);
  for (const [step, color] of Object.entries(accentScale(accent))) {
    vars[`--accent-${step}`] = toCss(color);
  }

  const second = accentVars(
    "accent2",
    parseHex(theme.accentSecondary ?? theme.accent),
    scheme,
    theme.onAccent,
    "secondary accent",
  );
  Object.assign(vars, second.vars);
  if (theme.accentSecondary) report.push(...second.report);

  for (const name of STATUS_NAMES) {
    const raw = STATUS[scheme][name];
    vars[`--${name}`] = toCss(raw);
    const status = accentVars(name, raw, scheme, "auto", name);
    Object.assign(vars, status.vars);
    report.push(...status.report);
  }
  return { vars, report };
}

const spring = springEasing();

export function buildTheme(input: TenantThemeInput = DEFAULT_THEME): BuiltTheme {
  const theme = tenantThemeSchema.parse(input);
  const r = RADIUS_SCALES[theme.radius];
  const base: Record<string, string> = {
    "--r-control": `${r.control / 16}rem`,
    "--r-card": `${r.card / 16}rem`,
    "--r-sheet": `${r.sheet / 16}rem`,
    "--font-stack": FONT_STACKS[theme.font],
    "--spring-easing": spring.easing,
    "--spring-duration": `${spring.durationMs}ms`,
  };
  const light = schemeVars(theme, "light");
  const dark = schemeVars(theme, "dark");
  return {
    theme,
    base,
    light: light.vars,
    dark: dark.vars,
    report: [...light.report, ...dark.report],
  };
}

const VAR_NAME = /^--[a-z0-9-]+$/;
// Values the engine itself produces: colors, rem lengths, font stacks, shadows, linear() easings.
const VAR_VALUE = /^[a-zA-Z0-9#.,()%' \-]+$/;

function block(selector: string, vars: Record<string, string>, scheme?: Scheme): string {
  const body = Object.entries(vars)
    .map(([name, value]) => {
      if (!VAR_NAME.test(name) || !VAR_VALUE.test(value)) {
        throw new Error(`Refusing to emit unsafe CSS variable ${name}`);
      }
      return `${name}:${value};`;
    })
    .join("");
  // color-scheme is a fixed keyword chosen here, never tenant input.
  return `${selector}{${scheme ? `color-scheme:${scheme};` : ""}${body}}`;
}

/**
 * Serialise a built theme to CSS for a server-rendered `<style>` (no flash of the default theme).
 * `data-scheme="light|dark"` on the root element overrides the scheme; otherwise the tenant
 * default applies, and "system" follows `prefers-color-scheme`.
 */
export function themeToCss(built: BuiltTheme, root = ":root"): string {
  const { scheme } = built.theme;
  const lightSel = `${root}[data-scheme="light"]`;
  const darkSel = `${root}[data-scheme="dark"]`;
  const light = (sel: string) => block(sel, built.light, "light");
  const dark = (sel: string) => block(sel, built.dark, "dark");
  const parts = [block(root, built.base)];
  if (scheme === "dark") {
    parts.push(dark(root), light(lightSel), dark(darkSel));
  } else {
    parts.push(light(root));
    if (scheme === "system") {
      parts.push(
        `@media (prefers-color-scheme: dark){${dark(`${root}:not([data-scheme="light"])`)}}`,
      );
    }
    parts.push(dark(darkSel), light(lightSel));
  }
  return parts.join("\n");
}
