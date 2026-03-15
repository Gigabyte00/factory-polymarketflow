import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getWhaleWallets, getUserProfile } from "@/lib/supabase/pmflow";
import { redirect } from "next/navigation";
import { Users, TrendingUp, ExternalLink } from "lucide-react";
import { cn, formatCompact, truncateAddress } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Whale Tracker" };

export default async function WhalesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const profile = await getUserProfile(user.id);
  const isPro = profile?.tier === "pro" || profile?.tier === "elite";

  if (!isPro) {
    return (
      <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
        <div className="terminal-card p-12 text-center max-w-lg mx-auto mt-12">
          <Users className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Whale Tracker</h1>
          <p className="text-muted-foreground mb-6">Follow the smart money. See when top holders enter or exit positions across any market.</p>
          <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">Upgrade to Pro</Link>
        </div>
      </div>
    );
  }

  const whales = await getWhaleWallets(100);

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6 text-primary" />Whale Tracker</h1>
        <p className="text-muted-foreground text-sm mt-1">Tracking {whales.length} whale wallets</p>
      </div>

      <div className="terminal-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-12">#</th>
              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">Wallet</th>
              <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">Volume</th>
              <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">PnL</th>
              <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {whales.map((w, i) => (
              <tr key={w.wallet_address} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3"><span className={cn("text-sm font-mono", i < 3 ? "text-warning font-bold" : "text-muted-foreground")}>{i + 1}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-mono text-primary">{(w.display_name || w.wallet_address)[0].toUpperCase()}</div>
                    <div>
                      <span className="text-sm font-medium">{w.display_name || truncateAddress(w.wallet_address)}</span>
                      {w.x_username && <span className="text-[10px] text-muted-foreground ml-2">@{w.x_username}</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right"><span className="text-sm font-mono text-muted-foreground">{formatCompact(w.total_volume)}</span></td>
                <td className="px-4 py-3 text-right"><span className={cn("text-sm font-mono font-semibold", w.total_pnl >= 0 ? "text-profit" : "text-loss")}>{w.total_pnl >= 0 ? "+" : ""}{formatCompact(w.total_pnl)}</span></td>
                <td className="px-4 py-3 text-center"><span className={`text-[10px] px-1.5 py-0.5 rounded ${w.auto_detected ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"}`}>{w.auto_detected ? "AUTO" : "CURATED"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
