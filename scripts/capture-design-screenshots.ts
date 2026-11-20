/**
 * Capture the /design showcase for each demo theme at 390 and 1280 px, light and dark
 * (P1 acceptance, spec Section 12). Run against a running server:
 *
 *   pnpm build && pnpm start --port 3100
 *   BASE_URL=http://localhost:3100 pnpm screenshots:design [out-dir]
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { DEMO_THEME_NAMES } from "../src/lib/theme/demo-themes";

const baseURL = process.env.BASE_URL ?? "http://localhost:3100";
const outDir = path.resolve(process.argv[2] ?? "docs/screenshots/p1");
const WIDTHS = [390, 1280] as const;
const SCHEMES = ["light", "dark"] as const;

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const theme of DEMO_THEME_NAMES) {
      for (const width of WIDTHS) {
        for (const scheme of SCHEMES) {
          const page = await browser.newPage({
            viewport: { width, height: width < 768 ? 844 : 900 },
            colorScheme: scheme,
            reducedMotion: "reduce",
            deviceScaleFactor: 1,
          });
          await page.goto(`${baseURL}/design/${theme}`, { waitUntil: "networkidle" });
          // Date fields and the calendar render after hydration.
          await page.getByRole("group", { name: "Start date" }).waitFor();
          const file = path.join(outDir, `design-${theme}-${width}-${scheme}.png`);
          // A viewport as tall as the page (instead of fullPage stitching, which scrolls) keeps the
          // navigation bar in its true top-of-page state.
          const height = await page.evaluate(() => document.documentElement.scrollHeight);
          await page.setViewportSize({ width, height });
          await page.waitForTimeout(400);
          await page.screenshot({ path: file });
          console.log(file);
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
