import Link from "next/link";
import Image from "next/image";
import { cn, formatCompact, formatProbability, formatChange } from "@/lib/utils";
import { WatchlistButton } from "@/components/markets/watchlist-button";

/**
 * MarketCard works with both Polymarket API events AND Supabase DbEvent rows.
 * It normalizes the field names internally.
 */
export function MarketCard({ event }: { event: any }) {
  // Normalize: handle both API format and DB format
  const slug = event.slug || "";
  const title = event.title || event.question || "Unknown Market";
  const image = event.image || null;
  const category = event.category || null;
  const volume = event.volume || 0;
  const volume24h = event.volume_24h || event.volume24hr || 0;

  // For DB events, we don't have nested markets — use event-level data
  // For API events, parse the first market
  let outcomes: string[] = ["Yes", "No"];
  let prices: number[] = [0.5, 0.5];
  let priceChange = 0;

  if (event.markets && event.markets.length > 0) {
    const m = event.markets[0];
    try { outcomes = typeof m.outcomes === "string" ? JSON.parse(m.outcomes) : m.outcomes || outcomes; } catch {}
    try { prices = typeof m.outcomePrices === "string" ? JSON.parse(m.outcomePrices) : (m.outcome_prices || m.outcomePrices || prices); } catch {}
    priceChange = m.oneDayPriceChange || m.one_day_price_change || 0;
  }

  return (
    <div className="terminal-card p-4 hover:border-primary/30 transition-all group">
      <div className="flex items-center justify-end mb-2">
        {event.id && <WatchlistButton eventId={event.id} />}
      </div>
      <Link href={`/market/${slug}`}>
      <div className="flex items-start gap-3">
        {image && (
          <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-muted">
            <Image src={image} alt={title} fill className="object-cover" sizes="40px" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {category && <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{category}</span>}
          <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {outcomes.slice(0, 3).map((outcome: string, i: number) => {
          const price = parseFloat(String(prices[i] || 0));
          return (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground truncate mr-2">{outcome}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${price * 100}%` }} />
                </div>
                <span className="text-xs font-mono font-semibold w-10 text-right">{formatProbability(price)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground font-mono">{formatCompact(volume)} vol</span>
        {priceChange !== 0 && (
          <span className={cn("font-mono font-semibold", priceChange > 0 ? "text-profit" : "text-loss")}>
            {formatChange(priceChange / 100)}
          </span>
        )}
        {volume24h > 0 && <span className="text-muted-foreground font-mono">{formatCompact(volume24h)} 24h</span>}
      </div>
      </Link>
    </div>
  );
}
