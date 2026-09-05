import { NextResponse } from "next/server";
import { POST as runIngest } from "../../ingest/route";

/**
 * GET /api/cron/events — Vercel Cron entry point for the events/markets sync.
 *
 * Vercel calls this every 15 minutes (see vercel.json) with
 * `Authorization: Bearer $CRON_SECRET`. It runs the ingest "events" task
 * in-process, so the market table no longer depends on the external n8n
 * schedule that silently stopped on 2026-06-03.
 */
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internal = new Request("http://internal/api/ingest", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.INGEST_API_KEY || "pmflow-ingest-secret"}`,
      "content-type": "application/json",
      "x-triggered-by": "vercel-cron-events",
    },
    body: JSON.stringify({ tasks: ["events"] }),
  });
  return runIngest(internal);
}
