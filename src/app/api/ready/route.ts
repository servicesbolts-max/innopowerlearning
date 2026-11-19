import { connection } from "next/server";
import { checkReadiness } from "@/modules/system";

/** Readiness: dependencies are reachable. Returns 503 when any check fails. */
export async function GET() {
  await connection();
  const report = await checkReadiness();
  return Response.json(report, {
    status: report.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
