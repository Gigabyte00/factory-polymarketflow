import { AlertTriangle } from "lucide-react";

/**
 * Reusable leveraged-derivatives risk + affiliate disclosure block.
 * Used on the /perps hub and appended to Perps-category blog posts
 * (src/app/(public)/blog/[slug]/page.tsx). Server-safe, no client hooks.
 */
export function RiskDisclosure() {
  return (
    <aside
      aria-label="Risk disclosure"
      className="terminal-card p-5 border-warning/40 bg-warning/5"
    >
      <h2 className="text-sm font-semibold flex items-center gap-2 mb-2 text-warning">
        <AlertTriangle className="h-4 w-4" />
        Leverage Risk Disclosure
      </h2>
      <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
        <p>
          <strong className="text-foreground">Perps are leveraged derivatives.</strong>{" "}
          Leverage amplifies losses as well as gains. Funding costs accrue hourly
          and reduce your equity even when price doesn&apos;t move. If account equity
          falls below maintenance margin, Polymarket&apos;s liquidation engine closes
          your position automatically, with additional liquidation fees on those
          fills — liquidation is <strong className="text-foreground">not a guaranteed stop-loss</strong>,
          and per Polymarket&apos;s documentation (as of Aug 2026) fast markets can
          exhaust your entire deposited collateral. Never trade with funds you
          can&apos;t afford to lose in full.
        </p>
        <p>
          Nothing on this page is investment, financial, or legal advice.
          Prediction markets and perpetual futures carry regional restrictions —
          confirm your own eligibility. Mechanics described here are sourced from
          docs.polymarket.com/perps as of August 2026 and may change.
        </p>
        <p className="border-t border-border pt-2">
          <strong className="text-foreground">Affiliate disclosure:</strong> We may
          earn a commission when you sign up through links on this site — this
          never affects our coverage.
        </p>
      </div>
    </aside>
  );
}
