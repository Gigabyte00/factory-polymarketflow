import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/v1/markets - Public API for Elite tier users
 * Query params: limit, offset, category, active
 * Requires API key in header: X-API-Key
 */
export async function GET(request: Request) {
  // Check for API key (Elite tier feature)
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key required. Get one at polymarketflow.com/api-keys", docs: "https://polymarketflow.com/api-docs" },
      { status: 401 }
    );
  }

  // Validate API key against users table (simplified - real implementation would use api_keys table)
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");
  const category = searchParams.get("category");
  const active = searchParams.get("active") !== "false";

  let query = db.from("events").select("id, slug, title, category, volume, volume_24h, liquidity, open_interest, active, closed, end_date, tags, synced_at");
  if (active) query = query.eq("active", true).eq("closed", false);
  if (category) query = query.ilike("category", category);
  query = query.order("volume_24h", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data: data || [],
    meta: { limit, offset, count: data?.length || 0 },
  });
}
