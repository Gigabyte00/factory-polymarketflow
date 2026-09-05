/**
 * /odds/2026-midterms — live 2026 midterm election odds tracker.
 *
 * Headline control-of-Congress odds + every active Senate/House/Governor
 * race market, straight from our ingested Polymarket dataset (pmflow.markets),
 * refreshed every 15 minutes. Evergreen SEO data page through Nov 3, 2026.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { Landmark, TrendingUp } from "lucide-react";
import { cn, formatCompact } from "@/lib/utils";
import { BreadcrumbSchema, FAQSchema } from "@/components/structured-data";
import { DataPagesNav } from "@/components/data-pages-nav";

export const revalidate = 900; // 15 min

export const metadata: Metadata = {
  title: "2026 Midterm Election Odds — Live Prediction Market Tracker",
  description:
    "Live 2026 midterm odds from Polymarket prediction markets: who controls the House and Senate, balance of power, and state-by-state race odds — updated every 15 minutes with 24h and 7-day movement.",
  alternates: { canonical: "/odds/2026-midterms" },
  openGraph: {
    title: "2026 Midterm Election Odds — Live Tracker | PolymarketFlow",
    description: "Real-money prediction-market odds for the 2026 midterms, updated continuously.",
  },
};

const FAQ_ITEMS = [
  {
    question: "What do these 2026 midterm odds mean?",
    answer:
      "Each percentage is the live price of that outcome on Polymarket's prediction markets — the probability real-money traders collectively assign right now. A 65% price means the market prices roughly a 65% chance. Odds update continuously; this page refreshes about every 15 minutes.",
  },
  {
    question: "Are prediction markets accurate for elections?",
    answer:
      "Research on prediction markets has generally found them competitive with — and often faster-moving than — polling averages, because traders put money behind new information immediately. They are not infallible: markets have mispriced races before, and thin markets move on small volume.",
  },
  {
    question: "When do the 2026 midterm markets resolve?",
    answer:
      "Election Day is November 3, 2026. The control-of-Congress markets on this page list that as their end date, resolving once results are certified per each market's resolution rules.",
  },
  {
    question: "Where does this data come from?",
    answer:
      "From Polymarket's public market data, which we ingest and refresh continuously. We show mid prices for the leading outcome, 24-hour and 7-day movement, and trading volume so you can judge how liquid each signal is.",
  },
];

const HEADLINE_SLUGS = [
  "which-party-will-win-the-house-in-2026",
  "which-party-will-win-the-senate-in-2026",
  "balance-of-power-2026-midterms",
];

function pmClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "pmflow" },
  });
}

export default async function Midterms2026Page() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <div className="p-6 text-center text-muted-foreground">Loading odds…</div>;
  }
  const db = pmClient();

  const { data: headlineEvents } = await db
    .from("events")
    .select("slug, title, markets(question, slug, outcomes, outcome_prices, one_day_price_change, one_week_price_change, volume)")
    .in("slug", HEADLINE_SLUGS);

  const { data: raceEvents } = await db
    .from("events")
    .select("slug, title, volume, end_date, markets(question, slug, outcomes, outcome_prices, one_day_price_change, volume)")
    .eq("active", true)
    .eq("category", "Politics")
    .or("title.ilike.%senate%,title.ilike.%house%,title.ilike.%governor%,title.ilike.%midterm%")
    .order("volume", { ascending: false, nullsFirst: false })
    .limit(30);

  const now = new Date();

  // "Will the Democratic Party control the House after…?" → "Democratic Party";
  // "2026 Balance of Power: R Senate, R House" → "R Senate, R House"
  const shortLabel = (q: string) => {
    if (/balance of power:/i.test(q)) return q.split(":").slice(1).join(":").trim();
    let s = (q || "").replace(/^Will\s+(the\s+)?/i, "").replace(/\?$/, "");
    const cut = s.search(/\s+(control|win|be)\s+/i);
    if (cut > 0) s = s.slice(0, cut);
    return s.length > 30 ? `${s.slice(0, 29)}…` : s;
  };
  const pts = (x: any) => (x == null ? null : Number(x) * 100); // stored in price units (0.05 = 5 points)

  // Leading outcome: for a single-market event the higher-priced side; for a
  // multi-outcome event the market with the highest Yes price (0-volume placeholders ignored)
  const lead = (markets: any[]) => {
    const ms = (markets || []).filter((m) => Array.isArray(m.outcome_prices) && m.outcome_prices.length > 0);
    if (ms.length === 0) return null;
    if (ms.length === 1) {
      const m = ms[0];
      let idx = 0;
      for (let i = 1; i < m.outcome_prices.length; i++) if (Number(m.outcome_prices[i]) > Number(m.outcome_prices[idx])) idx = i;
      return { market: m, outcome: Array.isArray(m.outcomes) ? m.outcomes[idx] ?? "Yes" : "Yes", pct: Number(m.outcome_prices[idx]) * 100, d1: pts(m.one_day_price_change) };
    }
    const real = ms.filter((m) => Number(m.volume || 0) > 0);
    const pool = real.length ? real : ms;
    const m = pool.reduce((b, x) => (Number(x.outcome_prices[0]) > Number(b.outcome_prices[0]) ? x : b), pool[0]);
    return { market: m, outcome: shortLabel(m.question || ""), pct: Number(m.outcome_prices[0]) * 100, d1: pts(m.one_day_price_change) };
  };

  const headlines = HEADLINE_SLUGS
    .map((slug) => (headlineEvents || []).find((e: any) => e.slug === slug))
    .filter(Boolean) as any[];

  const races = (raceEvents || []).filter((e: any) => !HEADLINE_SLUGS.includes(e.slug));

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://polymarketflow.com" },
          { name: "Odds", url: "https://polymarketflow.com/odds" },
          { name: "2026 Midterms", url: "https://polymarketflow.com/odds/2026-midterms" },
        ]}
      />
      <FAQSchema items={FAQ_ITEMS} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" />
          2026 Midterm Election Odds — Live Tracker
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          Real-money prediction-market odds for control of Congress and every major 2026 race,
          from Polymarket data we refresh continuously. Election Day: November 3, 2026. Page
          updated ~every 15 minutes (last build {now.toISOString().slice(0, 16).replace("T", " ")} UTC).
        </p>
      </div>

      {/* Headline control markets */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {headlines.map((e: any) => {
          const l = lead(e.markets);
          return (
            <div key={e.slug} className="terminal-card p-5">
              <h2 className="text-sm font-semibold mb-3">{e.title}</h2>
              {l ? (
                <>
                  <p className="text-3xl font-bold font-mono">{l.pct.toFixed(0)}%</p>
                  <p className="text-sm text-muted-foreground">{l.outcome}</p>
                  <p className={cn("text-xs font-mono mt-1", (l.d1 ?? 0) >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {l.d1 == null ? "" : `${l.d1 >= 0 ? "+" : ""}${l.d1.toFixed(1)}% today`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Odds loading…</p>
              )}
              <Link href={`/market/${e.slug}`} className="text-xs text-primary hover:underline mt-3 inline-block">
                Full market + chart →
              </Link>
            </div>
          );
        })}
      </div>

      {/* Race table */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold">Every tracked 2026 race</h2>
        <span className="text-[11px] text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> sorted by volume</span>
      </div>
      <div className="terminal-card overflow-x-auto mb-8">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2.5 text-left font-semibold">Race / market</th>
              <th className="px-3 py-2.5 text-right font-semibold">Leader</th>
              <th className="px-3 py-2.5 text-right font-semibold">Odds</th>
              <th className="px-3 py-2.5 text-right font-semibold">24h</th>
              <th className="px-3 py-2.5 text-right font-semibold">Volume</th>
            </tr>
          </thead>
          <tbody>
            {races.map((e: any) => {
              const l = lead(e.markets);
              if (!l) return null;
              return (
                <tr key={e.slug} className="border-b border-border/50 last:border-0 hover:bg-accent/30">
                  <td className="px-3 py-2.5">
                    <Link href={`/market/${e.slug}`} className="hover:text-primary transition-colors">{e.title}</Link>
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">{String(l.outcome).slice(0, 24)}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold">{l.pct.toFixed(0)}%</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono", (l.d1 ?? 0) >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {l.d1 == null ? "—" : `${l.d1 >= 0 ? "+" : ""}${l.d1.toFixed(1)}%`}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">{formatCompact(e.volume || 0)}</td>
                </tr>
              );
            })}
            {races.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Race data is temporarily unavailable — refresh shortly.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Email capture */}
      <div className="terminal-card p-5 mb-8 max-w-xl mx-auto text-center">
        <h2 className="text-sm font-bold mb-1">Get midterm odds moves in your inbox</h2>
        <p className="text-xs text-muted-foreground mb-3">Daily digest of the biggest prediction-market swings. Free, unsubscribe anytime.</p>
        <form action="/api/subscribe" method="POST" className="flex gap-2 max-w-sm mx-auto">
          <input type="hidden" name="source" value="odds-midterms" />
          <input type="hidden" name="next" value="/odds/2026-midterms" />
          <input type="email" name="email" placeholder="you@email.com" required className="flex-1 px-3 py-2 rounded-md bg-background border border-border text-xs focus:ring-1 focus:ring-primary focus:border-primary" />
          <button type="submit" className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">Subscribe</button>
        </form>
      </div>

      {/* FAQ */}
      <div className="mb-8 max-w-3xl">
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

      <DataPagesNav current="/odds/2026-midterms" />

      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-3xl">
        Odds are Polymarket market prices (leading outcome of each event&apos;s highest-volume market),
        shown for information only — not a prediction, endorsement or advice. Markets can be thin;
        check volume before treating a price as a strong signal. Availability of trading depends on
        your jurisdiction (US residents: see the separate, CFTC-regulated Polymarket US product).
        We may earn a commission when you sign up through links on this site.
      </p>
    </div>
  );
}
