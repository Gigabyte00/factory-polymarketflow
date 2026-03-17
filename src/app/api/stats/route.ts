import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isInternalOrTestEmail } from "@/lib/entitlements";

const INGEST_API_KEY = process.env.INGEST_API_KEY || "";
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || "";

/**
 * POST /api/stats
 * Generates hourly data pipeline & growth stats and sends to Slack.
 * Called by n8n every hour.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${INGEST_API_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "pmflow" } }
  );

  // 1. Current counts
  const tables = ["events", "markets", "price_history", "top_holders", "whale_wallets", "leaderboard", "users", "alert_rules", "sync_log"];
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const { count } = await db.from(table).select("*", { count: "exact", head: true });
    counts[table] = count || 0;
  }

  // 2. Real vs test users / subscribers
  const { data: userRows } = await db.from("users").select("email, tier");
  const realUsers = (userRows || []).filter((u: any) => !isInternalOrTestEmail(u.email));
  const internalUsers = (userRows || []).filter((u: any) => isInternalOrTestEmail(u.email));

  const { data: subscriberRows } = await db.from("email_subscribers").select("email, unsubscribed").eq("unsubscribed", false);
  const realSubscribers = (subscriberRows || []).filter((s: any) => !isInternalOrTestEmail(s.email));
  const internalSubscribers = (subscriberRows || []).filter((s: any) => isInternalOrTestEmail(s.email));

  counts.real_users = realUsers.length;
  counts.internal_users = internalUsers.length;
  counts.real_email_subscribers = realSubscribers.length;
  counts.internal_email_subscribers = internalSubscribers.length;

  // 3. Recent sync stats
  const { data: recentSyncs } = await db
    .from("sync_log")
    .select("status, duration_ms, events_count, markets_count, prices_count, holders_count, started_at")
    .order("started_at", { ascending: false })
    .limit(12); // Last ~1 hour of syncs (5-min interval = 12 per hour)

  const syncStats = {
    total: recentSyncs?.length || 0,
    errors: recentSyncs?.filter((s: any) => s.status === "error").length || 0,
    avg_duration: recentSyncs && recentSyncs.length > 0
      ? Math.round(recentSyncs.reduce((sum: number, s: any) => sum + (s.duration_ms || 0), 0) / recentSyncs.length)
      : 0,
    prices_captured: recentSyncs?.reduce((sum: number, s: any) => sum + (s.prices_count || 0), 0) || 0,
    events_synced: recentSyncs?.reduce((sum: number, s: any) => sum + (s.events_count || 0), 0) || 0,
  };

  // 4. Data freshness
  const { data: latestEvent } = await db
    .from("events")
    .select("synced_at")
    .order("synced_at", { ascending: false })
    .limit(1)
    .single();

  const freshnessMinutes = latestEvent
    ? Math.round((Date.now() - new Date(latestEvent.synced_at).getTime()) / 60000)
    : -1;

  // 5. Price history growth (last hour)
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { count: pricesLastHour } = await db
    .from("price_history")
    .select("*", { count: "exact", head: true })
    .gte("timestamp", oneHourAgo);

  // 6. New whales detected (last hour)
  const { count: newWhales } = await db
    .from("whale_wallets")
    .select("*", { count: "exact", head: true })
    .gte("first_seen_at", oneHourAgo);

  // 7. Build Slack message
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const slackMessage = {
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `📊 PolymarketFlow Stats — ${dateStr} ${timeStr} ET` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Events*\n${counts.events.toLocaleString()}` },
          { type: "mrkdwn", text: `*Markets*\n${counts.markets.toLocaleString()}` },
          { type: "mrkdwn", text: `*Price History*\n${counts.price_history.toLocaleString()}` },
          { type: "mrkdwn", text: `*Top Holders*\n${counts.top_holders.toLocaleString()}` },
          { type: "mrkdwn", text: `*Whale Wallets*\n${counts.whale_wallets.toLocaleString()}` },
          { type: "mrkdwn", text: `*Leaderboard*\n${counts.leaderboard.toLocaleString()}` },
        ],
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Last Hour Growth*\n+${(pricesLastHour || 0).toLocaleString()} prices\n+${newWhales || 0} new whales` },
          { type: "mrkdwn", text: `*Pipeline Health*\n${syncStats.errors === 0 ? "✅" : "⚠️"} ${syncStats.total} syncs, ${syncStats.errors} errors\nAvg: ${syncStats.avg_duration}ms` },
        ],
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*Users*\n${counts.real_users} real\n${counts.real_email_subscribers} real email subs` },
          { type: "mrkdwn", text: `*Data Freshness*\n${freshnessMinutes >= 0 ? `${freshnessMinutes}m ago` : "unknown"}` },
        ],
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `Internal/test records excluded: ${counts.internal_users} users, ${counts.internal_email_subscribers} email subs` },
        ],
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `<https://polymarketflow.com/api/health|Health Check> • <https://polymarketflow.com|Site> • <https://polymarketflow.com/screener|Screener>` },
        ],
      },
    ],
  };

  // 8. Send to Slack
  let slackSent = false;
  if (SLACK_WEBHOOK_URL) {
    try {
      const slackRes = await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackMessage),
      });
      slackSent = slackRes.ok;
    } catch {
      slackSent = false;
    }
  }

  return NextResponse.json({
    status: "ok",
    slack_sent: slackSent,
    timestamp: now.toISOString(),
    counts,
    growth: {
      prices_last_hour: pricesLastHour || 0,
      new_whales_last_hour: newWhales || 0,
    },
    users: {
      real_users: counts.real_users,
      internal_users: counts.internal_users,
      real_email_subscribers: counts.real_email_subscribers,
      internal_email_subscribers: counts.internal_email_subscribers,
    },
    sync_stats: syncStats,
    freshness_minutes: freshnessMinutes,
  });
}
