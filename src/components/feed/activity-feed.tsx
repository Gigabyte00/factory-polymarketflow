import { createClient } from "@supabase/supabase-js";
import { TrendingUp, TrendingDown, Users, Zap } from "lucide-react";
import { cn, formatCompact, formatProbability, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";

export async function ActivityFeed() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  // Get recent price movements (markets with biggest absolute change)
  const { data: movers } = await db
    .from("markets")
    .select("id, question, slug, one_day_price_change, outcome_prices, volume_24h, synced_at, events!inner(slug)")
    .eq("active", true)
    .not("one_day_price_change", "is", null)
    .order("volume_24h", { ascending: false, nullsFirst: false })
    .limit(50);

  // Sort by absolute price change and take top movers
  const topMovers = (movers || [])
    .filter((m: any) => Math.abs(m.one_day_price_change || 0) > 1)
    .sort((a: any, b: any) => Math.abs(b.one_day_price_change) - Math.abs(a.one_day_price_change))
    .slice(0, 8);

  // Get recent whale activity (new holders)
  const { data: recentHolders } = await db
    .from("top_holders")
    .select("wallet_address, wallet_name, amount, market_id, markets(question, slug, events(slug))")
    .order("snapshot_at", { ascending: false })
    .limit(5);

  return (
    <div className="terminal-card p-6">
      <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary animate-pulse" />
        Live Activity Feed
      </h2>
      <div className="space-y-2">
        {topMovers.map((m: any, i: number) => {
          const change = m.one_day_price_change || 0;
          const price = m.outcome_prices?.[0] || 0.5;
          const eventSlug = m.events?.slug || m.slug || "";
          return (
            <Link key={m.id} href={`/market/${eventSlug}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors group">
              {change > 0 ? (
                <TrendingUp className="h-4 w-4 text-profit flex-shrink-0" />
              ) : (
                <TrendingDown className="h-4 w-4 text-loss flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">{m.question}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-mono">{formatProbability(price)}</span>
                <span className={cn("text-[10px] font-mono font-semibold", change > 0 ? "text-profit" : "text-loss")}>
                  {change > 0 ? "+" : ""}{change.toFixed(1)}%
                </span>
              </div>
            </Link>
          );
        })}

        {recentHolders && recentHolders.length > 0 && recentHolders.slice(0, 3).map((h: any, i: number) => {
          const eventSlug = h.markets?.events?.slug || h.markets?.slug || "";
          return (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/10">
              <Users className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs">
                  <span className="font-medium text-primary">{h.wallet_name || `${h.wallet_address?.slice(0, 6)}...`}</span>
                  <span className="text-muted-foreground"> holds {formatCompact(h.amount)} in </span>
                  <Link href={`/market/${eventSlug}`} className="font-medium hover:text-primary">{h.markets?.question?.slice(0, 40) || "a market"}...</Link>
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <Link href="/movers" className="block text-center text-xs text-primary hover:underline mt-3">
        View all market movers
      </Link>
    </div>
  );
}
