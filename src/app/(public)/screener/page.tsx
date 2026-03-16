import { createClient } from "@supabase/supabase-js";
import { Filter, TrendingUp, BarChart3, Clock, Zap } from "lucide-react";
import { cn, formatCompact, formatProbability } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Market Screener",
  description: "Filter and screen 14,000+ prediction markets by volume, price, category, anomaly score, and more.",
  alternates: { canonical: "/screener" },
};

export default async function ScreenerPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const category = (params.category as string) || "";
  const minVol = parseInt((params.minVol as string) || "0");
  const maxPrice = parseFloat((params.maxPrice as string) || "1");
  const minPrice = parseFloat((params.minPrice as string) || "0");
  const sortBy = (params.sort as string) || "volume_24h";
  const anomalyOnly = params.anomaly === "true";

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  let query = db
    .from("markets")
    .select("id, question, slug, outcome_prices, volume_24h, volume, liquidity, one_day_price_change, spread, anomaly_score, volume_spike_detected, end_date, category, events!inner(slug, title)")
    .eq("active", true);

  if (category) query = query.ilike("category", category);
  if (minVol > 0) query = query.gte("volume_24h", minVol);
  if (anomalyOnly) query = query.eq("volume_spike_detected", true);

  const orderCol = sortBy === "change" ? "one_day_price_change" : sortBy === "liquidity" ? "liquidity" : sortBy === "anomaly" ? "anomaly_score" : "volume_24h";
  query = query.order(orderCol, { ascending: false, nullsFirst: false }).limit(100);

  const { data: markets } = await query;

  // Filter by price range client-side (outcome_prices is JSONB)
  const filtered = (markets || []).filter((m: any) => {
    const price = m.outcome_prices?.[0] || 0.5;
    return price >= minPrice && price <= maxPrice;
  });

  const categories = ["", "Politics", "Crypto", "Sports", "Science & Tech", "Culture", "Economics", "Weather"];

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Filter className="h-6 w-6 text-primary" />Market Screener</h1>
        <p className="text-muted-foreground text-sm mt-1">Filter {filtered.length} markets from 14,000+ active markets</p>
      </div>

      {/* Filters */}
      <div className="terminal-card p-4 mb-6">
        <form className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Category</label>
            <select name="category" defaultValue={category} className="bg-background border border-border rounded px-2 py-1.5 text-xs">
              {categories.map(c => <option key={c} value={c}>{c || "All"}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Min 24h Volume</label>
            <select name="minVol" defaultValue={String(minVol)} className="bg-background border border-border rounded px-2 py-1.5 text-xs">
              <option value="0">Any</option>
              <option value="1000">$1K+</option>
              <option value="10000">$10K+</option>
              <option value="100000">$100K+</option>
              <option value="1000000">$1M+</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Price Range</label>
            <div className="flex items-center gap-1">
              <input type="number" name="minPrice" defaultValue={minPrice} step="0.05" min="0" max="1" className="bg-background border border-border rounded px-2 py-1.5 text-xs w-16 font-mono" />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="number" name="maxPrice" defaultValue={maxPrice} step="0.05" min="0" max="1" className="bg-background border border-border rounded px-2 py-1.5 text-xs w-16 font-mono" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Sort By</label>
            <select name="sort" defaultValue={sortBy} className="bg-background border border-border rounded px-2 py-1.5 text-xs">
              <option value="volume_24h">24h Volume</option>
              <option value="change">Price Change</option>
              <option value="liquidity">Liquidity</option>
              <option value="anomaly">Anomaly Score</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <input type="checkbox" name="anomaly" value="true" defaultChecked={anomalyOnly} id="anomaly" className="rounded border-border" />
            <label htmlFor="anomaly" className="text-[10px] text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3 text-warning" />Spikes only</label>
          </div>
          <button type="submit" className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">Apply</button>
        </form>
      </div>

      {/* Results table */}
      <div className="terminal-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-3 py-2">Market</th>
                <th className="text-right px-3 py-2">Price</th>
                <th className="text-right px-3 py-2">24h Change</th>
                <th className="text-right px-3 py-2">24h Volume</th>
                <th className="text-right px-3 py-2">Liquidity</th>
                <th className="text-right px-3 py-2">Spread</th>
                <th className="text-center px-3 py-2">Anomaly</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m: any) => {
                const price = m.outcome_prices?.[0] || 0.5;
                const change = m.one_day_price_change || 0;
                const slug = m.events?.slug || m.slug || "";
                return (
                  <tr key={m.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 max-w-[300px]">
                      <Link href={`/market/${slug}`} className="text-xs font-medium hover:text-primary transition-colors line-clamp-1">{m.question || m.events?.title}</Link>
                      {m.category && <span className="text-[10px] text-muted-foreground ml-1">({m.category})</span>}
                    </td>
                    <td className="text-right px-3 py-2.5 font-mono text-xs">{formatProbability(price)}</td>
                    <td className={cn("text-right px-3 py-2.5 font-mono text-xs font-semibold", change > 0 ? "text-profit" : change < 0 ? "text-loss" : "text-muted-foreground")}>{change > 0 ? "+" : ""}{change.toFixed(1)}%</td>
                    <td className="text-right px-3 py-2.5 font-mono text-xs text-muted-foreground">{formatCompact(m.volume_24h || 0)}</td>
                    <td className="text-right px-3 py-2.5 font-mono text-xs text-muted-foreground">{formatCompact(m.liquidity || 0)}</td>
                    <td className="text-right px-3 py-2.5 font-mono text-xs text-muted-foreground">{m.spread ? `${(m.spread * 100).toFixed(1)}%` : "—"}</td>
                    <td className="text-center px-3 py-2.5">
                      {m.volume_spike_detected ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-warning/20 text-warning">{m.anomaly_score}</span> : <span className="text-[10px] text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center"><Filter className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No markets match your filters. Try adjusting criteria.</p></div>
        )}
      </div>
    </div>
  );
}
