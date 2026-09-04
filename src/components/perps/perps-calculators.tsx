"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PerpsInstrument, PerpsTicker } from "@/lib/perps-api";

/** Published fee schedule (docs.polymarket.com/perps, as of Sept 2026).
 *  Percent of notional per fill; negative maker = rebate. */
const FEE_TIERS = [
  { label: "$0+ (base tier)", taker: 0.04, maker: 0.0125 },
  { label: "$1M+ 30d volume", taker: 0.037, maker: 0.01 },
  { label: "$5M+ 30d volume", taker: 0.035, maker: 0.008 },
  { label: "$25M+ 30d volume", taker: 0.03, maker: 0.005 },
  { label: "$100M+ 30d volume", taker: 0.027, maker: 0.002 },
  { label: "$500M+ 30d volume", taker: 0.025, maker: 0 },
  { label: "$1B+ 30d volume", taker: 0.02, maker: -0.005 },
];

const CATEGORY_ORDER: Record<string, number> = { crypto: 0, index: 1, commodity: 2, equity: 3 };

const inputCls =
  "w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary";
const labelCls = "block text-[10px] uppercase tracking-wider text-muted-foreground mb-1";

function usd(n: number, dp = 2): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
}

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (p >= 1) return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return p.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

interface LiveQuote {
  markPrice: number;
  fundingHourlyPct: number; // e.g. 0.00125 means 0.00125%/hour
}

/** Interactive fee / liquidation / funding calculators for Polymarket Perps.
 *  All math mirrors the documented formulas (see page footnote); live mark
 *  price + funding pre-fill from the same cached feed as the screener. */
export function PerpsCalculators({
  instruments,
  tickers,
}: {
  instruments: PerpsInstrument[];
  tickers: PerpsTicker[];
}) {
  const sorted = useMemo(
    () =>
      [...instruments].sort(
        (a, b) =>
          (CATEGORY_ORDER[a.category] ?? 9) - (CATEGORY_ORDER[b.category] ?? 9) ||
          a.symbol.localeCompare(b.symbol)
      ),
    [instruments]
  );

  const initialQuotes = useMemo(() => {
    const m = new Map<string, LiveQuote>();
    for (const t of tickers) {
      m.set(t.symbol, {
        markPrice: parseFloat(t.mark_price),
        fundingHourlyPct: parseFloat(t.funding_rate) * 100,
      });
    }
    return m;
  }, [tickers]);

  const searchParams = useSearchParams();
  const urlSymbol = searchParams.get("symbol");
  const [quotes, setQuotes] = useState<Map<string, LiveQuote>>(initialQuotes);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [symbol, setSymbol] = useState(
    sorted.find((i) => urlSymbol && i.symbol.toLowerCase() === urlSymbol.toLowerCase())?.symbol ??
      sorted.find((i) => i.symbol === "BTC-USD")?.symbol ??
      sorted[0]?.symbol ??
      ""
  );
  const [side, setSide] = useState<"long" | "short">("long");
  const [collateral, setCollateral] = useState(100);
  const [leverage, setLeverage] = useState(5);
  const [entryOverride, setEntryOverride] = useState<number | null>(null);
  const [holdHours, setHoldHours] = useState(24);
  const [feeTierIdx, setFeeTierIdx] = useState(0);
  const [orderType, setOrderType] = useState<"taker" | "maker">("taker");

  // Refresh mark price + funding from the same cached endpoint the screener polls.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/perps/markets");
        if (!res.ok) return;
        const data = await res.json();
        if (!alive || !Array.isArray(data.rows)) return;
        const m = new Map<string, LiveQuote>();
        for (const r of data.rows) m.set(r.symbol, { markPrice: r.markPrice, fundingHourlyPct: r.fundingHourlyPct });
        setQuotes(m);
        setUpdatedAt(data.at);
      } catch {}
    };
    const id = setInterval(tick, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const inst = sorted.find((i) => i.symbol === symbol);
  const quote = quotes.get(symbol);
  const livemark = quote?.markPrice ?? 0;
  const entry = entryOverride ?? livemark;
  const fundingHourlyPct = quote?.fundingHourlyPct ?? 0;

  // ---- position math (documented conventions; see footnote) ----
  const notional = collateral * leverage;
  const tiers = inst?.risk_tiers ?? [];
  const applicableTier = tiers.reduce<{ lower_bound: string; max_leverage: number } | null>(
    (acc, t) => (notional >= parseFloat(t.lower_bound) ? t : acc),
    null
  );
  const tierMaxLev = applicableTier?.max_leverage ?? inst?.max_leverage ?? 0;
  const overTierCap = tierMaxLev > 0 && leverage > tierMaxLev;
  const mmrPct = tierMaxLev > 0 ? (0.5 / tierMaxLev) * 100 : 0; // MM = notional × (0.5 / max leverage)
  const initialMargin = leverage > 0 ? notional / leverage : 0;
  const maintenanceMargin = notional * (mmrPct / 100);

  const liqDistancePct = leverage > 0 ? (1 / leverage - mmrPct / 100) * 100 : 0;
  const liqPrice =
    entry > 0 && leverage > 0
      ? side === "long"
        ? entry * (1 - 1 / leverage + mmrPct / 100)
        : entry * (1 + 1 / leverage - mmrPct / 100)
      : 0;

  // ---- fees ----
  const tier = FEE_TIERS[feeTierIdx];
  const feeRatePct = orderType === "taker" ? tier.taker : tier.maker;
  const roundTripUsd = notional * (feeRatePct / 100) * 2;
  const roundTripEquityPct = collateral > 0 ? (roundTripUsd / collateral) * 100 : 0;
  const takerRoundUsd = notional * (FEE_TIERS[feeTierIdx].taker / 100) * 2;
  const makerRoundUsd = notional * (FEE_TIERS[feeTierIdx].maker / 100) * 2;

  // ---- funding (current live hourly rate; varies every hour) ----
  const paysFunding =
    fundingHourlyPct > 0 ? side === "long" : fundingHourlyPct < 0 ? side === "short" : false;
  const fundingPerHourUsd = notional * (Math.abs(fundingHourlyPct) / 100);
  const fundingHoldUsd = fundingPerHourUsd * holdHours;
  const fundingDayEquityPct = collateral > 0 ? ((fundingPerHourUsd * 24) / collateral) * 100 : 0;

  const maxLev = Math.max(inst?.max_leverage ?? 1, 1);

  return (
    <div>
      {/* Inputs */}
      <div className="terminal-card p-4 sm:p-5 mb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="col-span-2 lg:col-span-1">
            <label className={labelCls} htmlFor="calc-market">Market</label>
            <select id="calc-market" className={inputCls} value={symbol}
              onChange={(e) => { setSymbol(e.target.value); setEntryOverride(null); }}>
              {sorted.map((i) => (
                <option key={i.symbol} value={i.symbol}>
                  {i.base_asset} ({i.category === "equity" ? "stock" : i.category}) — up to {i.max_leverage}x
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Direction</label>
            <div className="grid grid-cols-2 gap-1">
              {(["long", "short"] as const).map((s) => (
                <button key={s} onClick={() => setSide(s)}
                  className={cn(
                    "px-2 py-2 rounded-md text-sm font-semibold transition-colors capitalize",
                    side === s
                      ? s === "long" ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"
                      : "bg-background border border-border text-muted-foreground hover:text-foreground"
                  )}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls} htmlFor="calc-collateral">Collateral (pUSD)</label>
            <input id="calc-collateral" type="number" min={1} className={inputCls} value={collateral}
              onChange={(e) => setCollateral(Math.max(0, parseFloat(e.target.value) || 0))} />
          </div>
          <div>
            <label className={labelCls} htmlFor="calc-leverage">Leverage: {leverage}x</label>
            <input id="calc-leverage" type="range" min={1} max={maxLev} step={1} value={Math.min(leverage, maxLev)}
              onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--primary,#6366f1)] mt-2.5" />
          </div>
          <div>
            <label className={labelCls} htmlFor="calc-entry">Entry price</label>
            <input id="calc-entry" type="number" min={0} step="any" className={inputCls}
              value={entry > 0 ? Number(entry.toFixed(4)) : ""}
              onChange={(e) => setEntryOverride(parseFloat(e.target.value) || 0)} />
            {entryOverride != null && livemark > 0 && (
              <button className="text-[11px] text-primary hover:underline mt-1" onClick={() => setEntryOverride(null)}>
                Reset to live mark (${fmtPrice(livemark)})
              </button>
            )}
          </div>
          <div>
            <label className={labelCls} htmlFor="calc-hold">Hold time (hours)</label>
            <input id="calc-hold" type="number" min={1} className={inputCls} value={holdHours}
              onChange={(e) => setHoldHours(Math.max(1, parseInt(e.target.value, 10) || 1))} />
          </div>
          <div>
            <label className={labelCls} htmlFor="calc-tier">Fee tier</label>
            <select id="calc-tier" className={inputCls} value={feeTierIdx}
              onChange={(e) => setFeeTierIdx(parseInt(e.target.value, 10))}>
              {FEE_TIERS.map((t, i) => (
                <option key={t.label} value={i}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Order type</label>
            <div className="grid grid-cols-2 gap-1">
              {(["taker", "maker"] as const).map((o) => (
                <button key={o} onClick={() => setOrderType(o)}
                  className={cn(
                    "px-2 py-2 rounded-md text-sm font-semibold transition-colors capitalize",
                    orderType === o
                      ? "bg-primary/10 text-primary"
                      : "bg-background border border-border text-muted-foreground hover:text-foreground"
                  )}>
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          {updatedAt
            ? `Live mark + funding updated ${new Date(updatedAt).toLocaleTimeString()}`
            : "Mark price and funding pre-filled live — refreshes every 15s"}
          {livemark > 0 && <span className="font-mono">· {symbol} mark ${fmtPrice(livemark)}</span>}
        </p>
      </div>

      {overTierCap && (
        <div className="terminal-card p-3 border-warning/40 bg-warning/5 mb-4">
          <p className="text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />
            <span>
              At ~{usd(notional, 0)} notional, this market&apos;s risk tier caps leverage at{" "}
              <strong>{tierMaxLev}x</strong> — the exchange would not let you open this position at {leverage}x.
              Figures below are hypothetical.
            </span>
          </p>
        </div>
      )}

      {/* Results */}
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        {/* Position + liquidation */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-bold mb-3">Position &amp; liquidation</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Notional</dt><dd className="font-mono">{usd(notional, 0)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Initial margin</dt><dd className="font-mono">{usd(initialMargin)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Maintenance margin ({mmrPct.toFixed(2)}%)</dt><dd className="font-mono">{usd(maintenanceMargin)}</dd></div>
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="text-muted-foreground">Est. liquidation price</dt>
              <dd className={cn("font-mono font-semibold", liqDistancePct < 3 ? "text-red-500" : "")}>
                {liqPrice > 0 ? `$${fmtPrice(liqPrice)}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Distance to liquidation</dt>
              <dd className={cn("font-mono font-semibold", liqDistancePct < 3 ? "text-red-500" : "text-foreground")}>
                {liqDistancePct > 0 ? `${liqDistancePct.toFixed(2)}%` : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
            Estimate before accrued fees and funding — both drain equity, so real liquidation sits
            closer than this. A {side === "long" ? "drop" : "rise"} of {liqDistancePct > 0 ? liqDistancePct.toFixed(2) : "—"}% triggers the engine.
          </p>
        </div>

        {/* Fees */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-bold mb-3">Trading fees</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Rate per fill ({orderType})</dt><dd className="font-mono">{feeRatePct.toFixed(4)}%</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Open + close (round trip)</dt><dd className="font-mono font-semibold">{usd(roundTripUsd)}</dd></div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">As % of your collateral</dt>
              <dd className={cn("font-mono font-semibold", roundTripEquityPct >= 1 ? "text-warning" : "")}>{roundTripEquityPct.toFixed(2)}%</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2"><dt className="text-muted-foreground">All-taker vs all-maker</dt><dd className="font-mono">{usd(takerRoundUsd)} / {usd(makerRoundUsd)}</dd></div>
          </dl>
          <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
            Fees charge on notional, so leverage multiplies them against your equity. Liquidation
            fills pay the normal rate plus a per-market liquidation fee on top.
          </p>
        </div>

        {/* Funding */}
        <div className="terminal-card p-4">
          <h3 className="text-sm font-bold mb-3">Funding (at current rate)</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Current hourly rate</dt>
              <dd className="font-mono">{fundingHourlyPct >= 0 ? "" : "-"}{Math.abs(fundingHourlyPct).toFixed(4)}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Your {side} position</dt>
              <dd className={cn("font-semibold", fundingHourlyPct === 0 ? "text-muted-foreground" : paysFunding ? "text-red-500" : "text-emerald-500")}>
                {fundingHourlyPct === 0 ? "flat" : paysFunding ? "pays" : "receives"}
              </dd>
            </div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Per hour</dt><dd className="font-mono">{usd(fundingPerHourUsd, 4)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Over {holdHours}h hold</dt><dd className="font-mono font-semibold">{usd(fundingHoldUsd)}</dd></div>
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="text-muted-foreground">Daily, as % of collateral</dt>
              <dd className={cn("font-mono", fundingDayEquityPct >= 2 ? "text-warning" : "")}>{fundingDayEquityPct.toFixed(2)}%</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
            Uses the live rate right now — funding recomputes every hour and can flip sign or spike
            (capped at ±4%/hour). Treat multi-day projections as illustrative only.
          </p>
        </div>
      </div>
    </div>
  );
}
