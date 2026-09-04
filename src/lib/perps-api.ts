/**
 * Polymarket Perps public market-data client.
 *
 * Reads the unauthenticated Perps REST API (api.perpetuals.polymarket.com).
 * Read-only market data is NOT geo-restricted (docs + empirically verified
 * from a US IP 2026-09-04); only order placement is. Rate budget is 1,000
 * weighted tokens/min per IP — we stay far under it by caching every fetch
 * through Next's data cache (tickers ~10s, instruments 1h, klines 5m) so all
 * site visitors share one disciplined set of upstream calls.
 *
 * Live-verified quirks (probe 2026-09-04):
 *  - tickers do NOT include the documented volume_24h/open_price fields —
 *    24h volume/change are reconstructed from hourly klines instead.
 *  - open_interest is denominated in the BASE asset → multiply by mark_price
 *    for USD.
 *  - funding_rate is the HOURLY rate (e.g. "0.0000125" = 0.00125%/hour);
 *    positive → longs pay shorts, negative → shorts pay longs.
 */

const PERPS_API = "https://api.perpetuals.polymarket.com/v1/info";

export interface PerpsInstrument {
  instrument_id: number;
  symbol: string; // e.g. "BTC-USD"
  base_asset: string; // e.g. "BTC"
  category: "crypto" | "equity" | "index" | "commodity" | string;
  max_leverage: number;
  funding_interval: string;
  min_notional: string;
  risk_tiers: { lower_bound: string; max_leverage: number }[];
}

export interface PerpsTicker {
  instrument_id: number;
  symbol: string;
  index_price: string;
  mark_price: string;
  last_price: string;
  mid_price: string;
  open_interest: string; // base-asset units
  funding_rate: string; // hourly decimal
  next_funding: number; // ms epoch
  timestamp: number;
}

/** One joined row for the screener table. All numeric fields pre-computed. */
export interface PerpsScreenerRow {
  instrumentId: number;
  symbol: string;
  baseAsset: string;
  category: string;
  markPrice: number;
  indexPrice: number;
  oiUsd: number;
  fundingHourlyPct: number; // e.g. 0.00125 (%)
  funding8hPct: number; // hourly × 8
  fundingAprPct: number; // hourly × 24 × 365
  fundingDirection: "longs-pay" | "shorts-pay" | "flat";
  nextFunding: number;
  maxLeverage: number;
  change24hPct: number | null; // null when klines unavailable
  volume24hUsd: number | null;
}

async function fetchJson<T>(url: string, revalidate: number): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getPerpsInstruments(): Promise<PerpsInstrument[]> {
  return (await fetchJson<PerpsInstrument[]>(`${PERPS_API}/instruments`, 3600)) ?? [];
}

export async function getPerpsTickers(): Promise<PerpsTicker[]> {
  return (await fetchJson<PerpsTicker[]>(`${PERPS_API}/tickers`, 10)) ?? [];
}

/** Trailing-24h change + USD volume for one instrument, from hourly klines.
 *  Kline tuple: [ts, open, high, low, close, volume(base), trades]. Cached 5m. */
async function get24hStats(
  instrumentId: number
): Promise<{ change24hPct: number | null; volume24hUsd: number | null }> {
  const start = Date.now() - 25 * 3600 * 1000;
  const data = await fetchJson<{ data: [number, string, string, string, string, string, number][] }>(
    `${PERPS_API}/klines?instrument_id=${instrumentId}&interval=1h&start_timestamp=${start}`,
    300
  );
  const candles = data?.data;
  if (!candles || candles.length === 0) return { change24hPct: null, volume24hUsd: null };
  const window = candles.slice(-24);
  const open = parseFloat(window[0][1]);
  const close = parseFloat(window[window.length - 1][4]);
  const change24hPct = open > 0 ? ((close - open) / open) * 100 : null;
  const volume24hUsd = window.reduce(
    (sum, c) => sum + parseFloat(c[5]) * parseFloat(c[4]),
    0
  );
  return { change24hPct, volume24hUsd };
}

/** Joined, display-ready screener rows (sorted by USD open interest desc).
 *  `with24h` adds the klines-derived columns (67 cached sub-fetches). */
export async function getPerpsScreenerRows(with24h = true): Promise<PerpsScreenerRow[]> {
  const [instruments, tickers] = await Promise.all([getPerpsInstruments(), getPerpsTickers()]);
  if (tickers.length === 0) return [];
  const byId = new Map(instruments.map((i) => [i.instrument_id, i]));

  const stats = with24h
    ? await Promise.all(tickers.map((t) => get24hStats(t.instrument_id)))
    : tickers.map(() => ({ change24hPct: null, volume24hUsd: null }));

  const rows = tickers.map((t, idx): PerpsScreenerRow => {
    const inst = byId.get(t.instrument_id);
    const mark = parseFloat(t.mark_price);
    const hourly = parseFloat(t.funding_rate); // decimal, e.g. 0.0000125
    const hourlyPct = hourly * 100;
    return {
      instrumentId: t.instrument_id,
      symbol: t.symbol,
      baseAsset: inst?.base_asset ?? t.symbol.replace(/-USD$/, ""),
      category: inst?.category ?? "unknown",
      markPrice: mark,
      indexPrice: parseFloat(t.index_price),
      oiUsd: parseFloat(t.open_interest) * mark,
      fundingHourlyPct: hourlyPct,
      funding8hPct: hourlyPct * 8,
      fundingAprPct: hourlyPct * 24 * 365,
      fundingDirection: hourly > 0 ? "longs-pay" : hourly < 0 ? "shorts-pay" : "flat",
      nextFunding: t.next_funding,
      maxLeverage: inst?.max_leverage ?? 0,
      change24hPct: stats[idx].change24hPct,
      volume24hUsd: stats[idx].volume24hUsd,
    };
  });

  return rows.sort((a, b) => b.oiUsd - a.oiUsd);
}
