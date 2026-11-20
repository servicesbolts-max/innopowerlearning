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
    await captureStates(browser);
  } finally {
    await browser.close();
  }
}

type Browser = Awaited<ReturnType<typeof chromium.launch>>;

/** States a static capture cannot show: collapsed bar, open sheet, forced colors, 200% zoom. */
async function captureStates(browser: Browser) {
  const shot = async (
    name: string,
    options: Parameters<Browser["newPage"]>[0],
    act: (page: Awaited<ReturnType<Browser["newPage"]>>) => Promise<void>,
  ) => {
    const page = await browser.newPage({
      reducedMotion: "reduce",
      deviceScaleFactor: 1,
      ...options,
    });
    await act(page);
    const file = path.join(outDir, `state-${name}.png`);
    await page.screenshot({ path: file });
    console.log(file);
    await page.close();
  };
  const open = async (page: Awaited<ReturnType<Browser["newPage"]>>, theme: string) => {
    await page.goto(`${baseURL}/design/${theme}`, { waitUntil: "networkidle" });
    await page.getByRole("group", { name: "Start date" }).waitFor();
  };

  await shot(
    "innopower-390-light-collapsed-bar",
    { viewport: { width: 390, height: 844 }, colorScheme: "light" },
    async (page) => {
      await open(page, "innopower");
      await page.mouse.wheel(0, 1600);
      await page.waitForTimeout(500);
    },
  );
  await shot(
    "sunset-390-dark-sheet-open",
    { viewport: { width: 390, height: 844 }, colorScheme: "dark" },
    async (page) => {
      await open(page, "sunset");
      await page.getByRole("button", { name: "Open sheet" }).click();
      await page.getByRole("dialog").waitFor();
      await page.waitForTimeout(300);
    },
  );
  await shot(
    "emerald-1280-light-alert-dialog",
    { viewport: { width: 1280, height: 900 }, colorScheme: "light" },
    async (page) => {
      await open(page, "emerald");
      await page.getByRole("button", { name: "Delete course" }).nth(1).click();
      await page.getByRole("alertdialog").waitFor();
      await page.waitForTimeout(300);
    },
  );
  await shot(
    "innopower-1280-forced-colors",
    { viewport: { width: 1280, height: 900 }, forcedColors: "active" },
    async (page) => {
      await open(page, "innopower");
      await page.getByText("Selection controls").scrollIntoViewIfNeeded();
    },
  );
  await shot(
    "sunset-640-light-zoom-200",
    { viewport: { width: 640, height: 1000 }, colorScheme: "light" },
    async (page) => {
      await open(page, "sunset");
    },
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
