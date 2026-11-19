// Shared helpers for Claude Code hooks. Plain Node (no dependencies) so hooks run anywhere.
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/** Reads the hook payload JSON from stdin. Returns {} on empty or invalid input. */
export function readPayload() {
  try {
    const raw = readFileSync(0, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Project root: CLAUDE_PROJECT_DIR when set by Claude Code, else the payload cwd, else cwd. */
export function projectDir(payload = {}) {
  return process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
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

/** True when the module is the entry script (so tests can import without side effects). */
export function isMain(importMetaUrl) {
  return process.argv[1] && importMetaUrl === pathToFileURL(path.resolve(process.argv[1])).href;
}
