import Link from "next/link";
import Image from "next/image";
import { cn, formatCompact, formatProbability, formatChange } from "@/lib/utils";
import type { PolymarketEvent } from "@/types/polymarket";

export function MarketCard({ event }: { event: PolymarketEvent }) {
  const market = event.markets?.[0];
  if (!market) return null;

  const outcomes = market.outcomes ? JSON.parse(market.outcomes) : ["Yes", "No"];
  const prices = market.outcomePrices
    ? JSON.parse(market.outcomePrices)
    : ["0.50", "0.50"];
  const yesPrice = parseFloat(prices[0]);
  const priceChange = market.oneDayPriceChange ?? 0;

  return (
    <Link
      href={`/market/${event.slug}`}
      className="terminal-card p-4 hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start gap-3">
        {/* Event image */}
        {event.image && (
          <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-muted">
            <Image
              src={event.image}
              alt={event.title || "Market"}
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Category tag */}
          {event.category && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {event.category}
            </span>
          )}

          {/* Title */}
          <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
            {event.title || market.question}
          </h3>
        </div>
      </div>

      {/* Outcomes */}
      <div className="mt-3 space-y-2">
        {outcomes.slice(0, 3).map((outcome: string, i: number) => {
          const price = parseFloat(prices[i] || "0");
          return (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate mr-2">
                {outcome}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${price * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-semibold w-10 text-right">
                  {formatProbability(price)}
                </span>
              </div>
            </div>
          );
        })}
        {outcomes.length > 3 && (
          <span className="text-[10px] text-muted-foreground">
            +{outcomes.length - 3} more
          </span>
        )}
      </div>

      {/* Footer stats */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground font-mono">
          {formatCompact(event.volume || 0)} vol
        </span>
        {priceChange !== 0 && (
          <span
            className={cn(
              "font-mono font-semibold",
              priceChange > 0 ? "text-profit" : "text-loss"
            )}
          >
            {formatChange(priceChange / 100)}
          </span>
        )}
        {event.volume24hr && event.volume24hr > 0 && (
          <span className="text-muted-foreground font-mono">
            {formatCompact(event.volume24hr)} 24h
          </span>
        )}
      </div>
    </Link>
  );
}
