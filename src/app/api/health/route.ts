import { connection } from "next/server";

/** Liveness: the process is up. No dependencies are checked here (see /api/ready). */
export async function GET() {
  await connection();
  return Response.json(
    { status: "ok", time: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
