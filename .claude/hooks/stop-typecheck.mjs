#!/usr/bin/env node
// Stop: run `pnpm typecheck`; while it fails, keep the turn open with the errors as the reason.
// Claude Code ends the turn anyway after repeated blocks, so this cannot loop forever.
import { spawnSync } from "node:child_process";
import { isMain, projectDir, readPayload } from "./lib.mjs";

if (isMain(import.meta.url)) {
  const payload = readPayload();
  const res = spawnSync("pnpm", ["-s", "typecheck"], {
    cwd: projectDir(payload),
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (res.status !== 0) {
    const output = `${res.stdout ?? ""}${res.stderr ?? ""}`
      .trim()
      .split("\n")
      .slice(0, 40)
      .join("\n");
    process.stdout.write(
      JSON.stringify({
        decision: "block",
        reason: `pnpm typecheck is failing. Fix the root cause before finishing:\n${output}`,
      }),
    );
  }
}
