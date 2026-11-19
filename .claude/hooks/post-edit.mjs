#!/usr/bin/env node
// PostToolUse (Edit|Write|MultiEdit): format the changed file with Prettier, run ESLint --fix on
// it, and return any remaining lint errors to Claude (exit 2 + stderr).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { isMain, projectDir, readPayload, toRepoPath } from "./lib.mjs";

const PRETTIER_EXT = /\.(?:[cm]?[jt]sx?|json|css|md|ya?ml)$/i;
const ESLINT_EXT = /\.(?:[cm]?[jt]sx?)$/i;
const SKIP = [
  /^node_modules\//,
  /^\.next\//,
  /^docs\/MASTER_PROMPT\.md$/,
  /(^|\/)pnpm-lock\.yaml$/,
];

export function plan(repoPath) {
  if (repoPath.startsWith("..") || SKIP.some((re) => re.test(repoPath))) {
    return { prettier: false, eslint: false };
  }
  return { prettier: PRETTIER_EXT.test(repoPath), eslint: ESLINT_EXT.test(repoPath) };
}

function runNodeBin(root, relBin, args) {
  const bin = path.join(root, relBin);
  if (!existsSync(bin)) return { status: 0, stdout: "", stderr: "" };
  return spawnSync(process.execPath, [bin, ...args], { cwd: root, encoding: "utf8" });
}

if (isMain(import.meta.url)) {
  const payload = readPayload();
  const filePath = payload.tool_input?.file_path;
  const root = projectDir(payload);
  if (filePath && existsSync(filePath)) {
    const repoPath = toRepoPath(filePath, root);
    const todo = plan(repoPath);
    if (todo.prettier) {
      runNodeBin(root, "node_modules/prettier/bin/prettier.cjs", [
        "--write",
        "--ignore-unknown",
        "--log-level=warn",
        repoPath,
      ]);
    }
    if (todo.eslint) {
      const res = runNodeBin(root, "node_modules/eslint/bin/eslint.js", [
        "--fix",
        "--max-warnings=0",
        "--no-warn-ignored",
        repoPath,
      ]);
      if (res.status !== 0) {
        process.stderr.write(
          `ESLint found problems in ${repoPath} after auto-fix:\n${res.stdout}${res.stderr}`,
        );
        process.exit(2);
      }
    }
  }
}
