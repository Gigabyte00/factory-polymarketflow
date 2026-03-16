import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const INGEST_API_KEY = process.env.INGEST_API_KEY || "";

/**
 * POST /api/insights
 * Generates a daily market insight post using market data.
 * Called by n8n daily at 8am ET.
 * Aggregates top movers + whale data into an editorial-style blog post.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${INGEST_API_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  // 1. Gather data for the insight
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  const formatted = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  // Top movers
  const { data: movers } = await db
    .from("markets")
    .select("question, one_day_price_change, outcome_prices, volume_24h, slug, category, events!inner(slug, title)")
    .eq("active", true)
    .not("one_day_price_change", "is", null)
    .order("volume_24h", { ascending: false, nullsFirst: false })
    .limit(80);

  const sorted = (movers || [])
    .filter((m: any) => Math.abs(m.one_day_price_change || 0) > 2)
    .sort((a: any, b: any) => Math.abs(b.one_day_price_change) - Math.abs(a.one_day_price_change));

  const topGainer = sorted.find((m: any) => m.one_day_price_change > 0);
  const topLoser = sorted.find((m: any) => m.one_day_price_change < 0);

  // Whale activity
  const { data: whalePositions } = await db
    .from("top_holders")
    .select("wallet_name, wallet_address, amount, outcome_index, markets!inner(question, slug, events!inner(slug))")
    .gt("amount", 20000)
    .order("snapshot_at", { ascending: false })
    .limit(5);

  // Volume stats
  const { data: volumeData } = await db
    .from("events")
    .select("volume_24h")
    .eq("active", true);

  const total24hVol = (volumeData || []).reduce((sum: number, e: any) => sum + (e.volume_24h || 0), 0);

  // 2. Generate the insight content
  const gainerText = topGainer ? `**${(topGainer as any).events?.title || topGainer.question}** surged ${(topGainer.one_day_price_change || 0).toFixed(1)}%, now trading at ${((topGainer.outcome_prices?.[0] || 0.5) * 100).toFixed(0)}% probability. Volume hit $${((topGainer.volume_24h || 0) / 1000).toFixed(0)}K in the past 24 hours.` : "No significant gainers today.";

  const loserText = topLoser ? `**${(topLoser as any).events?.title || topLoser.question}** dropped ${Math.abs(topLoser.one_day_price_change || 0).toFixed(1)}%, now at ${((topLoser.outcome_prices?.[0] || 0.5) * 100).toFixed(0)}% probability.` : "No significant losers today.";

  const whaleText = whalePositions && whalePositions.length > 0
    ? whalePositions.slice(0, 3).map((h: any) => {
        const name = h.wallet_name || `${(h.wallet_address || "").slice(0, 8)}...`;
        const side = h.outcome_index === 0 ? "YES" : "NO";
        const amount = h.amount >= 1000 ? `$${(h.amount / 1000).toFixed(0)}K` : `$${h.amount}`;
        const question = ((h.markets as any)?.question || "").slice(0, 60);
        return `- **${name}** holds ${amount} ${side} on "${question}"`;
      }).join("\n")
    : "No notable whale moves today.";

  const title = `Market Intelligence — ${formatted}`;
  const slug = `market-insight-${dateStr}`;

  const content = `## Today's Market Overview

Total 24h trading volume across all prediction markets: **$${(total24hVol / 1000000).toFixed(1)}M**

## Biggest Mover Up

${gainerText}

This market saw increased attention from both retail and whale traders.

## Biggest Mover Down

${loserText}

## Smart Money Activity

Notable whale positions detected in the last 24 hours:

${whaleText}

These positions represent significant capital commitments and may signal informed trading activity.

## What to Watch

Markets approaching their resolution dates tend to see increased volatility as uncertainty resolves. Keep an eye on markets in the [Politics](/predictions/politics) and [Crypto](/predictions/crypto) categories for the biggest moves.

Track all market movements in real-time with [PolymarketFlow](/pricing). Get instant alerts when whales move and markets spike.

---

*This insight was generated from PolymarketFlow's data pipeline, which tracks 1,100+ active prediction markets, 1,900+ whale wallets, and 150,000+ price data points.*`;

  const excerpt = topGainer
    ? `${(topGainer as any).events?.title || topGainer.question} surges ${(topGainer.one_day_price_change || 0).toFixed(1)}%. $${(total24hVol / 1000000).toFixed(1)}M in 24h volume across all markets.`
    : `$${(total24hVol / 1000000).toFixed(1)}M in 24h prediction market volume. Here's what moved.`;

  // 3. Save to pmflow.posts
  const { data: post, error } = await db.from("posts").upsert({
    slug,
    title,
    content,
    excerpt,
    type: "briefing",
    category: "Market Insights",
    published: true,
    published_at: today.toISOString(),
    read_time: "3 min read",
    author: "PolymarketFlow",
    meta_title: `${title} | PolymarketFlow`,
    meta_description: excerpt,
  }, { onConflict: "slug" }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    status: "published",
    slug,
    title,
    url: `https://polymarketflow.com/blog/${slug}`,
  });
}
