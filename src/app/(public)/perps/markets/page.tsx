/**
 * /perps/markets — live Polymarket Perps screener.
 *
 * SSR-rendered table (crawlable) + client auto-refresh via /api/perps/markets.
 * Data from Polymarket's public Perps API (read-only market data is not
 * geo-restricted). Differentiator vs crypto-first aggregators: full coverage
 * of all instruments including single-stock, index and commodity perps.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { Activity, ShieldAlert, Zap } from "lucide-react";
import { getPerpsScreenerRows } from "@/lib/perps-api";
import { PerpsScreenerTable } from "@/components/perps/perps-screener-table";
import { RiskDisclosure } from "@/components/risk-disclosure";
import { BreadcrumbSchema, FAQSchema } from "@/components/structured-data";
import { formatCompact } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Polymarket Perps Markets — Live Screener: Prices, Funding Rates, Open Interest",
  description:
    "Live screener for every Polymarket Perps market — crypto, stocks, indices and commodities. Real-time mark prices, funding rates, open interest, 24h volume and max leverage, updated continuously.",
  alternates: { canonical: "/perps/markets" },
  openGraph: {
    title: "Live Polymarket Perps Screener | PolymarketFlow",
    description:
      "Every Polymarket Perps market in one table: prices, funding rates, open interest and leverage — crypto, stocks, indices, commodities.",
  },
};

const FAQ_ITEMS = [
  {
    question: "What markets can you trade on Polymarket Perps?",
    answer:
      "Polymarket Perps lists perpetual futures across four categories: crypto (BTC, ETH, SOL and more), single stocks (TSLA, NVDA, AAPL and other large caps), indices (S&P 500, Nasdaq 100) and commodities (gold, silver, WTI and Brent oil). This screener shows every live instrument with current data.",
  },
  {
    question: "How do Polymarket Perps funding rates work?",
    answer:
      "Funding settles every hour, directly between longs and shorts with no protocol fee. When the perp trades above its index price, longs pay shorts; below it, shorts pay longs. We display the 8-hour-equivalent rate for comparability with other venues — Polymarket's raw rate is hourly.",
  },
  {
    question: "What is the maximum leverage on Polymarket Perps?",
    answer:
      "Max leverage is set per market: up to 20x on major crypto, indices and commodities, and up to 10x on single stocks — and it steps down for larger position sizes via per-market risk tiers. The screener shows each market's headline cap.",
  },
  {
    question: "Is Polymarket Perps available in the United States?",
    answer:
      "No. Polymarket blocks Perps order placement in the United States and Canada (plus sanctioned jurisdictions) per its official documentation. Market data remains viewable anywhere — this page is informational. Circumventing geo-restrictions violates Polymarket's terms.",
  },
  {
    question: "How often does this screener update?",
    answer:
      "Prices, funding and open interest refresh roughly every 15 seconds from Polymarket's public Perps API; 24-hour change and volume are computed from hourly candles and refresh every few minutes.",
  },
];

export default async function PerpsMarketsPage() {
  const rows = await getPerpsScreenerRows(true);
  const totalOi = rows.reduce((s, r) => s + r.oiUsd, 0);
  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://polymarketflow.com" },
          { name: "Perps", url: "https://polymarketflow.com/perps" },
          { name: "Markets", url: "https://polymarketflow.com/perps/markets" },
        ]}
      />
      <FAQSchema items={FAQ_ITEMS} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Live Polymarket Perps Markets
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Every Perps instrument — crypto, stocks, indices and commodities — with live prices,
          funding rates, open interest and leverage. Updated September 2026.
        </p>
      </div>

      {/* Stats strip */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="terminal-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Markets</p>
            <p className="text-xl font-bold">{rows.length}</p>
          </div>
          <div className="terminal-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Open Interest</p>
            <p className="text-xl font-bold">{formatCompact(totalOi)}</p>
          </div>
          <div className="terminal-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Stocks / Crypto</p>
            <p className="text-xl font-bold">{counts["equity"] ?? 0} / {counts["crypto"] ?? 0}</p>
          </div>
          <div className="terminal-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Indices / Commodities</p>
            <p className="text-xl font-bold">{(counts["index"] ?? 0)} / {(counts["commodity"] ?? 0)}</p>
          </div>
        </div>
      )}

      {/* Screener */}
      <PerpsScreenerTable initialRows={rows} />

      {/* Eligibility strip */}
      <div className="terminal-card p-4 border-warning/40 bg-warning/5 my-6">
        <p className="text-sm leading-relaxed flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0 text-warning" />
          <span>
            <strong>Eligibility:</strong> Polymarket blocks Perps order placement in the United
            States and Canada (per its official documentation) — this screener is informational
            and viewable anywhere. If you&apos;re in an eligible region and new to perps, read the{" "}
            <Link href="/blog/polymarket-perps-tutorial" className="text-primary hover:underline">tutorial</Link>{" "}
            and <Link href="/blog/polymarket-perps-risk-math" className="text-primary hover:underline">risk math</Link> first.
          </span>
        </p>
      </div>

      {/* CTA */}
      <div className="terminal-card p-6 mb-6 text-center border-primary/30">
        <h2 className="text-lg font-bold mb-1">Trade these markets</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-xl mx-auto">
          Eligible regions only. Start small, use isolated margin while learning, and know your
          liquidation distance before you click buy.
        </p>
        <a
          href="/go/polymarket-perps"
          target="_blank"
          rel="sponsored nofollow noopener"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
        >
          <Zap className="h-4 w-4" /> Open Polymarket Perps
        </a>
      </div>

      {/* Guides */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-3">Perps guides</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <Link href="/perps/calculator" className="terminal-card p-4 hover:border-primary/40 transition-colors">Perps calculator: liquidation, fees &amp; funding →</Link>
          <Link href="/perps" className="terminal-card p-4 hover:border-primary/40 transition-colors">How Polymarket Perps work →</Link>
          <Link href="/blog/polymarket-perps-tutorial" className="terminal-card p-4 hover:border-primary/40 transition-colors">The complete Perps tutorial →</Link>
          <Link href="/blog/polymarket-perps-fees" className="terminal-card p-4 hover:border-primary/40 transition-colors">Fees explained + worked examples →</Link>
          <Link href="/blog/polymarket-perps-risk-math" className="terminal-card p-4 hover:border-primary/40 transition-colors">Leverage &amp; liquidation risk math →</Link>
          <Link href="/blog/polymarket-perps-countries" className="terminal-card p-4 hover:border-primary/40 transition-colors">Country eligibility →</Link>
          <Link href="/blog/polymarket-perps-vs-hyperliquid" className="terminal-card p-4 hover:border-primary/40 transition-colors">Perps vs Hyperliquid →</Link>
        </div>
      </div>

      {/* FAQ (visible copy matching the schema) */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-3">Frequently asked questions</h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((f) => (
            <div key={f.question} className="terminal-card p-4">
              <h3 className="text-sm font-semibold mb-1">{f.question}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </div>
      </div>

      <RiskDisclosure />
    </div>
  );
}
