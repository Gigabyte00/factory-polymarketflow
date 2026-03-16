import { Activity, BarChart3, Bell, Brain, Filter, LineChart, Star, TrendingUp, Users, Wallet, Zap } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polymarket Tools - Free Prediction Market Analytics",
  description: "Free Polymarket tools for prediction market traders. Whale tracker, price alerts, market screener, TradingView charts, AI briefings, and portfolio tracker.",
  alternates: { canonical: "/tools" },
  openGraph: { title: "Free Polymarket Tools | PolymarketFlow", description: "The complete toolkit for Polymarket traders. Track whales, set alerts, screen markets." },
};

const tools = [
  { name: "Market Explorer", desc: "Browse 1,100+ active prediction markets with real-time prices, volume, and category filtering.", href: "/markets", icon: BarChart3, tier: "free" },
  { name: "Whale Alerts", desc: "Track large positions from 1,900+ whale wallets. See what smart money is buying and selling.", href: "/alerts-feed", icon: Users, tier: "free" },
  { name: "Market Movers", desc: "See the biggest price movements in the last 24 hours. Top gainers and losers across all markets.", href: "/movers", icon: TrendingUp, tier: "free" },
  { name: "Leaderboard", desc: "Top Polymarket traders ranked by profit and volume. Filter by category and timeframe.", href: "/leaderboard", icon: TrendingUp, tier: "free" },
  { name: "Market Screener", desc: "Filter 14,000+ markets by volume, price range, category, anomaly score, and liquidity.", href: "/screener", icon: Filter, tier: "free" },
  { name: "Price Charts", desc: "TradingView-powered charts with multiple timeframes (1h, 1d, 1w, 1m, all) for every market.", href: "/markets", icon: LineChart, tier: "free" },
  { name: "Flow Feed", desc: "Real-time stream of whale trades, volume spikes, and market-moving events. The pulse of prediction markets.", href: "/flow", icon: Activity, tier: "pro" },
  { name: "Price Alerts", desc: "Get notified via email or Slack when any market crosses your price threshold.", href: "/alerts", icon: Bell, tier: "starter" },
  { name: "Watchlists", desc: "Save and track your favorite markets. Monitor prices and changes at a glance.", href: "/watchlist", icon: Star, tier: "free" },
  { name: "Portfolio Tracker", desc: "Connect your Polymarket wallet to track positions, P&L, and performance over time.", href: "/portfolio", icon: Wallet, tier: "starter" },
  { name: "AI Briefings", desc: "Daily AI-powered market intelligence reports. What moved, why, and what to watch next.", href: "/briefings", icon: Brain, tier: "pro" },
  { name: "Smart Money Scores", desc: "Proprietary scoring system for whale wallets. Track the most profitable and consistent traders.", href: "/scorecard", icon: Zap, tier: "pro" },
];

export default function ToolsPage() {
  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="text-center mb-10 pt-4">
        <h1 className="text-3xl font-bold mb-3">Polymarket Tools</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          The complete toolkit for prediction market traders. Track whales, set alerts, screen markets, and get AI-powered analysis. Most tools are free — no account required.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Link key={tool.name} href={tool.href} className="terminal-card p-5 hover:border-primary/30 transition-colors group">
            <div className="flex items-center gap-2 mb-2">
              <tool.icon className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-sm group-hover:text-primary transition-colors">{tool.name}</h2>
              {tool.tier !== "free" && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tool.tier === "pro" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{tool.tier.toUpperCase()}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{tool.desc}</p>
          </Link>
        ))}
      </div>

      <div className="text-center mt-12">
        <h2 className="text-xl font-bold mb-3">Ready to trade smarter?</h2>
        <p className="text-sm text-muted-foreground mb-6">Start with free tools. Upgrade when you need real-time intelligence.</p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/auth" className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90">Start Free</Link>
          <Link href="/pricing" className="px-6 py-3 rounded-lg border border-border font-semibold hover:bg-accent">View Pricing</Link>
        </div>
      </div>
    </div>
  );
}
