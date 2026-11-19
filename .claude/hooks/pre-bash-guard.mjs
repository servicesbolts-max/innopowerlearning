#!/usr/bin/env node
// PreToolUse (Bash|PowerShell): block pushes, force flags, hard resets, hook bypasses,
// rm -rf outside build directories, destructive SQL, and piping downloads into a shell.
import { block, isMain, readPayload } from "./lib.mjs";

const BUILD_DIRS = new Set([
  ".next",
  "node_modules",
  "coverage",
  "dist",
  "out",
  "build",
  "test-results",
  "playwright-report",
  "blob-report",
  ".lighthouseci",
  ".turbo",
]);

/** Each rule: [pattern, reason]. Patterns run on each shell segment (split on ; && || |). */
const SEGMENT_RULES = [
  [
    /\bgit\s+(?:-[cC]\s+\S+\s+|--?[\w-]+(?:=\S+)?\s+)*push\b/,
    "git push is not allowed; the owner pushes.",
  ],
  [
    /\bgit\b.*\breset\b.*--hard\b/,
    "git reset --hard discards work; use git stash or a new commit.",
  ],
  [/--no-verify\b/, "--no-verify bypasses git hooks."],
  [/--force(?:-with-lease)?\b/, "force flags are not allowed."],
  [/\bgit\b(?:\s+\S+)*\s-[a-zA-Z]*f[a-zA-Z]*\b/, "git force flags (-f) are not allowed."],
  [
    /\bdrop\s+(?:database|schema)\b/i,
    "DROP DATABASE/SCHEMA is not allowed (use pnpm db:reset locally).",
  ],
  [
    /\b(?:Remove-Item|rd|rmdir|ri)\b(?=.*\s-Recurse\b)(?=.*\s-Force\b)/i,
    "recursive forced deletes are not allowed.",
  ],
];

const PIPE_TO_SHELL =
  /\b(?:curl|wget|iwr|Invoke-WebRequest|irm|Invoke-RestMethod)\b[^|]*\|\s*(?:sudo\s+)?(?:sh|bash|zsh|pwsh|powershell|iex|Invoke-Expression|node|python3?)\b/i;

/** Splits a command into simple segments (best effort; quotes are not parsed). */
function segments(command) {
  return command
    .split(/&&|\|\||;|\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** True when an rm segment is recursive and forced. */
function isRmRf(tokens) {
  const flags = tokens.filter((t) => t.startsWith("-"));
  const short = flags.filter((f) => !f.startsWith("--")).join("");
  const recursive = /r/i.test(short) || flags.includes("--recursive");
  const force = /f/.test(short) || flags.includes("--force");
  return recursive && force;
}

function isBuildDirTarget(target) {
  const clean = target
    .replace(/^["']|["']$/g, "")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
  return BUILD_DIRS.has(clean);
}

/** Returns a reason string when the command must be blocked, otherwise null. */
export function checkCommand(command) {
  if (!command) return null;
  if (PIPE_TO_SHELL.test(command)) return "piping a download into a shell is not allowed.";
  for (const segment of segments(command)) {
    for (const [pattern, reason] of SEGMENT_RULES) {
      if (pattern.test(segment)) return reason;
    }
    for (const part of segment.split("|")) {
      const tokens = part.trim().split(/\s+/);
      const rmAt = tokens.findIndex((t) => t === "rm" || t.endsWith("/rm"));
      if (rmAt === -1) continue;
      const args = tokens.slice(rmAt + 1);
      if (!isRmRf(args)) continue;
      const targets = args.filter((t) => !t.startsWith("-"));
      if (targets.length === 0 || !targets.every(isBuildDirTarget)) {
        return `rm -rf is only allowed on build directories (${[...BUILD_DIRS].join(", ")}).`;
      }
    }
  }
  return null;
}

if (isMain(import.meta.url)) {
  const payload = readPayload();
  const reason = checkCommand(payload.tool_input?.command ?? "");
  if (reason) block(reason);
}
