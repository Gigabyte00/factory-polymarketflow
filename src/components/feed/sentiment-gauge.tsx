import { createClient } from "@supabase/supabase-js";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export async function SentimentGauge() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  // Compute sentiment from market price changes
  const { data: markets } = await db
    .from("markets")
    .select("one_day_price_change, volume_24h, category")
    .eq("active", true)
    .not("one_day_price_change", "is", null)
    .gt("volume_24h", 100);

  // Overall sentiment: weighted average of price changes by volume
  let totalWeightedChange = 0;
  let totalVolume = 0;
  const catSentiment: Record<string, { up: number; down: number; flat: number }> = {};

  for (const m of markets || []) {
    const vol = m.volume_24h || 0;
    const change = m.one_day_price_change || 0;
    totalWeightedChange += change * vol;
    totalVolume += vol;

    const cat = m.category || "Other";
    if (!catSentiment[cat]) catSentiment[cat] = { up: 0, down: 0, flat: 0 };
    if (change > 1) catSentiment[cat].up++;
    else if (change < -1) catSentiment[cat].down++;
    else catSentiment[cat].flat++;
  }

  const overallSentiment = totalVolume > 0 ? totalWeightedChange / totalVolume : 0;
  const sentimentLabel = overallSentiment > 0.5 ? "Bullish" : overallSentiment < -0.5 ? "Bearish" : "Neutral";
  const sentimentColor = overallSentiment > 0.5 ? "text-profit" : overallSentiment < -0.5 ? "text-loss" : "text-muted-foreground";

  // Top 4 categories by market count
  const topCats = Object.entries(catSentiment)
    .sort(([, a], [, b]) => (b.up + b.down + b.flat) - (a.up + a.down + a.flat))
    .slice(0, 4);

  return (
    <div className="terminal-card p-6">
      <h2 className="text-sm font-semibold mb-4">Market Sentiment</h2>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          {overallSentiment > 0.5 ? <TrendingUp className="h-5 w-5 text-profit" /> : overallSentiment < -0.5 ? <TrendingDown className="h-5 w-5 text-loss" /> : <Minus className="h-5 w-5 text-muted-foreground" />}
          <span className={cn("text-lg font-bold font-mono", sentimentColor)}>{sentimentLabel}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {(markets || []).length} markets analyzed
        </div>
      </div>

      {/* Sentiment bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
        <div
          className={cn("h-full rounded-full transition-all", overallSentiment > 0 ? "bg-profit" : "bg-loss")}
          style={{ width: `${Math.min(Math.abs(overallSentiment) * 10 + 50, 95)}%`, marginLeft: overallSentiment < 0 ? "0" : "auto" }}
        />
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 gap-2">
        {topCats.map(([cat, data]) => {
          const total = data.up + data.down + data.flat;
          const bullishPct = total > 0 ? Math.round((data.up / total) * 100) : 50;
          return (
            <div key={cat} className="flex items-center justify-between p-2 rounded bg-muted/20 text-xs">
              <span className="text-muted-foreground truncate mr-2">{cat}</span>
              <span className={cn("font-mono font-semibold", bullishPct > 55 ? "text-profit" : bullishPct < 45 ? "text-loss" : "text-muted-foreground")}>
                {bullishPct}% up
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
