import { fetchEvents } from "@/lib/polymarket/client";
import { cn, formatCompact, formatProbability } from "@/lib/utils";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market Movers",
  description:
    "Top gaining and losing prediction markets in the last 24 hours. See what's moving on Polymarket.",
};

export default async function MoversPage() {
  let events: Awaited<ReturnType<typeof fetchEvents>> = [];
  try {
    events = await fetchEvents({
      active: true,
      closed: false,
      limit: 100,
      order: "volume24hr",
      ascending: false,
    });
  } catch {
    events = [];
  }

  // Compute movers from the first market's oneDayPriceChange
  const marketsWithChange = events
    .filter((e) => e.markets?.[0]?.oneDayPriceChange !== null)
    .map((e) => {
      const m = e.markets[0];
      const prices = m.outcomePrices ? JSON.parse(m.outcomePrices) : ["0.5"];
      return {
        event: e,
        market: m,
        yesPrice: parseFloat(prices[0]),
        change: m.oneDayPriceChange ?? 0,
      };
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  const gainers = marketsWithChange.filter((m) => m.change > 0).slice(0, 15);
  const losers = marketsWithChange.filter((m) => m.change < 0).slice(0, 15);

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Market Movers
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Biggest price movements in the last 24 hours
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Gainers */}
        <div className="terminal-card p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-profit" />
            Top Gainers
          </h2>
          <div className="space-y-2">
            {gainers.length > 0 ? (
              gainers.map(({ event, market, yesPrice, change }, i) => (
                <MoverRow
                  key={event.id}
                  rank={i + 1}
                  slug={event.slug || ""}
                  title={event.title || market.question || "Unknown"}
                  price={yesPrice}
                  change={change}
                  volume24h={event.volume24hr || 0}
                  direction="up"
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No gainers in the last 24 hours
              </p>
            )}
          </div>
        </div>

        {/* Losers */}
        <div className="terminal-card p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-loss" />
            Top Losers
          </h2>
          <div className="space-y-2">
            {losers.length > 0 ? (
              losers.map(({ event, market, yesPrice, change }, i) => (
                <MoverRow
                  key={event.id}
                  rank={i + 1}
                  slug={event.slug || ""}
                  title={event.title || market.question || "Unknown"}
                  price={yesPrice}
                  change={change}
                  volume24h={event.volume24hr || 0}
                  direction="down"
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No losers in the last 24 hours
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MoverRow({
  rank,
  slug,
  title,
  price,
  change,
  volume24h,
  direction,
}: {
  rank: number;
  slug: string;
  title: string;
  price: number;
  change: number;
  volume24h: number;
  direction: "up" | "down";
}) {
  return (
    <Link
      href={`/market/${slug}`}
      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors group"
    >
      <span className="text-xs text-muted-foreground font-mono w-5 text-right">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          {formatCompact(volume24h)} 24h vol
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-sm font-mono font-semibold">
          {formatProbability(price)}
        </div>
        <div
          className={cn(
            "text-xs font-mono font-semibold",
            direction === "up" ? "text-profit" : "text-loss"
          )}
        >
          {change > 0 ? "+" : ""}
          {change.toFixed(1)}%
        </div>
      </div>
    </Link>
  );
}
