/**
 * /odds/fed-rate-cut — live Fed rate-cut odds from Polymarket's interest-rate markets.
 *
 * Cut-by-meeting ladder, number-of-cuts distribution, year-end rate distribution and
 * hike / emergency-cut odds, all from pmflow.markets (refreshed every 15 minutes).
 * The event slugs are the 2026 series — swap them when Polymarket lists the 2027 set.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { CalendarDays, Percent, TrendingUp } from "lucide-react";
import { cn, formatCompact } from "@/lib/utils";
import { BreadcrumbSchema, FAQSchema } from "@/components/structured-data";
import { DataPagesNav } from "@/components/data-pages-nav";

export const revalidate = 900; // 15 min

export const metadata: Metadata = {
  title: "Fed Rate Cut Odds — Live Prediction Market Probabilities",
  description:
    "Live odds of a Federal Reserve rate cut at the next FOMC meeting, how many cuts traders expect in 2026, and where the fed funds rate ends the year — from Polymarket prediction markets, updated every 15 minutes.",
  alternates: { canonical: "/odds/fed-rate-cut" },
  openGraph: {
    title: "Fed Rate Cut Odds — Live Tracker | PolymarketFlow",
    description: "Real-money prediction-market odds for the next Fed decision and the 2026 rate path.",
  },
};

// Decision day (second day) of each scheduled 2026 FOMC meeting, per the Fed's published calendar.
const FOMC_2026: Record<string, string> = {
  january: "2026-01-28",
  march: "2026-03-18",
  april: "2026-04-29",
  june: "2026-06-17",
  july: "2026-07-29",
  september: "2026-09-16",
  october: "2026-10-28",
  december: "2026-12-09",
};

const SLUGS = {
  cutBy: "fed-rate-cut-by-629",
  count: "how-many-fed-rate-cuts-in-2026",
  yearEnd: "what-will-the-fed-rate-be-at-the-end-of-2026",
  hike: "fed-rate-hike-in-2026",
  emergency: "fed-emergency-rate-cut-before-2027",
};

const FAQ_ITEMS = [
  {
    question: "When is the next Fed meeting?",
    answer:
      "The FOMC's remaining scheduled 2026 meetings conclude on September 16, October 28 and December 9, with the rate decision published at 2:00 p.m. ET on the final day. The odds on this page refresh continuously as each date approaches.",
  },
  {
    question: "What does 'rate cut by the September meeting' mean?",
    answer:
      "It is a cumulative market: it pays out if the Fed has cut at least once at or before that meeting. That is why the probability rises for later meetings — each later date includes every earlier chance to cut.",
  },
  {
    question: "How do these odds compare with CME FedWatch?",
    answer:
      "FedWatch infers probabilities from fed funds futures prices; Polymarket odds come from an order book where traders stake real money on the outcome directly. Both react to the same inflation, jobs and Fed-communication news and usually land close together, but they are different mechanisms and can diverge when a market is thin.",
  },
  {
    question: "Can I trade these markets from the United States?",
    answer:
      "Polymarket's main platform is not available to US residents. Polymarket offers a separate CFTC-regulated US product for event contracts in eligible states; availability depends on your jurisdiction. This page is informational only.",
  },
];

function pmClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "pmflow" },
  });
}

const yesPct = (m: any): number | null =>
  Array.isArray(m?.outcome_prices) && m.outcome_prices.length ? Number(m.outcome_prices[0]) * 100 : null;
// price changes are stored in price units (0.05 = 5 points)
const pts = (x: any): number | null => (x == null ? null : Number(x) * 100);

function fmtDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function Change({ v, suffix }: { v: number | null; suffix: string }) {
  if (v == null) return null;
  return (
    <span className={cn("text-xs font-mono", v >= 0 ? "text-emerald-500" : "text-red-500")}>
      {v >= 0 ? "+" : ""}{v.toFixed(1)} pts {suffix}
    </span>
  );
}

function Bar({ pct }: { pct: number }) {
  return (
    <div className="h-2 rounded bg-muted overflow-hidden">
      <div className="h-full bg-primary rounded" style={{ width: `${Math.min(100, Math.max(1, pct))}%` }} />
    </div>
  );
}

export default async function FedRateCutOddsPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <div className="p-6 text-center text-muted-foreground">Loading odds…</div>;
  }
  const db = pmClient();
  const { data: events } = await db
    .from("events")
    .select("slug, title, volume, markets(question, slug, outcome_prices, volume, one_day_price_change, one_week_price_change)")
    .in("slug", Object.values(SLUGS));

  const bySlug = (s: string) => (events || []).find((e: any) => e.slug === s) as any;
  const today = new Date().toISOString().slice(0, 10);

  // Cumulative "cut by <meeting>" ladder — future meetings only
  const cutBy = ((bySlug(SLUGS.cutBy)?.markets || []) as any[])
    .map((m) => {
      const mm = /by (\w+) 2026 meeting/i.exec(m.question || "");
      const date = mm ? FOMC_2026[mm[1].toLowerCase()] : undefined;
      return { month: mm?.[1] ?? "", date, pct: yesPct(m), d1: pts(m.one_day_price_change), d7: pts(m.one_week_price_change), vol: Number(m.volume || 0) };
    })
    .filter((r) => r.date && r.date >= today && r.pct != null)
    .sort((a, b) => a.date!.localeCompare(b.date!));
  const next = cutBy[0] ?? null;

  const counts = ((bySlug(SLUGS.count)?.markets || []) as any[])
    .map((m) => {
      const q: string = m.question || "";
      let n: number | null = null;
      let label = "";
      const more = /(\d+) or more/i.exec(q);
      const exact = /Will (\d+) Fed rate cut/i.exec(q);
      if (/^Will no Fed/i.test(q)) { n = 0; label = "No cuts"; }
      else if (more) { n = Number(more[1]); label = `${n}+ cuts`; }
      else if (exact) { n = Number(exact[1]); label = n === 1 ? "1 cut" : `${n} cuts`; }
      return { n, label, pct: yesPct(m), d7: pts(m.one_week_price_change) };
    })
    .filter((r) => r.n != null && r.pct != null)
    .sort((a, b) => a.n! - b.n!);

  const yearEnd = ((bySlug(SLUGS.yearEnd)?.markets || []) as any[])
    .map((m) => {
      const mm = /be\s*(≥|≤)?\s*([\d.]+)%/.exec(m.question || "");
      if (!mm) return null;
      const rate = Number(mm[2]);
      const sym = mm[1] || "";
      return {
        label: `${sym === "≥" ? "≥ " : sym === "≤" ? "≤ " : ""}${rate.toFixed(2)}%`,
        sort: rate + (sym === "≥" ? 0.001 : sym === "≤" ? -0.001 : 0),
        pct: yesPct(m),
        d7: pts(m.one_week_price_change),
      };
    })
    .filter((r): r is NonNullable<typeof r> => !!r && r.pct != null)
    .sort((a, b) => b.sort - a.sort);

  const hikeMkt = ((bySlug(SLUGS.hike)?.markets || []) as any[])[0];
  const hike = yesPct(hikeMkt);
  const hikeD7 = pts(hikeMkt?.one_week_price_change);
  const emergency = yesPct(((bySlug(SLUGS.emergency)?.markets || []) as any[])[0]);

  const likelyCount = counts.reduce<(typeof counts)[number] | null>((b, r) => (!b || r.pct! > b.pct! ? r : b), null);
  const likelyRate = yearEnd.reduce<(typeof yearEnd)[number] | null>((b, r) => (!b || r.pct! > b.pct! ? r : b), null);
  const totalVol = (events || []).reduce((s: number, e: any) => s + Number(e.volume || 0), 0);
  const now = new Date();

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://polymarketflow.com" },
          { name: "Odds", url: "https://polymarketflow.com/odds" },
          { name: "Fed Rate Cut", url: "https://polymarketflow.com/odds/fed-rate-cut" },
        ]}
      />
      <FAQSchema items={FAQ_ITEMS} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Percent className="h-6 w-6 text-primary" />
          Fed Rate Cut Odds — Live Tracker
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          What real-money traders on Polymarket expect from the Federal Reserve: the odds of a cut at each
          remaining 2026 meeting, how many cuts this year, and where the fed funds rate finishes December.
          {totalVol > 0 && <> {formatCompact(totalVol)} traded across these markets.</>} Updated ~every 15
          minutes (last build {now.toISOString().slice(0, 16).replace("T", " ")} UTC).
        </p>
      </div>

      {/* Headline cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="terminal-card p-5">
          <h2 className="text-sm font-semibold mb-3">
            Rate cut by the {next ? `${next.month} ${fmtDate(next.date!)}` : "next"} meeting
          </h2>
          {next ? (
            <>
              <p className="text-3xl font-bold font-mono">{next.pct!.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">chance of at least one cut by then</p>
              <p className="mt-1 flex gap-3"><Change v={next.d1} suffix="today" /><Change v={next.d7} suffix="7d" /></p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No scheduled 2026 meeting remaining in this series.</p>
          )}
        </div>
        <div className="terminal-card p-5">
          <h2 className="text-sm font-semibold mb-3">Most likely number of cuts in 2026</h2>
          {likelyCount ? (
            <>
              <p className="text-3xl font-bold font-mono">{likelyCount.label}</p>
              <p className="text-sm text-muted-foreground">{likelyCount.pct!.toFixed(0)}% probability</p>
              <p className="mt-1"><Change v={likelyCount.d7} suffix="7d" /></p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Odds loading…</p>
          )}
        </div>
        <div className="terminal-card p-5">
          <h2 className="text-sm font-semibold mb-3">Rate hike in 2026?</h2>
          {hike != null ? (
            <>
              <p className="text-3xl font-bold font-mono">{hike.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">
                chance of a hike this year{emergency != null && <> · emergency cut before 2027: {emergency.toFixed(0)}%</>}
              </p>
              <p className="mt-1"><Change v={hikeD7} suffix="7d" /></p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Odds loading…</p>
          )}
        </div>
      </div>

      {/* Cut-by ladder */}
      <div className="terminal-card p-5 mb-8">
        <h2 className="text-sm font-semibold mb-1 flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Remaining 2026 FOMC meetings — chance of a cut by each</h2>
        <p className="text-xs text-muted-foreground mb-4">Cumulative: each row counts every earlier chance to cut as well.</p>
        {cutBy.length > 0 ? (
          <div className="space-y-3">
            {cutBy.map((r) => (
              <div key={r.month} className="grid grid-cols-[110px_1fr_64px_90px] items-center gap-3 text-sm">
                <span className="font-medium">{r.month} {fmtDate(r.date!)}</span>
                <Bar pct={r.pct!} />
                <span className="font-mono font-semibold text-right">{r.pct!.toFixed(0)}%</span>
                <span className="text-right"><Change v={r.d7} suffix="7d" /></span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Meeting-by-meeting odds are temporarily unavailable.</p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-8">
        {/* Number of cuts */}
        <div className="terminal-card p-5">
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> How many Fed rate cuts in 2026?</h2>
          <p className="text-xs text-muted-foreground mb-4">Probability of each total for the calendar year.</p>
          <div className="space-y-2.5">
            {counts.map((r) => (
              <div key={r.label} className="grid grid-cols-[80px_1fr_56px] items-center gap-3 text-sm">
                <span>{r.label}</span>
                <Bar pct={r.pct!} />
                <span className="font-mono text-right">{r.pct! < 1 ? "<1" : r.pct!.toFixed(0)}%</span>
              </div>
            ))}
            {counts.length === 0 && <p className="text-sm text-muted-foreground">Temporarily unavailable.</p>}
          </div>
        </div>

        {/* Year-end rate */}
        <div className="terminal-card p-5">
          <h2 className="text-sm font-semibold mb-1 flex items-center gap-2"><Percent className="h-4 w-4 text-primary" /> Fed funds rate at the end of 2026 (upper bound)</h2>
          <p className="text-xs text-muted-foreground mb-4">
            {likelyRate ? <>Most likely: <span className="font-mono font-semibold text-foreground">{likelyRate.label}</span> at {likelyRate.pct!.toFixed(0)}%.</> : "Probability of each target-range upper bound."}
          </p>
          <div className="space-y-2.5">
            {yearEnd.map((r) => (
              <div key={r.label} className="grid grid-cols-[80px_1fr_56px] items-center gap-3 text-sm">
                <span className="font-mono">{r.label}</span>
                <Bar pct={r.pct!} />
                <span className="font-mono text-right">{r.pct! < 1 ? "<1" : r.pct!.toFixed(0)}%</span>
              </div>
            ))}
            {yearEnd.length === 0 && <p className="text-sm text-muted-foreground">Temporarily unavailable.</p>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm mb-8">
        <Link href={`/market/${SLUGS.count}`} className="terminal-card px-4 py-3 hover:border-primary/40 transition-colors">Cuts-in-2026 market + chart →</Link>
        <Link href={`/market/${SLUGS.yearEnd}`} className="terminal-card px-4 py-3 hover:border-primary/40 transition-colors">Year-end rate market →</Link>
        <Link href={`/market/${SLUGS.hike}`} className="terminal-card px-4 py-3 hover:border-primary/40 transition-colors">Rate-hike market →</Link>
        <Link href="/predictions/economics" className="terminal-card px-4 py-3 hover:border-primary/40 transition-colors">All economics markets →</Link>
      </div>

      {/* Email capture */}
      <div className="terminal-card p-5 mb-8 max-w-xl mx-auto text-center">
        <h2 className="text-sm font-bold mb-1">Get Fed odds moves in your inbox</h2>
        <p className="text-xs text-muted-foreground mb-3">Daily digest of the biggest prediction-market swings. Free, unsubscribe anytime.</p>
        <form action="/api/subscribe" method="POST" className="flex gap-2 max-w-sm mx-auto">
          <input type="hidden" name="source" value="odds-fed" />
          <input type="hidden" name="next" value="/odds/fed-rate-cut" />
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

      <DataPagesNav current="/odds/fed-rate-cut" />

      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-3xl">
        Probabilities are Polymarket &quot;Yes&quot; prices on each market, shown for information only — not a
        forecast, endorsement or advice. Markets can be thin; the volume figure above indicates how much
        money stands behind them. Meeting dates follow the Federal Reserve&apos;s published 2026 calendar.
        Trading availability depends on your jurisdiction. We may earn a commission when you sign up
        through links on this site.
      </p>
    </div>
  );
}
