import { createClient } from "@supabase/supabase-js";
import { Calendar, TrendingUp, TrendingDown, Users, BarChart3 } from "lucide-react";
import { cn, formatCompact, formatProbability } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

type Props = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const formatted = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return {
    title: `Prediction Market Odds — ${formatted}`,
    description: `Daily prediction market snapshot for ${formatted}. Top movers, whale activity, and market odds across politics, crypto, sports, and more.`,
    alternates: { canonical: `/daily/${date}` },
  };
}

export default async function DailySnapshotPage({ params }: Props) {
  const { date } = await params;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  const formatted = new Date(date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Top movers
  const { data: movers } = await db
    .from("markets")
    .select("question, one_day_price_change, outcome_prices, volume_24h, slug, events!inner(slug)")
    .eq("active", true)
    .not("one_day_price_change", "is", null)
    .order("volume_24h", { ascending: false, nullsFirst: false })
    .limit(80);

  const sortedMovers = (movers || [])
    .filter((m: any) => Math.abs(m.one_day_price_change || 0) > 1)
    .sort((a: any, b: any) => Math.abs(b.one_day_price_change) - Math.abs(a.one_day_price_change));

  const gainers = sortedMovers.filter((m: any) => m.one_day_price_change > 0).slice(0, 8);
  const losers = sortedMovers.filter((m: any) => m.one_day_price_change < 0).slice(0, 8);

  // High volume markets
  const { data: highVol } = await db
    .from("events")
    .select("title, slug, volume_24h, volume, category")
    .eq("active", true)
    .order("volume_24h", { ascending: false })
    .limit(10);

  // Stats
  const { count: activeEvents } = await db.from("events").select("id", { count: "exact", head: true }).eq("active", true);

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Calendar className="h-3 w-3" />
          <Link href="/markets" className="hover:text-foreground">Markets</Link>
          <span>/</span>
          <span>Daily Snapshot</span>
        </div>
        <h1 className="text-2xl font-bold">Today&apos;s Prediction Market Odds</h1>
        <p className="text-muted-foreground text-sm mt-1">{formatted} &mdash; {activeEvents} active markets</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Gainers */}
        <div className="terminal-card p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-profit" />Top Gainers</h2>
          <div className="space-y-2">
            {gainers.map((m: any, i: number) => {
              const price = ((m.outcome_prices?.[0] || 0.5) * 100).toFixed(0);
              const slug = (m as any).events?.slug || m.slug || "";
              return (
                <Link key={i} href={`/market/${slug}`} className="flex items-center justify-between p-2 rounded hover:bg-muted/30 transition-colors group">
                  <p className="text-xs truncate flex-1 mr-2 group-hover:text-primary">{m.question}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono">{price}%</span>
                    <span className="text-[10px] font-mono text-profit">+{(m.one_day_price_change || 0).toFixed(1)}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Losers */}
        <div className="terminal-card p-6">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-loss" />Top Losers</h2>
          <div className="space-y-2">
            {losers.map((m: any, i: number) => {
              const price = ((m.outcome_prices?.[0] || 0.5) * 100).toFixed(0);
              const slug = (m as any).events?.slug || m.slug || "";
              return (
                <Link key={i} href={`/market/${slug}`} className="flex items-center justify-between p-2 rounded hover:bg-muted/30 transition-colors group">
                  <p className="text-xs truncate flex-1 mr-2 group-hover:text-primary">{m.question}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono">{price}%</span>
                    <span className="text-[10px] font-mono text-loss">{(m.one_day_price_change || 0).toFixed(1)}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Most Traded */}
      <div className="terminal-card p-6 mb-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Most Traded Today</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {(highVol || []).map((e: any, i: number) => (
            <Link key={i} href={`/market/${e.slug}`} className="flex items-center justify-between p-2.5 rounded bg-muted/20 hover:bg-muted/40 transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate group-hover:text-primary">{e.title}</p>
                {e.category && <span className="text-[10px] text-muted-foreground">{e.category}</span>}
              </div>
              <span className="text-xs font-mono text-muted-foreground ml-2">{formatCompact(e.volume_24h || 0)}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="text-center">
        <Link href="/markets" className="text-sm text-primary hover:underline">Explore all markets</Link>
        <span className="text-muted-foreground mx-2">&bull;</span>
        <Link href="/alerts-feed" className="text-sm text-primary hover:underline">Free whale alerts</Link>
        <span className="text-muted-foreground mx-2">&bull;</span>
        <Link href="/pricing" className="text-sm text-primary hover:underline">Get real-time access</Link>
      </div>
    </div>
  );
}
