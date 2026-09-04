import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Clock,
  Gauge,
  Infinity as InfinityIcon,
  LineChart,
  Percent,
  Rocket,
  Scale,
  TrendingUp,
  Zap,
} from "lucide-react";
import { isPerpsLive } from "@/lib/flags";
import { RiskDisclosure } from "@/components/risk-disclosure";
import { PerpsNotifyForm } from "@/components/perps-notify-form";
import { BreadcrumbSchema, FAQSchema } from "@/components/structured-data";

const FAQ_ITEMS = [
  {
    question: "What are Polymarket Perps?",
    answer:
      "Perps (perpetual futures) are contracts that track an underlying asset — crypto, single stocks, indices or commodities — and trade continuously with no expiry date. You take a leveraged long or short position on price, collateralized in pUSD, with an hourly funding mechanism keeping the contract anchored to its index price.",
  },
  {
    question: "What is the maximum leverage on Polymarket Perps?",
    answer:
      "Leverage is set per market: up to 20x on major crypto, indices and commodities, and up to 10x on single stocks (as of September 2026). Per-market risk tiers reduce available leverage as position size grows.",
  },
  {
    question: "Is Polymarket Perps available in the United States?",
    answer:
      "No. Per Polymarket's official documentation, Perps order placement is blocked in the United States and Canada (plus sanctioned jurisdictions). Market data is viewable anywhere, but US and Canadian users cannot trade — and circumventing geo-restrictions violates Polymarket's terms.",
  },
  {
    question: "How does funding work on Polymarket Perps?",
    answer:
      "Funding settles every hour directly between longs and shorts — the protocol takes no cut. When the perp trades above its index price, longs pay shorts; below it, shorts pay longs. The hourly rate is capped at ±4% in extreme conditions.",
  },
  {
    question: "How do I get access to Polymarket Perps?",
    answer:
      "Perps launched broadly on September 3, 2026. You need a Polymarket account and at least 10 pUSD in the dedicated Perps balance; during the rollout, access may still require a referral link or code, applied automatically when you open Perps through one.",
  },
];

export const metadata: Metadata = {
  title: "Polymarket Perps — What They Are & How They Work",
  description:
    "Polymarket Perps explained: perpetual futures on indices, crypto and equities with leverage. How they differ from prediction markets, plus fees, hourly funding, margin and liquidation mechanics.",
  alternates: { canonical: "/perps" },
  openGraph: {
    title: "Polymarket Perps Guide | PolymarketFlow",
    description:
      "Perpetual futures on Polymarket: leverage, hourly funding, margin states and liquidation — explained from the official docs.",
  },
};

// Gating page: short ISR window so a perps_live flip propagates fast
// (matches /markets' 300s convention; flag itself is also cached 300s).
export const revalidate = 300;

const CTA_REL = "sponsored nofollow noopener";
const CTA_HREF = "/go/polymarket-perps";

// Base fee tiers per docs.polymarket.com/perps (as of Aug 2026).
const feeTiers = [
  { volume: "$0+", taker: "0.0400%", maker: "0.0125%" },
  { volume: "$1M+", taker: "0.0370%", maker: "0.0100%" },
  { volume: "$25M+", taker: "0.0300%", maker: "0.0050%" },
  { volume: "$1B+", taker: "0.0200%", maker: "-0.0050%" },
];

export default async function PerpsPage() {
  const live = await isPerpsLive();

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://polymarketflow.com" },
          { name: "Perps", url: "https://polymarketflow.com/perps" },
        ]}
      />
      <FAQSchema items={FAQ_ITEMS} />

      {/* Hero */}
      <div className="terminal-card p-8 sm:p-10 mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-primary/10 text-primary mb-4">
          <Rocket className="h-3 w-3" /> {live ? "Now Live — launched Sept 3, 2026" : "Coming Soon"}
        </span>
        <h1 className="text-3xl font-bold mb-3">Polymarket Perps</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
          Perpetual futures on indices, commodities, crypto and equities — long or short,
          with leverage, no expiry date. Here&apos;s how they work, what they cost, and how
          they differ from the prediction markets you already know.
        </p>

        {live ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={CTA_HREF}
              target="_blank"
              rel={CTA_REL}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              <Zap className="h-4 w-4" /> Start Trading Perps
            </a>
            <Link
              href="/perps/markets"
              className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border font-medium hover:bg-accent transition-colors"
            >
              <LineChart className="h-4 w-4" /> Live Perps Markets
            </Link>
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <p className="text-sm font-semibold mb-3">
              Coming soon — Perps coverage, guides and tools are on the way.
            </p>
            <PerpsNotifyForm />
            <p className="text-[10px] text-muted-foreground mt-2">
              Free. One email when it ships, plus the launch guides. Unsubscribe anytime.
            </p>
          </div>
        )}
      </div>

      {/* What are Perps */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">What are Polymarket Perps?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mb-6">
          Perps (perpetual futures) are contracts that track an underlying asset — an index,
          commodity, crypto asset or equity — and trade continuously with{" "}
          <strong className="text-foreground">no expiry or resolution date</strong>. Instead of
          betting on an outcome, you take a leveraged long or short position on price itself,
          collateralized in pUSD (minimum 10 pUSD deposit). An hourly funding mechanism keeps
          the contract price anchored to the underlying&apos;s index price.
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="terminal-card p-5">
            <InfinityIcon className="h-5 w-5 text-primary mb-2" />
            <h3 className="text-sm font-semibold mb-1">No expiry</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Positions run until you close them — or until margin runs out. No event, no
              resolution, no settlement date.
            </p>
          </div>
          <div className="terminal-card p-5">
            <Gauge className="h-5 w-5 text-primary mb-2" />
            <h3 className="text-sm font-semibold mb-1">Leverage, long or short</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Control more notional than your collateral, in either direction. Max leverage is
              set per market (up to 20x on crypto, index and commodity markets, 10x on single
              stocks, as of Sept 2026).
            </p>
          </div>
          <div className="terminal-card p-5">
            <Clock className="h-5 w-5 text-primary mb-2" />
            <h3 className="text-sm font-semibold mb-1">Hourly funding</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Longs and shorts pay each other every hour to keep the perp near its index price
              — the carrying cost (or yield) of holding.
            </p>
          </div>
        </div>
      </section>

      {/* Perps vs Predictions */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Perps vs Predictions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="terminal-card p-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Prediction Markets
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary">›</span> Binary YES/NO shares priced 0–$1, resolving to $1 or $0 at a known date</li>
              <li className="flex gap-2"><span className="text-primary">›</span> No leverage — max loss is exactly what you paid, only at resolution</li>
              <li className="flex gap-2"><span className="text-primary">›</span> Zero holding cost: park a thesis for months for free</li>
              <li className="flex gap-2"><span className="text-primary">›</span> No liquidation — you can always hold to settlement</li>
              <li className="flex gap-2"><span className="text-primary">›</span> Rewards probability judgment on events</li>
            </ul>
          </div>
          <div className="terminal-card p-6 border-primary/30">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <LineChart className="h-4 w-4 text-primary" /> Perps
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary">›</span> Continuous mark-to-market P&amp;L on price — no resolution, ever</li>
              <li className="flex gap-2"><span className="text-primary">›</span> Leverage up to the market&apos;s cap; margin can be cross or isolated</li>
              <li className="flex gap-2"><span className="text-primary">›</span> Funding accrues hourly — holding has a cost (or a yield)</li>
              <li className="flex gap-2"><span className="text-primary">›</span> Liquidation engine closes you out if equity falls below maintenance margin</li>
              <li className="flex gap-2"><span className="text-primary">›</span> Rewards entries, exits, sizing and risk control</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Mechanics */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-1">Fees, funding &amp; liquidation</h2>
        <p className="text-xs text-muted-foreground mb-4">
          As of September 2026, per{" "}
          <a
            href="https://docs.polymarket.com/perps/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            docs.polymarket.com/perps
          </a>
          . Parameters are per-market and can change — always confirm in the app.
        </p>
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Fees */}
          <div className="terminal-card p-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" /> Trading fees
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Charged per fill on notional (price × quantity), in pUSD. Tiered by trailing
              30-day volume:
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>30d volume</span><span>Taker / Maker</span>
              </div>
              {feeTiers.map((t) => (
                <div key={t.volume} className="flex items-center justify-between text-xs border-t border-border pt-1.5">
                  <span className="text-muted-foreground">{t.volume}</span>
                  <span className="font-mono">{t.taker} / {t.maker}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-3">
              Top tier includes a maker rebate. Liquidation fills pay an extra per-market
              liquidation fee on top of the normal rate.
            </p>
          </div>

          {/* Funding */}
          <div className="terminal-card p-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Funding
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary">›</span> Settles <strong className="text-foreground">every hour</strong>, directly between longs and shorts — no protocol fee</li>
              <li className="flex gap-2"><span className="text-primary">›</span> Perp trading above index → longs pay shorts; below index → shorts pay longs</li>
              <li className="flex gap-2"><span className="text-primary">›</span> Rate built from order-book premium sampling (every 5s) plus a small fixed interest leg; hourly rate capped at ±4%</li>
              <li className="flex gap-2"><span className="text-primary">›</span> Payment scales with notional — at high leverage, persistent funding meaningfully drains equity</li>
            </ul>
          </div>

          {/* Margin & liquidation */}
          <div className="terminal-card p-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" /> Margin &amp; liquidation
            </h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary">›</span> Equity = collateral + unrealized P&amp;L (at mark price) − fees &amp; funding due</li>
              <li className="flex gap-2"><span className="text-primary">›</span> Initial margin = notional ÷ leverage. Maintenance margin = 0.5 ÷ max leverage (2.5% of notional on a 20x market)</li>
              <li className="flex gap-2"><span className="text-primary">›</span> Equity below initial margin → margin call: reduce or deposit only</li>
              <li className="flex gap-2"><span className="text-primary">›</span> Equity below maintenance margin → automatic liquidation via reduce-only orders, with liquidation fees; insurance fund and auto-deleveraging backstop the extremes</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Access + eligibility */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Getting access</h2>
        <div className="terminal-card p-5 border-warning/40 bg-warning/5 mb-4">
          <p className="text-sm leading-relaxed max-w-3xl">
            <strong>Eligibility first:</strong> per Polymarket&apos;s official documentation,
            Perps order placement is <strong>blocked in the United States and Canada</strong>{" "}
            (plus sanctioned jurisdictions) — market data is viewable, but you cannot trade.
            The main platform carries separate restrictions in the UK, Australia and elsewhere.
            If you&apos;re in a restricted region, Perps won&apos;t be tradable for you, and
            circumventing geo-restrictions violates Polymarket&apos;s terms.
          </p>
        </div>
        <div className="terminal-card p-6">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            Perps <strong className="text-foreground">launched broadly on September 3, 2026</strong>{" "}
            (in beta since April). During the rollout, access may still require a valid Perps
            referral link or code — applied automatically when you open Perps through one.
            You&apos;ll need a Polymarket account and at least 10 pUSD to fund the dedicated
            Perps balance.
          </p>
          {live && (
            <a
              href={CTA_HREF}
              target="_blank"
              rel={CTA_REL}
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Get Perps Access <ArrowRight className="h-4 w-4" />
            </a>
          )}
        </div>
      </section>

      {/* Guides + live data */}
      <section className="mb-10">
        <h2 className="text-xl font-bold mb-4">Go deeper</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <Link href="/perps/markets" className="terminal-card p-4 border-primary/30 hover:border-primary/60 transition-colors font-medium">
            📊 Live Perps markets screener — prices, funding, OI →
          </Link>
          <Link href="/blog/polymarket-perps-tutorial" className="terminal-card p-4 hover:border-primary/40 transition-colors">
            The complete Perps tutorial (2026) →
          </Link>
          <Link href="/blog/polymarket-perps-fees" className="terminal-card p-4 hover:border-primary/40 transition-colors">
            Fees explained: full schedule + worked examples →
          </Link>
          <Link href="/blog/polymarket-perps-risk-math" className="terminal-card p-4 hover:border-primary/40 transition-colors">
            Leverage, funding &amp; liquidation: the risk math →
          </Link>
          <Link href="/blog/polymarket-perps-countries" className="terminal-card p-4 hover:border-primary/40 transition-colors">
            Country eligibility: where Perps are available →
          </Link>
          <Link href="/blog/polymarket-perps-vs-hyperliquid" className="terminal-card p-4 hover:border-primary/40 transition-colors">
            Polymarket Perps vs Hyperliquid →
          </Link>
        </div>
      </section>

      {/* Final CTA (live) / notify (coming soon) */}
      {live ? (
        <div className="terminal-card p-8 mb-8 text-center border-primary/30">
          <h2 className="text-xl font-bold mb-2">Ready to trade Perps?</h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-xl mx-auto">
            Start small, use isolated margin while you learn, and know your liquidation
            distance before you click buy.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={CTA_HREF}
              target="_blank"
              rel={CTA_REL}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              <Zap className="h-4 w-4" /> Open Polymarket Perps
            </a>
            <Link
              href="/markets"
              className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border font-medium hover:bg-accent transition-colors"
            >
              Explore Prediction Markets
            </Link>
          </div>
        </div>
      ) : (
        <div className="terminal-card p-8 mb-8 text-center">
          <h2 className="text-xl font-bold mb-2">Be first to our Perps coverage</h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-xl mx-auto">
            Tutorials, risk math and flow intelligence for Polymarket Perps are in the works.
            Leave your email and we&apos;ll send one message when it goes live.
          </p>
          <div className="max-w-lg mx-auto">
            <PerpsNotifyForm />
          </div>
        </div>
      )}

      {/* Risk disclosure — always prominent */}
      <RiskDisclosure />
    </div>
  );
}
