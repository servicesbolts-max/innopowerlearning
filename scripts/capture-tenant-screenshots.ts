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
/** Which package's screens to capture: SCREENSHOTS=p2 (default) or p3 (auth). */
const PKG = process.env.SCREENSHOTS === "p3" ? "p3" : "p2";
const outDir = path.resolve(process.argv[2] ?? `docs/screenshots/${PKG}`);
type Host = "hub" | "lsetf" | "wapsea" | "gods-entrepreneurs" | "wvstu";
/** Every host's home, plus the secondary screens P2 adds (once each, on one host). */
const SCREENS: { host: Host; path: string; name: string; status?: number }[] = [
  ...(["hub", "lsetf", "wapsea", "gods-entrepreneurs", "wvstu"] as const).map((host) => ({
    host,
    path: "/",
    name: host,
  })),
  { host: "hub", path: "/partners", name: "hub-partners" },
  { host: "hub", path: "/sign-in", name: "hub-sign-in" },
  { host: "hub", path: "/library", name: "hub-library" },
  { host: "lsetf", path: "/courses", name: "lsetf-courses" },
  { host: "lsetf", path: "/sign-in", name: "lsetf-sign-in" },
  { host: "hub", path: "/no-such-page", name: "not-found", status: 404 },
];

/** P3: the public auth screens (signed-in screens are covered by axe in e2e/auth.spec.ts). */
const AUTH_SCREENS: typeof SCREENS = [
  { host: "lsetf", path: "/sign-in", name: "lsetf-sign-in" },
  { host: "wvstu", path: "/sign-up", name: "wvstu-sign-up" },
  { host: "lsetf", path: "/invite/not-a-real-invitation-token-000", name: "lsetf-invite-invalid" },
];
const WIDTHS = [390, 1280] as const;
const SCHEMES = ["light", "dark"] as const;

const urlFor = (host: Host, path: string) =>
  `${base.protocol}//${host === "hub" ? "" : `${host}.`}${base.hostname}:${base.port}${path}`;

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    for (const screen of PKG === "p3" ? AUTH_SCREENS : SCREENS) {
      for (const width of WIDTHS) {
        for (const scheme of SCHEMES) {
          const page = await browser.newPage({
            viewport: { width, height: width < 768 ? 844 : 900 },
            colorScheme: scheme,
            reducedMotion: "reduce",
            deviceScaleFactor: 1,
          });
          const url = urlFor(screen.host, screen.path);
          const res = await page.goto(url, { waitUntil: "networkidle" });
          if (res?.status() !== (screen.status ?? 200)) {
            throw new Error(`${url} returned ${res?.status()}`);
          }
          await page.getByRole("heading", { level: 1 }).waitFor();
          const height = await page.evaluate(() => document.documentElement.scrollHeight);
          await page.setViewportSize({ width, height });
          await page.waitForTimeout(300);
          const file = path.join(
            outDir,
            `${PKG === "p3" ? "auth" : "tenant"}-${screen.name}-${width}-${scheme}.png`,
          );
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
