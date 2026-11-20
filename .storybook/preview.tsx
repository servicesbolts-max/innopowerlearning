import type { Decorator, Preview } from "@storybook/react-vite";
import { NextIntlClientProvider } from "next-intl";
import { DsProvider } from "../src/design-system/provider";
import messages from "../src/i18n/messages/en.json";
import {
  buildTheme,
  DEMO_THEME_NAMES,
  DEMO_THEMES,
  themeToCss,
  type DemoThemeName,
} from "../src/lib/theme";
import "../src/app/globals.css";

type SchemeGlobal = "light" | "dark" | "matrix";

/** Theme CSS for one demo theme, scoped to `[data-ds-theme="<name>"]` so several can coexist. */
const scopedCss = DEMO_THEME_NAMES.map((name) =>
  themeToCss(buildTheme({ ...DEMO_THEMES[name], scheme: "light" }), `[data-ds-theme="${name}"]`),
).join("\n");

const withTheme: Decorator = (Story, context) => {
  const theme = context.globals.theme as DemoThemeName;
  const scheme = context.globals.scheme as SchemeGlobal;
  const frames: Array<[DemoThemeName, "light" | "dark"]> =
    scheme === "matrix"
      ? DEMO_THEME_NAMES.flatMap((t) => [[t, "light"] as const, [t, "dark"] as const])
      : [[theme, scheme]];
  // Overlays (popovers, sheets, toasts) portal to <body>, so the root carries the selected theme too.
  if (typeof document !== "undefined") {
    document.documentElement.dataset.scheme = scheme === "matrix" ? "light" : scheme;
  }
  return (
    <NextIntlClientProvider locale="en" timeZone="UTC" messages={messages}>
      <style>{themeToCss(buildTheme(DEMO_THEMES[theme]))}</style>
      <style>{scopedCss}</style>
      <DsProvider locale="en">
        <div className={scheme === "matrix" ? "grid gap-4 md:grid-cols-2" : undefined}>
          {frames.map(([t, s]) => (
            <div
              key={`${t}-${s}`}
              data-ds-theme={t}
              data-scheme={s}
              className="rounded-card bg-bg p-6 font-sans text-label"
            >
              {scheme === "matrix" && (
                <p className="mb-4 text-caption1 text-label-secondary">
                  {t} · {s}
                </p>
              )}
              <Story />
            </div>
          ))}
        </div>
      </DsProvider>
    </NextIntlClientProvider>
  );
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Tenant theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [...DEMO_THEME_NAMES],
        dynamicTitle: true,
      },
    },
    scheme: {
      description: "Color scheme",
      toolbar: {
        title: "Scheme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
          { value: "matrix", title: "All themes and schemes" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "innopower", scheme: "light" },
  decorators: [withTheme],
  parameters: {
    layout: "padded",
    a11y: { test: "error" },
    controls: { matchers: { color: /(background|color)$/i } },
  },
};

export default preview;
