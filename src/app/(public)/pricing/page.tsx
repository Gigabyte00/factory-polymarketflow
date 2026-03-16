"use client";

import { useState } from "react";
import { Check, Zap, Shield, Brain, Bell, Users, Wallet, BarChart3, TrendingUp, MessageSquare, Star, Activity, Filter } from "lucide-react";
import Link from "next/link";

const tiers = [
  {
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Explore prediction markets",
    features: [
      "Market Explorer (all active markets)",
      "Basic price charts",
      "Market Movers",
      "Leaderboard",
      "Delayed whale alerts (6h)",
      "3 price alerts",
      "2 watchlists (10 markets each)",
      "Weekly email digest",
    ],
    cta: "Get Started Free",
    href: "/auth",
    highlighted: false,
  },
  {
    name: "Starter",
    monthlyPrice: 49,
    annualPrice: 490,
    description: "For active traders",
    features: [
      "Everything in Free",
      "Real-time whale alerts",
      "Market screener (all filters)",
      "20 price alerts",
      "Unlimited watchlists",
      "Daily AI briefing email",
      "Portfolio tracker (basic)",
    ],
    cta: "Start Starter",
    href: "/auth?plan=starter",
    highlighted: false,
  },
  {
    name: "Pro",
    monthlyPrice: 199,
    annualPrice: 1990,
    description: "Full intelligence suite",
    features: [
      "Everything in Starter",
      "Flow feed (real-time)",
      "Smart money signals",
      "Unlimited alerts",
      "Advanced portfolio analytics",
      "AI market briefings (personalized)",
      "Cross-market correlation",
      "Priority support",
      "Early access to features",
    ],
    cta: "Start Pro",
    href: "/auth?plan=pro",
    highlighted: true,
    badge: "MOST POPULAR",
  },
];

const comparisonRows = [
  { feature: "Market Explorer", icon: BarChart3, free: true, starter: true, pro: true },
  { feature: "Price Charts", icon: TrendingUp, free: true, starter: true, pro: true },
  { feature: "Market Movers", icon: TrendingUp, free: true, starter: true, pro: true },
  { feature: "Leaderboard", icon: Users, free: true, starter: true, pro: true },
  { feature: "Whale Alerts", icon: Users, free: "6h delay", starter: true, pro: true },
  { feature: "Market Screener", icon: Filter, free: "basic", starter: true, pro: true },
  { feature: "Price Alerts", icon: Bell, free: "3", starter: "20", pro: "unlimited" },
  { feature: "Watchlists", icon: Star, free: "2", starter: "unlimited", pro: "unlimited" },
  { feature: "Flow Feed", icon: Activity, free: false, starter: false, pro: true },
  { feature: "Portfolio Tracker", icon: Wallet, free: false, starter: "basic", pro: "advanced" },
  { feature: "AI Briefings", icon: Brain, free: false, starter: "daily", pro: "personalized" },
  { feature: "Smart Money Signals", icon: Zap, free: false, starter: false, pro: true },
  { feature: "Priority Support", icon: MessageSquare, free: false, starter: false, pro: true },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="text-center mb-8 pt-8">
        <h1 className="text-3xl font-bold mb-3">Simple, transparent pricing</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">Start free. Upgrade when you need real-time alerts, smart money signals, and more.</p>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <button onClick={() => setBilling("monthly")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${billing === "monthly" ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"}`}>Monthly</button>
        <button onClick={() => setBilling("annual")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${billing === "annual" ? "bg-primary/10 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"}`}>
          Annual
          <span className="absolute -top-2 -right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-profit text-white">Save 17%</span>
        </button>
      </div>

      {/* Pricing cards */}
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
        {tiers.map((tier) => (
          <div key={tier.name} className={`terminal-card p-6 flex flex-col ${tier.highlighted ? "border-primary ring-1 ring-primary/30 relative" : ""}`}>
            {tier.badge && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary text-primary-foreground">{tier.badge}</span></div>}
            <h3 className="text-lg font-bold">{tier.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
            <div className="mt-4 mb-6">
              {billing === "monthly" ? (
                <><span className="text-4xl font-bold font-mono">${tier.monthlyPrice}</span>{tier.monthlyPrice > 0 && <span className="text-muted-foreground">/mo</span>}</>
              ) : (
                <><span className="text-4xl font-bold font-mono">${tier.annualPrice > 0 ? tier.annualPrice.toLocaleString() : 0}</span>{tier.annualPrice > 0 && <><span className="text-muted-foreground">/yr</span><div className="text-xs text-profit mt-1">${Math.round(tier.annualPrice / 12)}/mo — save ${tier.monthlyPrice * 12 - tier.annualPrice > 0 ? `$${tier.monthlyPrice * 12 - tier.annualPrice}` : ""}/yr</div></>}</>
              )}
            </div>
            <ul className="space-y-2.5 mb-8 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />{f}</li>
              ))}
            </ul>
            <Link href={`${tier.href}${tier.monthlyPrice > 0 ? `&billing=${billing}` : ""}`} className={`block text-center py-3 rounded-md text-sm font-semibold transition-colors ${tier.highlighted ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border hover:bg-accent"}`}>{tier.cta}</Link>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-8">Feature Comparison</h2>
        <div className="terminal-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Feature</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium w-20">Free</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium w-20">Starter</th>
                <th className="text-center px-4 py-3 text-primary font-medium w-20">Pro</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.feature} className="border-b border-border/50 hover:bg-muted/10">
                  <td className="px-4 py-2.5 flex items-center gap-2"><row.icon className="h-3.5 w-3.5 text-muted-foreground" />{row.feature}</td>
                  {["free", "starter", "pro"].map((tier) => {
                    const val = (row as any)[tier];
                    return (
                      <td key={tier} className="text-center px-4 py-2.5">
                        {val === true ? <Check className="h-4 w-4 text-profit mx-auto" /> : val === false ? <span className="text-muted-foreground">—</span> : <span className="text-xs text-muted-foreground">{val}</span>}
                      </td>
                    );
                  })}
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
          <FAQ q="Can I cancel anytime?" a="Yes. Cancel anytime from your account settings. You keep access until end of billing period." />
          <FAQ q="Is there a free trial?" a="Yes! Sign up and get 7 days of Pro features free — no credit card required. After the trial, you keep the free tier." />
          <FAQ q="What's the difference between Starter and Pro?" a="Starter gives you real-time alerts and the screener. Pro adds the Flow feed, smart money signals, advanced portfolio analytics, and personalized AI briefings." />
          <FAQ q="Do I need a Polymarket account?" a="No. PolymarketFlow works independently. A wallet address is only needed for the Portfolio Tracker." />
        </div>
      </div>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return <div className="terminal-card p-4"><h3 className="text-sm font-semibold">{q}</h3><p className="text-sm text-muted-foreground mt-1">{a}</p></div>;
}
