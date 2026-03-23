import { getMarketMovers } from "@/lib/supabase/pmflow";
import { cn, formatCompact, formatProbability } from "@/lib/utils";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 600; // ISR: revalidate every 10 minutes

export const metadata: Metadata = {
  title: "Market Movers",
  description: "Top gaining and losing prediction markets in the last 24 hours.",
};

export default async function MoversPage() {
  let gainers: any[] = [];
  let losers: any[] = [];
  try {
    [gainers, losers] = await Promise.all([
      getMarketMovers("up", 15),
      getMarketMovers("down", 15),
    ]);
  } catch {}

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" />Market Movers</h1>
        <p className="text-muted-foreground text-sm mt-1">Biggest price movements in the last 24 hours</p>
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="terminal-card p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-profit" />Top Gainers</h2>
          <div className="space-y-2">
            {gainers.length > 0 ? gainers.map((m, i) => (
              <MoverRow key={m.id} rank={i + 1} slug={m.event_slug || m.slug || ""} title={m.event_title || m.question || ""} price={(m.outcome_prices?.[0]) || 0.5} change={m.one_day_price_change || 0} volume24h={m.volume_24h || 0} direction="up" />
            )) : <p className="text-sm text-muted-foreground text-center py-8">No gainers in the last 24 hours</p>}
          </div>
        </div>
        <div className="terminal-card p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-loss" />Top Losers</h2>
          <div className="space-y-2">
            {losers.length > 0 ? losers.map((m, i) => (
              <MoverRow key={m.id} rank={i + 1} slug={m.event_slug || m.slug || ""} title={m.event_title || m.question || ""} price={(m.outcome_prices?.[0]) || 0.5} change={m.one_day_price_change || 0} volume24h={m.volume_24h || 0} direction="down" />
            )) : <p className="text-sm text-muted-foreground text-center py-8">No losers in the last 24 hours</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MoverRow({ rank, slug, title, price, change, volume24h, direction }: { rank: number; slug: string; title: string; price: number; change: number; volume24h: number; direction: "up" | "down" }) {
  return (
    <Link href={`/market/${slug}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors group">
      <span className="text-xs text-muted-foreground font-mono w-5 text-right">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{title}</p>
        <p className="text-xs text-muted-foreground font-mono">{formatCompact(volume24h)} 24h vol</p>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-mono font-semibold">{formatProbability(price)}</div>
        <div className={cn("text-xs font-mono font-semibold", direction === "up" ? "text-profit" : "text-loss")}>
          {change > 0 ? "+" : ""}{change.toFixed(1)}%
        </div>
      </div>
    </Link>
  );
}
