import { fetchLeaderboard } from "@/lib/polymarket/client";
import { cn, formatCompact, truncateAddress } from "@/lib/utils";
import { Trophy, TrendingUp, BarChart3 } from "lucide-react";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Top Polymarket traders ranked by profit and volume. See who's making money on prediction markets.",
};

const categories = [
  "OVERALL",
  "POLITICS",
  "SPORTS",
  "CRYPTO",
  "CULTURE",
  "ECONOMICS",
  "TECH",
];

const timePeriods = [
  { key: "DAY", label: "24h" },
  { key: "WEEK", label: "7d" },
  { key: "MONTH", label: "30d" },
  { key: "ALL", label: "All Time" },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const category = (params.category as string) || "OVERALL";
  const timePeriod = (params.timePeriod as string) || "WEEK";
  const orderBy = (params.orderBy as string) || "PNL";

  let traders: Awaited<ReturnType<typeof fetchLeaderboard>> = [];
  try {
    traders = await fetchLeaderboard({
      category,
      timePeriod,
      orderBy,
      limit: 50,
    });
  } catch {
    traders = [];
  }

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-warning" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Top Polymarket traders by {orderBy === "PNL" ? "profit" : "volume"}
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Category tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <a
              key={cat}
              href={`/leaderboard?category=${cat}&timePeriod=${timePeriod}&orderBy=${orderBy}`}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                category === cat
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {cat.charAt(0) + cat.slice(1).toLowerCase()}
            </a>
          ))}
        </div>

        {/* Time period + order */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {timePeriods.map((tp) => (
              <a
                key={tp.key}
                href={`/leaderboard?category=${category}&timePeriod=${tp.key}&orderBy=${orderBy}`}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-mono transition-colors",
                  timePeriod === tp.key
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tp.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <a
              href={`/leaderboard?category=${category}&timePeriod=${timePeriod}&orderBy=PNL`}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors",
                orderBy === "PNL"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TrendingUp className="h-3 w-3" />
              PnL
            </a>
            <a
              href={`/leaderboard?category=${category}&timePeriod=${timePeriod}&orderBy=VOL`}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors",
                orderBy === "VOL"
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 className="h-3 w-3" />
              Volume
            </a>
          </div>
        </div>
      </div>

      {/* Leaderboard table */}
      <div className="terminal-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 w-12">
                  #
                </th>
                <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                  Trader
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">
                  PnL
                </th>
                <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3">
                  Volume
                </th>
              </tr>
            </thead>
            <tbody>
              {traders.length > 0 ? (
                traders.map((trader, i) => (
                  <tr
                    key={trader.proxyWallet || i}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm font-mono",
                          i < 3 ? "text-warning font-bold" : "text-muted-foreground"
                        )}
                      >
                        {trader.rank || i + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {trader.profileImage ? (
                          <Image
                            src={trader.profileImage}
                            alt={trader.userName || "Trader"}
                            width={28}
                            height={28}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-mono text-muted-foreground">
                            {(trader.userName || "?")[0].toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium flex items-center gap-1">
                            {trader.userName || truncateAddress(trader.proxyWallet)}
                            {trader.verifiedBadge && (
                              <span className="text-info text-xs">&#10003;</span>
                            )}
                          </div>
                          {trader.xUsername && (
                            <span className="text-[10px] text-muted-foreground">
                              @{trader.xUsername}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "text-sm font-mono font-semibold",
                          trader.pnl >= 0 ? "text-profit" : "text-loss"
                        )}
                      >
                        {trader.pnl >= 0 ? "+" : ""}
                        {formatCompact(trader.pnl)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-mono text-muted-foreground">
                        {formatCompact(trader.vol)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Unable to load leaderboard. Try again later.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
