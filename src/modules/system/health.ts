import { getSql } from "@/db";

export type CheckStatus = "ok" | "fail";

export interface ReadinessReport {
  status: CheckStatus;
  checks: { database: CheckStatus };
}

/** Readiness: can this instance serve traffic? Never includes error details or secrets. */
export async function checkReadiness(
  pingDatabase: () => Promise<void> = defaultPing,
): Promise<ReadinessReport> {
  let database: CheckStatus = "ok";
  try {
    await pingDatabase();
  } catch {
    database = "fail";
  }
  return { status: database === "ok" ? "ok" : "fail", checks: { database } };
}

async function defaultPing(): Promise<void> {
  await getSql()`select 1`;
}
