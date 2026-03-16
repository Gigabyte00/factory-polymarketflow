"use client";

import { useState } from "react";
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
  MessageSquare,
} from "lucide-react";
import Link from "next/link";

const freeFeatures = [
  "Market Explorer (all active markets)",
  "Basic price charts",
  "Market Movers (24h)",
  "Leaderboard access",
  "Category browsing",
  "Search markets",
];

const proFeatures = [
  "Everything in Free",
  "Whale Tracker (1,000+ wallets)",
  "Price Alerts (Email + Slack)",
  "Volume Spike Detection",
  "Portfolio Tracker",
  "Orderbook Depth Analysis",
  "Open Interest Heatmap",
  "AI Market Briefings (daily)",
  "Custom Alert Rules",
  "Cross-Market Correlation",
  "Priority Support",
  "Early access to new features",
];

const comparisonRows = [
  { feature: "Market Explorer", icon: BarChart3, free: true, pro: true },
  { feature: "Price Charts", icon: TrendingUp, free: true, pro: true },
  { feature: "Market Movers", icon: TrendingUp, free: true, pro: true },
  { feature: "Leaderboard", icon: Users, free: true, pro: true },
  { feature: "Whale Tracker", icon: Users, free: false, pro: true },
  { feature: "Price Alerts", icon: Bell, free: false, pro: true },
  { feature: "Volume Spikes", icon: Zap, free: false, pro: true },
  { feature: "Portfolio Tracker", icon: Wallet, free: false, pro: true },
  { feature: "Orderbook Depth", icon: BarChart3, free: false, pro: true },
  { feature: "AI Briefings", icon: Brain, free: false, pro: true },
  { feature: "Custom Alerts", icon: Shield, free: false, pro: true },
  { feature: "Priority Support", icon: MessageSquare, free: false, pro: true },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 pt-8">
        <h1 className="text-3xl font-bold mb-3">
          Simple, transparent pricing
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Start free. Upgrade to Pro for full access to whale tracking, alerts,
          AI analysis, and more. Cancel anytime.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <button
          onClick={() => setBilling("monthly")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            billing === "monthly"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("annual")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
            billing === "annual"
              ? "bg-primary/10 text-primary border border-primary/30"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Annual
          <span className="absolute -top-2 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-profit text-white">
            Save 17%
          </span>
        </button>
      </div>

      {/* Pricing cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
        {/* Free */}
        <div className="terminal-card p-6 flex flex-col">
          <h3 className="text-lg font-bold">Free</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Perfect for exploring prediction markets
          </p>
          <div className="mt-4 mb-6">
            <span className="text-4xl font-bold font-mono">$0</span>
          </div>
          <ul className="space-y-2.5 mb-8 flex-1">
            {freeFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/auth"
            className="block text-center py-3 rounded-md text-sm font-semibold border border-border hover:bg-accent transition-colors"
          >
            Get Started Free
          </Link>
        </div>

        {/* Pro */}
        <div className="terminal-card p-6 flex flex-col border-primary ring-1 ring-primary/30 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
              FULL ACCESS
            </span>
          </div>
          <h3 className="text-lg font-bold">Pro</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Full prediction market intelligence suite
          </p>
          <div className="mt-4 mb-6">
            {billing === "monthly" ? (
              <>
                <span className="text-4xl font-bold font-mono">$199</span>
                <span className="text-muted-foreground">/mo</span>
              </>
            ) : (
              <>
                <span className="text-4xl font-bold font-mono">$1,990</span>
                <span className="text-muted-foreground">/yr</span>
                <div className="text-xs text-profit mt-1">
                  $166/mo — save $398/yr
                </div>
              </>
            )}
          </div>
          <ul className="space-y-2.5 mb-8 flex-1">
            {proFeatures.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href={`/auth?plan=pro&billing=${billing}`}
            className="block text-center py-3 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {billing === "annual" ? "Start Pro (Annual)" : "Start Pro"}
          </Link>
        </div>
      </div>

      {/* Feature comparison */}
      <div className="max-w-3xl mx-auto">
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
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
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
            q="Is the annual plan auto-renewing?"
            a="Yes. Both monthly ($199/mo) and annual ($1,990/yr) plans auto-renew. You can cancel before the next billing cycle to stop future charges."
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

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <div className="terminal-card p-4">
      <h3 className="text-sm font-semibold">{q}</h3>
      <p className="text-sm text-muted-foreground mt-1">{a}</p>
    </div>
  );
}
