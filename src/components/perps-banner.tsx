import Link from "next/link";
import { ArrowRight, Rocket } from "lucide-react";
import { isPerpsLive } from "@/lib/flags";

/**
 * Cross-page Perps launch banner (alerts-feed, briefings). Renders nothing
 * until the perps_live flag is on (src/lib/flags.ts), so it can be mounted
 * unconditionally. Async server component — banner visibility follows the
 * host page's ISR cadence.
 */
export async function PerpsBanner() {
  if (!(await isPerpsLive())) return null;

  return (
    <div className="terminal-card p-4 mb-6 border-primary/40 flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Rocket className="h-5 w-5 text-primary flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary mr-2 align-middle">NEW</span>
            Polymarket Perps are live — trade indices, crypto and equities with leverage
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Perpetual futures, hourly funding, up to per-market max leverage.{" "}
            <Link href="/perps" className="text-primary hover:underline">How Perps work</Link>
          </p>
        </div>
      </div>
      <a
        href="/go/polymarket-perps"
        target="_blank"
        rel="sponsored nofollow noopener"
        className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex-shrink-0"
      >
        Try Perps <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
