/**
 * /biggest-polymarket-bets — the largest whale bets on Polymarket, live.
 *
 * Two tables from our holder/activity dataset via pmflow.biggest_open_positions and
 * pmflow.biggest_whale_moves: value-weighted (shares × price), one row per wallet ×
 * market, with parked capital (price ≥ 95¢) and complete-set positions filtered out.
 * ISR 15 min.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { Trophy, TrendingUp, Users } from "lucide-react";
import { cn, formatCompact, formatRelativeTime, truncateAddress } from "@/lib/utils";
import { BreadcrumbSchema, FAQSchema } from "@/components/structured-data";
import { DataPagesNav } from "@/components/data-pages-nav";

export const revalidate = 900; // 15 min

export const metadata: Metadata = {
  title: "Biggest Polymarket Bets — Largest Whale Positions Live",
  description:
    "The biggest bets on Polymarket right now: the largest whale positions by dollars at risk and the biggest new bets this week, with market, side, price and potential payout. Updated every 15 minutes.",
  alternates: { canonical: "/biggest-polymarket-bets" },
  openGraph: {
    title: "Biggest Polymarket Bets — Live | PolymarketFlow",
    description: "Largest whale positions and the biggest new bets this week, from live Polymarket holder data.",
  },
};

type Row = {
  wallet_address: string;
  display_name: string | null;
  side: "YES" | "NO";
  shares: number;
  price: number;
  est_value_usd: number;
  payout_if_right: number;
  detected_at?: string;
  snapshot_at?: string;
  market_id: string;
  question: string;
  market_slug: string;
  event_slug: string | null;
  event_title: string | null;
  smart_money_score: number | null;
};

function pmClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    db: { schema: "pmflow" },
  });
}

function traderName(r: Row) {
  return r.display_name || truncateAddress(r.wallet_address);
}

function BetsTable({ rows, whenKey }: { rows: Row[]; whenKey: "detected_at" | "snapshot_at" }) {
  return (
    <div className="terminal-card overflow-x-auto">
      <table className="w-full min-w-[780px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2.5 text-left font-semibold w-8">#</th>
            <th className="px-3 py-2.5 text-left font-semibold">Trader</th>
            <th className="px-3 py-2.5 text-left font-semibold">Bet</th>
            <th className="px-3 py-2.5 text-right font-semibold">Price</th>
            <th className="px-3 py-2.5 text-right font-semibold">At risk</th>
            <th className="px-3 py-2.5 text-right font-semibold">Pays if right</th>
            <th className="px-3 py-2.5 text-right font-semibold">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.wallet_address}-${r.market_id}`} className="border-b border-border/50 last:border-0 hover:bg-accent/30">
              <td className="px-3 py-2.5 font-mono text-muted-foreground">{i + 1}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <Link href={`/trader/${r.wallet_address}`} className="hover:text-primary transition-colors font-medium">{traderName(r)}</Link>
                {r.smart_money_score != null && r.smart_money_score > 0 && (
                  <span className="ml-2 text-[10px] font-mono text-primary">SMS {r.smart_money_score}</span>
                )}
              </td>
              <td className="px-3 py-2.5 max-w-[340px]">
                <span className={cn("font-mono text-xs font-semibold mr-2", r.side === "YES" ? "text-profit" : "text-loss")}>{r.side}</span>
                <Link href={`/market/${r.event_slug || r.market_slug}`} className="hover:text-primary transition-colors">{r.question}</Link>
              </td>
              <td className="px-3 py-2.5 text-right font-mono">{(Number(r.price) * 100).toFixed(1)}¢</td>
              <td className="px-3 py-2.5 text-right font-mono font-semibold">{formatCompact(Number(r.est_value_usd))}</td>
              <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">{formatCompact(Number(r.payout_if_right))}</td>
              <td className="px-3 py-2.5 text-right text-xs text-muted-foreground whitespace-nowrap">{formatRelativeTime(r[whenKey] as string)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Data is temporarily unavailable — refresh shortly.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function BiggestBetsPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <div className="p-6 text-center text-muted-foreground">Loading…</div>;
  }
  const db = pmClient();
  const [{ data: movesRaw }, { data: positionsRaw }] = await Promise.all([
    db.rpc("biggest_whale_moves", { p_days: 7, p_limit: 20 }),
    db.rpc("biggest_open_positions", { p_days: 2, p_limit: 20 }),
  ]);
  const moves = (movesRaw || []) as Row[];
  const positions = (positionsRaw || []) as Row[];
  const top = positions[0] ?? null;
  const longShot = positions.reduce<Row | null>((b, r) => (!b || Number(r.price) < Number(b.price) ? r : b), null);
  // Detection restarted on 2026-09-05 when coverage moved to today's top markets, so for
  // about a week every tracked position reads as "new" — don't ship a duplicate table.
  const overlap = moves.filter((m) => positions.some((p) => p.wallet_address === m.wallet_address && p.market_id === m.market_id)).length;
  const movesDistinct = moves.length > 0 && overlap / moves.length < 0.8;
  const now = new Date();

  const FAQ_ITEMS = [
    {
      question: "Who has the biggest bet on Polymarket right now?",
      answer: top
        ? `In our latest holder snapshot the largest open directional position is ${traderName(top)}'s ${top.side} position on "${top.question}" — about ${formatCompact(Number(top.est_value_usd))} at risk at ${(Number(top.price) * 100).toFixed(0)}¢, paying roughly ${formatCompact(Number(top.payout_if_right))} if it wins. The table above updates every 15 minutes, so this changes.`
        : "The table above shows the largest open directional positions in our latest holder snapshot, updated every 15 minutes.",
    },
    {
      question: "What is the biggest bet ever placed on Polymarket?",
      answer:
        "The most widely reported is the pseudonymous French trader known as \"Théo\", who The Wall Street Journal reported in late 2024 had staked more than $30 million on Donald Trump winning the 2024 election across several accounts — a position that paid out when Trump won. The tables on this page track today's largest open positions rather than historical records.",
    },
    {
      question: "Are the amounts in dollars?",
      answer:
        "Polymarket positions are counted in shares, and each winning share redeems for $1. \"At risk\" is shares × the current price — roughly what the position is worth today. \"Pays if right\" is the full redemption value (shares × $1). A 12-million-share YES position at 9¢ is about $1.1M at risk and pays about $12M if it wins.",
    },
    {
      question: "Why don't I see the huge 99¢ positions?",
      answer:
        "We deliberately filter out positions priced at 95¢ or more and identical-size positions spread across every outcome of one event. Those are parked capital, market-making or complete sets — near-riskless holdings, not directional bets — and they would otherwise dominate every ranking.",
    },
    {
      question: "Should I copy these bets?",
      answer:
        "No page can tell you that. Whales lose too, and a large position can be a hedge against something you can't see. Use this as a map of where conviction money sits, check the market's volume and rules, and remember trading availability depends on your jurisdiction.",
    },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://polymarketflow.com" },
          { name: "Biggest Bets", url: "https://polymarketflow.com/biggest-polymarket-bets" },
        ]}
      />
      <FAQSchema items={FAQ_ITEMS} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          Biggest Polymarket Bets — Live
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          The largest directional positions whales hold right now and the biggest new bets of the past
          seven days, valued at current prices from the holder data we snapshot hourly across Polymarket&apos;s
          highest-volume markets. Updated ~every 15 minutes (last build {now.toISOString().slice(0, 16).replace("T", " ")} UTC).
        </p>
      </div>

      {/* Headline stats */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="terminal-card p-5">
          <h2 className="text-sm font-semibold mb-2">Largest open position</h2>
          {top ? (
            <>
              <p className="text-3xl font-bold font-mono">{formatCompact(Number(top.est_value_usd))}</p>
              <p className="text-sm text-muted-foreground truncate">{traderName(top)} · {top.side} · {top.question}</p>
            </>
          ) : <p className="text-sm text-muted-foreground">Loading…</p>}
        </div>
        <div className="terminal-card p-5">
          <h2 className="text-sm font-semibold mb-2">Best payout multiple in the top 20</h2>
          {longShot ? (
            <>
              <p className="text-3xl font-bold font-mono">{(1 / Number(longShot.price)).toFixed(1)}×</p>
              <p className="text-sm text-muted-foreground truncate">
                {traderName(longShot)} · {formatCompact(Number(longShot.est_value_usd))} at risk pays {formatCompact(Number(longShot.payout_if_right))} · {longShot.side} · {longShot.question}
              </p>
            </>
          ) : <p className="text-sm text-muted-foreground">Loading…</p>}
        </div>
        <div className="terminal-card p-5">
          <h2 className="text-sm font-semibold mb-2">Money at risk, top 20 positions</h2>
          <p className="text-3xl font-bold font-mono">{formatCompact(positions.reduce((s, r) => s + Number(r.est_value_usd || 0), 0))}</p>
          <p className="text-sm text-muted-foreground">would pay {formatCompact(positions.reduce((s, r) => s + Number(r.payout_if_right || 0), 0))} if every one won</p>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Largest open positions right now</h2>
        <span className="text-[11px] text-muted-foreground">by dollars at risk · latest holder snapshot</span>
      </div>
      <div className="mb-8"><BetsTable rows={positions} whenKey="snapshot_at" /></div>

      {movesDistinct ? (
        <>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Biggest new bets — last 7 days</h2>
            <span className="text-[11px] text-muted-foreground">new positions detected · first seen</span>
          </div>
          <div className="mb-8"><BetsTable rows={moves} whenKey="detected_at" /></div>
        </>
      ) : (
        <div className="terminal-card p-4 mb-8 text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Biggest new bets (last 7 days):</strong> new-position detection restarted on
          September 5, 2026 when we expanded coverage to today&apos;s highest-volume markets, so for now every tracked
          position counts as &quot;new&quot; and this table would duplicate the one above. It returns as a separate list
          once a week of fresh history exists.
        </div>
      )}

      {/* How to read */}
      <div className="terminal-card p-5 mb-8 max-w-3xl">
        <h2 className="text-sm font-bold mb-2">How to read this page</h2>
        <ul className="text-xs text-muted-foreground leading-relaxed space-y-1.5 list-disc pl-4">
          <li><strong className="text-foreground">At risk</strong> = shares × current price: what the position is worth today and roughly what the trader loses if wrong.</li>
          <li><strong className="text-foreground">Pays if right</strong> = shares × $1, the redemption value if the outcome hits. The gap between the two is the trader&apos;s potential profit.</li>
          <li><strong className="text-foreground">Filtered out:</strong> positions priced at 95¢ or higher (parked capital) and identical-size positions across every outcome of an event (complete sets / market-making). One row per wallet per market.</li>
          <li><strong className="text-foreground">Coverage:</strong> the highest-volume Polymarket markets, whose top holders we snapshot hourly. Smaller markets are not included. &quot;SMS&quot; is our Smart Money Score for the wallet.</li>
        </ul>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-sm mb-8">
        <Link href="/whale-tracker" className="terminal-card p-4 hover:border-primary/40 transition-colors">Whale tracker + Smart Money Scores →</Link>
        <Link href="/alerts-feed" className="terminal-card p-4 hover:border-primary/40 transition-colors">Free whale alerts feed →</Link>
        <Link href="/leaderboard" className="terminal-card p-4 hover:border-primary/40 transition-colors">Trader leaderboard →</Link>
      </div>

      {/* Email capture */}
      <div className="terminal-card p-5 mb-8 max-w-xl mx-auto text-center">
        <h2 className="text-sm font-bold mb-1">Get the biggest bets in your inbox</h2>
        <p className="text-xs text-muted-foreground mb-3">Daily digest of the largest whale moves. Free, unsubscribe anytime.</p>
        <form action="/api/subscribe" method="POST" className="flex gap-2 max-w-sm mx-auto">
          <input type="hidden" name="source" value="biggest-bets" />
          <input type="hidden" name="next" value="/biggest-polymarket-bets" />
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

      <DataPagesNav current="/biggest-polymarket-bets" />

      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-3xl">
        Positions are derived from public Polymarket holder data and valued at current market prices;
        wallet names are the traders&apos; own public handles. Shown for information only — not a
        recommendation to trade. Trading availability depends on your jurisdiction. We may earn a
        commission when you sign up through links on this site.
      </p>
    </div>
  );
}
