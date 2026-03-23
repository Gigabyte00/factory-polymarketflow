import { createClient } from "@supabase/supabase-js";
import { Target, TrendingUp, Trophy, BarChart3, Users } from "lucide-react";
import { cn, formatCompact, truncateAddress } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Performance Scorecard - Smart Money Tracking Results",
  description: "How well do Polymarket whales perform? See real-time accuracy metrics, win rates, and performance data from our smart money tracking system.",
  alternates: { canonical: "/scorecard" },
};

export default async function ScorecardPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <div className="p-6 text-center"><p className="text-muted-foreground">Loading scorecard data...</p></div>;
  }
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  // Top performing whales
  const { data: topWhales } = await db
    .from("whale_wallets")
    .select("wallet_address, display_name, smart_money_score, strategy_label, consistency_score, markets_traded, total_volume, total_pnl")
    .gt("smart_money_score", 20)
    .order("smart_money_score", { ascending: false })
    .limit(20);

  // Platform stats
  const { count: totalWhales } = await db.from("whale_wallets").select("wallet_address", { count: "exact", head: true }).gt("smart_money_score", 0);
  const { count: totalMarkets } = await db.from("events").select("id", { count: "exact", head: true }).eq("active", true);
  const { count: pricePoints } = await db.from("price_history").select("id", { count: "exact", head: true });

  // Strategy distribution
  const { data: strategyDist } = await db
    .from("whale_wallets")
    .select("strategy_label")
    .not("strategy_label", "is", null);

  const strategies: Record<string, number> = {};
  for (const w of strategyDist || []) {
    const label = w.strategy_label || "Unknown";
    strategies[label] = (strategies[label] || 0) + 1;
  }

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6 text-primary" />Performance Scorecard</h1>
        <p className="text-muted-foreground text-sm mt-1">How our smart money tracking system performs</p>
      </div>

      {/* Platform stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <div className="terminal-card p-4 text-center">
          <Users className="h-5 w-5 text-primary mx-auto mb-1" />
          <div className="text-xl font-mono font-bold text-primary">{totalWhales?.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">Scored Whale Wallets</div>
        </div>
        <div className="terminal-card p-4 text-center">
          <BarChart3 className="h-5 w-5 text-primary mx-auto mb-1" />
          <div className="text-xl font-mono font-bold">{totalMarkets?.toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">Active Markets Tracked</div>
        </div>
        <div className="terminal-card p-4 text-center">
          <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
          <div className="text-xl font-mono font-bold">{(pricePoints || 0) > 1000 ? `${((pricePoints || 0) / 1000).toFixed(0)}K` : pricePoints}</div>
          <div className="text-[10px] text-muted-foreground">Price Data Points</div>
        </div>
        <div className="terminal-card p-4 text-center">
          <Trophy className="h-5 w-5 text-warning mx-auto mb-1" />
          <div className="text-xl font-mono font-bold">{Object.keys(strategies).length}</div>
          <div className="text-[10px] text-muted-foreground">Strategy Types Detected</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Top Whales Table */}
          <div className="terminal-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold">Top Smart Money Wallets</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2">#</th>
                  <th className="text-left px-4 py-2">Trader</th>
                  <th className="text-left px-4 py-2">Strategy</th>
                  <th className="text-right px-4 py-2">Score</th>
                  <th className="text-right px-4 py-2">Markets</th>
                </tr>
              </thead>
              <tbody>
                {(topWhales || []).map((w: any, i: number) => (
                  <tr key={w.wallet_address} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5"><span className={cn("text-xs font-mono", i < 3 ? "text-warning font-bold" : "text-muted-foreground")}>{i + 1}</span></td>
                    <td className="px-4 py-2.5">
                      <Link href={`/trader/${w.wallet_address}`} className="text-xs font-medium hover:text-primary transition-colors">
                        {w.display_name || truncateAddress(w.wallet_address)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5"><span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{w.strategy_label || "—"}</span></td>
                    <td className="text-right px-4 py-2.5"><span className="text-xs font-mono font-bold text-primary">{w.smart_money_score}</span></td>
                    <td className="text-right px-4 py-2.5"><span className="text-xs font-mono text-muted-foreground">{w.markets_traded}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          {/* Strategy Distribution */}
          <div className="terminal-card p-6">
            <h3 className="text-sm font-semibold mb-3">Strategy Distribution</h3>
            <div className="space-y-2">
              {Object.entries(strategies).sort(([,a],[,b]) => b - a).map(([label, count]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-mono">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="terminal-card p-6 border-primary/30">
            <h3 className="font-semibold text-sm mb-2">Track Smart Money</h3>
            <p className="text-xs text-muted-foreground mb-4">Get real-time alerts when these wallets make moves. Filter by strategy, score, and market category.</p>
            <Link href="/pricing" className="block text-center py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Start Free Trial</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
