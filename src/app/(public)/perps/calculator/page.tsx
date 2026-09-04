/**
 * /perps/calculator — interactive Polymarket Perps calculators.
 *
 * Fee, liquidation-price and funding-cost calculators pre-filled with LIVE
 * mark prices and funding rates from the public Perps API (same cached feed
 * as the screener). Formulas mirror the official docs and our published
 * risk-math guide; results are estimates and exclude accrued fees/funding.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { Calculator, ShieldAlert, Zap } from "lucide-react";
import { getPerpsInstruments, getPerpsTickers } from "@/lib/perps-api";
import { PerpsCalculators } from "@/components/perps/perps-calculators";
import { RiskDisclosure } from "@/components/risk-disclosure";
import { BreadcrumbSchema, FAQSchema } from "@/components/structured-data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Polymarket Perps Calculator — Fees, Liquidation Price & Funding Costs",
  description:
    "Free Polymarket Perps calculator with live prices: estimate your liquidation price, round-trip trading fees and hourly funding costs for any market — crypto, stocks, indices and commodities — at any leverage.",
  alternates: { canonical: "/perps/calculator" },
  openGraph: {
    title: "Polymarket Perps Calculator | PolymarketFlow",
    description:
      "Liquidation price, trading fees and funding costs for every Polymarket Perps market — pre-filled with live data.",
  },
};

const FAQ_ITEMS = [
  {
    question: "How is the liquidation price calculated on Polymarket Perps?",
    answer:
      "Liquidation begins when account equity falls below maintenance margin, which Polymarket sets at notional × (0.5 ÷ the market's max leverage) — 2.5% of notional on a 20x market. For a long, the estimated liquidation price is entry × (1 − 1/leverage + maintenance rate); mirrored for shorts. Accrued fees and funding drain equity too, so real liquidation sits slightly closer than the estimate.",
  },
  {
    question: "What are Polymarket Perps trading fees?",
    answer:
      "Base-tier fees are 0.0400% taker and 0.0125% maker, charged on notional per fill, with volume tiers stepping down to 0.02% taker and a maker rebate at $1B+ trailing 30-day volume. Because fees charge on notional, a 20x taker round trip costs about 1.6% of your collateral.",
  },
  {
    question: "How does funding work on Polymarket Perps?",
    answer:
      "Funding settles every hour directly between longs and shorts, computed from how far the perp trades from its index price, and is capped at ±4% per hour. A positive rate means longs pay shorts; negative means shorts pay longs. This calculator projects costs from the current live rate — the actual rate recomputes hourly.",
  },
  {
    question: "What leverage does Polymarket Perps allow?",
    answer:
      "Up to 20x on major crypto, index and commodity markets and up to 10x on single stocks (as of September 2026). Per-market risk tiers reduce the cap as position size grows — the calculator warns you when a position exceeds its tier's limit.",
  },
  {
    question: "Can I trade Polymarket Perps from the United States?",
    answer:
      "No. Polymarket blocks Perps order placement in the United States and Canada per its official documentation. This calculator is informational and works anywhere. Circumventing geo-restrictions violates Polymarket's terms.",
  },
];

export default async function PerpsCalculatorPage() {
  const [instruments, tickers] = await Promise.all([getPerpsInstruments(), getPerpsTickers()]);

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://polymarketflow.com" },
          { name: "Perps", url: "https://polymarketflow.com/perps" },
          { name: "Calculator", url: "https://polymarketflow.com/perps/calculator" },
        ]}
      />
      <FAQSchema items={FAQ_ITEMS} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          Polymarket Perps Calculator
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          Estimate your liquidation price, round-trip fees and funding costs before you trade —
          pre-filled with live mark prices and the current funding rate for all{" "}
          {instruments.length > 0 ? instruments.length : ""} Perps markets. Updated September 2026.
        </p>
      </div>

      {instruments.length > 0 && tickers.length > 0 ? (
        <PerpsCalculators instruments={instruments} tickers={tickers} />
      ) : (
        <div className="terminal-card p-8 text-center text-muted-foreground mb-4">
          Live Perps data is temporarily unavailable — refresh in a moment.
        </div>
      )}

      {/* Eligibility strip */}
      <div className="terminal-card p-4 border-warning/40 bg-warning/5 my-6">
        <p className="text-sm leading-relaxed flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0 text-warning" />
          <span>
            <strong>Eligibility:</strong> Polymarket blocks Perps order placement in the United
            States and Canada (per its official documentation) — this calculator is informational
            and viewable anywhere. New to perps? Read the{" "}
            <Link href="/blog/polymarket-perps-risk-math" className="text-primary hover:underline">risk math guide</Link>{" "}
            before your first position.
          </span>
        </p>
      </div>

      {/* CTA */}
      <div className="terminal-card p-6 mb-6 text-center border-primary/30">
        <h2 className="text-lg font-bold mb-1">Ready to trade the real thing?</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-xl mx-auto">
          Eligible regions only. Run your numbers here first — know your liquidation distance and
          fee drag before you click buy.
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

      {/* Related */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-3">Go deeper</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <Link href="/perps/markets" className="terminal-card p-4 hover:border-primary/40 transition-colors">Live Perps markets screener →</Link>
          <Link href="/blog/polymarket-perps-fees" className="terminal-card p-4 hover:border-primary/40 transition-colors">Fees explained + worked examples →</Link>
          <Link href="/blog/polymarket-perps-risk-math" className="terminal-card p-4 hover:border-primary/40 transition-colors">Leverage &amp; liquidation risk math →</Link>
          <Link href="/blog/polymarket-perps-tutorial" className="terminal-card p-4 hover:border-primary/40 transition-colors">The complete Perps tutorial →</Link>
          <Link href="/blog/polymarket-perps-countries" className="terminal-card p-4 hover:border-primary/40 transition-colors">Country eligibility →</Link>
          <Link href="/perps" className="terminal-card p-4 hover:border-primary/40 transition-colors">How Polymarket Perps work →</Link>
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

      <p className="mb-6 text-[11px] text-muted-foreground leading-relaxed">
        Formulas per docs.polymarket.com/perps as of September 2026: maintenance margin = notional ×
        (0.5 ÷ market max leverage, per risk tier); fees charged on notional per fill; funding
        settles hourly, capped ±4%/hour. Estimates exclude accrued fees, accrued funding, the
        per-market liquidation fee and execution slippage. Parameters can change — the live app is
        authoritative.
      </p>

      <RiskDisclosure />
    </div>
  );
}
