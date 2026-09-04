"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { cn, formatCompact } from "@/lib/utils";
import type { PerpsScreenerRow } from "@/lib/perps-api";

const CATEGORIES = [
  { key: "", label: "All" },
  { key: "crypto", label: "Crypto" },
  { key: "equity", label: "Stocks" },
  { key: "index", label: "Indices" },
  { key: "commodity", label: "Commodities" },
];

type SortKey = "oiUsd" | "markPrice" | "change24hPct" | "funding8hPct" | "volume24hUsd" | "maxLeverage";

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (p >= 1) return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return p.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function fmtFunding(pct: number): string {
  return `${pct >= 0 ? "" : "-"}${Math.abs(pct).toFixed(4)}%`;
}

/** Live-refreshing screener grid. Receives SSR rows, then polls our own
 *  /api/perps/markets every 15s (which is itself cached upstream). */
export function PerpsScreenerTable({ initialRows }: { initialRows: PerpsScreenerRow[] }) {
  const [rows, setRows] = useState<PerpsScreenerRow[]>(initialRows);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("oiUsd");
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/perps/markets");
        if (!res.ok) return;
        const data = await res.json();
        if (alive && Array.isArray(data.rows) && data.rows.length > 0) {
          setRows(data.rows);
          setUpdatedAt(data.at);
        }
      } catch {}
    };
    const id = setInterval(tick, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const view = useMemo(() => {
    const filtered = category ? rows.filter((r) => r.category === category) : rows;
    const dir = sortDesc ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? -Infinity;
      const bv = b[sortKey] ?? -Infinity;
      return av === bv ? 0 : av > bv ? dir : -dir;
    });
  }, [rows, category, sortKey, sortDesc]);

  const header = (key: SortKey, label: string) => (
    <th
      className="px-3 py-2.5 text-right font-semibold cursor-pointer select-none hover:text-foreground whitespace-nowrap"
      onClick={() => {
        if (sortKey === key) setSortDesc(!sortDesc);
        else { setSortKey(key); setSortDesc(true); }
      }}
    >
      {label}
      {sortKey === key && (sortDesc ? <ArrowDown className="inline h-3 w-3 ml-0.5" /> : <ArrowUp className="inline h-3 w-3 ml-0.5" />)}
    </th>
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto" role="tablist" aria-label="Filter by category">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors",
                category === c.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <RefreshCw className="h-3 w-3" />
          {updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString()}` : "Live — refreshes every 15s"}
        </span>
      </div>

      <div className="terminal-card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2.5 text-left font-semibold">Market</th>
              {header("markPrice", "Mark Price")}
              {header("change24hPct", "24h")}
              {header("funding8hPct", "Funding (8h)")}
              {header("oiUsd", "Open Interest")}
              {header("volume24hUsd", "24h Volume")}
              {header("maxLeverage", "Max Lev")}
            </tr>
          </thead>
          <tbody>
            {view.map((r) => (
              <tr key={r.instrumentId} className="border-b border-border/50 last:border-0 hover:bg-accent/30">
                <td className="px-3 py-2.5">
                  <Link href={`/perps/market/${r.symbol}`} className="group">
                    <span className="font-semibold group-hover:text-primary transition-colors">{r.baseAsset}</span>
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground">{r.category === "equity" ? "stock" : r.category}</span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right font-mono">${fmtPrice(r.markPrice)}</td>
                <td className={cn(
                  "px-3 py-2.5 text-right font-mono",
                  r.change24hPct == null ? "text-muted-foreground" : r.change24hPct >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {r.change24hPct == null ? "—" : `${r.change24hPct >= 0 ? "+" : ""}${r.change24hPct.toFixed(2)}%`}
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span className={cn("font-mono", r.fundingDirection === "shorts-pay" ? "text-emerald-500" : "text-foreground")}>
                    {fmtFunding(r.funding8hPct)}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {r.fundingDirection === "longs-pay" ? "longs pay" : r.fundingDirection === "shorts-pay" ? "shorts pay" : "flat"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right font-mono">{formatCompact(r.oiUsd)}</td>
                <td className="px-3 py-2.5 text-right font-mono">
                  {r.volume24hUsd == null ? "—" : formatCompact(r.volume24hUsd)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono">{r.maxLeverage}x</td>
              </tr>
            ))}
            {view.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Perps market data is temporarily unavailable — try again shortly.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Funding shown as the 8-hour-equivalent rate (Polymarket settles hourly); positive = longs pay shorts.
        Open interest converted to USD at mark price. Data: Polymarket public Perps API.
      </p>
    </div>
  );
}
