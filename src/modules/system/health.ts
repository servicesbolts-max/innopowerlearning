import { pingDatabase } from "@/modules/tenancy";

export type CheckStatus = "ok" | "fail";

export interface ReadinessReport {
  status: CheckStatus;
  checks: { database: CheckStatus };
}

/** Readiness: can this instance serve traffic? Never includes error details or secrets. */
export async function checkReadiness(
  ping: () => Promise<void> = pingDatabase,
): Promise<ReadinessReport> {
  let database: CheckStatus = "ok";
  try {
    await ping();
  } catch {
    database = "fail";
  }
  return { status: database === "ok" ? "ok" : "fail", checks: { database } };
}
