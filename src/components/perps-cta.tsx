import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { isPerpsLive } from "@/lib/flags";
import { cn } from "@/lib/utils";

/**
 * Shared Polymarket Perps call-to-action for the evergreen trackers and the
 * whale/leaderboard surfaces — the pages where high-notional traders already
 * are, which is the audience whose trading fees a revshare actually pays on.
 *
 * - Renders nothing until the perps_live flag is on (src/lib/flags.ts), so it
 *   can be mounted unconditionally (async server component).
 * - The outbound link is a plain <a>, never <Link>: Next must not prefetch
 *   /go/ (the fleet lost 84–89% of its "clicks" to prefetch phantoms).
 * - The eligibility + risk + affiliate line lives in the SAME card as the
 *   button. Never phrase anything as a way around the geo-block.
 */
export async function PerpsCta({ context, className }: { context?: string; className?: string }) {
  if (!(await isPerpsLive())) return null;

  return (
    <aside aria-label="Polymarket Perps" className={cn("terminal-card p-5 mb-8 border-primary/30", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary flex-shrink-0" />
            Trade on Polymarket Perps
          </p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {context ?? "Perpetual futures on indices, commodities, crypto and equities — long or short, up to 20× leverage, no expiry."}{" "}
            <Link href="/perps" className="text-primary hover:underline">How Perps work</Link>
            {" · "}
            <Link href="/perps/calculator" className="text-primary hover:underline">Liquidation calculator</Link>
          </p>
        </div>
        <a
          href="/go/polymarket-perps"
          target="_blank"
          rel="sponsored nofollow noopener"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex-shrink-0"
        >
          Open Polymarket Perps <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border">
        Polymarket blocks Perps order placement in the United States and Canada (per its documentation) —
        confirm your own eligibility; circumventing geo-restrictions violates Polymarket&apos;s terms. Leverage
        amplifies losses and liquidation is not a guaranteed stop-loss. We may earn a commission when you sign
        up through this link — this never affects our coverage.{" "}
        <Link href="/affiliate-disclosure" className="hover:text-foreground underline">Disclosure</Link>
      </p>
    </aside>
  );
}
