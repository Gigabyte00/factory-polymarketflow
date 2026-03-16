import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { Users, TrendingUp, BarChart3, Trophy, ExternalLink, Calendar } from "lucide-react";
import { cn, formatCompact, truncateAddress, formatProbability } from "@/lib/utils";
import { BreadcrumbSchema } from "@/components/structured-data";
import Link from "next/link";
import type { Metadata } from "next";

type Props = { params: Promise<{ address: string }> };

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const db = getDb();
  const { data: whale } = await db.from("whale_wallets").select("*").eq("wallet_address", address).single();
  const name = whale?.display_name || truncateAddress(address);
  return {
    title: `${name} - Trader Profile`,
    description: `Track ${name}'s prediction market positions, P&L, and trading activity on Polymarket. Volume: ${formatCompact(whale?.total_volume || 0)}.`,
    alternates: { canonical: `/trader/${address}` },
    openGraph: { title: `${name} | PolymarketFlow Trader`, description: `Polymarket trader profile. Track positions and activity.` },
  };
}

export default async function TraderProfilePage({ params }: Props) {
  const { address } = await params;
  const db = getDb();

  const { data: whale } = await db.from("whale_wallets").select("*").eq("wallet_address", address).single();
  if (!whale) notFound();

  // Get their positions (top holders entries)
  const { data: positions } = await db
    .from("top_holders")
    .select("*, markets(question, outcome_prices, event_id, slug)")
    .eq("wallet_address", address)
    .order("amount", { ascending: false })
    .limit(20);

  // Get leaderboard entry if exists
  const { data: ranking } = await db
    .from("leaderboard")
    .select("*")
    .eq("wallet_address", address)
    .eq("category", "OVERALL")
    .eq("time_period", "ALL")
    .single();

  const name = whale.display_name || truncateAddress(address);

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://polymarketflow.com" },
        { name: "Leaderboard", url: "https://polymarketflow.com/leaderboard" },
        { name: name, url: `https://polymarketflow.com/trader/${address}` },
      ]} />

      {/* Header */}
      <div className="terminal-card p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
            {name[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{name}</h1>
            <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded mt-1 inline-block">{address}</code>
            {whale.x_username && (
              <a href={`https://x.com/${whale.x_username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary mt-1 hover:underline">
                @{whale.x_username} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <div className="text-right">
            {whale.auto_detected ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">AUTO-DETECTED</span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary">VERIFIED</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="terminal-card p-4 text-center">
              <BarChart3 className="h-4 w-4 text-primary mx-auto mb-1" />
              <div className="text-lg font-mono font-bold">{formatCompact(whale.total_volume)}</div>
              <div className="text-[10px] text-muted-foreground">Volume</div>
            </div>
            <div className="terminal-card p-4 text-center">
              <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
              <div className={cn("text-lg font-mono font-bold", whale.total_pnl >= 0 ? "text-profit" : "text-loss")}>
                {whale.total_pnl >= 0 ? "+" : ""}{formatCompact(whale.total_pnl)}
              </div>
              <div className="text-[10px] text-muted-foreground">PnL</div>
            </div>
            <div className="terminal-card p-4 text-center">
              <Trophy className="h-4 w-4 text-warning mx-auto mb-1" />
              <div className="text-lg font-mono font-bold">{ranking?.rank ? `#${ranking.rank}` : "--"}</div>
              <div className="text-[10px] text-muted-foreground">Rank</div>
            </div>
          </div>

          {/* Active Positions */}
          <div className="terminal-card p-6">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Active Positions ({positions?.length || 0})
            </h2>
            {positions && positions.length > 0 ? (
              <div className="space-y-2">
                {positions.map((pos: any, i: number) => (
                  <Link key={i} href={`/market/${pos.markets?.slug || ""}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {pos.markets?.question || "Unknown Market"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pos.outcome_index === 0 ? "YES" : "NO"} position
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm font-mono font-semibold">{formatCompact(pos.amount)}</div>
                      <div className="text-[10px] text-muted-foreground">shares</div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No position data available</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="terminal-card p-6">
            <h3 className="text-sm font-semibold mb-3">Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">First seen</span><span className="font-mono">{new Date(whale.first_seen_at).toLocaleDateString()}</span></div>
              {ranking && <div className="flex justify-between"><span className="text-muted-foreground">Overall rank</span><span className="font-mono">#{ranking.rank}</span></div>}
            </div>
          </div>

          <div className="terminal-card p-6 text-center">
            <p className="text-xs text-muted-foreground mb-3">Track this trader in real-time</p>
            <Link href="/pricing" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              Get Pro Access
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
