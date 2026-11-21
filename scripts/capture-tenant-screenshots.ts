/**
 * Capture the Hub and every seeded tenant host at 390 and 1280 px, light and dark (P2
 * acceptance: each tenant host shows a distinct branded shell). Run against a running server
 * with the demo seed loaded:
 *
 *   pnpm build && pnpm start --port 3100
 *   BASE_URL=http://localhost:3100 pnpm screenshots:tenants [out-dir]
 *
 * Chromium resolves *.localhost to loopback itself, so no hosts-file change is needed.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const base = new URL(process.env.BASE_URL ?? "http://localhost:3100");
const outDir = path.resolve(process.argv[2] ?? "docs/screenshots/p2");
const HOSTS = ["hub", "lsetf", "wapsea", "gods-entrepreneurs", "wvstu"] as const;
const WIDTHS = [390, 1280] as const;
const SCHEMES = ["light", "dark"] as const;

const urlFor = (host: (typeof HOSTS)[number]) =>
  `${base.protocol}//${host === "hub" ? "" : `${host}.`}${base.hostname}:${base.port}/`;

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const host of HOSTS) {
      for (const width of WIDTHS) {
        for (const scheme of SCHEMES) {
          const page = await browser.newPage({
            viewport: { width, height: width < 768 ? 844 : 900 },
            colorScheme: scheme,
            reducedMotion: "reduce",
            deviceScaleFactor: 1,
          });
          const res = await page.goto(urlFor(host), { waitUntil: "networkidle" });
          if (res?.status() !== 200) throw new Error(`${urlFor(host)} returned ${res?.status()}`);
          await page.getByRole("heading", { level: 1 }).waitFor();
          const height = await page.evaluate(() => document.documentElement.scrollHeight);
          await page.setViewportSize({ width, height });
          await page.waitForTimeout(300);
          const file = path.join(outDir, `tenant-${host}-${width}-${scheme}.png`);
          await page.screenshot({ path: file });
          console.log(`saved ${path.relative(process.cwd(), file)}`);
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

await main();
