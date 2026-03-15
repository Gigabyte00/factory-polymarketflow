import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/pmflow";
import { redirect } from "next/navigation";
import { Wallet, Link as LinkIcon, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Portfolio Tracker" };

export default async function PortfolioPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const profile = await getUserProfile(user.id);
  const isPro = profile?.tier === "pro" || profile?.tier === "elite";

  if (!isPro) {
    return (
      <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
        <div className="terminal-card p-12 text-center max-w-lg mx-auto mt-12">
          <Wallet className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Portfolio Tracker</h1>
          <p className="text-muted-foreground mb-6">Connect your Polymarket wallet to track positions, PnL, and performance over time.</p>
          <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">Upgrade to Pro</Link>
        </div>
      </div>
    );
  }

  const walletAddress = profile?.polymarket_wallet;

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-6 w-6 text-primary" />Portfolio</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your Polymarket positions and performance</p>
      </div>

      {walletAddress ? (
        <div className="space-y-6">
          <div className="terminal-card p-4">
            <div className="flex items-center gap-2 text-sm">
              <LinkIcon className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Connected wallet:</span>
              <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{walletAddress}</code>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="terminal-card p-6 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Value</p>
              <p className="text-2xl font-mono font-bold text-primary">--</p>
            </div>
            <div className="terminal-card p-6 text-center">
              <p className="text-xs text-muted-foreground mb-1">Open Positions</p>
              <p className="text-2xl font-mono font-bold">--</p>
            </div>
            <div className="terminal-card p-6 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total PnL</p>
              <p className="text-2xl font-mono font-bold text-profit">--</p>
            </div>
          </div>

          <div className="terminal-card p-6 text-center py-12">
            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Portfolio data syncs with each hourly update. Check back soon.</p>
          </div>
        </div>
      ) : (
        <div className="terminal-card p-12 text-center max-w-lg mx-auto">
          <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-sm text-muted-foreground mb-6">Enter your Polymarket wallet address in Settings to start tracking your portfolio.</p>
          <Link href="/settings" className="text-sm text-primary hover:underline">Go to Settings</Link>
        </div>
      )}
    </div>
  );
}
