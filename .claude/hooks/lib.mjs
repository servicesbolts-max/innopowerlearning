// Shared helpers for Claude Code hooks. Plain Node (no dependencies) so hooks run anywhere.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Reads the hook payload JSON from stdin. Returns null when it is missing or invalid. */
export function readPayload() {
  try {
    const raw = readFileSync(0, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Project root: CLAUDE_PROJECT_DIR when set by Claude Code, else the payload cwd, else cwd. */
export function projectDir(payload) {
  return process.env.CLAUDE_PROJECT_DIR || payload?.cwd || process.cwd();
}

/** Path relative to the project root, with forward slashes. */
export function toRepoPath(filePath, root) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(root, filePath);
  return path.relative(root, abs).split(path.sep).join("/");
}

/** Blocks the tool call: exit code 2 sends stderr back to Claude as the reason. */
export function block(reason) {
  process.stderr.write(`Blocked by project hook: ${reason}\n`);
  process.exit(2);
}

/**
 * True when the module is the entry script (so tests can import without side effects).
 * Compared case-insensitively on Windows, where drive-letter case can differ.
 */
export function isMain(importMetaUrl) {
  if (!process.argv[1]) return false;
  const self = path.resolve(fileURLToPath(importMetaUrl));
  const entry = path.resolve(process.argv[1]);
  return process.platform === "win32" ? self.toLowerCase() === entry.toLowerCase() : self === entry;
}
