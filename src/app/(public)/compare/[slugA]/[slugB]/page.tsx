import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowLeftRight, TrendingUp, BarChart3, Droplets } from "lucide-react";
import { cn, formatCompact, formatProbability } from "@/lib/utils";
import { BreadcrumbSchema } from "@/components/structured-data";
import Link from "next/link";
import type { Metadata } from "next";

type Props = { params: Promise<{ slugA: string; slugB: string }> };

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slugA, slugB } = await params;
  const db = getDb();
  const [{ data: a }, { data: b }] = await Promise.all([
    db.from("events").select("title").eq("slug", slugA).single(),
    db.from("events").select("title").eq("slug", slugB).single(),
  ]);
  const titleA = a?.title || slugA;
  const titleB = b?.title || slugB;
  return {
    title: `Compare: ${titleA} vs ${titleB}`,
    description: `Side-by-side comparison of prediction markets: ${titleA} vs ${titleB}. Compare prices, volume, liquidity, and trends.`,
    alternates: { canonical: `/compare/${slugA}/${slugB}` },
  };
}

export default async function ComparePage({ params }: Props) {
  const { slugA, slugB } = await params;
  const db = getDb();

  const [{ data: eventA }, { data: eventB }] = await Promise.all([
    db.from("events").select("*").eq("slug", slugA).single(),
    db.from("events").select("*").eq("slug", slugB).single(),
  ]);

  if (!eventA || !eventB) notFound();

  // Get markets for each
  const [{ data: marketsA }, { data: marketsB }] = await Promise.all([
    db.from("markets").select("*").eq("event_id", eventA.id).order("volume_24h", { ascending: false }).limit(1),
    db.from("markets").select("*").eq("event_id", eventB.id).order("volume_24h", { ascending: false }).limit(1),
  ]);

  const mA = marketsA?.[0];
  const mB = marketsB?.[0];

  const stats = [
    { label: "Current Price", a: formatProbability(mA?.outcome_prices?.[0] || 0.5), b: formatProbability(mB?.outcome_prices?.[0] || 0.5) },
    { label: "24h Change", a: `${(mA?.one_day_price_change || 0) > 0 ? "+" : ""}${(mA?.one_day_price_change || 0).toFixed(1)}%`, b: `${(mB?.one_day_price_change || 0) > 0 ? "+" : ""}${(mB?.one_day_price_change || 0).toFixed(1)}%`, colorA: (mA?.one_day_price_change || 0) >= 0, colorB: (mB?.one_day_price_change || 0) >= 0 },
    { label: "Total Volume", a: formatCompact(eventA.volume || 0), b: formatCompact(eventB.volume || 0) },
    { label: "24h Volume", a: formatCompact(eventA.volume_24h || 0), b: formatCompact(eventB.volume_24h || 0) },
    { label: "Liquidity", a: formatCompact(eventA.liquidity || 0), b: formatCompact(eventB.liquidity || 0) },
    { label: "Open Interest", a: formatCompact(eventA.open_interest || 0), b: formatCompact(eventB.open_interest || 0) },
    { label: "Category", a: eventA.category || "—", b: eventB.category || "—" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://polymarketflow.com" },
        { name: "Markets", url: "https://polymarketflow.com/markets" },
        { name: "Compare", url: `https://polymarketflow.com/compare/${slugA}/${slugB}` },
      ]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-primary" />
          Market Comparison
        </h1>
      </div>

      {/* Headers */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[eventA, eventB].map((event, i) => (
          <Link key={event.id} href={`/market/${event.slug}`} className="terminal-card p-4 hover:border-primary/30 transition-colors group">
            <div className="flex items-start gap-3">
              {event.image && (
                <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                  <Image src={event.image} alt="" fill className="object-cover" sizes="40px" />
                </div>
              )}
              <div>
                {event.category && <span className="text-[10px] uppercase text-muted-foreground">{event.category}</span>}
                <h2 className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-2">{event.title}</h2>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Comparison table */}
      <div className="terminal-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 w-1/3">{eventA.title?.substring(0, 30)}</th>
              <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 w-1/3">Metric</th>
              <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 w-1/3">{eventB.title?.substring(0, 30)}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((row, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/10">
                <td className={cn("text-center px-4 py-3 font-mono text-sm font-semibold", (row as any).colorA === false ? "text-loss" : (row as any).colorA === true ? "text-profit" : "")}>
                  {row.a}
                </td>
                <td className="text-center px-4 py-3 text-xs text-muted-foreground">{row.label}</td>
                <td className={cn("text-center px-4 py-3 font-mono text-sm font-semibold", (row as any).colorB === false ? "text-loss" : (row as any).colorB === true ? "text-profit" : "")}>
                  {row.b}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-center">
        <Link href="/markets" className="text-sm text-primary hover:underline">Browse all markets to compare</Link>
      </div>
    </div>
  );
}
