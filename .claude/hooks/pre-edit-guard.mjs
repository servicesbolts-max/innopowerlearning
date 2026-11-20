#!/usr/bin/env node
// PreToolUse (Read|Edit|Write|NotebookEdit): block reads and writes of .env* files, and writes
// to any migration that already exists in git HEAD (migrations are forward-only).
import { execFileSync } from "node:child_process";
import path from "node:path";
import { block, isMain, projectDir, readPayload, toRepoPath } from "./lib.mjs";

const MIGRATION = /^src\/db\/migrations\/[^/]+\.sql$/;

export function isEnvFile(repoPath) {
  const base = path.posix.basename(repoPath);
  return base.startsWith(".env") && base !== ".env.example";
}

export function isMigration(repoPath) {
  return MIGRATION.test(repoPath);
}

/** True when the path exists in the HEAD commit. */
export function existsInHead(repoPath, root) {
  try {
    execFileSync("git", ["cat-file", "-e", `HEAD:${repoPath}`], { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Returns a reason string when the edit must be blocked, otherwise null. */
export function checkEdit(filePath, root, inHead = existsInHead) {
  if (!filePath) return null;
  const repoPath = toRepoPath(filePath, root);
  if (isEnvFile(repoPath)) {
    return `${repoPath} is an environment file. Never read or write .env* files; edit .env.example instead.`;
  }
  if (isMigration(repoPath) && inHead(repoPath, root)) {
    return `${repoPath} is already committed. Migrations are forward-only: write a new numbered migration instead.`;
  }
  return null;
}

/** Reads, searches and globs: only .env files are off limits (committed migrations may be read). */
export function checkRead(input, root, toolName = "Read") {
  // Grep's `pattern` is a content regex, not a path; Glob's `pattern` is a path glob.
  const paths = [input.file_path, input.path, input.glob];
  if (toolName === "Glob") paths.push(input.pattern);
  for (const value of paths) {
    if (typeof value !== "string" || !value) continue;
    const base = value.split(/[\\/]/).pop() ?? "";
    const candidate = /[*?[]/.test(value) ? base : toRepoPath(value, root);
    if (isEnvFile(candidate) || /^\.env\*?$/.test(base)) {
      return `${value} targets environment files. Never read .env* files.`;
    }
  }
  return null;
}

if (isMain(import.meta.url)) {
  try {
    const payload = readPayload();
    if (payload === null || typeof payload.tool_input !== "object" || payload.tool_input === null) {
      block("unreadable hook payload (failing closed).");
    }
    const input = payload.tool_input;
    const root = projectDir(payload);
    const reason = ["Read", "Grep", "Glob"].includes(payload.tool_name)
      ? checkRead(input, root, payload.tool_name)
      : checkEdit(input.file_path ?? input.notebook_path, root);
    if (reason) block(reason);
  } catch (error) {
    // Any unexpected input (e.g. a non-string path) blocks instead of letting the edit through.
    block(`guard error, failing closed: ${error?.message ?? error}`);
  }
}
