/**
 * Color math for the theme engine: sRGB <-> OKLCH, WCAG 2.x contrast, alpha compositing.
 * Pure functions, no dependencies. References: WCAG 2.2 relative luminance; Björn Ottosson's OKLab.
 */

/** sRGB channels 0..255, alpha 0..1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Oklch {
  l: number; // 0..1
  c: number; // 0..~0.4
  h: number; // degrees 0..360
}

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHex(value: string): boolean {
  return HEX.test(value);
}

export function parseHex(hex: string): Rgba {
  if (!isHex(hex)) throw new Error(`Not a hex color: ${hex}`);
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((ch) => ch + ch).join("");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: 1,
  };
}

export function rgba(r: number, g: number, b: number, a = 1): Rgba {
  return { r, g, b, a };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const to255 = (v: number) => Math.round(clamp(v, 0, 255));

export function toHex({ r, g, b }: Rgba): string {
  return `#${[r, g, b].map((v) => to255(v).toString(16).padStart(2, "0")).join("")}`;
}

/** CSS serialisation: hex when opaque, rgba() otherwise. Only digits, dots, commas and `#`. */
export function toCss(color: Rgba): string {
  if (color.a >= 1) return toHex(color);
  const a = Math.round(clamp(color.a, 0, 1) * 1000) / 1000;
  return `rgba(${to255(color.r)}, ${to255(color.g)}, ${to255(color.b)}, ${a})`;
}

/** Paint `fg` (with its alpha) over an opaque `bg`. */
export function composite(fg: Rgba, bg: Rgba): Rgba {
  const a = clamp(fg.a, 0, 1);
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
    a: 1,
  };
}

function toLinear(channel255: number): number {
  const c = channel255 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function fromLinear(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return v * 255;
}

export function relativeLuminance(color: Rgba): number {
  return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
}

/** WCAG contrast ratio of `fg` (composited over `bg` if translucent) against opaque `bg`. */
export function contrast(fg: Rgba, bg: Rgba): number {
  const solid = fg.a < 1 ? composite(fg, bg) : fg;
  const l1 = relativeLuminance(solid);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function rgbToOklch(color: Rgba): Oklch {
  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.hypot(A, B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

/** OKLCH to linear-light sRGB channels (may fall outside 0..1). */
function oklchToLinear({ l, c, h }: Oklch): [number, number, number] {
  const hr = (h * Math.PI) / 180;
  const A = c * Math.cos(hr);
  const B = c * Math.sin(hr);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

const inGamut = (lin: number[]) => lin.every((v) => v >= -1e-6 && v <= 1 + 1e-6);

/** OKLCH to sRGB, reducing chroma (keeping lightness and hue) until the color fits the gamut. */
export function oklchToRgb(color: Oklch): Rgba {
  const l = clamp(color.l, 0, 1);
  let lo = 0;
  let hi = Math.max(0, color.c);
  if (!inGamut(oklchToLinear({ l, c: hi, h: color.h }))) {
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear({ l, c: mid, h: color.h }))) lo = mid;
      else hi = mid;
    }
    hi = lo;
  }
  const [r, g, b] = oklchToLinear({ l, c: hi, h: color.h });
  return {
    r: fromLinear(clamp(r, 0, 1)),
    g: fromLinear(clamp(g, 0, 1)),
    b: fromLinear(clamp(b, 0, 1)),
    a: 1,
  };
}

/** Hue distance in degrees (0..180). */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}
