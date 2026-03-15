import { fetchEventBySlug } from "@/lib/polymarket/client";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Clock,
  Droplets,
  ExternalLink,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn, formatCompact, formatProbability, formatRelativeTime } from "@/lib/utils";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchEventBySlug(slug);
  if (!event) return { title: "Market Not Found" };

  return {
    title: event.title || "Market",
    description: event.description || `Prediction market: ${event.title}`,
  };
}

export default async function MarketDetailPage({ params }: Props) {
  const { slug } = await params;
  const event = await fetchEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const market = event.markets?.[0];
  const outcomes = market?.outcomes ? JSON.parse(market.outcomes) : ["Yes", "No"];
  const prices = market?.outcomePrices
    ? JSON.parse(market.outcomePrices)
    : ["0.50", "0.50"];

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <a href="/markets" className="hover:text-foreground transition-colors">
          Markets
        </a>
        <span>/</span>
        {event.category && (
          <>
            <a
              href={`/markets?category=${event.category.toLowerCase()}`}
              className="hover:text-foreground transition-colors capitalize"
            >
              {event.category}
            </a>
            <span>/</span>
          </>
        )}
        <span className="text-foreground truncate">{event.title}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event header */}
          <div className="terminal-card p-6">
            <div className="flex items-start gap-4">
              {event.image && (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                  <Image
                    src={event.image}
                    alt={event.title || "Market"}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {event.category && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                      {event.category}
                    </span>
                  )}
                  {event.active && (
                    <span className="flex items-center gap-1 text-[10px] text-profit">
                      <span className="h-1.5 w-1.5 rounded-full bg-profit animate-pulse" />
                      ACTIVE
                    </span>
                  )}
                </div>
                <h1 className="text-xl font-bold">{event.title}</h1>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                    {event.description}
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-4">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <Bell className="h-3.5 w-3.5" />
                Set Alert
              </button>
              <a
                href={`https://polymarket.com/event/${event.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Trade on Polymarket
              </a>
            </div>
          </div>

          {/* Chart placeholder */}
          <div className="terminal-card p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Price History
            </h2>
            <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/20">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  TradingView chart will render here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Connecting to price history API...
                </p>
              </div>
            </div>
          </div>

          {/* Outcomes table */}
          <div className="terminal-card p-6">
            <h2 className="text-sm font-semibold mb-4">Outcomes</h2>
            <div className="space-y-3">
              {outcomes.map((outcome: string, i: number) => {
                const price = parseFloat(prices[i] || "0");
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "w-3 h-3 rounded-full",
                          i === 0 ? "bg-profit" : "bg-loss"
                        )}
                      />
                      <span className="font-medium">{outcome}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Probability bar */}
                      <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            i === 0 ? "bg-profit" : "bg-loss"
                          )}
                          style={{ width: `${price * 100}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-lg w-16 text-right">
                        {formatProbability(price)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="terminal-card p-6 space-y-4">
            <h2 className="text-sm font-semibold">Market Stats</h2>
            <div className="space-y-3">
              <StatRow
                icon={BarChart3}
                label="Total Volume"
                value={formatCompact(event.volume || 0)}
              />
              <StatRow
                icon={TrendingUp}
                label="24h Volume"
                value={formatCompact(event.volume24hr || 0)}
              />
              <StatRow
                icon={Droplets}
                label="Liquidity"
                value={formatCompact(event.liquidity || 0)}
              />
              {event.openInterest && (
                <StatRow
                  icon={Users}
                  label="Open Interest"
                  value={formatCompact(event.openInterest)}
                />
              )}
              {event.endDate && (
                <StatRow
                  icon={Clock}
                  label="End Date"
                  value={new Date(event.endDate).toLocaleDateString()}
                />
              )}
              {event.commentCount !== null && (
                <StatRow
                  icon={ArrowUpRight}
                  label="Comments"
                  value={String(event.commentCount)}
                />
              )}
            </div>
          </div>

          {/* Top Holders placeholder */}
          <div className="terminal-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Top Holders
              </h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                PRO
              </span>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded bg-muted/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono w-4">
                      #{i}
                    </span>
                    <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="h-3 w-12 rounded bg-muted animate-pulse" />
                </div>
              ))}
            </div>
            <a
              href="/pricing"
              className="block text-center text-sm text-primary hover:underline mt-4"
            >
              Unlock with Pro
            </a>
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="terminal-card p-6">
              <h2 className="text-sm font-semibold mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <span className="text-sm font-mono font-semibold">{value}</span>
    </div>
  );
}
