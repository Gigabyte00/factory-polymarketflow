import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GAMMA_BASE = "https://gamma-api.polymarket.com";
const CLOB_BASE = "https://clob.polymarket.com";
const DATA_BASE = "https://data-api.polymarket.com";

// Simple API key auth for the ingest endpoint
const INGEST_API_KEY = process.env.INGEST_API_KEY || "pmflow-ingest-secret";

/**
 * POST /api/ingest
 * 
 * Called hourly by n8n (or cron) to sync Polymarket data into Supabase.
 * 
 * Body: { "tasks": ["events", "prices", "leaderboard", "holders"] }
 * Default: all tasks
 */
export async function POST(request: Request) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${INGEST_API_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pmflow = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "pmflow" },
    }
  );

  let body: { tasks?: string[] } = {};
  try {
    body = await request.json();
  } catch {
    // Default: run all tasks
  }

  const tasks = body.tasks || ["events", "prices", "leaderboard", "holders"];
  const results: Record<string, { success: boolean; count?: number; error?: string }> = {};

  // ============ TASK 1: Sync Events + Markets ============
  if (tasks.includes("events")) {
    try {
      let allEvents: any[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      // Paginate through all active events
      while (hasMore) {
        const res = await fetch(
          `${GAMMA_BASE}/events?active=true&closed=false&limit=${limit}&offset=${offset}`
        );
        if (!res.ok) throw new Error(`Gamma API ${res.status}`);
        const events = await res.json();
        allEvents = allEvents.concat(events);
        hasMore = events.length === limit;
        offset += limit;
        // Safety: cap at 1000 events
        if (offset > 1000) break;
      }

      // Upsert events
      const eventRows = allEvents.map((e: any) => ({
        id: String(e.id),
        slug: e.slug,
        title: e.title,
        subtitle: e.subtitle,
        description: e.description?.substring(0, 5000),
        resolution_source: e.resolutionSource,
        start_date: e.startDate,
        end_date: e.endDate,
        image: e.image,
        icon: e.icon,
        active: e.active ?? true,
        closed: e.closed ?? false,
        featured: e.featured ?? false,
        category: e.category,
        subcategory: e.subcategory,
        volume: e.volume || 0,
        volume_24h: e.volume24hr || 0,
        volume_1w: e.volume1wk || 0,
        volume_1m: e.volume1mo || 0,
        liquidity: e.liquidity || 0,
        open_interest: e.openInterest || 0,
        competitive: e.competitive || 0,
        comment_count: e.commentCount || 0,
        neg_risk: e.negRisk ?? false,
        tags: e.tags || [],
        synced_at: new Date().toISOString(),
      }));

      if (eventRows.length > 0) {
        const { error: eventError } = await pmflow
          .from("events")
          .upsert(eventRows, { onConflict: "id" });
        if (eventError) throw eventError;
      }

      // Upsert markets from all events
      const marketRows: any[] = [];
      for (const event of allEvents) {
        if (!event.markets) continue;
        for (const m of event.markets) {
          let outcomes, outcomePrices, clobTokenIds;
          try { outcomes = JSON.parse(m.outcomes || '["Yes","No"]'); } catch { outcomes = ["Yes", "No"]; }
          try { outcomePrices = JSON.parse(m.outcomePrices || '[0.5,0.5]'); } catch { outcomePrices = [0.5, 0.5]; }
          try { clobTokenIds = JSON.parse(m.clobTokenIds || '[]'); } catch { clobTokenIds = []; }

          marketRows.push({
            id: String(m.id),
            event_id: String(event.id),
            condition_id: m.conditionId,
            slug: m.slug,
            question: m.question,
            description: m.description?.substring(0, 5000),
            image: m.image,
            outcomes,
            outcome_prices: outcomePrices.map(Number),
            clob_token_ids: clobTokenIds,
            volume: parseFloat(m.volume || "0"),
            volume_24h: m.volume24hr || 0,
            volume_1w: m.volume1wk || 0,
            volume_1m: m.volume1mo || 0,
            liquidity: m.liquidityNum || 0,
            best_bid: m.bestBid,
            best_ask: m.bestAsk,
            last_trade_price: m.lastTradePrice,
            spread: m.spread,
            one_day_price_change: m.oneDayPriceChange,
            one_week_price_change: m.oneWeekPriceChange,
            one_month_price_change: m.oneMonthPriceChange,
            enable_order_book: m.enableOrderBook ?? true,
            active: m.active ?? true,
            closed: m.closed ?? false,
            end_date: m.endDate,
            category: m.category || event.category,
            synced_at: new Date().toISOString(),
          });
        }
      }

      // Batch upsert markets (100 at a time to avoid payload limits)
      let marketCount = 0;
      for (let i = 0; i < marketRows.length; i += 100) {
        const batch = marketRows.slice(i, i + 100);
        const { error: marketError } = await pmflow
          .from("markets")
          .upsert(batch, { onConflict: "id" });
        if (marketError) throw marketError;
        marketCount += batch.length;
      }

      results.events = { success: true, count: eventRows.length };
      results.markets = { success: true, count: marketCount };
    } catch (err: any) {
      results.events = { success: false, error: err.message };
    }
  }

  // ============ TASK 2: Capture Price Snapshots ============
  if (tasks.includes("prices")) {
    try {
      // Get all markets with CLOB token IDs
      const { data: markets } = await pmflow
        .from("markets")
        .select("id, clob_token_ids")
        .eq("active", true)
        .not("clob_token_ids", "is", null);

      if (markets && markets.length > 0) {
        const now = new Date().toISOString();
        const priceRows: any[] = [];

        // Batch fetch midpoints (up to 500 per call)
        const allTokenIds = markets.flatMap((m: any) => {
          const ids = m.clob_token_ids;
          return Array.isArray(ids) ? ids : [];
        }).filter((id: string) => id && id.length > 0);

        // Fetch in batches of 100 tokens
        const midpointMap: Record<string, number> = {};
        for (let i = 0; i < allTokenIds.length; i += 100) {
          const batch = allTokenIds.slice(i, i + 100);
          const params = batch.map((id: string) => `token_ids=${id}`).join("&");
          try {
            const res = await fetch(`${CLOB_BASE}/midpoints?${params}`);
            if (res.ok) {
              const data = await res.json();
              Object.assign(midpointMap, data);
            }
          } catch { /* skip failed batches */ }
        }

        // Create price history rows
        for (const market of markets) {
          const tokenIds = Array.isArray(market.clob_token_ids) ? market.clob_token_ids : [];
          for (const tokenId of tokenIds) {
            const price = midpointMap[tokenId];
            if (price !== undefined) {
              priceRows.push({
                market_id: market.id,
                token_id: tokenId,
                timestamp: now,
                price: parseFloat(String(price)),
              });
            }
          }
        }

        // Insert price snapshots
        if (priceRows.length > 0) {
          for (let i = 0; i < priceRows.length; i += 100) {
            const batch = priceRows.slice(i, i + 100);
            await pmflow
              .from("price_history")
              .upsert(batch, { onConflict: "market_id,token_id,timestamp", ignoreDuplicates: true });
          }
        }

        results.prices = { success: true, count: priceRows.length };
      } else {
        results.prices = { success: true, count: 0 };
      }
    } catch (err: any) {
      results.prices = { success: false, error: err.message };
    }
  }

  // ============ TASK 3: Sync Leaderboard ============
  if (tasks.includes("leaderboard")) {
    try {
      const categories = ["OVERALL", "POLITICS", "SPORTS", "CRYPTO"];
      const timePeriods = ["DAY", "WEEK", "MONTH", "ALL"];
      let totalCount = 0;

      for (const category of categories) {
        for (const timePeriod of timePeriods) {
          const res = await fetch(
            `${DATA_BASE}/v1/leaderboard?category=${category}&timePeriod=${timePeriod}&orderBy=PNL&limit=50`
          );
          if (!res.ok) continue;
          const traders = await res.json();

          const rows = traders.map((t: any) => ({
            wallet_address: t.proxyWallet,
            username: t.userName,
            profile_image: t.profileImage,
            x_username: t.xUsername,
            verified_badge: t.verifiedBadge ?? false,
            rank: parseInt(t.rank) || 0,
            pnl: t.pnl || 0,
            volume: t.vol || 0,
            category,
            time_period: timePeriod,
            synced_at: new Date().toISOString(),
          }));

          if (rows.length > 0) {
            await pmflow
              .from("leaderboard")
              .upsert(rows, { onConflict: "wallet_address,category,time_period" });
            totalCount += rows.length;
          }
        }
      }

      results.leaderboard = { success: true, count: totalCount };
    } catch (err: any) {
      results.leaderboard = { success: false, error: err.message };
    }
  }

  // ============ TASK 4: Sync Top Holders ============
  if (tasks.includes("holders")) {
    try {
      // Get top 50 markets by volume for holder tracking
      const { data: topMarkets } = await pmflow
        .from("markets")
        .select("id, condition_id")
        .eq("active", true)
        .order("volume_24h", { ascending: false })
        .limit(50);

      let holderCount = 0;
      if (topMarkets) {
        const now = new Date().toISOString();
        for (const market of topMarkets) {
          try {
            const res = await fetch(
              `${DATA_BASE}/holders?market=${market.condition_id}&limit=20`
            );
            if (!res.ok) continue;
            const holdersData = await res.json();

            for (const tokenData of holdersData) {
              if (!tokenData.holders) continue;
              const rows = tokenData.holders.map((h: any) => ({
                market_id: market.id,
                token_id: tokenData.token || "",
                wallet_address: h.proxyWallet,
                wallet_name: h.name || h.pseudonym,
                profile_image: h.profileImage,
                amount: h.amount || 0,
                outcome_index: h.outcomeIndex,
                snapshot_at: now,
              }));

              if (rows.length > 0) {
                await pmflow.from("top_holders").insert(rows);
                holderCount += rows.length;

                // Also upsert into whale_wallets for tracking
                const whaleRows = rows
                  .filter((r: any) => r.amount > 1000) // Only track significant holders
                  .map((r: any) => ({
                    wallet_address: r.wallet_address,
                    display_name: r.wallet_name,
                    profile_image: r.profile_image,
                    auto_detected: true,
                  }));

                if (whaleRows.length > 0) {
                  await pmflow
                    .from("whale_wallets")
                    .upsert(whaleRows, { onConflict: "wallet_address", ignoreDuplicates: true });
                }
              }
            }
          } catch { /* skip individual market failures */ }
        }
      }

      results.holders = { success: true, count: holderCount };
    } catch (err: any) {
      results.holders = { success: false, error: err.message };
    }
  }

  return NextResponse.json({
    status: "complete",
    timestamp: new Date().toISOString(),
    results,
  });
}

/**
 * GET /api/ingest - Health check
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "PolymarketFlow Ingest API. POST with Bearer token to trigger ingestion.",
  });
}
