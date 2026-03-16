import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const INGEST_API_KEY = process.env.INGEST_API_KEY || "";

/**
 * POST /api/twitter
 * Generates tweet content for n8n to post via Twitter API.
 * Returns formatted tweet text + market URL.
 * n8n calls this, then uses the Twitter node to post.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${INGEST_API_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  let body: { type?: string } = {};
  try { body = await request.json(); } catch {}

  const tweetType = body.type || "whale";
  const tweets: { text: string; url: string }[] = [];

  if (tweetType === "whale" || tweetType === "all") {
    // Get notable whale positions
    const { data: holders } = await db
      .from("top_holders")
      .select("wallet_name, wallet_address, amount, outcome_index, market_id")
      .gt("amount", 50000)
      .order("snapshot_at", { ascending: false })
      .limit(3);

    for (const h of holders || []) {
      // Get market details separately
      const { data: mkt } = await db.from("markets").select("question, events!inner(slug)").eq("id", h.market_id).single();
      const name = h.wallet_name || `${(h.wallet_address || "").slice(0, 8)}...`;
      const side = h.outcome_index === 0 ? "YES" : "NO";
      const amount = h.amount >= 1000000 ? `$${(h.amount / 1000000).toFixed(1)}M` : `$${(h.amount / 1000).toFixed(0)}K`;
      const question = ((mkt as any)?.question || "").slice(0, 80);
      const slug = (mkt as any)?.events?.slug || "";

      tweets.push({
        text: `Whale Alert: ${name} holds ${amount} ${side} on "${question}"\n\nTrack smart money moves in real-time\n\nhttps://polymarketflow.com/market/${slug}`,
        url: `https://polymarketflow.com/market/${slug}`,
      });
    }
  }

  if (tweetType === "mover" || tweetType === "all") {
    // Get biggest movers
    const { data: markets } = await db
      .from("markets")
      .select("question, one_day_price_change, outcome_prices, volume_24h, events!inner(slug)")
      .eq("active", true)
      .not("one_day_price_change", "is", null)
      .order("volume_24h", { ascending: false, nullsFirst: false })
      .limit(50);

    const topMover = (markets || [])
      .filter((m: any) => Math.abs(m.one_day_price_change || 0) > 5)
      .sort((a: any, b: any) => Math.abs(b.one_day_price_change) - Math.abs(a.one_day_price_change))[0];

    if (topMover) {
      const change = topMover.one_day_price_change || 0;
      const price = ((topMover.outcome_prices?.[0] || 0.5) * 100).toFixed(0);
      const dir = change > 0 ? "up" : "down";
      const slug = (topMover as any).events?.slug || "";

      tweets.push({
        text: `Market Alert: "${(topMover.question || "").slice(0, 70)}" moved ${dir} ${Math.abs(change).toFixed(1)}% to ${price}%\n\n24h Volume: $${((topMover.volume_24h || 0) / 1000).toFixed(0)}K\n\nhttps://polymarketflow.com/market/${slug}`,
        url: `https://polymarketflow.com/market/${slug}`,
      });
    }
  }

  return NextResponse.json({ tweets, count: tweets.length });
}
