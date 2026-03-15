import { Activity, BarChart3, Bell, Brain, Shield, Users } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "PolymarketFlow provides real-time prediction market intelligence for Polymarket traders. Track markets, follow whales, and get smart alerts.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">About PolymarketFlow</h1>

      <div className="prose prose-invert max-w-none space-y-6">
        <div className="terminal-card p-6">
          <p className="text-muted-foreground leading-relaxed">
            PolymarketFlow is a prediction market intelligence platform built for Polymarket traders who want an edge. We aggregate data from all three Polymarket APIs, compute derived analytics, and deliver actionable insights through a clean, terminal-inspired interface.
          </p>
        </div>

        <h2 className="text-xl font-bold mt-8 mb-4">What We Do</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="terminal-card p-4">
            <BarChart3 className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-sm mb-1">Market Analytics</h3>
            <p className="text-xs text-muted-foreground">Real-time data on 1,100+ prediction markets including volume, liquidity, open interest, and price history.</p>
          </div>
          <div className="terminal-card p-4">
            <Users className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-sm mb-1">Whale Tracking</h3>
            <p className="text-xs text-muted-foreground">Monitor 1,000+ whale wallets. See when smart money enters or exits positions before markets move.</p>
          </div>
          <div className="terminal-card p-4">
            <Bell className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-sm mb-1">Smart Alerts</h3>
            <p className="text-xs text-muted-foreground">Get notified via email or Slack when markets cross your price thresholds or volume spikes occur.</p>
          </div>
          <div className="terminal-card p-4">
            <Brain className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-semibold text-sm mb-1">AI Analysis</h3>
            <p className="text-xs text-muted-foreground">Daily market intelligence reports powered by AI. What moved, why, and what to watch next.</p>
          </div>
        </div>

        <h2 className="text-xl font-bold mt-8 mb-4">Data Sources</h2>
        <div className="terminal-card p-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            All data comes directly from Polymarket&apos;s public APIs (Gamma, CLOB, and Data APIs). We sync data hourly and store it in our own database for fast queries and historical analysis. PolymarketFlow is not affiliated with Polymarket. Data is provided for informational purposes only and should not be considered financial advice.
          </p>
        </div>

        <div className="text-center mt-8">
          <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  );
}
