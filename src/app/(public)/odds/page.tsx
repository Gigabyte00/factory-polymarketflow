import Link from "next/link";
import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { DATA_PAGES } from "@/components/data-pages-nav";
import { BreadcrumbSchema } from "@/components/structured-data";

export const metadata: Metadata = {
  title: "Live Odds Trackers — Elections, Fed Rates, Biggest Bets",
  description:
    "Live prediction-market odds pages built on Polymarket data: 2026 midterm election odds, Fed rate-cut probabilities, the biggest whale bets and a market-resolution calendar — refreshed every 15 minutes.",
  alternates: { canonical: "/odds" },
  openGraph: {
    title: "Live Odds Trackers | PolymarketFlow",
    description: "Election odds, Fed rate odds, biggest bets and the resolution calendar — live from Polymarket data.",
  },
};

export default function OddsIndexPage() {
  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://polymarketflow.com" },
          { name: "Odds", url: "https://polymarketflow.com/odds" },
        ]}
      />
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Landmark className="h-6 w-6 text-primary" />
          Live Odds Trackers
        </h1>
        <p className="text-muted-foreground text-sm mt-1 max-w-2xl">
          Evergreen pages that turn Polymarket&apos;s real-money markets into readable odds: who wins the
          midterms, whether the Fed cuts, what the whales are betting and what resolves next. All refresh
          about every 15 minutes from data we ingest continuously.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        {DATA_PAGES.map((p) => {
          const Icon = p.icon;
          return (
            <Link key={p.href} href={p.href} className="terminal-card p-6 hover:border-primary/40 transition-colors group">
              <Icon className="h-5 w-5 text-primary mb-3" />
              <h2 className="text-base font-semibold group-hover:text-primary transition-colors">{p.label}</h2>
              <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
              <span className="text-xs text-primary mt-3 inline-block">Open tracker →</span>
            </Link>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-sm mb-8">
        <Link href="/predictions/politics" className="terminal-card p-4 hover:border-primary/40 transition-colors">All politics markets →</Link>
        <Link href="/predictions/economics" className="terminal-card p-4 hover:border-primary/40 transition-colors">All economics markets →</Link>
        <Link href="/whale-tracker" className="terminal-card p-4 hover:border-primary/40 transition-colors">Whale tracker →</Link>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-3xl">
        Odds are Polymarket market prices shown for information only — not predictions, endorsements or
        advice. Trading availability depends on your jurisdiction. We may earn a commission when you sign
        up through links on this site.
      </p>
    </div>
  );
}
