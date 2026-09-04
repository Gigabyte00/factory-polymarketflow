import { NextResponse } from "next/server";
import { getPerpsScreenerRows } from "@/lib/perps-api";

/**
 * JSON feed for the live Perps screener (client auto-refresh).
 * Upstream calls are cached via the lib's fetch revalidate windows
 * (tickers ~10s, klines 5m, instruments 1h) so visitor traffic never
 * multiplies against Polymarket's per-IP rate budget.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await getPerpsScreenerRows(true);
  return NextResponse.json(
    { rows, at: Date.now() },
    { headers: { "cache-control": "public, s-maxage=10, stale-while-revalidate=30" } }
  );
}
