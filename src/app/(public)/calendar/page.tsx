/**
 * /calendar — Polymarket resolution calendar.
 *
 * Every active market in our dataset whose listed end date falls in the next 31 days,
 * grouped by UTC day and by event, with the current leader and volume. ISR 15 min.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { CalendarDays } from "lucide-react";
import { cn, formatCompact } from "@/lib/utils";
import { BreadcrumbSchema, FAQSchema } from "@/components/structured-data";
import { DataPagesNav } from "@/components/data-pages-nav";

export const revalidate = 900; // 15 min

export const metadata: Metadata = {
  title: "Polymarket Resolution Calendar — What Resolves This Week & Month",
  description:
    "Calendar of Polymarket markets ending in the next 31 days: elections, Fed decisions, sports finals, crypto deadlines and more, grouped by day with the current leader and volume. Updated every 15 minutes.",
  alternates: { canonical: "/calendar" },
  openGraph: {
    title: "Polymarket Resolution Calendar | PolymarketFlow",
    description: "Which prediction markets resolve this week and this month — with live leaders and volume.",
  },
};

const FAQ_ITEMS = [
  {
    question: "What does it mean for a Polymarket market to resolve?",
    answer:
      "Resolution is when a market's outcome is determined and winning shares redeem for $1 each. The dates here are each market's listed end date; actual resolution can come earlier if the outcome is already known, or later if the event is delayed or disputed, per that market's rules.",
  },
  {
    question: "Are all Polymarket markets on this calendar?",
    answer:
      "It lists the active markets in our dataset whose end date falls in the next 31 days. Markets with far-off or open-ended resolution (many 'by end of year' markets, for example) appear only once they enter the window.",
  },
  {
    question: "What time zone are the dates in?",
    answer:
      "Polymarket lists end dates in UTC and we group by that UTC date. A market ending 'September 8' typically stops trading late on September 7 in US time zones.",
  },
  {
    question: "How often is this page updated?",
    answer: "About every 15 minutes, from Polymarket market data that we ingest continuously.",
  },
];

type Mk = {
  question: string;
  slug: string;
  end_date: string;
  volume: number | null;
  outcome_prices: unknown;
  events: { slug: string; title: string; category: string | null } | null;
};

type EventGroup = {
  title: string;
  slug: string;
  category: string | null;
  vol: number;
  n: number;
  lead: { pct: number; q: string } | null;
};

function pmClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "pmflow" },
  });
}

function dayLabel(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function bucketOf(d: string, today: string) {
  const diff = Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5);
  return diff < 7 ? "This week" : diff < 14 ? "Next week" : "Later this month";
}

function shortQuestion(q: string) {
  const s = q.replace(/^Will\s+/i, "").replace(/\?$/, "");
  return s.length > 64 ? `${s.slice(0, 61)}…` : s;
}

export default async function CalendarPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <div className="p-6 text-center text-muted-foreground">Loading calendar…</div>;
  }
  const db = pmClient();
  const now = new Date();
  const until = new Date(now.getTime() + 31 * 864e5);

  const { data } = await db
    .from("markets")
    .select("question, slug, end_date, volume, outcome_prices, events(slug, title, category)")
    .eq("active", true)
    .gte("end_date", now.toISOString())
    .lt("end_date", until.toISOString())
    .order("end_date", { ascending: true })
    .order("volume", { ascending: false, nullsFirst: false })
    .limit(600);

  const today = now.toISOString().slice(0, 10);
  const days = new Map<string, Map<string, EventGroup>>();
  let totalMarkets = 0;
  for (const m of ((data || []) as unknown) as Mk[]) {
    const day = String(m.end_date).slice(0, 10);
    const ev = m.events;
    const key = ev?.slug || m.slug;
    if (!days.has(day)) days.set(day, new Map());
    const g = days.get(day)!;
    const prices = m.outcome_prices;
    const yes = Array.isArray(prices) && prices.length ? Number(prices[0]) * 100 : null;
    const cur = g.get(key) ?? { title: ev?.title || m.question, slug: key, category: ev?.category ?? null, vol: 0, n: 0, lead: null };
    cur.vol += Number(m.volume || 0);
    cur.n += 1;
    if (yes != null && (!cur.lead || yes > cur.lead.pct)) cur.lead = { pct: yes, q: m.question };
    g.set(key, cur);
    totalMarkets += 1;
  }
  const dayKeys = [...days.keys()].sort();

  let lastBucket = "";

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://polymarketflow.com" },
          { name: "Calendar", url: "https://polymarketflow.com/calendar" },
        ]}
      />
      <FAQSchema items={FAQ_ITEMS} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Polymarket Resolution Calendar
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          {totalMarkets} markets across {dayKeys.length} days are scheduled to resolve in the next 31 days.
          Grouped by end date (UTC) and event, with the current leader and total volume. Updated ~every 15
          minutes (last build {now.toISOString().slice(0, 16).replace("T", " ")} UTC).
        </p>
      </div>

      {dayKeys.length === 0 && (
        <div className="terminal-card p-8 text-center text-muted-foreground mb-8">Calendar data is temporarily unavailable — refresh shortly.</div>
      )}

      <div className="space-y-6 mb-8">
        {dayKeys.map((d) => {
          const bucket = bucketOf(d, today);
          const showBucket = bucket !== lastBucket;
          lastBucket = bucket;
          const groups = [...days.get(d)!.values()].sort((a, b) => b.vol - a.vol);
          const dayVol = groups.reduce((s, g) => s + g.vol, 0);
          return (
            <div key={d}>
              {showBucket && <h2 className="text-lg font-bold mb-3 mt-2">{bucket}</h2>}
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="text-sm font-semibold">{dayLabel(d)}</h3>
                <span className="text-[11px] text-muted-foreground">{groups.length} events · {formatCompact(dayVol)} volume</span>
              </div>
              <div className="terminal-card divide-y divide-border/50">
                {groups.map((g) => (
                  <Link key={g.slug} href={`/market/${g.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{g.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {g.category && <span className="uppercase tracking-wider mr-2">{g.category}</span>}
                        {g.n > 1 ? `${g.n} markets` : "1 market"}
                        {g.lead && (
                          <> · {g.n > 1 ? `leader ${g.lead.pct.toFixed(0)}%: ${shortQuestion(g.lead.q)}` : `Yes ${g.lead.pct.toFixed(0)}%`}</>
                        )}
                      </p>
                    </div>
                    <span className={cn("text-xs font-mono flex-shrink-0", g.vol >= 1_000_000 ? "text-primary" : "text-muted-foreground")}>{formatCompact(g.vol)}</span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Email capture */}
      <div className="terminal-card p-5 mb-8 max-w-xl mx-auto text-center">
        <h2 className="text-sm font-bold mb-1">Never miss a resolution</h2>
        <p className="text-xs text-muted-foreground mb-3">Daily digest of what resolved, what moved and what&apos;s next. Free, unsubscribe anytime.</p>
        <form action="/api/subscribe" method="POST" className="flex gap-2 max-w-sm mx-auto">
          <input type="hidden" name="source" value="calendar" />
          <input type="hidden" name="next" value="/calendar" />
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

      <DataPagesNav current="/calendar" />

      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-3xl">
        End dates and prices are Polymarket market data shown for information only — not advice. A listed
        end date is not a guarantee of when a market resolves; each market&apos;s own rules govern. Trading
        availability depends on your jurisdiction. We may earn a commission when you sign up through links
        on this site.
      </p>
    </div>
  );
}
