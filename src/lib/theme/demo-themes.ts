import type { TenantThemeInput } from "./engine";

/**
 * Placeholder tenant themes for the /design showcase and Storybook (P1). P2 seeds the real
 * partner brands; these exist to prove the engine on a blue, a green-teal and an orange-red.
 */
export const DEMO_THEMES = {
  innopower: { accent: "#0071E3", radius: "standard" },
  emerald: { accent: "#0F9D7A", radius: "compact", font: "inter" },
  sunset: { accent: "#F25C2A", accentSecondary: "#7A4CE0", radius: "rounded" },
} as const satisfies Record<string, TenantThemeInput>;

export type DemoThemeName = keyof typeof DEMO_THEMES;
export const DEMO_THEME_NAMES = Object.keys(DEMO_THEMES) as DemoThemeName[];

export function isDemoTheme(name: string): name is DemoThemeName {
  return Object.hasOwn(DEMO_THEMES, name);
}
