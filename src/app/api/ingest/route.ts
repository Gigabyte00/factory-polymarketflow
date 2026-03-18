import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GAMMA_BASE = "https://gamma-api.polymarket.com";
const CLOB_BASE = "https://clob.polymarket.com";
const DATA_BASE = "https://data-api.polymarket.com";

// Simple API key auth for the ingest endpoint
const INGEST_API_KEY = process.env.INGEST_API_KEY || "pmflow-ingest-secret";

/**
 * Infer category from title/description when Polymarket API returns null.
 */
function inferCategory(title: string | null, description: string | null, tags: any[]): string | null {
  const text = `${title || ""} ${description || ""}`.toLowerCase();
  const tagLabels = (tags || []).map((t: any) => (t.label || "").toLowerCase()).join(" ");
  const all = `${text} ${tagLabels}`;

  // Politics
  if (/trump|biden|election|president|congress|senate|governor|democrat|republican|political|impeach|legislation|white house|cabinet|nato|parliament|vote|ballot|primary|gop|dnc|rnc|kamala|desantis|newsom|potus/.test(all)) return "Politics";
  // Crypto
  if (/bitcoin|btc|ethereum|eth|crypto|token|blockchain|solana|defi|nft|coinbase|binance|altcoin|stablecoin|memecoin|doge|xrp|cardano|polygon|avalanche|arbitrum|optimism|base chain|layer 2/.test(all)) return "Crypto";
  // Sports
  if (/nba|nfl|mlb|nhl|soccer|football|basketball|baseball|hockey|tennis|golf|ufc|mma|boxing|f1|formula|olympics|world cup|champions league|premier league|la liga|serie a|bundesliga|ncaa|super bowl|playoff|championship|mvp|slam|grand prix/.test(all)) return "Sports";
  // Science & Tech
  if (/ai |artificial intelligence|spacex|nasa|mars|moon|launch|rocket|openai|google|apple|microsoft|tesla|elon musk|chip|semiconductor|quantum|gene|crispr|fda approval|clinical trial/.test(all)) return "Science & Tech";
  // Culture & Entertainment
  if (/oscar|grammy|emmy|box office|movie|film|album|song|celebrity|reality tv|netflix|disney|streaming|tiktok|youtube|instagram|podcast|influencer|concert|festival|award show/.test(all)) return "Culture";
  // Economics & Finance
  if (/fed |federal reserve|interest rate|inflation|gdp|recession|stock|s&p|nasdaq|dow jones|treasury|unemployment|jobs report|cpi|fomc|tariff|trade war|ipo/.test(all)) return "Economics";
  // Weather & Climate
  if (/hurricane|earthquake|temperature|climate|weather|wildfire|flood|drought|el nino|la nina/.test(all)) return "Weather";

  return null;
}

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
  const syncStarted = new Date();

  // Create sync log entry
  const { data: syncLog } = await pmflow
    .from("sync_log")
    .insert({
      started_at: syncStarted.toISOString(),
      status: "running",
      tasks: tasks,
      triggered_by: request.headers.get("x-triggered-by") || "api",
    })
    .select("id")
    .single();
  const syncLogId = syncLog?.id;

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
        category: e.category || inferCategory(e.title, e.description, e.tags),
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

  // ============ TASK 2: Capture Price Snapshots (top 500 markets) ============
  if (tasks.includes("prices")) {
    try {
      // Get top 500 active markets by 24h volume with token IDs
      const { data: markets } = await pmflow
        .from("markets")
        .select("id, clob_token_ids")
        .eq("active", true)
        .not("clob_token_ids", "is", null)
        .order("volume_24h", { ascending: false, nullsFirst: false })
        .limit(500);

      if (markets && markets.length > 0) {
        const now = new Date().toISOString();
        const priceRows: any[] = [];

        // Fetch midpoint for each market's first token using singular /midpoint
        // Rate limit: 1,500 req/10s — we fetch 500 markets max
        const fetchPromises = markets.map(async (m: any) => {
          const ids = Array.isArray(m.clob_token_ids) ? m.clob_token_ids : [];
          const tokenId = ids[0]; // First token (YES outcome)
          if (!tokenId) return;

          try {
            const res = await fetch(`${CLOB_BASE}/midpoint?token_id=${tokenId}`);
            if (res.ok) {
              const data = await res.json();
              const price = parseFloat(data.mid);
              if (!isNaN(price)) {
                priceRows.push({
                  market_id: m.id,
                  token_id: tokenId,
                  timestamp: now,
                  price,
                });
              }
            }
          } catch { /* skip */ }
        });

        // Process in batches of 50 concurrent requests
        for (let i = 0; i < fetchPromises.length; i += 50) {
          await Promise.allSettled(fetchPromises.slice(i, i + 50));
        }

        // Insert price snapshots
        if (priceRows.length > 0) {
          for (let i = 0; i < priceRows.length; i += 200) {
            const batch = priceRows.slice(i, i + 200);
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

  // ============ TASK 2b: Backfill Price History ============
  if (tasks.includes("backfill")) {
    try {
      // Get top 100 markets that don't have much price history yet
      const { data: markets } = await pmflow
        .from("markets")
        .select("id, clob_token_ids")
        .eq("active", true)
        .not("clob_token_ids", "is", null)
        .order("volume_24h", { ascending: false, nullsFirst: false })
        .limit(100);

      let backfillCount = 0;
      if (markets) {
        for (const market of markets) {
          const tokenIds = Array.isArray(market.clob_token_ids) ? market.clob_token_ids : [];
          const firstToken = tokenIds[0];
          if (!firstToken) continue;

          // Check if we already have history for this market
          const { count: existing } = await pmflow
            .from("price_history")
            .select("id", { count: "exact", head: true })
            .eq("market_id", market.id);

          // Skip if we already have > 100 data points
          if (existing && existing > 100) continue;

          try {
            // Fetch full history at 60-min fidelity
            const res = await fetch(
              `${CLOB_BASE}/prices-history?market=${firstToken}&interval=all&fidelity=60`
            );
            if (!res.ok) continue;

            const data = await res.json();
            const history = data.history || [];

            if (history.length > 0) {
              const rows = history.map((point: any) => ({
                market_id: market.id,
                token_id: firstToken,
                timestamp: new Date(point.t * 1000).toISOString(),
                price: point.p,
              }));

              // Insert in batches
              for (let i = 0; i < rows.length; i += 200) {
                const batch = rows.slice(i, i + 200);
                await pmflow
                  .from("price_history")
                  .upsert(batch, { onConflict: "market_id,token_id,timestamp", ignoreDuplicates: true });
              }
              backfillCount += rows.length;
            }
          } catch { /* skip individual failures */ }

          // Rate limit: small delay between markets
          await new Promise((r) => setTimeout(r, 50));
        }
      }

      results.backfill = { success: true, count: backfillCount };
    } catch (err: any) {
      results.backfill = { success: false, error: err.message };
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

  // ============ TASK 5a: Ingest Recent Trades ============
  if (tasks.includes("trades")) {
    try {
      // Get top 20 markets by volume to fetch trades for
      const { data: topMarkets } = await pmflow
        .from("markets")
        .select("id, condition_id")
        .eq("active", true)
        .order("volume_24h", { ascending: false, nullsFirst: false })
        .limit(20);

      let tradeCount = 0;
      if (topMarkets) {
        for (const market of topMarkets) {
          try {
            const res = await fetch(`${DATA_BASE}/trades?market=${market.condition_id}&limit=20`);
            if (!res.ok) continue;
            const trades = await res.json();
            if (!Array.isArray(trades) || trades.length === 0) continue;

            const rows = trades.map((t: any) => ({
              id: t.id || `${t.market}-${t.match_time}-${t.size}`,
              market_id: market.id,
              condition_id: market.condition_id,
              asset_id: t.asset_id || "",
              side: t.side || "BUY",
              size: parseFloat(t.size || "0"),
              price: parseFloat(t.price || "0"),
              fee_rate_bps: t.fee_rate_bps || "",
              outcome: t.outcome || "",
              maker_address: t.maker_address || "",
              taker_address: t.owner || "",
              transaction_hash: t.transaction_hash || "",
              match_time: t.match_time || new Date().toISOString(),
            }));

            for (let i = 0; i < rows.length; i += 50) {
              const batch = rows.slice(i, i + 50);
              await pmflow.from("trades").upsert(batch, { onConflict: "id", ignoreDuplicates: true });
            }
            tradeCount += rows.length;
          } catch { /* skip individual market failures */ }
        }
      }
      results.trades = { success: true, count: tradeCount };
    } catch (err: any) {
      results.trades = { success: false, error: err.message };
    }
  }

  // ============ TASK 5b: Detect Whale Activity ============
  if (tasks.includes("whale_activity")) {
    let activityCount = 0;
    try {
      // Compare latest holder snapshots with previous ones to detect entries/exits
      const { data: snapshots } = await pmflow
        .from("top_holders")
        .select("snapshot_at")
        .order("snapshot_at", { ascending: false })
        .limit(1);

      if (snapshots && snapshots.length > 0) {
        const latestTime = snapshots[0].snapshot_at;
        const cutoff = new Date(new Date(latestTime).getTime() - 3600000).toISOString(); // 1 hour ago

        // Get current positions
        const { data: currentPositions } = await pmflow
          .from("top_holders")
          .select("wallet_address, market_id, amount, outcome_index")
          .gte("snapshot_at", cutoff)
          .gt("amount", 5000);

        // Get previous positions (1-2 hours ago)
        const prevCutoffStart = new Date(new Date(latestTime).getTime() - 7200000).toISOString();
        const { data: prevPositions } = await pmflow
          .from("top_holders")
          .select("wallet_address, market_id, amount")
          .gte("snapshot_at", prevCutoffStart)
          .lt("snapshot_at", cutoff)
          .gt("amount", 5000);

        // Build maps
        const prevMap: Record<string, number> = {};
        for (const p of prevPositions || []) {
          prevMap[`${p.wallet_address}-${p.market_id}`] = p.amount;
        }

        let activityCount = 0;
        const activities: any[] = [];

        for (const curr of currentPositions || []) {
          const key = `${curr.wallet_address}-${curr.market_id}`;
          const prevAmount = prevMap[key];

          let action: string | null = null;
          if (prevAmount === undefined && curr.amount > 10000) {
            action = "ENTER";
          } else if (prevAmount !== undefined) {
            const change = curr.amount - prevAmount;
            if (change > 5000) action = "INCREASE";
            else if (change < -5000) action = "DECREASE";
          }

          if (action) {
            activities.push({
              wallet_address: curr.wallet_address,
              market_id: curr.market_id,
              action,
              side: curr.outcome_index === 0 ? "YES" : "NO",
              amount: curr.amount,
              previous_amount: prevAmount || 0,
              detected_at: new Date().toISOString(),
            });
          }
        }

        // Check for exits (was in prev but not in current)
        const currMap: Record<string, boolean> = {};
        for (const c of currentPositions || []) {
          currMap[`${c.wallet_address}-${c.market_id}`] = true;
        }
        for (const p of prevPositions || []) {
          const key = `${p.wallet_address}-${p.market_id}`;
          if (!currMap[key] && p.amount > 10000) {
            activities.push({
              wallet_address: p.wallet_address,
              market_id: p.market_id,
              action: "EXIT",
              side: "YES",
              amount: 0,
              previous_amount: p.amount,
              detected_at: new Date().toISOString(),
            });
          }
        }

        // Insert whale activity
        if (activities.length > 0) {
          for (let i = 0; i < activities.length; i += 50) {
            await pmflow.from("whale_activity").insert(activities.slice(i, i + 50));
          }
          activityCount = activities.length;
        }
      }

      results.whale_activity = { success: true, count: activityCount };
    } catch (err: any) {
      results.whale_activity = { success: false, error: err.message };
    }
  }

  // ============ TASK 6: Compute Smart Money Labels ============
  if (tasks.includes("smart_money")) {
    try {
      // Compute markets traded + avg position from top_holders
      const { data: holderStats } = await pmflow
        .from("top_holders")
        .select("wallet_address, market_id, amount, snapshot_at");

      if (holderStats && holderStats.length > 0) {
        // Aggregate per wallet
        const walletMap: Record<string, { markets: Set<string>; totalAmount: number; count: number; lastSeen: string }> = {};
        for (const h of holderStats) {
          if (!h.wallet_address) continue;
          if (!walletMap[h.wallet_address]) {
            walletMap[h.wallet_address] = { markets: new Set(), totalAmount: 0, count: 0, lastSeen: h.snapshot_at || "" };
          }
          const w = walletMap[h.wallet_address];
          w.markets.add(h.market_id);
          w.totalAmount += h.amount || 0;
          w.count++;
          if (h.snapshot_at && h.snapshot_at > w.lastSeen) w.lastSeen = h.snapshot_at;
        }

        // Update whale_wallets with computed stats
        for (const [addr, stats] of Object.entries(walletMap)) {
          await pmflow.from("whale_wallets").update({
            markets_traded: stats.markets.size,
            avg_position_size: stats.count > 0 ? stats.totalAmount / stats.count : 0,
            last_active_at: stats.lastSeen || null,
          }).eq("wallet_address", addr);
        }
      }

      // Compute smart money score (0-100)
      const { data: whales } = await pmflow
        .from("whale_wallets")
        .select("wallet_address, total_volume, total_pnl, markets_traded, last_active_at")
        .gt("markets_traded", 0);

      if (whales && whales.length > 0) {
        const maxVol = Math.max(...whales.map((w: any) => w.total_volume || 0), 1);
        const maxMarkets = Math.max(...whales.map((w: any) => w.markets_traded || 0), 1);
        const maxPnl = Math.max(...whales.map((w: any) => Math.abs(w.total_pnl || 0)), 1);
        const now = Date.now();

        for (const whale of whales) {
          const volScore = Math.min(((whale.total_volume || 0) / maxVol) * 30, 30);
          const mktScore = Math.min(((whale.markets_traded || 0) / maxMarkets) * 30, 30);
          const pnlScore = whale.total_pnl > 0 ? Math.min((whale.total_pnl / maxPnl) * 20, 20) : 0;
          const daysSinceActive = whale.last_active_at
            ? (now - new Date(whale.last_active_at).getTime()) / 86400000
            : 30;
          const recencyScore = Math.max(20 - daysSinceActive, 0);
          const score = Math.round(volScore + mktScore + pnlScore + recencyScore);

          // Determine strategy label
          let strategyLabel = "Diversified";
          const mktCount = whale.markets_traded || 0;
          const vol = whale.total_volume || 0;
          if (whale.total_pnl > 0 && score > 40) strategyLabel = "Consistent Winner";
          else if (vol > maxVol * 0.3) strategyLabel = "Whale";
          else if (mktCount >= 15) strategyLabel = "Active Trader";
          else if (mktCount <= 2) strategyLabel = "Focused";
          else if (mktCount >= 5 && mktCount <= 10) strategyLabel = "Selective";

          await pmflow
            .from("whale_wallets")
            .update({ smart_money_score: score, strategy_label: strategyLabel, consistency_score: Math.min(score + 10, 100) })
            .eq("wallet_address", whale.wallet_address);
        }
      }

      results.smart_money = { success: true, count: whales?.length || 0 };
    } catch (err: any) {
      results.smart_money = { success: false, error: err.message };
    }
  }

  // ============ TASK 6: Anomaly Detection ============
  if (tasks.includes("anomaly")) {
    try {
      // Detect volume spikes: current 24h vol > 3x 7-day average
      const { data: markets } = await pmflow
        .from("markets")
        .select("id, volume_24h, volume_avg_7d")
        .eq("active", true)
        .gt("volume_24h", 0);

      let anomalyCount = 0;
      if (markets) {
        for (const m of markets) {
          const vol24h = m.volume_24h || 0;
          const avg7d = m.volume_avg_7d || vol24h; // Default to current if no avg
          const newAvg = avg7d > 0 ? (avg7d * 6 + vol24h) / 7 : vol24h; // Rolling avg

          const spikeMultiplier = avg7d > 0 ? vol24h / avg7d : 1;
          const isSpike = spikeMultiplier > 3;
          const anomalyScore = Math.min(Math.round(spikeMultiplier * 10), 100);

          await pmflow
            .from("markets")
            .update({
              volume_avg_7d: newAvg,
              volume_spike_detected: isSpike,
              anomaly_score: isSpike ? anomalyScore : 0,
            })
            .eq("id", m.id);

          if (isSpike) anomalyCount++;
        }
      }

      results.anomaly = { success: true, count: anomalyCount };
    } catch (err: any) {
      results.anomaly = { success: false, error: err.message };
    }
  }

  // Finalize sync log
  const syncCompleted = new Date();
  const durationMs = syncCompleted.getTime() - syncStarted.getTime();
  const hasErrors = Object.values(results).some((r) => !r.success);

  if (syncLogId) {
    await pmflow
      .from("sync_log")
      .update({
        completed_at: syncCompleted.toISOString(),
        duration_ms: durationMs,
        status: hasErrors ? "error" : "complete",
        results,
        events_count: results.events?.count || 0,
        markets_count: results.markets?.count || 0,
        leaderboard_count: results.leaderboard?.count || 0,
        holders_count: results.holders?.count || 0,
        prices_count: results.prices?.count || 0,
        error_message: hasErrors
          ? Object.entries(results)
              .filter(([, r]) => !r.success)
              .map(([k, r]) => `${k}: ${r.error}`)
              .join("; ")
          : null,
      })
      .eq("id", syncLogId);
  }

  return NextResponse.json({
    status: hasErrors ? "partial" : "complete",
    timestamp: syncCompleted.toISOString(),
    duration_ms: durationMs,
    sync_log_id: syncLogId,
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
