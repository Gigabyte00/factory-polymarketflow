import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Activity, TrendingUp, TrendingDown, Users, Zap, Lock, Filter } from "lucide-react";
import { cn, formatCompact, formatProbability, truncateAddress, formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 300; // ISR: revalidate every 5 minutes

export const metadata: Metadata = {
  title: "Flow - Real-Time Market Intelligence",
  description: "Live feed of notable Polymarket trades, whale movements, and volume spikes. Track smart money in real-time.",
  alternates: { canonical: "/flow" },
};

export default async function FlowPage() {
  // Check auth
  let isPro = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });
      const { data: profile } = await db.from("users").select("tier").eq("id", user.id).single();
      isPro = profile?.tier === "pro";
    }
  } catch {}

  if (!isPro) {
    return (
      <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6 text-primary" />Flow</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time prediction market intelligence</p>
        </div>

        {/* Preview with blur */}
        <div className="relative">
          <div className="space-y-2 opacity-40 blur-sm pointer-events-none">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="terminal-card p-4 flex items-center gap-3">
                <div className={`h-4 w-4 rounded-full ${i % 2 === 0 ? 'bg-profit' : 'bg-loss'}`} />
                <div className="flex-1"><div className="h-3 w-48 bg-muted rounded" /><div className="h-2 w-32 bg-muted rounded mt-1" /></div>
                <div className="h-4 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="terminal-card p-8 text-center max-w-md">
              <Lock className="h-10 w-10 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Unlock Flow Feed</h2>
              <p className="text-sm text-muted-foreground mb-4">Get real-time access to whale trades, volume spikes, and smart money movements across all prediction markets.</p>
              <ul className="text-xs text-muted-foreground space-y-1 mb-6 text-left">
                <li className="flex items-center gap-2"><Zap className="h-3 w-3 text-primary" />Real-time whale trade alerts</li>
                <li className="flex items-center gap-2"><TrendingUp className="h-3 w-3 text-primary" />Volume spike detection</li>
                <li className="flex items-center gap-2"><Users className="h-3 w-3 text-primary" />Smart money position tracking</li>
                <li className="flex items-center gap-2"><Filter className="h-3 w-3 text-primary" />Filter by category, size, direction</li>
              </ul>
              <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">Upgrade to Pro</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pro users get the full feed
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  // Get latest whale positions (large holders)
  const { data: recentHolders } = await db
    .from("top_holders")
    .select("wallet_address, wallet_name, amount, outcome_index, snapshot_at, market_id, markets!inner(question, slug, outcome_prices, events!inner(slug, category))")
    .gt("amount", 5000)
    .order("snapshot_at", { ascending: false })
    .limit(30);

  // Get volume spike markets
  const { data: spikeMarkets } = await db
    .from("markets")
    .select("id, question, slug, volume_24h, anomaly_score, one_day_price_change, outcome_prices, events!inner(slug, category)")
    .eq("volume_spike_detected", true)
    .order("anomaly_score", { ascending: false })
    .limit(10);

  // Get biggest movers
  const { data: bigMovers } = await db
    .from("markets")
    .select("id, question, slug, one_day_price_change, outcome_prices, volume_24h, events!inner(slug)")
    .eq("active", true)
    .not("one_day_price_change", "is", null)
    .order("volume_24h", { ascending: false, nullsFirst: false })
    .limit(100);

  const sortedMovers = (bigMovers || [])
    .filter((m: any) => Math.abs(m.one_day_price_change || 0) > 2)
    .sort((a: any, b: any) => Math.abs(b.one_day_price_change) - Math.abs(a.one_day_price_change))
    .slice(0, 15);

  // Interleave into a unified feed
  type FeedItem = { type: "whale" | "spike" | "mover"; data: any; time: string };
  const feed: FeedItem[] = [];

  for (const h of recentHolders || []) {
    feed.push({ type: "whale", data: h, time: h.snapshot_at });
  }
  for (const s of spikeMarkets || []) {
    feed.push({ type: "spike", data: s, time: new Date().toISOString() });
  }
  for (const m of sortedMovers) {
    feed.push({ type: "mover", data: m, time: new Date().toISOString() });
  }

  // Sort by time descending (most recent first)
  feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary animate-pulse" />Flow
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time prediction market intelligence</p>
      </div>

      <div className="space-y-2">
        {feed.slice(0, 40).map((item, i) => {
          if (item.type === "whale") {
            const h = item.data;
            const name = h.wallet_name || truncateAddress(h.wallet_address);
            const slug = h.markets?.events?.slug || h.markets?.slug || "";
            const side = h.outcome_index === 0 ? "YES" : "NO";
            return (
              <Link key={`w-${i}`} href={`/market/${slug}`} className="terminal-card p-3 flex items-center gap-3 hover:border-primary/30 transition-colors group">
                <Users className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs">
                    <span className="font-semibold text-primary">{name}</span>
                    <span className="text-muted-foreground"> holds </span>
                    <span className="font-mono font-semibold">{formatCompact(h.amount)}</span>
                    <span className={cn("font-semibold ml-1", side === "YES" ? "text-profit" : "text-loss")}>{side}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate group-hover:text-foreground">{h.markets?.question}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatRelativeTime(h.snapshot_at)}</span>
              </Link>
            );
          }
          if (item.type === "spike") {
            const s = item.data;
            const slug = s.events?.slug || s.slug || "";
            return (
              <Link key={`s-${i}`} href={`/market/${slug}`} className="terminal-card p-3 flex items-center gap-3 border-warning/30 hover:border-warning/50 transition-colors group">
                <Zap className="h-4 w-4 text-warning flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs">
                    <span className="font-semibold text-warning">Volume Spike</span>
                    <span className="text-muted-foreground"> — anomaly score </span>
                    <span className="font-mono font-semibold text-warning">{s.anomaly_score}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate group-hover:text-foreground">{s.question}</p>
                </div>
                <span className="text-xs font-mono text-muted-foreground">{formatCompact(s.volume_24h)} vol</span>
              </Link>
            );
          }
          if (item.type === "mover") {
            const m = item.data;
            const change = m.one_day_price_change || 0;
            const price = m.outcome_prices?.[0] || 0.5;
            const slug = m.events?.slug || m.slug || "";
            return (
              <Link key={`m-${i}`} href={`/market/${slug}`} className="terminal-card p-3 flex items-center gap-3 hover:border-primary/30 transition-colors group">
                {change > 0 ? <TrendingUp className="h-4 w-4 text-profit flex-shrink-0" /> : <TrendingDown className="h-4 w-4 text-loss flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate group-hover:text-primary">{m.question}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-mono">{formatProbability(price)}</span>
                  <span className={cn("text-[10px] font-mono font-semibold", change > 0 ? "text-profit" : "text-loss")}>{change > 0 ? "+" : ""}{change.toFixed(1)}%</span>
                </div>
              </Link>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
