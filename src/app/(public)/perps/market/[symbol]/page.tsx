/**
 * /perps/market/[symbol] — per-instrument Polymarket Perps analytics page.
 *
 * One page per live Perps market (~67): live stats, 7-day price candles,
 * hourly funding-rate history, leverage/risk tiers, calculator prefill link.
 * Nothing else in the niche has per-market Perps pages as of Sept 2026 —
 * this is the data-moat surface. All data from the public Perps API via
 * the cached fetchers in src/lib/perps-api.ts.
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Activity, Calculator, ShieldAlert, Zap } from "lucide-react";
import {
  getFundingHistory,
  getPerpsInstruments,
  getPerpsKlines,
  getPerpsTickers,
} from "@/lib/perps-api";
import { PerpsMarketCharts } from "@/components/perps/perps-market-charts";
import { RiskDisclosure } from "@/components/risk-disclosure";
import { BreadcrumbSchema, FAQSchema } from "@/components/structured-data";
import { cn, formatCompact } from "@/lib/utils";

export const revalidate = 60;

type Props = { params: Promise<{ symbol: string }> };

function catLabel(category: string): string {
  return category === "equity" ? "stock" : category;
}

function fmtPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (p >= 1) return p.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return p.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export async function generateStaticParams() {
  const instruments = await getPerpsInstruments();
  return instruments.map((i) => ({ symbol: i.symbol }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw);
  const instruments = await getPerpsInstruments();
  const inst = instruments.find((i) => i.symbol.toLowerCase() === symbol.toLowerCase());
  if (!inst) return { title: "Perps Market Not Found" };
  const base = inst.base_asset;
  return {
    title: `${base} Perpetual Futures on Polymarket — Live Price, Funding Rate & Open Interest`,
    description: `Live ${base} perps data on Polymarket: mark price, hourly funding rate with history, open interest, volume and up to ${inst.max_leverage}x leverage. Updated continuously from the public Perps API.`,
    alternates: { canonical: `/perps/market/${inst.symbol}` },
    openGraph: {
      title: `${base} Polymarket Perps — Live Data | PolymarketFlow`,
      description: `Live ${base}-USD perpetual futures: price, funding, open interest and risk tiers.`,
    },
  };
}

export default async function PerpsMarketPage({ params }: Props) {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw);
  const [instruments, tickers] = await Promise.all([getPerpsInstruments(), getPerpsTickers()]);
  const inst = instruments.find((i) => i.symbol.toLowerCase() === symbol.toLowerCase());
  if (!inst) notFound();

  const ticker = tickers.find((t) => t.instrument_id === inst.instrument_id);
  const [candles, funding] = await Promise.all([
    getPerpsKlines(inst.instrument_id, 168),
    getFundingHistory(inst.instrument_id),
  ]);

  const mark = ticker ? parseFloat(ticker.mark_price) : 0;
  const index = ticker ? parseFloat(ticker.index_price) : 0;
  const oiUsd = ticker ? parseFloat(ticker.open_interest) * mark : 0;
  const hourlyPct = ticker ? parseFloat(ticker.funding_rate) * 100 : 0;
  const direction = hourlyPct > 0 ? "longs pay shorts" : hourlyPct < 0 ? "shorts pay longs" : "flat";
  const window24 = candles.slice(-24);
  const open24 = window24.length > 0 ? window24[0].open : 0;
  const change24 = open24 > 0 && mark > 0 ? ((mark - open24) / open24) * 100 : null;
  const vol24Usd = window24.reduce((s, c) => s + c.volumeBase * c.close, 0);
  const base = inst.base_asset;

  const faq = [
    {
      question: `What leverage can you trade ${base} perps with on Polymarket?`,
      answer: `Up to ${inst.max_leverage}x on the ${base}-USD perpetual, stepping down for larger positions via risk tiers (shown on this page). Margin posts in pUSD.`,
    },
    {
      question: `How does funding work on the ${base} perpetual?`,
      answer: `Funding settles every hour directly between longs and shorts, based on how far the perp trades from the ${base} index price, capped at ±4% per hour. A positive rate means longs pay shorts. This page charts the recent hourly rates.`,
    },
    {
      question: `Can US traders trade ${base} perps on Polymarket?`,
      answer: `No — Polymarket blocks Perps order placement in the United States and Canada per its official documentation. This page is informational and viewable anywhere.`,
    },
    {
      question: `Where does this ${base} perps data come from?`,
      answer: `Directly from Polymarket's public Perps market-data API (prices, funding, open interest and candles), refreshed continuously with short caches. It is read-only public data.`,
    },
  ];

  const related = instruments
    .filter((i) => i.category === inst.category && i.symbol !== inst.symbol)
    .slice(0, 6);

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://polymarketflow.com" },
          { name: "Perps", url: "https://polymarketflow.com/perps" },
          { name: "Markets", url: "https://polymarketflow.com/perps/markets" },
          { name: base, url: `https://polymarketflow.com/perps/market/${inst.symbol}` },
        ]}
      />
      <FAQSchema items={faq} />

      {/* Header */}
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
          <Link href="/perps/markets" className="hover:text-foreground">Perps markets</Link> / {catLabel(inst.category)}
        </p>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          {base} Perpetual Futures on Polymarket
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Live {inst.symbol} data — mark price, hourly funding with history, open interest and risk
          tiers, straight from the public Perps API. Updated September 2026.
        </p>
      </div>

      {/* Live stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="terminal-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Mark price</p>
          <p className="text-lg font-bold font-mono">${fmtPrice(mark)}</p>
        </div>
        <div className="terminal-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">24h change</p>
          <p className={cn("text-lg font-bold font-mono", change24 == null ? "" : change24 >= 0 ? "text-emerald-500" : "text-red-500")}>
            {change24 == null ? "—" : `${change24 >= 0 ? "+" : ""}${change24.toFixed(2)}%`}
          </p>
        </div>
        <div className="terminal-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Funding (1h)</p>
          <p className="text-lg font-bold font-mono">{hourlyPct >= 0 ? "" : "-"}{Math.abs(hourlyPct).toFixed(4)}%</p>
          <p className="text-[10px] text-muted-foreground">{direction}</p>
        </div>
        <div className="terminal-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Open interest</p>
          <p className="text-lg font-bold font-mono">{oiUsd > 0 ? formatCompact(oiUsd) : "—"}</p>
        </div>
        <div className="terminal-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">24h volume</p>
          <p className="text-lg font-bold font-mono">{vol24Usd > 0 ? formatCompact(vol24Usd) : "—"}</p>
        </div>
        <div className="terminal-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Max leverage</p>
          <p className="text-lg font-bold font-mono">{inst.max_leverage}x</p>
          <p className="text-[10px] text-muted-foreground">index ${fmtPrice(index)}</p>
        </div>
      </div>

      {/* Charts */}
      <PerpsMarketCharts candles={candles} funding={funding} />

      {/* Risk tiers + calculator */}
      <div className="grid md:grid-cols-2 gap-4 my-6">
        <div className="terminal-card p-4">
          <h2 className="text-sm font-bold mb-3">Leverage risk tiers</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left py-2">Position notional from</th>
                <th className="text-right py-2">Max leverage</th>
              </tr>
            </thead>
            <tbody>
              {inst.risk_tiers.map((t) => (
                <tr key={t.lower_bound} className="border-b border-border/50 last:border-0">
                  <td className="py-2 font-mono">${parseFloat(t.lower_bound).toLocaleString("en-US")}</td>
                  <td className="py-2 text-right font-mono">{t.max_leverage}x</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Bigger positions must run lower leverage. Maintenance margin scales with the tier
            (documented as notional × 0.5 ÷ tier max leverage).
          </p>
        </div>
        <div className="terminal-card p-4 flex flex-col justify-center text-center">
          <Calculator className="h-6 w-6 text-primary mx-auto mb-2" />
          <h2 className="text-sm font-bold mb-1">Run your {base} numbers first</h2>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
            Liquidation price, fee drag and funding cost for your exact size and leverage — pre-filled
            with this market&apos;s live data.
          </p>
          <Link
            href={`/perps/calculator?symbol=${encodeURIComponent(inst.symbol)}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border border-primary/40 text-primary font-semibold hover:bg-primary/10 transition-colors mx-auto"
          >
            Open the {base} calculator
          </Link>
        </div>
      </div>

      {/* Eligibility strip */}
      <div className="terminal-card p-4 border-warning/40 bg-warning/5 mb-6">
        <p className="text-sm leading-relaxed flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0 text-warning" />
          <span>
            <strong>Eligibility:</strong> Polymarket blocks Perps order placement in the United
            States and Canada (per its official documentation) — this page is informational and
            viewable anywhere. New to perps? Start with the{" "}
            <Link href="/blog/polymarket-perps-tutorial" className="text-primary hover:underline">tutorial</Link> and{" "}
            <Link href="/blog/polymarket-perps-risk-math" className="text-primary hover:underline">risk math</Link>.
          </span>
        </p>
      </div>

      {/* CTA */}
      <div className="terminal-card p-6 mb-6 text-center border-primary/30">
        <h2 className="text-lg font-bold mb-1">Trade {base} perps</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-xl mx-auto">
          Eligible regions only. Know your liquidation distance before you click buy.
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

      {/* Related markets */}
      {related.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3">More {catLabel(inst.category)} perps</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
            {related.map((r) => (
              <Link key={r.symbol} href={`/perps/market/${r.symbol}`} className="terminal-card p-3 hover:border-primary/40 transition-colors text-center">
                <span className="font-semibold">{r.base_asset}</span>
                <span className="block text-[10px] text-muted-foreground">up to {r.max_leverage}x</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-3">Frequently asked questions</h2>
        <div className="space-y-4">
          {faq.map((f) => (
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
