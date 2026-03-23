import { createClient } from "@supabase/supabase-js";
import { Bell, TrendingUp, TrendingDown, Users, Zap, ArrowRight } from "lucide-react";
import { cn, formatCompact, truncateAddress, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Whale Alerts - Free Prediction Market Intelligence",
  description: "Free delayed whale alerts for Polymarket. See what smart money is doing in prediction markets. Track large trades, volume spikes, and market movers.",
  alternates: { canonical: "/alerts-feed" },
  openGraph: {
    title: "Free Whale Alerts | PolymarketFlow",
    description: "Track what smart money is doing on Polymarket. Free delayed alerts updated every 6 hours.",
  },
};

export const revalidate = 3600; // Revalidate every hour (6h delay is fine)

export default async function PublicAlertsFeedPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <div className="p-6 text-center"><p className="text-muted-foreground">Loading alerts...</p></div>;
  }
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  // Get whale positions (delayed — only show data > 6 hours old)
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data: whalePositions } = await db
    .from("top_holders")
    .select("wallet_address, wallet_name, amount, outcome_index, snapshot_at, market_id, markets!inner(question, slug, outcome_prices, events!inner(slug, category))")
    .gt("amount", 10000)
    .lt("snapshot_at", sixHoursAgo)
    .order("snapshot_at", { ascending: false })
    .limit(30);

  // Get big movers (delayed)
  const { data: movers } = await db
    .from("markets")
    .select("id, question, slug, one_day_price_change, outcome_prices, volume_24h, events!inner(slug)")
    .eq("active", true)
    .not("one_day_price_change", "is", null)
    .order("volume_24h", { ascending: false, nullsFirst: false })
    .limit(80);

  const topMovers = (movers || [])
    .filter((m: any) => Math.abs(m.one_day_price_change || 0) > 3)
    .sort((a: any, b: any) => Math.abs(b.one_day_price_change) - Math.abs(a.one_day_price_change))
    .slice(0, 10);

  // Smart money stats
  const { data: smartWhales } = await db
    .from("whale_wallets")
    .select("wallet_address, display_name, smart_money_score, strategy_label")
    .gt("smart_money_score", 30)
    .order("smart_money_score", { ascending: false })
    .limit(10);

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      {/* Hero */}
      <div className="terminal-card p-8 mb-6 text-center">
        <Bell className="h-10 w-10 text-primary mx-auto mb-3" />
        <h1 className="text-2xl font-bold mb-2">Free Whale Alerts</h1>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto mb-4">
          See what smart money is doing on Polymarket. Large trades, volume spikes, and market movers — updated with a 6-hour delay. Get real-time alerts with Pro.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/pricing" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Zap className="h-4 w-4" />Get Real-Time Alerts
          </Link>
          <Link href="/auth" className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors">
            Sign Up Free
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Whale Positions */}
          <div className="terminal-card p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Recent Whale Positions
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground ml-auto">6h delay</span>
            </h2>
            <div className="space-y-2">
              {(whalePositions || []).slice(0, 15).map((h: any, i: number) => {
                const name = h.wallet_name || truncateAddress(h.wallet_address);
                const slug = h.markets?.events?.slug || h.markets?.slug || "";
                const side = h.outcome_index === 0 ? "YES" : "NO";
                return (
                  <Link key={i} href={`/market/${slug}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors group">
                    <Users className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs"><span className="font-semibold text-primary">{name}</span> <span className="text-muted-foreground">holds</span> <span className="font-mono font-semibold">{formatCompact(h.amount)}</span> <span className={cn("font-semibold", side === "YES" ? "text-profit" : "text-loss")}>{side}</span></p>
                      <p className="text-[10px] text-muted-foreground truncate">{h.markets?.question}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatRelativeTime(h.snapshot_at)}</span>
                  </Link>
                );
              })}
              {(!whalePositions || whalePositions.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">Loading whale data...</p>
              )}
            </div>
          </div>

          {/* Market Movers */}
          <div className="terminal-card p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />Biggest Movers
            </h2>
            <div className="space-y-2">
              {topMovers.map((m: any, i: number) => {
                const change = m.one_day_price_change || 0;
                const price = m.outcome_prices?.[0] || 0.5;
                const slug = m.events?.slug || m.slug || "";
                return (
                  <Link key={i} href={`/market/${slug}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors group">
                    {change > 0 ? <TrendingUp className="h-3.5 w-3.5 text-profit" /> : <TrendingDown className="h-3.5 w-3.5 text-loss" />}
                    <div className="flex-1 min-w-0"><p className="text-xs truncate group-hover:text-primary">{m.question}</p></div>
                    <span className="text-xs font-mono">{(price * 100).toFixed(0)}%</span>
                    <span className={cn("text-[10px] font-mono font-semibold", change > 0 ? "text-profit" : "text-loss")}>{change > 0 ? "+" : ""}{change.toFixed(1)}%</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Smart Money Leaderboard */}
          <div className="terminal-card p-6">
            <h2 className="text-sm font-semibold mb-3">Top Smart Money</h2>
            <div className="space-y-2">
              {(smartWhales || []).map((w: any, i: number) => (
                <Link key={i} href={`/trader/${w.wallet_address}`} className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 transition-colors">
                  <span className="text-[10px] text-muted-foreground font-mono w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{w.display_name || truncateAddress(w.wallet_address)}</p>
                    {w.strategy_label && <span className="text-[10px] text-primary">{w.strategy_label}</span>}
                  </div>
                  <span className="text-[10px] font-mono text-primary">{w.smart_money_score}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="terminal-card p-6 border-primary/30">
            <h3 className="font-semibold text-sm mb-2">Want real-time alerts?</h3>
            <p className="text-xs text-muted-foreground mb-4">Get instant whale alerts, volume spikes, and smart money signals — no 6-hour delay.</p>
            <Link href="/pricing" className="block text-center py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              View Plans <ArrowRight className="h-3 w-3 inline ml-1" />
            </Link>
          </div>

          {/* Email signup */}
          <div className="terminal-card p-6">
            <h3 className="font-semibold text-sm mb-2">Free Daily Digest</h3>
            <p className="text-xs text-muted-foreground mb-3">Get the top whale moves and market movers in your inbox every morning.</p>
            <form action="/api/subscribe" method="POST" className="flex gap-2">
              <input type="email" name="email" placeholder="you@email.com" required className="flex-1 px-3 py-2 rounded-md bg-background border border-border text-xs focus:ring-1 focus:ring-primary focus:border-primary" />
              <button type="submit" className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">Subscribe</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
