import { getEventBySlug, getTopHoldersForMarket } from "@/lib/supabase/pmflow";
import { PriceChart } from "@/components/charts/price-chart";

function PriceChartWrapper({ tokenId }: { tokenId: string }) {
  return <PriceChart tokenId={tokenId} height={280} />;
}
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowUpRight, BarChart3, Bell, Clock, Droplets, ExternalLink, TrendingUp, Users } from "lucide-react";
import { cn, formatCompact, formatProbability } from "@/lib/utils";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Market Not Found" };

  const title = event.title || "Market";
  const description = event.description
    ? event.description.substring(0, 160)
    : `Track ${title} on Polymarket. Real-time price data, whale positions, volume analytics, and price alerts.`;

  return {
    title,
    description,
    alternates: { canonical: `/market/${slug}` },
    openGraph: {
      title: `${title} | PolymarketFlow`,
      description,
      url: `https://polymarketflow.com/market/${slug}`,
      images: event.image ? [{ url: event.image, width: 400, height: 400 }] : undefined,
    },
    twitter: {
      card: "summary",
      title: `${title} | PolymarketFlow`,
      description,
    },
  };
}

export default async function MarketDetailPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const market = event.markets?.[0];
  const outcomes: string[] = market?.outcomes || ["Yes", "No"];
  const prices: number[] = market?.outcome_prices || [0.5, 0.5];

  // Get top holders for the main market
  let holders: any[] = [];
  if (market) {
    try { holders = await getTopHoldersForMarket(market.id); } catch {}
  }

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
        <a href="/markets" className="hover:text-foreground transition-colors">Markets</a>
        <span>/</span>
        {event.category && (<><a href={`/markets?category=${event.category.toLowerCase()}`} className="hover:text-foreground transition-colors capitalize">{event.category}</a><span>/</span></>)}
        <span className="text-foreground truncate">{event.title}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="terminal-card p-6">
            <div className="flex items-start gap-4">
              {event.image && (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                  <Image src={event.image} alt={event.title || ""} fill className="object-cover" sizes="64px" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {event.category && <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">{event.category}</span>}
                  {event.active && <span className="flex items-center gap-1 text-[10px] text-profit"><span className="h-1.5 w-1.5 rounded-full bg-profit animate-pulse" />ACTIVE</span>}
                </div>
                <h1 className="text-xl font-bold">{event.title}</h1>
                {event.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{event.description}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <a href={`https://polymarket.com/event/${event.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <ExternalLink className="h-3.5 w-3.5" />Trade on Polymarket
              </a>
            </div>
          </div>

          {/* Price Chart */}
          <div className="terminal-card p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Price History</h2>
            {market?.clob_token_ids?.[0] ? (
              <PriceChartWrapper tokenId={market.clob_token_ids[0]} />
            ) : (
              <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/20">
                <p className="text-sm text-muted-foreground">No price data available for this market</p>
              </div>
            )}
          </div>

          {/* All markets in this event */}
          <div className="terminal-card p-6">
            <h2 className="text-sm font-semibold mb-4">Outcomes ({event.markets.length} markets)</h2>
            <div className="space-y-3">
              {event.markets.map((m: any, idx: number) => {
                const mOutcomes: string[] = m.outcomes || ["Yes", "No"];
                const mPrices: number[] = m.outcome_prices || [0.5, 0.5];
                return (
                  <div key={m.id} className="p-3 rounded-lg bg-muted/30">
                    <p className="text-sm font-medium mb-2">{m.question || mOutcomes[0]}</p>
                    <div className="flex items-center gap-4">
                      {mOutcomes.map((o: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className={cn("w-2.5 h-2.5 rounded-full", i === 0 ? "bg-profit" : "bg-loss")} />
                          <span className="text-xs text-muted-foreground">{o}</span>
                          <span className="text-sm font-mono font-bold">{formatProbability(mPrices[i] || 0)}</span>
                        </div>
                      ))}
                      <span className="ml-auto text-xs text-muted-foreground font-mono">{formatCompact(m.volume_24h || 0)} 24h</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="terminal-card p-6 space-y-3">
            <h2 className="text-sm font-semibold">Market Stats</h2>
            <StatRow icon={BarChart3} label="Total Volume" value={formatCompact(event.volume || 0)} />
            <StatRow icon={TrendingUp} label="24h Volume" value={formatCompact(event.volume_24h || 0)} />
            <StatRow icon={Droplets} label="Liquidity" value={formatCompact(event.liquidity || 0)} />
            {event.open_interest > 0 && <StatRow icon={Users} label="Open Interest" value={formatCompact(event.open_interest)} />}
            {event.end_date && <StatRow icon={Clock} label="End Date" value={new Date(event.end_date).toLocaleDateString()} />}
            <StatRow icon={ArrowUpRight} label="Comments" value={String(event.comment_count || 0)} />
          </div>

          {/* Top Holders */}
          <div className="terminal-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Top Holders</h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">PRO</span>
            </div>
            {holders.length > 0 ? (
              <div className="space-y-2">
                {holders.slice(0, 5).map((h: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono w-4">#{i + 1}</span>
                      <span className="text-xs truncate max-w-[120px]">{h.wallet_name || `${h.wallet_address.slice(0, 6)}...${h.wallet_address.slice(-4)}`}</span>
                    </div>
                    <span className="text-xs font-mono">{formatCompact(h.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No holder data yet</p>
            )}
          </div>

          {event.tags && event.tags.length > 0 && (
            <div className="terminal-card p-6">
              <h2 className="text-sm font-semibold mb-3">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag: any) => (
                  <span key={tag.id || tag.label} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">{tag.label}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</div>
      <span className="text-sm font-mono font-semibold">{value}</span>
    </div>
  );
}
