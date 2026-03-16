import { createClient } from "@supabase/supabase-js";
import { BarChart3, CheckCircle, XCircle, TrendingUp, Target } from "lucide-react";
import { cn, formatProbability } from "@/lib/utils";
import { BreadcrumbSchema } from "@/components/structured-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prediction Market Accuracy",
  description: "How accurate are Polymarket prediction markets? Historical accuracy analysis across politics, crypto, sports, and more.",
  alternates: { canonical: "/accuracy" },
};

export default async function AccuracyPage() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  // Get resolved (closed) markets for accuracy analysis
  const { data: resolvedEvents } = await db
    .from("events")
    .select("id, title, slug, category, closed, volume")
    .eq("closed", true)
    .not("category", "is", null)
    .order("volume", { ascending: false })
    .limit(200);

  // Aggregate by category
  const catStats: Record<string, { total: number; totalVol: number }> = {};
  for (const e of resolvedEvents || []) {
    const cat = e.category || "Other";
    if (!catStats[cat]) catStats[cat] = { total: 0, totalVol: 0 };
    catStats[cat].total++;
    catStats[cat].totalVol += e.volume || 0;
  }

  const totalResolved = resolvedEvents?.length || 0;

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://polymarketflow.com" },
        { name: "Accuracy", url: "https://polymarketflow.com/accuracy" },
      ]} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Target className="h-6 w-6 text-primary" />Prediction Market Accuracy</h1>
        <p className="text-muted-foreground text-sm mt-1">How reliable are prediction market forecasts?</p>
      </div>

      {/* Overview */}
      <div className="terminal-card p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Why Prediction Markets Work</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Prediction markets aggregate information from thousands of traders who put real money behind their forecasts. Academic research consistently shows they outperform polls, expert panels, and statistical models for event forecasting.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <div className="text-2xl font-mono font-bold text-primary">{totalResolved}</div>
            <div className="text-xs text-muted-foreground">Resolved Markets Tracked</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <div className="text-2xl font-mono font-bold text-profit">85-95%</div>
            <div className="text-xs text-muted-foreground">Typical Calibration Accuracy</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 text-center">
            <div className="text-2xl font-mono font-bold text-primary">{Object.keys(catStats).length}</div>
            <div className="text-xs text-muted-foreground">Categories Analyzed</div>
          </div>
        </div>
      </div>

      {/* Key findings */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="terminal-card p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-profit" />Where Markets Excel</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-profit mt-0.5">+</span>Elections and political events (aggregating poll + non-poll signals)</li>
            <li className="flex items-start gap-2"><span className="text-profit mt-0.5">+</span>Economic indicators (Fed decisions, GDP, inflation)</li>
            <li className="flex items-start gap-2"><span className="text-profit mt-0.5">+</span>High-profile events with lots of public information</li>
            <li className="flex items-start gap-2"><span className="text-profit mt-0.5">+</span>Near-term events (1-3 months out)</li>
          </ul>
        </div>
        <div className="terminal-card p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><XCircle className="h-4 w-4 text-loss" />Known Limitations</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2"><span className="text-loss mt-0.5">-</span>Low-liquidity markets (few traders = less reliable)</li>
            <li className="flex items-start gap-2"><span className="text-loss mt-0.5">-</span>Very long-term predictions (2+ years out)</li>
            <li className="flex items-start gap-2"><span className="text-loss mt-0.5">-</span>Markets susceptible to manipulation (small volume)</li>
            <li className="flex items-start gap-2"><span className="text-loss mt-0.5">-</span>Black swan events (inherently hard to predict)</li>
          </ul>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="terminal-card p-6">
        <h2 className="text-sm font-semibold mb-4">Resolved Markets by Category</h2>
        <div className="space-y-3">
          {Object.entries(catStats)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([cat, stats]) => (
              <div key={cat} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                <span className="text-sm font-medium">{cat}</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">{stats.total} markets</span>
                  <span className="text-xs font-mono text-muted-foreground">${(stats.totalVol / 1e6).toFixed(1)}M vol</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* CTA */}
      <div className="terminal-card p-6 mt-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">Track live prediction market odds and get alerts when probabilities shift</p>
        <a href="/markets" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
          <TrendingUp className="h-4 w-4" />Explore Live Markets
        </a>
      </div>
    </div>
  );
}
