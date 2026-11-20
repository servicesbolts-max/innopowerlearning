#!/usr/bin/env node
// PreToolUse (Bash|PowerShell): block pushes, force flags, hard resets, hook bypasses,
// recursive deletes outside build directories, destructive SQL, .env access, and piping
// downloads into a shell.
//
// This is a best-effort guard, not a shell parser: quotes are only understood for commit
// messages, and rules err on the side of blocking. Permissions in .claude/settings.json are the
// second layer. Anything that throws here blocks the command (fail closed).
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

/** Rules on the whole command (after commit messages are masked). */
const COMMAND_RULES = [
  [/--no-ver\w*/, "--no-verify bypasses git hooks."],
  [/\bHUSKY\s*=\s*["']?0|\$env:HUSKY\b/i, "disabling Husky bypasses git hooks."],
  [/core\.hooksPath/i, "changing core.hooksPath bypasses git hooks."],
  [/\bgit\b.*\s-c\s+alias\./, "defining git aliases inline is not allowed."],
  [
    /\b(?:curl|wget|iwr|Invoke-WebRequest|irm|Invoke-RestMethod)\b[^|]*\|\s*(?:sudo\s+)?(?:sh|bash|zsh|pwsh|powershell|iex|Invoke-Expression|node|python3?)\b/i,
    "piping a download into a shell is not allowed.",
  ],
];

/** Rules on each segment. */
const SEGMENT_RULES = [
  [/\bgit\b.*\b(?:push|send-pack)\b/, "git push is not allowed; the owner pushes."],
  [/\bgit\s+(?:\S+\s+)*["']?(?:\$\{?\w|\$\(|`)/, "git with a variable subcommand is not allowed."],
  [/(?:^|\s)\$\{?\w+\}?\s+push\b|\$\([^)]*\)\s+push\b/, "git push via a variable is not allowed."],
  [/\bgit\b.*\bcommit\b.*\s-[a-zA-Z]*n[a-zA-Z]*\b/, "git commit -n skips git hooks."],
  [/\bgit\b.*\breset\b.*--hard\b/, "git reset --hard discards work; use git stash or a commit."],
  [/--force(?:-with-lease)?\b/, "force flags are not allowed."],
  [/\bgit\b(?:\s+\S+)*\s-[a-zA-Z]*f[a-zA-Z]*\b/, "git force flags (-f) are not allowed."],
  [
    /\bdrop\s+(?:database|schema|table|owned|role)\b|\btruncate\s+(?:table\s+)?\w|\bdropdb\b/i,
    "destructive SQL is not allowed (use pnpm db:reset on the local database).",
  ],
  [
    /\b(?:Remove-Item|ri|rd|rmdir|del|erase)\b.*\s-r(?:e(?:c(?:u(?:r(?:se?)?)?)?)?)?\b|\brm\b.*\s-Recurse\b/i,
    "recursive deletes are not allowed (use rm -rf on a build directory).",
  ],
  [/\b(?:del|erase|rd|rmdir)\b.*\s\/s\b/i, "recursive deletes are not allowed."],
  [/\bfind\b.*\s-(?:delete\b|exec(?:dir)?\s+rm\b)/, "find -delete is not allowed."],
  [/\[(?:System\.)?IO\.(?:Directory|File)\]::Delete/i, "scripted deletes are not allowed."],
  [/\bloadEnvFile\b|\bdotenv\b|--env-file\b/, "loading .env files from the shell is not allowed."],
  [
    /\b(?:e?grep)\b(?=.*\s-[a-zA-Z]*[rR])(?!.*--exclude)|\bfindstr\b.*\s\/s\b/i,
    "recursive grep can read .env files; use the Grep tool (or add --exclude='.env*').",
  ],
];

/**
 * Masks quoted commit/tag messages so they may mention "push" or ".env". Double-quoted messages
 * that contain command substitution are left unmasked: the shell would execute them.
 */
export function maskMessages(command) {
  return command.replace(/(\s-[a-zA-Z]*m\s*)("(?:[^"\\]|\\.)*"|'[^']*')/g, (whole, flag, quoted) =>
    quoted.startsWith('"') && /\$\(|`|<\(/.test(quoted) ? whole : `${flag}MSG`,
  );
}

/** Splits a command into simple segments (best effort; quotes are not parsed). */
function segments(command) {
  return command
    .split(/&&|\|\||;|\n|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Strips quotes, a leading backslash, redirections and `--flag=` prefixes from a token. */
function clean(token) {
  return token
    .replace(/^[<>]+/, "")
    .replace(/^--?[\w-]+=/, "")
    .replace(/^["'\\]+|["']+$/g, "");
}

function isRecursive(args) {
  const flags = args.filter((t) => t.startsWith("-"));
  const short = flags.filter((f) => !f.startsWith("--")).join("");
  return /r/i.test(short) || flags.includes("--recursive");
}

function isBuildDirTarget(target) {
  const t = clean(target).replace(/^\.\//, "").replace(/\/+$/, "");
  return BUILD_DIRS.has(t);
}

/** True for .env, .env.local, .env*, <.env, --env-file=.env (but not .env.example). */
export function isEnvToken(token) {
  const base = clean(token).split(/[\\/]/).pop() ?? "";
  return /^\.env(?:[.*?[]|$)/.test(base) && base !== ".env.example";
}

/** Returns a reason string when the command must be blocked, otherwise null. */
export function checkCommand(command) {
  if (!command) return null;
  const masked = maskMessages(command);
  for (const [pattern, reason] of COMMAND_RULES) {
    if (pattern.test(masked)) return reason;
  }
  for (const segment of segments(masked)) {
    for (const [pattern, reason] of SEGMENT_RULES) {
      if (pattern.test(segment)) return reason;
    }
    const tokens = segment.split(/\s+/);
    // --exclude=.env* names files to skip, which is the safe direction.
    const touched = tokens.filter((t) => !/^--exclude(?:-dir)?=/.test(t));
    if (touched.some(isEnvToken)) return ".env files may not be read or written from the shell.";
    const rmAt = tokens.findIndex((t) => clean(t) === "rm" || clean(t).endsWith("/rm"));
    if (rmAt === -1) continue;
    const args = tokens.slice(rmAt + 1);
    if (!isRecursive(args)) continue;
    const targets = args.filter((t) => !t.startsWith("-"));
    if (targets.length === 0 || !targets.every(isBuildDirTarget)) {
      return `recursive rm is only allowed on build directories (${[...BUILD_DIRS].join(", ")}).`;
    }
  }
  return null;
}

if (isMain(import.meta.url)) {
  try {
    const payload = readPayload();
    if (payload === null || typeof payload.tool_input?.command !== "string") {
      block("unreadable hook payload (failing closed).");
    }
    const reason = checkCommand(payload.tool_input.command);
    if (reason) block(reason);
  } catch (error) {
    block(`guard error, failing closed: ${error?.message ?? error}`);
  }
}
