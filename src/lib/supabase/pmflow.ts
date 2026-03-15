/**
 * Supabase pmflow schema client for server-side data access.
 * All pages use this to read from our ingested data.
 * Falls back to direct Polymarket API if Supabase data is empty.
 */

import { createClient } from "@supabase/supabase-js";

function getPmflowClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "pmflow" } }
  );
}

export interface DbEvent {
  id: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
  icon: string | null;
  active: boolean;
  closed: boolean;
  featured: boolean;
  category: string | null;
  volume: number;
  volume_24h: number;
  volume_1w: number;
  volume_1m: number;
  liquidity: number;
  open_interest: number;
  comment_count: number;
  end_date: string | null;
  tags: any[];
  synced_at: string;
}

export interface DbMarket {
  id: string;
  event_id: string;
  condition_id: string;
  slug: string | null;
  question: string | null;
  description: string | null;
  image: string | null;
  outcomes: string[];
  outcome_prices: number[];
  clob_token_ids: string[];
  volume: number;
  volume_24h: number;
  liquidity: number;
  best_bid: number | null;
  best_ask: number | null;
  last_trade_price: number | null;
  spread: number | null;
  one_day_price_change: number | null;
  one_week_price_change: number | null;
  active: boolean;
  closed: boolean;
  end_date: string | null;
  category: string | null;
}

export interface DbLeaderboardEntry {
  wallet_address: string;
  username: string | null;
  profile_image: string | null;
  x_username: string | null;
  verified_badge: boolean;
  rank: number;
  pnl: number;
  volume: number;
  category: string;
  time_period: string;
}

export interface DbTopHolder {
  market_id: string;
  token_id: string;
  wallet_address: string;
  wallet_name: string | null;
  profile_image: string | null;
  amount: number;
  outcome_index: number | null;
  snapshot_at: string;
}

export interface DbWhaleWallet {
  wallet_address: string;
  display_name: string | null;
  profile_image: string | null;
  x_username: string | null;
  is_verified: boolean;
  total_volume: number;
  total_pnl: number;
  auto_detected: boolean;
}

export interface DbAlertRule {
  id: string;
  user_id: string;
  market_id: string | null;
  market_question: string | null;
  condition: string;
  threshold: number;
  channel: string;
  active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

// ============ Events & Markets ============

export async function getEvents(params?: {
  limit?: number;
  offset?: number;
  category?: string;
  orderBy?: string;
  search?: string;
}): Promise<DbEvent[]> {
  const db = getPmflowClient();
  let query = db
    .from("events")
    .select("*")
    .eq("active", true)
    .eq("closed", false);

  if (params?.category) {
    query = query.ilike("category", params.category);
  }
  if (params?.search) {
    query = query.ilike("title", `%${params.search}%`);
  }

  const orderCol = params?.orderBy === "liquidity" ? "liquidity"
    : params?.orderBy === "volume" ? "volume"
    : params?.orderBy === "end_date" ? "end_date"
    : "volume_24h";
  const ascending = params?.orderBy === "end_date";

  query = query.order(orderCol, { ascending, nullsFirst: false });

  if (params?.limit) query = query.limit(params.limit);
  if (params?.offset) query = query.range(params.offset, params.offset + (params.limit || 100) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getEventBySlug(slug: string): Promise<(DbEvent & { markets: DbMarket[] }) | null> {
  const db = getPmflowClient();
  const { data: events, error } = await db
    .from("events")
    .select("*")
    .eq("slug", slug)
    .limit(1);

  if (error || !events || events.length === 0) return null;

  const event = events[0];

  // Fetch associated markets
  const { data: markets } = await db
    .from("markets")
    .select("*")
    .eq("event_id", event.id)
    .order("volume_24h", { ascending: false });

  return { ...event, markets: markets || [] };
}

export async function getMarketsForEvent(eventId: string): Promise<DbMarket[]> {
  const db = getPmflowClient();
  const { data } = await db
    .from("markets")
    .select("*")
    .eq("event_id", eventId)
    .order("volume_24h", { ascending: false });
  return data || [];
}

// ============ Market Movers ============

export async function getMarketMovers(direction: "up" | "down", limit = 15): Promise<(DbMarket & { event_slug: string; event_title: string })[]> {
  const db = getPmflowClient();

  const { data: markets } = await db
    .from("markets")
    .select("*, events!inner(slug, title)")
    .eq("active", true)
    .not("one_day_price_change", "is", null)
    .order("one_day_price_change", { ascending: direction === "down" })
    .limit(limit);

  if (!markets) return [];

  return markets.map((m: any) => ({
    ...m,
    event_slug: m.events?.slug || m.slug,
    event_title: m.events?.title || m.question,
  }));
}

// ============ Leaderboard ============

export async function getLeaderboard(params?: {
  category?: string;
  timePeriod?: string;
  orderBy?: string;
  limit?: number;
}): Promise<DbLeaderboardEntry[]> {
  const db = getPmflowClient();
  let query = db
    .from("leaderboard")
    .select("*")
    .eq("category", params?.category || "OVERALL")
    .eq("time_period", params?.timePeriod || "WEEK")
    .order(params?.orderBy === "VOL" ? "volume" : "pnl", { ascending: false })
    .limit(params?.limit || 50);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ============ Whale Tracking ============

export async function getTopHoldersForMarket(marketId: string): Promise<DbTopHolder[]> {
  const db = getPmflowClient();
  const { data } = await db
    .from("top_holders")
    .select("*")
    .eq("market_id", marketId)
    .order("amount", { ascending: false })
    .limit(20);
  return data || [];
}

export async function getWhaleWallets(limit = 50): Promise<DbWhaleWallet[]> {
  const db = getPmflowClient();
  const { data } = await db
    .from("whale_wallets")
    .select("*")
    .order("total_volume", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function getRecentWhaleActivity(limit = 50): Promise<any[]> {
  const db = getPmflowClient();
  const { data } = await db
    .from("whale_activity")
    .select("*, whale_wallets(display_name, profile_image), markets(question, event_id)")
    .order("detected_at", { ascending: false })
    .limit(limit);
  return data || [];
}

// ============ Alerts ============

export async function getUserAlerts(userId: string): Promise<DbAlertRule[]> {
  const db = getPmflowClient();
  const { data } = await db
    .from("alert_rules")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function createAlert(alert: Omit<DbAlertRule, "id" | "created_at" | "last_triggered_at">): Promise<DbAlertRule> {
  const db = getPmflowClient();
  const { data, error } = await db
    .from("alert_rules")
    .insert(alert)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAlert(alertId: string, userId: string): Promise<void> {
  const db = getPmflowClient();
  await db
    .from("alert_rules")
    .delete()
    .eq("id", alertId)
    .eq("user_id", userId);
}

// ============ User Profile ============

export async function getUserProfile(userId: string) {
  const db = getPmflowClient();
  const { data } = await db
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return data;
}

export async function upsertUserProfile(profile: { id: string; email: string; name?: string; tier?: string }) {
  const db = getPmflowClient();
  await db.from("users").upsert(profile, { onConflict: "id" });
}

// ============ Stats ============

export async function getPlatformStats() {
  const db = getPmflowClient();

  const [eventsRes, marketsRes, whalesRes] = await Promise.all([
    db.from("events").select("id", { count: "exact", head: true }).eq("active", true),
    db.from("events").select("volume_24h").eq("active", true),
    db.from("whale_wallets").select("wallet_address", { count: "exact", head: true }),
  ]);

  const totalVolume24h = (marketsRes.data || []).reduce((sum: number, e: any) => sum + (e.volume_24h || 0), 0);

  return {
    activeMarkets: eventsRes.count || 0,
    volume24h: totalVolume24h,
    trackedWhales: whalesRes.count || 0,
  };
}
