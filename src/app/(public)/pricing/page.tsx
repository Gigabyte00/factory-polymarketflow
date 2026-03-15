import {
  Check,
  Zap,
  Shield,
  Brain,
  Bell,
  Users,
  Wallet,
  BarChart3,
  TrendingUp,
  Code,
  Download,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "PolymarketFlow pricing plans. Free, Pro ($19/mo), and Elite ($49/mo). Prediction market intelligence for every trader.",
};

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Perfect for exploring prediction markets",
    features: [
      { text: "Market Explorer (all active markets)", included: true },
      { text: "Basic price charts", included: true },
      { text: "Market Movers (24h)", included: true },
      { text: "Leaderboard access", included: true },
      { text: "Category browsing", included: true },
      { text: "Search markets", included: true },
      { text: "Whale Tracker", included: false },
      { text: "Price Alerts", included: false },
      { text: "AI Briefings", included: false },
    ],
    cta: "Get Started Free",
    href: "/auth",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    description: "For serious prediction market traders",
    features: [
      { text: "Everything in Free", included: true },
      { text: "Whale Tracker (real-time)", included: true },
      { text: "Price Alerts (Email + Slack)", included: true },
      { text: "Volume Spike Detection", included: true },
      { text: "Portfolio Tracker", included: true },
      { text: "Orderbook Depth Analysis", included: true },
      { text: "Open Interest Heatmap", included: true },
      { text: "Advanced filtering", included: true },
      { text: "AI Briefings", included: false },
    ],
    cta: "Start Pro",
    href: "/auth?plan=pro",
    highlighted: true,
    badge: "MOST POPULAR",
  },
  {
    name: "Elite",
    price: "$49",
    period: "/mo",
    description: "Maximum intelligence and automation",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "AI Market Briefings (daily)", included: true },
      { text: "Custom Alert Rules (multi-condition)", included: true },
      { text: "Cross-Market Correlation", included: true },
      { text: "REST API Access", included: true },
      { text: "Data Export (CSV/JSON)", included: true },
      { text: "Priority Support", included: true },
      { text: "Early access to new features", included: true },
    ],
    cta: "Go Elite",
    href: "/auth?plan=elite",
    highlighted: false,
    badge: "BEST VALUE",
  },
];

export default function PricingPage() {
  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="text-center mb-12 pt-8">
        <h1 className="text-3xl font-bold mb-3">
          Simple, transparent pricing
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Start free. Upgrade when you need whale tracking, alerts, AI analysis,
          and more. Cancel anytime.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`terminal-card p-6 flex flex-col ${
              tier.highlighted
                ? "border-primary ring-1 ring-primary/30 relative"
                : ""
            }`}
          >
            {tier.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
                  {tier.badge}
                </span>
              </div>
            )}

            <h3 className="text-lg font-bold">{tier.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {tier.description}
            </p>

            <div className="mt-4 mb-6">
              <span className="text-4xl font-bold font-mono">{tier.price}</span>
              {tier.period && (
                <span className="text-muted-foreground">{tier.period}</span>
              )}
            </div>

            <ul className="space-y-2.5 mb-8 flex-1">
              {tier.features.map((f) => (
                <li
                  key={f.text}
                  className={`flex items-start gap-2 text-sm ${
                    f.included ? "text-foreground" : "text-muted-foreground/50"
                  }`}
                >
                  {f.included ? (
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  ) : (
                    <span className="h-4 w-4 flex-shrink-0 mt-0.5 text-center">
                      -
                    </span>
                  )}
                  {f.text}
                </li>
              ))}
            </ul>

            <Link
              href={tier.href}
              className={`block text-center py-3 rounded-md text-sm font-semibold transition-colors ${
                tier.highlighted
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "border border-border hover:bg-accent"
              }`}
            >
              {tier.cta}
            </Link>
          </div>
        ))}
      </div>

      {/* Feature comparison */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-8">
          Feature Comparison
        </h2>
        <div className="terminal-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                  Feature
                </th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium w-20">
                  Free
                </th>
                <th className="text-center px-4 py-3 text-primary font-medium w-20">
                  Pro
                </th>
                <th className="text-center px-4 py-3 text-warning font-medium w-20">
                  Elite
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, i) => (
                <tr
                  key={row.feature}
                  className="border-b border-border/50 hover:bg-muted/10"
                >
                  <td className="px-4 py-2.5 flex items-center gap-2">
                    <row.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {row.feature}
                  </td>
                  <td className="text-center px-4 py-2.5">
                    {row.free ? (
                      <Check className="h-4 w-4 text-profit mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="text-center px-4 py-2.5">
                    {row.pro ? (
                      <Check className="h-4 w-4 text-profit mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="text-center px-4 py-2.5">
                    {row.elite ? (
                      <Check className="h-4 w-4 text-profit mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto mt-16 mb-8">
        <h2 className="text-xl font-bold text-center mb-8">FAQ</h2>
        <div className="space-y-4">
          <FAQ
            q="Can I cancel anytime?"
            a="Yes. Cancel your subscription anytime from your account settings. You'll keep access until the end of your billing period."
          />
          <FAQ
            q="Do I need a Polymarket account?"
            a="No. PolymarketFlow works independently. You only need a Polymarket wallet address if you want to use the Portfolio Tracker feature."
          />
          <FAQ
            q="How often is data updated?"
            a="Market data is refreshed hourly. We plan to increase this to real-time updates in the future."
          />
          <FAQ
            q="What payment methods do you accept?"
            a="We accept all major credit cards through Stripe. All payments are processed securely."
          />
        </div>
      </div>
    </div>
  );
}

const comparisonRows = [
  { feature: "Market Explorer", icon: BarChart3, free: true, pro: true, elite: true },
  { feature: "Price Charts", icon: TrendingUp, free: true, pro: true, elite: true },
  { feature: "Market Movers", icon: TrendingUp, free: true, pro: true, elite: true },
  { feature: "Leaderboard", icon: Users, free: true, pro: true, elite: true },
  { feature: "Whale Tracker", icon: Users, free: false, pro: true, elite: true },
  { feature: "Price Alerts", icon: Bell, free: false, pro: true, elite: true },
  { feature: "Volume Spikes", icon: Zap, free: false, pro: true, elite: true },
  { feature: "Portfolio Tracker", icon: Wallet, free: false, pro: true, elite: true },
  { feature: "Orderbook Depth", icon: BarChart3, free: false, pro: true, elite: true },
  { feature: "AI Briefings", icon: Brain, free: false, pro: false, elite: true },
  { feature: "Custom Alerts", icon: Shield, free: false, pro: false, elite: true },
  { feature: "API Access", icon: Code, free: false, pro: false, elite: true },
  { feature: "Data Export", icon: Download, free: false, pro: false, elite: true },
  { feature: "Priority Support", icon: MessageSquare, free: false, pro: false, elite: true },
];

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="terminal-card p-4">
      <h3 className="text-sm font-semibold">{q}</h3>
      <p className="text-sm text-muted-foreground mt-1">{a}</p>
    </div>
  );
}
