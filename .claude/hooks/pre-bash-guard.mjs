#!/usr/bin/env node
// PreToolUse (Bash|PowerShell): block pushes, force flags, hard resets, hook bypasses,
// recursive deletes outside build directories, destructive SQL, .env reads, and piping
// downloads into a shell. Quotes are not parsed, so rules err on the side of blocking.
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

/** Rules on the whole command, including commit messages. */
const COMMAND_RULES = [
  [/--no-verify\b/, "--no-verify bypasses git hooks."],
  [/\bHUSKY=0\b/, "HUSKY=0 bypasses git hooks."],
  [/core\.hooksPath/i, "changing core.hooksPath bypasses git hooks."],
  [/\bgit\b.*\s-c\s+alias\./, "defining git aliases inline is not allowed."],
  [
    /\b(?:curl|wget|iwr|Invoke-WebRequest|irm|Invoke-RestMethod)\b[^|]*\|\s*(?:sudo\s+)?(?:sh|bash|zsh|pwsh|powershell|iex|Invoke-Expression|node|python3?)\b/i,
    "piping a download into a shell is not allowed.",
  ],
];

/** Rules on each segment that is not itself a commit or tag (so messages can say "push"). */
const SEGMENT_RULES = [
  [/\bgit\b.*\bpush\b/, "git push is not allowed; the owner pushes."],
  [/(?:^|\s)\$\{?\w+\}?\s+push\b|\$\([^)]*\)\s+push\b/, "git push via a variable is not allowed."],
  [/\bgit\b.*\breset\b.*--hard\b/, "git reset --hard discards work; use git stash or a commit."],
  [/--force(?:-with-lease)?\b/, "force flags are not allowed."],
  [/\bgit\b(?:\s+\S+)*\s-[a-zA-Z]*f[a-zA-Z]*\b/, "git force flags (-f) are not allowed."],
  [
    /\bdrop\s+(?:database|schema|table|owned|role)\b|\btruncate\s+(?:table\s+)?\w|\bdropdb\b/i,
    "destructive SQL is not allowed (use pnpm db:reset on the local database).",
  ],
  [
    /\b(?:Remove-Item|ri|rd|rmdir)\b.*\s-r\w*\b/i,
    "recursive deletes are not allowed (use rm -rf on a build directory).",
  ],
  [/\bdel\b.*\s\/s\b/i, "recursive deletes are not allowed."],
  [/\bloadEnvFile\b|\bdotenv\b/, "loading .env files from the shell is not allowed."],
];

const COMMIT_SEGMENT = /^(?:\w+=\S*\s+)*git\s+(?:-C\s+\S+\s+)?(?:commit|tag)\b/;
const COMMIT_SKIP_HOOKS =
  /^(?:\w+=\S*\s+)*git\s+(?:-C\s+\S+\s+)?commit\b.*\s-[a-zA-Z]*n[a-zA-Z]*\b/;

/** Splits a command into simple segments (best effort; quotes are not parsed). */
function segments(command) {
  return command
    .split(/&&|\|\||;|\n|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Removes quotes and a leading backslash or `command ` prefix from a token. */
function clean(token) {
  return token.replace(/^["'\\]+|["']+$/g, "");
}

function isRmRf(args) {
  const flags = args.filter((t) => t.startsWith("-"));
  const short = flags.filter((f) => !f.startsWith("--")).join("");
  const recursive = /r/i.test(short) || flags.includes("--recursive");
  const force = /f/.test(short) || flags.includes("--force");
  return recursive && force;
}

function isBuildDirTarget(target) {
  const t = clean(target).replace(/^\.\//, "").replace(/\/+$/, "");
  return BUILD_DIRS.has(t);
}

/** True for .env, .env.local, path/to/.env.production (but not .env.example). */
export function isEnvToken(token) {
  const base = clean(token).split(/[\\/]/).pop() ?? "";
  return /^\.env(?:\.|$)/.test(base) && base !== ".env.example";
}

/** Returns a reason string when the command must be blocked, otherwise null. */
export function checkCommand(command) {
  if (!command) return null;
  for (const [pattern, reason] of COMMAND_RULES) {
    if (pattern.test(command)) return reason;
  }
  for (const segment of segments(command)) {
    if (COMMIT_SEGMENT.test(segment)) {
      if (COMMIT_SKIP_HOOKS.test(segment)) return "git commit -n skips git hooks.";
      continue; // commit and tag messages may mention push, .env, drop table, etc.
    }
    for (const [pattern, reason] of SEGMENT_RULES) {
      if (pattern.test(segment)) return reason;
    }
    const tokens = segment.split(/\s+/);
    if (tokens.some(isEnvToken)) return ".env files may not be read or written from the shell.";
    const rmAt = tokens.findIndex(
      (t) => /^(?:command\s+)?rm$/.test(clean(t)) || clean(t).endsWith("/rm"),
    );
    if (rmAt === -1) continue;
    const args = tokens.slice(rmAt + 1);
    if (!isRmRf(args)) continue;
    const targets = args.filter((t) => !t.startsWith("-"));
    if (targets.length === 0 || !targets.every(isBuildDirTarget)) {
      return `rm -rf is only allowed on build directories (${[...BUILD_DIRS].join(", ")}).`;
    }
  }
  return null;
}

if (isMain(import.meta.url)) {
  const payload = readPayload();
  if (payload === null || typeof payload.tool_input?.command !== "string") {
    block("unreadable hook payload (failing closed).");
  }
  const reason = checkCommand(payload.tool_input.command);
  if (reason) block(reason);
}
