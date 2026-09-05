import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const INGEST_API_KEY = process.env.INGEST_API_KEY || "";

export const maxDuration = 60;

/**
 * POST /api/insights
 * Generates the daily market briefing from ingested Polymarket data.
 *
 * History worth knowing (2026-09-05 rewrite). The previous version shipped three
 * defects that made every briefing it ever wrote wrong, and 92 of them were
 * archived rather than rewritten because no honest source for those days exists:
 *   1. It filtered movers on `Math.abs(one_day_price_change) > 2`, but that column
 *      is stored in PRICE UNITS (0.05 = 5 points), so the test demanded a 200-point
 *      move and every post said "No significant gainers today."
 *   2. It printed `top_holders.amount` — a SHARE count — with a dollar sign, so a
 *      20.3M-share position read as "$20279K".
 *   3. It repeated hardcoded corpus stats that drifted out of date.
 * It also had no duplicate guard, so when the events ingest died in June it minted
 * 61 byte-identical posts on 61 dated URLs. All four are addressed below.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${INGEST_API_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return generateBriefing(new URL(request.url).searchParams.get("force") === "1");
}

/** A price move of 5 points or more. `one_day_price_change` is in price units, not percent. */
const MOVE_THRESHOLD = 0.05;
/** A market pinned at 0 or 1 has settled. A football match ending 1-0 is not news, it is the
 *  scoreboard, and it dominates any naive "biggest mover" ranking. Only report repricing in
 *  markets whose outcome is still genuinely in doubt. */
const LIVE_MIN = 0.03;
const LIVE_MAX = 0.97;
const stillLive = (m: any) => {
  const p = Number(m.outcome_prices?.[0] ?? 0.5);
  return p >= LIVE_MIN && p <= LIVE_MAX;
};
const money = (n: number) =>
  n >= 1_000_000_000 ? `$${(n / 1e9).toFixed(1)}B`
  : n >= 1_000_000 ? `$${(n / 1e6).toFixed(1)}M`
  : n >= 1_000 ? `$${(n / 1e3).toFixed(1)}K`
  : `$${Math.round(n)}`;
const shares = (n: number) =>
  n >= 1_000_000 ? `${(n / 1e6).toFixed(1)}M` : n >= 1_000 ? `${(n / 1e3).toFixed(1)}K` : `${Math.round(n)}`;
const pts = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)} points`;

export async function generateBriefing(force = false) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "pmflow" },
  });

  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  const formatted = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const slug = `market-insight-${dateStr}`;

  // Refuse to publish on stale data — the failure mode that produced 92 archived posts.
  const { data: freshest } = await db.from("markets").select("synced_at").order("synced_at", { ascending: false }).limit(1);
  const syncedAt = freshest?.[0]?.synced_at ? new Date(freshest[0].synced_at) : null;
  const staleHours = syncedAt ? (Date.now() - syncedAt.getTime()) / 3_600_000 : Infinity;
  if (staleHours > 6 && !force) {
    return NextResponse.json({ status: "skipped", reason: "market data is stale", stale_hours: Math.round(staleHours) });
  }

  const [{ data: movers }, { data: volumeRows }, { data: positions }, { data: resolving }] = await Promise.all([
    db.from("markets")
      .select("question, one_day_price_change, one_week_price_change, outcome_prices, volume_24h, events!inner(slug, title)")
      .eq("active", true).not("one_day_price_change", "is", null).gt("volume_24h", 10_000)
      .order("volume_24h", { ascending: false, nullsFirst: false }).limit(150),
    db.from("events").select("volume_24h").eq("active", true),
    // Value-weighted, deduped, parked capital (>=95c) and complete sets already excluded.
    db.rpc("biggest_open_positions", { p_days: 2, p_limit: 6 }),
    db.from("markets")
      .select("question, outcome_prices, volume, end_date, events!inner(slug, title)")
      .eq("active", true)
      .gte("end_date", today.toISOString())
      .lt("end_date", new Date(today.getTime() + 7 * 86400_000).toISOString())
      .order("volume", { ascending: false, nullsFirst: false }).limit(40),
  ]);

  const ranked = (movers || [])
    .filter((m: any) => stillLive(m) && Math.abs(Number(m.one_day_price_change) || 0) >= MOVE_THRESHOLD)
    .sort((a: any, b: any) => Math.abs(Number(b.one_day_price_change)) - Math.abs(Number(a.one_day_price_change)));
  const gainer = ranked.find((m: any) => Number(m.one_day_price_change) > 0);
  const loser = ranked.find((m: any) => Number(m.one_day_price_change) < 0);
  const total24h = (volumeRows || []).reduce((s: number, e: any) => s + (Number(e.volume_24h) || 0), 0);

  const describe = (m: any, verb: string) => {
    const price = Number(m.outcome_prices?.[0] ?? 0.5) * 100;
    const name = m.events?.title || m.question;
    // Multi-outcome events carry a distinct question per market; single-market events
    // repeat the title, and printing both reads as a stutter.
    const asks = m.question && m.question !== name ? ` The market asks: ${m.question}` : "";
    return `**${name}** ${verb} ${pts(Number(m.one_day_price_change))} to ${price.toFixed(0)}% on ${money(Number(m.volume_24h) || 0)} of 24-hour volume.${asks}`;
  };

  const moversBlock = ranked.length === 0
    ? `No market with an open outcome moved 5 points or more in the last 24 hours. Quiet days are normal — most prediction markets only reprice when news arrives.`
    : [
        gainer ? `### Biggest gain\n\n${describe(gainer, "climbed")}` : null,
        loser ? `### Biggest drop\n\n${describe(loser, "fell")}` : null,
        ranked.length > 2
          ? `${ranked.length} markets with outcomes still in doubt moved at least 5 points today; markets that simply settled are excluded. The full list is on the [movers page](/movers), and the [screener](/screener) filters by volume and anomaly score.`
          : null,
      ].filter(Boolean).join("\n\n");

  // amount is a SHARE count; each winning share redeems for $1, so dollars at risk = shares x price.
  const whaleBlock = (positions || []).length === 0
    ? `No position cleared our reporting threshold in the latest holder snapshot.`
    : (positions as any[]).slice(0, 4).map((p) => {
        const name = p.display_name || `${String(p.wallet_address).slice(0, 8)}…`;
        return `- **${name}** holds ${shares(Number(p.shares))} shares of ${p.side} on "${p.question}" at ${(Number(p.price) * 100).toFixed(0)}¢ — about ${money(Number(p.est_value_usd))} at risk, paying ${money(Number(p.payout_if_right))} if it resolves that way.`;
      }).join("\n");

  // Same filter: a market already at 100% is waiting on settlement, not on an outcome.
  const upcoming = (resolving as any[] || []).filter(stillLive).slice(0, 5);
  const resolvingBlock = upcoming.length === 0
    ? `Nothing with an open outcome resolves in the next seven days.`
    : upcoming.map((m) => {
        const day = new Date(m.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
        const price = Number(m.outcome_prices?.[0] ?? 0.5) * 100;
        return `- **${day}** — ${m.question} (currently ${price.toFixed(0)}%, ${money(Number(m.volume) || 0)} traded)`;
      }).join("\n");

  const title = `Market Intelligence — ${formatted}`;
  const content = `## Today's market overview

Active prediction markets traded ${money(total24h)} in the last 24 hours. Here is what moved, where the largest
positions sit, and what resolves next.

## What moved

${moversBlock}

## Where the biggest money sits

Positions below are valued at the current price. Amounts are share counts; each winning share redeems for $1, so
"at risk" is shares times price. Parked capital priced at 95¢ or higher and identical-size positions spread across
every outcome of one event are excluded, because those are market-making rather than directional bets.

${whaleBlock}

Full rankings on the [biggest bets page](/biggest-polymarket-bets), with wallet history in the
[whale tracker](/whale-tracker) and new positions in the [free alerts feed](/alerts-feed).

## Resolving in the next seven days

${resolvingBlock}

The full 31-day view is on the [resolution calendar](/calendar).

## Where to look next

Live trackers for the questions that draw the most attention: [Fed decision odds](/odds/fed-rate-cut) for cut,
hold or hike at each remaining FOMC meeting, and [2026 midterm odds](/odds/2026-midterms) for control of Congress.
Perpetual futures data, including funding rates, is on the [Perps screener](/perps/markets).

---

*Generated from PolymarketFlow's ingested Polymarket data. Prices are market prices shown for information only,
not advice. Trading availability depends on your jurisdiction.*`;

  const excerpt = gainer
    ? `${String((gainer as any).events?.title || gainer.question).slice(0, 90)} moved ${pts(Number(gainer.one_day_price_change))}. ${money(total24h)} traded across all markets in 24 hours.`
    : `${money(total24h)} traded across prediction markets in the last 24 hours. Here is what moved and what resolves next.`;

  // Duplicate guard: identical output means the data did not change, and 61 identical
  // posts on 61 dated URLs is exactly how this went wrong before.
  const hash = createHash("sha256").update(content).digest("hex");
  const { data: prev } = await db.from("posts")
    .select("slug, content").eq("type", "briefing").neq("slug", slug)
    .order("published_at", { ascending: false }).limit(1);
  if (prev?.[0]?.content && createHash("sha256").update(prev[0].content).digest("hex") === hash && !force) {
    return NextResponse.json({ status: "skipped", reason: "identical to the previous briefing", previous: prev[0].slug });
  }

  const { error } = await db.from("posts").upsert({
    slug, title, content, excerpt,
    type: "briefing",
    category: "Market Insights",
    published: true,
    published_at: today.toISOString(),
    updated_at: today.toISOString(),
    read_time: `${Math.max(3, Math.round(content.split(/\s+/).length / 220))} min read`,
    author: "PolymarketFlow Research",
    meta_title: `${title} | PolymarketFlow`.slice(0, 60),
    meta_description: excerpt.slice(0, 155),
  }, { onConflict: "slug" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    status: "published",
    slug,
    title,
    movers_found: ranked.length,
    positions_found: (positions || []).length,
    resolving_found: upcoming.length,
    url: `https://polymarketflow.com/blog/${slug}`,
  });
}
