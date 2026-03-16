import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Brain,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="grid-bg">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-6">
            <Activity className="h-4 w-4" />
            Tracking $2B+ in prediction market volume
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="text-foreground">Prediction Market</span>
            <br />
            <span className="text-primary glow-green">Intelligence</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            Track every market on Polymarket. Follow whale wallets. Get instant
            alerts when prices move. AI-powered analysis delivered to your inbox.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/markets"
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Explore Markets
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-foreground font-semibold hover:bg-accent transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-3xl mx-auto mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Active Markets" value="1,200+" />
          <StatCard label="24h Volume" value="$84M" />
          <StatCard label="Tracked Whales" value="500+" />
          <StatCard label="Alerts Sent" value="12K+" />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            Everything you need to trade smarter
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={TrendingUp}
              title="Market Movers"
              description="See which markets are moving the most. Top gainers and losers by price change with volume context."
              tier="free"
            />
            <FeatureCard
              icon={BarChart3}
              title="Advanced Charts"
              description="TradingView-powered charts with full price history. Candlestick, line, and area views."
              tier="free"
            />
            <FeatureCard
              icon={Users}
              title="Whale Tracker"
              description="Follow the smart money. See when top holders enter or exit positions across any market."
              tier="pro"
            />
            <FeatureCard
              icon={Bell}
              title="Price Alerts"
              description="Get notified via email or Slack when any market crosses your price threshold."
              tier="pro"
            />
            <FeatureCard
              icon={Shield}
              title="Portfolio Tracker"
              description="Connect your Polymarket wallet. Track PnL, open positions, and performance over time."
              tier="pro"
            />
            <FeatureCard
              icon={Brain}
              title="AI Briefings"
              description="Claude-powered daily intelligence reports. What moved, why, and what to watch next."
              tier="pro"
            />
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-16 px-4 border-t border-border bg-card/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-muted-foreground mb-12">
            Start free. Upgrade when you need more power.
          </p>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <PricingCard
              tier="Free"
              price="$0"
              features={[
                "Market Explorer",
                "Basic Price Charts",
                "Market Movers",
                "Leaderboard",
              ]}
              cta="Get Started"
              href="/auth"
            />
            <PricingCard
              tier="Pro"
              price="$199"
              period="/mo"
              features={[
                "Everything in Free",
                "Whale Tracker",
                "Price Alerts",
                "AI Market Briefings",
                "Portfolio Tracker",
                "Priority Support",
              ]}
              cta="Start Pro"
              href="/pricing"
              highlighted
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 border-t border-border text-center">
        <div className="max-w-2xl mx-auto">
          <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">
            Start tracking markets now
          </h2>
          <p className="text-muted-foreground mb-8">
            Free forever for basic features. No credit card required.
          </p>
          <Link
            href="/markets"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-primary text-primary-foreground text-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Explore Markets
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="terminal-card p-4 text-center">
      <div className="font-mono text-xl font-bold text-primary glow-green">
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  tier,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  tier: "free" | "pro";
}) {
  return (
    <div className="terminal-card p-6 hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-md bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-semibold">{title}</h3>
        {tier !== "free" && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary"
          >
            {tier.toUpperCase()}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function PricingCard({
  tier,
  price,
  period,
  features,
  cta,
  href,
  highlighted,
}: {
  tier: string;
  price: string;
  period?: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`terminal-card p-6 flex flex-col ${
        highlighted ? "border-primary ring-1 ring-primary/30" : ""
      }`}
    >
      {highlighted && (
        <div className="text-xs font-semibold text-primary mb-2">
          MOST POPULAR
        </div>
      )}
      <h3 className="text-lg font-bold">{tier}</h3>
      <div className="mt-2 mb-4">
        <span className="text-3xl font-bold font-mono">{price}</span>
        {period && (
          <span className="text-muted-foreground text-sm">{period}</span>
        )}
      </div>
      <ul className="space-y-2 mb-6 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-primary">+</span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`block text-center py-2.5 rounded-md text-sm font-semibold transition-colors ${
          highlighted
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-border hover:bg-accent"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
