import { parseHex, rgba, type Rgba } from "./color";

/**
 * Base design tokens (docs/MASTER_PROMPT.md Section 7.2 and 7.3). Tenants never change these;
 * the theme engine (engine.ts) only derives accent, status-on-surface and radius values.
 *
 * Deviation from the spec (docs/ASSUMPTIONS.md, P1): light `--label-secondary` alpha is 0.73,
 * not 0.60, so secondary text reaches 4.5:1 on every light surface.
 */
export type Scheme = "light" | "dark";

export interface SurfaceTokens {
  bg: Rgba;
  bgSecondary: Rgba;
  bgTertiary: Rgba;
  bgGrouped: Rgba;
  bgGroupedRow: Rgba;
  label: Rgba;
  labelSecondary: Rgba;
  /** Disabled and decorative text only (WCAG 1.4.3 exempts inactive components). */
  labelTertiary: Rgba;
  separator: Rgba;
  fill: Rgba;
}

export const SURFACES: Record<Scheme, SurfaceTokens> = {
  light: {
    bg: parseHex("#FFFFFF"),
    bgSecondary: parseHex("#F2F2F7"),
    bgTertiary: parseHex("#FFFFFF"),
    bgGrouped: parseHex("#F2F2F7"),
    bgGroupedRow: parseHex("#FFFFFF"),
    label: parseHex("#000000"),
    labelSecondary: rgba(60, 60, 67, 0.73),
    labelTertiary: rgba(60, 60, 67, 0.3),
    separator: rgba(60, 60, 67, 0.29),
    fill: rgba(120, 120, 128, 0.2),
  },
  dark: {
    bg: parseHex("#000000"),
    bgSecondary: parseHex("#1C1C1E"),
    bgTertiary: parseHex("#2C2C2E"),
    bgGrouped: parseHex("#000000"),
    bgGroupedRow: parseHex("#1C1C1E"),
    label: parseHex("#FFFFFF"),
    labelSecondary: rgba(235, 235, 245, 0.6),
    labelTertiary: rgba(235, 235, 245, 0.3),
    separator: rgba(84, 84, 88, 0.6),
    fill: rgba(120, 120, 128, 0.36),
  },
};

/** Opaque surfaces that text can sit on, per scheme. Every text token is checked against all. */
export function textSurfaces(scheme: Scheme): Rgba[] {
  const s = SURFACES[scheme];
  return [s.bg, s.bgSecondary, s.bgTertiary, s.bgGrouped, s.bgGroupedRow];
}

export const STATUS_NAMES = ["green", "red", "orange", "yellow", "indigo", "purple"] as const;
export type StatusName = (typeof STATUS_NAMES)[number];

/** Raw system colors from the spec. Used as-is only for non-text marks (dots, icons, rings). */
export const STATUS: Record<Scheme, Record<StatusName, Rgba>> = {
  light: {
    green: parseHex("#34C759"),
    red: parseHex("#FF3B30"),
    orange: parseHex("#FF9500"),
    yellow: parseHex("#FFCC00"),
    indigo: parseHex("#5856D6"),
    purple: parseHex("#AF52DE"),
  },
  dark: {
    green: parseHex("#30D158"),
    red: parseHex("#FF453A"),
    orange: parseHex("#FF9F0A"),
    yellow: parseHex("#FFD60A"),
    indigo: parseHex("#5E5CE6"),
    purple: parseHex("#BF5AF2"),
  },
};

/** The platform default accent (spec: `--accent-fill` #0071E3). */
export const DEFAULT_ACCENT = "#0071E3";

export const RADIUS_SCALES = {
  compact: { control: 10, card: 16, sheet: 20 },
  standard: { control: 11, card: 18, sheet: 24 },
  rounded: { control: 12, card: 20, sheet: 28 },
} as const;
export type RadiusScale = keyof typeof RADIUS_SCALES;

export const FONT_STACKS = {
  system:
    "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', var(--font-inter, Inter), 'Segoe UI', Roboto, system-ui, sans-serif",
  inter:
    "var(--font-inter, Inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif",
} as const;
export type FontChoice = keyof typeof FONT_STACKS;

export const SHADOWS: Record<Scheme, string> = {
  light: "0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.08)",
  dark: "none",
};

/**
 * A damped spring (mass 1) sampled into a CSS `linear()` easing, so sheets and toggles get spring
 * motion without a JavaScript animation library. Defaults follow Section 7.3.
 */
export function springEasing(stiffness = 350, damping = 30, samples = 32) {
  const w0 = Math.sqrt(stiffness);
  const zeta = damping / (2 * w0);
  const position = (t: number) => {
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      return (
        1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
      );
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  };
  // Settle once the spring is within 0.5% of rest (visually still).
  let duration = 0.05;
  while (duration < 2 && Math.abs(1 - position(duration)) > 0.005) duration += 0.01;
  const points = Array.from({ length: samples + 1 }, (_, i) => {
    const v = i === samples ? 1 : position((duration * i) / samples);
    return Math.round(v * 1000) / 1000;
  });
  return { easing: `linear(${points.join(", ")})`, durationMs: Math.round(duration * 1000) };
}
