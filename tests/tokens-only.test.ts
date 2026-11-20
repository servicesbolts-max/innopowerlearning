import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard for the "tokens only" rule (.claude/rules/design-system.md): UI code never contains raw
 * colors or arbitrary pixel/rem values. Colors live in src/lib/theme and reach the UI as CSS
 * variables mapped to Tailwind utilities in src/app/globals.css.
 */
const ROOTS = ["src/app", "src/design-system"];
const ALLOWED = new Set(["src/app/globals.css"]);
const EXTENSIONS = /\.(tsx?|css|mdx)$/;

const RULES: Array<[string, RegExp]> = [
  ["hex color", /["'`\s(:]#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?=["'`\s;),])/],
  ["rgb/hsl/oklch color", /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/],
  ["arbitrary length or color", /-\[[^\]]*(?:\d(?:px|rem|em)|#|rgb|hsl)[^\]]*\]/],
  [
    "named color utility",
    /\b(?:bg|text|border|ring|fill|stroke)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})\b/,
  ],
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const files = ROOTS.flatMap((root) => walk(root))
  .map((f) => f.split(path.sep).join("/"))
  .filter((f) => EXTENSIONS.test(f) && !ALLOWED.has(f));

describe("UI code uses design tokens only", () => {
  it("finds UI files to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s has no raw colors or arbitrary lengths", (file) => {
    const offences = readFileSync(file, "utf8")
      .split("\n")
      .flatMap((line, i) =>
        RULES.filter(([, re]) => re.test(line)).map(
          ([name]) => `${file}:${i + 1} ${name}: ${line.trim()}`,
        ),
      );
    expect(offences).toEqual([]);
  });

  it("catches each kind of offence", () => {
    const samples = [
      'className="text-[#0071E3]"',
      'style={{ color: "#fff" }}',
      'style={{ color: "rgba(0,0,0,.5)" }}',
      'className="p-[13px]"',
      'className="bg-blue-500"',
      'className="text-white"',
    ];
    for (const s of samples)
      expect(
        RULES.some(([, re]) => re.test(s)),
        s,
      ).toBe(true);
    for (const ok of ['href="#main"', 'className="bg-accent-fill p-4 text-on-accent"']) {
      expect(
        RULES.some(([, re]) => re.test(ok)),
        ok,
      ).toBe(false);
    }
  });
});
