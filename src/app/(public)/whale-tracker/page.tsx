import { createClient } from "@supabase/supabase-js";
import { Users, TrendingUp, Target, Bell, ArrowRight, Zap } from "lucide-react";
import { formatCompact, truncateAddress, cn } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polymarket Whale Tracker - Follow Smart Money",
  description: "Track 1,900+ Polymarket whale wallets in real-time. Smart Money Scores, strategy labels, position tracking, and instant alerts when whales move.",
  alternates: { canonical: "/whale-tracker" },
  openGraph: { title: "Polymarket Whale Tracker | PolymarketFlow", description: "Follow the smart money. Track 1,900+ whale wallets on Polymarket." },
};

export default async function WhaleTrackerLandingPage() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  const { count: totalWhales } = await db.from("whale_wallets").select("wallet_address", { count: "exact", head: true });
  const { count: scoredWhales } = await db.from("whale_wallets").select("wallet_address", { count: "exact", head: true }).gt("smart_money_score", 0);

  const { data: topWhales } = await db
    .from("whale_wallets")
    .select("wallet_address, display_name, smart_money_score, strategy_label, markets_traded")
    .gt("smart_money_score", 20)
    .order("smart_money_score", { ascending: false })
    .limit(10);

  // Recent large positions
  const { data: recentPositions } = await db
    .from("top_holders")
    .select("wallet_name, wallet_address, amount, outcome_index, markets!inner(question, slug, events!inner(slug))")
    .gt("amount", 20000)
    .order("snapshot_at", { ascending: false })
    .limit(5);

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-4">
          <Users className="h-4 w-4" />Tracking {totalWhales?.toLocaleString()}+ whale wallets
        </div>
        <h1 className="text-3xl font-bold mb-3">Polymarket Whale Tracker</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Follow the smart money on Polymarket. Track large positions, get alerts when whales move, and use our proprietary Smart Money Score to identify the most profitable traders.
        </p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
        <div className="terminal-card p-4 text-center">
          <div className="text-2xl font-mono font-bold text-primary">{totalWhales?.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Tracked Whales</div>
        </div>
        <div className="terminal-card p-4 text-center">
          <div className="text-2xl font-mono font-bold">{scoredWhales?.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Smart Money Scored</div>
        </div>
        <div className="terminal-card p-4 text-center">
          <div className="text-2xl font-mono font-bold text-profit">24/7</div>
          <div className="text-xs text-muted-foreground">Real-time Monitoring</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        {/* Top Smart Money */}
        <div className="terminal-card p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Top Smart Money Wallets</h2>
          <div className="space-y-2">
            {(topWhales || []).map((w: any, i: number) => (
              <Link key={w.wallet_address} href={`/trader/${w.wallet_address}`} className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 transition-colors group">
                <span className={cn("text-xs font-mono w-4", i < 3 ? "text-warning font-bold" : "text-muted-foreground")}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate group-hover:text-primary">{w.display_name || truncateAddress(w.wallet_address)}</p>
                  <div className="flex items-center gap-2">
                    {w.strategy_label && <span className="text-[10px] text-primary">{w.strategy_label}</span>}
                    <span className="text-[10px] text-muted-foreground">{w.markets_traded} markets</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-primary">{w.smart_money_score}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Whale Moves */}
        <div className="terminal-card p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Recent Whale Positions</h2>
          <div className="space-y-2">
            {(recentPositions || []).map((h: any, i: number) => {
              const name = h.wallet_name || truncateAddress(h.wallet_address);
              const slug = (h.markets as any)?.events?.slug || (h.markets as any)?.slug || "";
              const side = h.outcome_index === 0 ? "YES" : "NO";
              return (
                <Link key={i} href={`/market/${slug}`} className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 transition-colors group">
                  <Users className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs"><span className="font-semibold text-primary">{name}</span> <span className="text-muted-foreground">holds</span> <span className="font-mono font-semibold">{formatCompact(h.amount)}</span> <span className={side === "YES" ? "text-profit" : "text-loss"}>{side}</span></p>
                    <p className="text-[10px] text-muted-foreground truncate">{(h.markets as any)?.question}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="terminal-card p-8 text-center mb-10">
        <h2 className="text-xl font-bold mb-6">What You Get</h2>
        <div className="grid sm:grid-cols-3 gap-6 text-left">
          <div><Zap className="h-5 w-5 text-primary mb-2" /><h3 className="text-sm font-semibold mb-1">Smart Money Scores</h3><p className="text-xs text-muted-foreground">Proprietary 0-100 scoring based on volume, consistency, diversification, and recency.</p></div>
          <div><Bell className="h-5 w-5 text-primary mb-2" /><h3 className="text-sm font-semibold mb-1">Instant Alerts</h3><p className="text-xs text-muted-foreground">Get notified when whales enter or exit positions. Email and Slack supported.</p></div>
          <div><Target className="h-5 w-5 text-primary mb-2" /><h3 className="text-sm font-semibold mb-1">Strategy Labels</h3><p className="text-xs text-muted-foreground">Wallets classified by behavior: Consistent Winner, Focused, Active Trader, Whale, and more.</p></div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3">
          <Link href="/alerts-feed" className="px-6 py-3 rounded-lg border border-border font-semibold hover:bg-accent">Free Whale Alerts</Link>
          <Link href="/pricing" className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 flex items-center gap-2">Get Real-Time Access <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </div>
  );
}
