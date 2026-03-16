import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/pmflow";
import { redirect } from "next/navigation";
import { Wallet, Link as LinkIcon, TrendingUp, BarChart3 } from "lucide-react";
import { cn, formatCompact } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Portfolio Tracker" };

async function fetchPortfolio(walletAddress: string) {
  try {
    const res = await fetch(`https://data-api.polymarket.com/positions?user=${walletAddress}&limit=50&sortBy=VALUE&sortOrder=DESC`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data?.positions || [];
  } catch {
    return [];
  }
}

async function fetchTrades(walletAddress: string) {
  try {
    const res = await fetch(`https://data-api.polymarket.com/trades?user=${walletAddress}&limit=10`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export default async function PortfolioPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const profile = await getUserProfile(user.id);
  const isPro = profile?.tier === "pro";
  const walletAddress = profile?.polymarket_wallet;

  if (!walletAddress) {
    return (
      <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6 text-primary" />Portfolio</h1>
        </div>
        <div className="terminal-card p-12 text-center max-w-lg mx-auto">
          <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-sm text-muted-foreground mb-6">Enter your Polymarket wallet address in Settings to start tracking your portfolio.</p>
          <Link href="/settings" className="text-sm text-primary hover:underline">Go to Settings</Link>
        </div>
      </div>
    );
  }

  const [positions, trades] = await Promise.all([
    fetchPortfolio(walletAddress),
    fetchTrades(walletAddress),
  ]);

  let totalValue = 0;
  let openCount = positions.length;
  for (const pos of positions) {
    totalValue += parseFloat(pos.currentValue || pos.value || pos.size || "0");
  }

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6 text-primary" />Portfolio</h1>
        <p className="text-muted-foreground text-sm mt-1">Tracking wallet positions on Polymarket</p>
      </div>

      <div className="terminal-card p-4 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <LinkIcon className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Wallet:</span>
          <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{walletAddress}</code>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="terminal-card p-6 text-center">
          <p className="text-xs text-muted-foreground mb-1">Portfolio Value</p>
          <p className="text-2xl font-mono font-bold text-primary">{formatCompact(totalValue)}</p>
        </div>
        <div className="terminal-card p-6 text-center">
          <p className="text-xs text-muted-foreground mb-1">Open Positions</p>
          <p className="text-2xl font-mono font-bold">{openCount}</p>
        </div>
        <div className="terminal-card p-6 text-center">
          <p className="text-xs text-muted-foreground mb-1">Recent Trades</p>
          <p className="text-2xl font-mono font-bold">{trades.length}</p>
        </div>
      </div>

      {/* Positions */}
      <div className="terminal-card p-6 mb-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Positions
          {!isPro && positions.length > 5 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">Pro shows all</span>}
        </h2>
        {positions.length > 0 ? (
          <div className="space-y-2">
            {(isPro ? positions : positions.slice(0, 5)).map((pos: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{pos.title || pos.market || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{pos.outcome || pos.side || ""} {pos.size ? `| ${parseFloat(pos.size).toFixed(2)} shares` : ""}</p>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm font-mono font-semibold">{formatCompact(parseFloat(pos.currentValue || pos.value || pos.size || "0"))}</div>
                  <div className="text-[10px] text-muted-foreground">value</div>
                </div>
              </div>
            ))}
            {!isPro && positions.length > 5 && (
              <div className="text-center py-2">
                <Link href="/pricing" className="text-xs text-primary hover:underline">Upgrade to Pro to see all {positions.length} positions</Link>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No positions found for this wallet. Make sure the address is correct.</p>
        )}
      </div>

      {/* Recent trades */}
      <div className="terminal-card p-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Recent Trades
        </h2>
        {trades.length > 0 ? (
          <div className="space-y-2">
            {(isPro ? trades : trades.slice(0, 3)).map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/10 text-xs">
                <span className={cn("font-mono font-semibold px-1.5 py-0.5 rounded", t.side === "BUY" ? "text-profit bg-profit/10" : "text-loss bg-loss/10")}>{t.side}</span>
                <span className="text-muted-foreground truncate mx-2 flex-1">{t.title || t.market || "Unknown"}</span>
                <span className="font-mono">{parseFloat(t.size || "0").toFixed(2)} @ ${parseFloat(t.price || "0").toFixed(2)}</span>
              </div>
            ))}
            {!isPro && trades.length > 3 && (
              <div className="text-center py-2">
                <Link href="/pricing" className="text-xs text-primary hover:underline">Upgrade to Pro for full trade history</Link>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No recent trades found</p>
        )}
      </div>
    </div>
  );
}
