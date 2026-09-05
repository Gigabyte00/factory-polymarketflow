import { NextResponse } from "next/server";
import { generateBriefing } from "../../insights/route";

/**
 * GET /api/cron/briefing — Vercel Cron entry point for the daily market briefing.
 *
 * Vercel calls this once a day with `Authorization: Bearer $CRON_SECRET`. Owning the
 * schedule here means the briefing no longer depends on the external n8n box, whose
 * events job died silently in June and went unnoticed for three months.
 * `?force=1` bypasses the staleness and duplicate guards for manual verification.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return generateBriefing(new URL(request.url).searchParams.get("force") === "1");
}
