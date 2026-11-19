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

if (isMain(import.meta.url)) {
  const payload = readPayload();
  const filePath = payload.tool_input?.file_path ?? payload.tool_input?.notebook_path;
  const root = projectDir(payload);
  // Reads are only checked for .env files; reading committed migrations is fine.
  const reason =
    payload.tool_name === "Read"
      ? filePath && isEnvFile(toRepoPath(filePath, root))
        ? `${toRepoPath(filePath, root)} is an environment file. Never read .env* files.`
        : null
      : checkEdit(filePath, root);
  if (reason) block(reason);
}
