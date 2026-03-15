/**
 * Polymarket API Client
 * Wraps all three APIs: Gamma, CLOB, and Data
 */

import type {
  PolymarketEvent,
  PolymarketMarket,
  PolymarketTag,
  PriceHistoryResponse,
  TraderLeaderboardEntry,
  OpenInterestData,
  MarketHolder,
} from "@/types/polymarket";

const GAMMA_BASE = "https://gamma-api.polymarket.com";
const CLOB_BASE = "https://clob.polymarket.com";
const DATA_BASE = "https://data-api.polymarket.com";

// ============ Gamma API ============

/**
 * Fetch active events with their markets
 */
export async function fetchEvents(params?: {
  limit?: number;
  offset?: number;
  active?: boolean;
  closed?: boolean;
  order?: string;
  ascending?: boolean;
  tag_id?: number;
}): Promise<PolymarketEvent[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  if (params?.active !== undefined)
    searchParams.set("active", String(params.active));
  if (params?.closed !== undefined)
    searchParams.set("closed", String(params.closed));
  if (params?.order) searchParams.set("order", params.order);
  if (params?.ascending !== undefined)
    searchParams.set("ascending", String(params.ascending));
  if (params?.tag_id) searchParams.set("tag_id", String(params.tag_id));

  const res = await fetch(`${GAMMA_BASE}/events?${searchParams.toString()}`, {
    next: { revalidate: 3600 }, // Cache for 1 hour (matches polling interval)
  });

  if (!res.ok) throw new Error(`Gamma API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single event by slug
 */
export async function fetchEventBySlug(
  slug: string
): Promise<PolymarketEvent | null> {
  const events = await fetchEvents();
  // Use the slug query parameter
  const res = await fetch(`${GAMMA_BASE}/events?slug=${slug}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`Gamma API error: ${res.status}`);
  const data: PolymarketEvent[] = await res.json();
  return data[0] || null;
}

/**
 * Fetch all available tags
 */
export async function fetchTags(): Promise<PolymarketTag[]> {
  const res = await fetch(`${GAMMA_BASE}/tags`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Gamma API error: ${res.status}`);
  return res.json();
}

/**
 * Search markets, events, and profiles
 */
export async function searchMarkets(
  query: string
): Promise<PolymarketEvent[]> {
  const res = await fetch(
    `${GAMMA_BASE}/events?active=true&closed=false&limit=20&order=volume24hr&ascending=false`,
    { next: { revalidate: 3600 } }
  );
  if (!res.ok) throw new Error(`Gamma API error: ${res.status}`);
  const events: PolymarketEvent[] = await res.json();

  // Client-side filter by query
  const q = query.toLowerCase();
  return events.filter(
    (e) =>
      e.title?.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.markets?.some((m) => m.question?.toLowerCase().includes(q))
  );
}

// ============ CLOB API ============

/**
 * Fetch price history for a market (by token ID)
 */
export async function fetchPriceHistory(
  tokenId: string,
  interval?: string,
  fidelity?: number
): Promise<PriceHistoryResponse> {
  const params = new URLSearchParams({ market: tokenId });
  if (interval) params.set("interval", interval);
  if (fidelity) params.set("fidelity", String(fidelity));

  const res = await fetch(
    `${CLOB_BASE}/prices-history?${params.toString()}`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) throw new Error(`CLOB API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch midpoint prices for multiple tokens
 */
export async function fetchMidpoints(
  tokenIds: string[]
): Promise<Record<string, string>> {
  const params = tokenIds.map((id) => `token_ids=${id}`).join("&");
  const res = await fetch(`${CLOB_BASE}/midpoints?${params}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`CLOB API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch spread for a token
 */
export async function fetchSpread(
  tokenId: string
): Promise<{ spread: string }> {
  const res = await fetch(`${CLOB_BASE}/spread?token_id=${tokenId}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`CLOB API error: ${res.status}`);
  return res.json();
}

// ============ Data API ============

/**
 * Fetch trader leaderboard
 */
export async function fetchLeaderboard(params?: {
  category?: string;
  timePeriod?: string;
  orderBy?: string;
  limit?: number;
  offset?: number;
}): Promise<TraderLeaderboardEntry[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.timePeriod) searchParams.set("timePeriod", params.timePeriod);
  if (params?.orderBy) searchParams.set("orderBy", params.orderBy);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const res = await fetch(
    `${DATA_BASE}/v1/leaderboard?${searchParams.toString()}`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) throw new Error(`Data API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch open interest for markets
 */
export async function fetchOpenInterest(
  conditionIds: string[]
): Promise<OpenInterestData[]> {
  const params = conditionIds.map((id) => `market=${id}`).join("&");
  const res = await fetch(`${DATA_BASE}/oi?${params}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) throw new Error(`Data API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch top holders for a market
 */
export async function fetchTopHolders(
  conditionId: string,
  limit = 20
): Promise<MarketHolder[]> {
  const res = await fetch(
    `${DATA_BASE}/holders?market=${conditionId}&limit=${limit}`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) throw new Error(`Data API error: ${res.status}`);
  return res.json();
}

/**
 * Fetch trades for markets
 */
export async function fetchTrades(params?: {
  market?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const searchParams = new URLSearchParams();
  if (params?.market) searchParams.set("market", params.market);
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));

  const res = await fetch(
    `${DATA_BASE}/trades?${searchParams.toString()}`,
    { next: { revalidate: 3600 } }
  );

  if (!res.ok) throw new Error(`Data API error: ${res.status}`);
  return res.json();
}
