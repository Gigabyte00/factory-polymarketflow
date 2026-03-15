import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/health
 * 
 * Health check endpoint for monitoring.
 * Returns status of all system components.
 */
export async function GET() {
  const checks: Record<string, { status: "ok" | "error"; latency_ms?: number; details?: string }> = {};
  const startTotal = Date.now();

  // 1. Database connectivity
  try {
    const start = Date.now();
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "pmflow" } }
    );
    const { count, error } = await db
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("active", true);
    
    if (error) throw error;
    checks.database = {
      status: "ok",
      latency_ms: Date.now() - start,
      details: `${count} active events`,
    };
  } catch (err: any) {
    checks.database = { status: "error", details: err.message };
  }

  // 2. Data freshness (check when events were last synced)
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "pmflow" } }
    );
    const { data } = await db
      .from("events")
      .select("synced_at")
      .order("synced_at", { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const lastSync = new Date(data.synced_at);
      const ageMinutes = Math.round((Date.now() - lastSync.getTime()) / 60000);
      const stale = ageMinutes > 120; // Alert if data is > 2 hours old
      checks.data_freshness = {
        status: stale ? "error" : "ok",
        details: `Last sync: ${ageMinutes}m ago (${lastSync.toISOString()})`,
      };
    }
  } catch (err: any) {
    checks.data_freshness = { status: "error", details: err.message };
  }

  // 3. Polymarket API reachability
  try {
    const start = Date.now();
    const res = await fetch("https://gamma-api.polymarket.com/events?limit=1", {
      signal: AbortSignal.timeout(10000),
    });
    checks.polymarket_api = {
      status: res.ok ? "ok" : "error",
      latency_ms: Date.now() - start,
      details: `HTTP ${res.status}`,
    };
  } catch (err: any) {
    checks.polymarket_api = { status: "error", details: err.message };
  }

  // 4. Table record counts
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "pmflow" } }
    );
    const tables = ["events", "markets", "leaderboard", "top_holders", "whale_wallets", "price_history", "alert_rules", "users"];
    const counts: Record<string, number> = {};
    
    for (const table of tables) {
      const { count } = await db.from(table).select("*", { count: "exact", head: true });
      counts[table] = count || 0;
    }
    
    checks.data_counts = {
      status: "ok",
      details: JSON.stringify(counts),
    };
  } catch (err: any) {
    checks.data_counts = { status: "error", details: err.message };
  }

  // 5. Recent sync history
  try {
    const db2 = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "pmflow" } }
    );
    const { data: recentSyncs } = await db2
      .from("sync_log")
      .select("id, started_at, completed_at, duration_ms, status, events_count, markets_count, error_message")
      .order("started_at", { ascending: false })
      .limit(5);

    const lastSync = recentSyncs?.[0];
    const recentErrors = recentSyncs?.filter((s: any) => s.status === "error").length || 0;

    checks.sync_history = {
      status: recentErrors > 2 ? "error" : "ok",
      details: JSON.stringify({
        last_sync: lastSync ? {
          id: lastSync.id,
          at: lastSync.started_at,
          duration_ms: lastSync.duration_ms,
          status: lastSync.status,
          events: lastSync.events_count,
          markets: lastSync.markets_count,
        } : null,
        recent_errors: recentErrors,
        total_recent: recentSyncs?.length || 0,
      }),
    };
  } catch (err: any) {
    checks.sync_history = { status: "error", details: err.message };
  }

  // Overall status
  const allOk = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime_check: true,
      total_latency_ms: Date.now() - startTotal,
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
