import { fetchEvents } from "@/lib/polymarket/client";
import { MarketCard } from "@/components/markets/market-card";
import { BarChart3, TrendingUp, Droplets, Clock } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Markets",
  description:
    "Browse all active prediction markets on Polymarket. Filter by category, volume, and trending.",
};

const sortOptions = [
  { key: "volume24hr", label: "Trending", icon: TrendingUp },
  { key: "volume", label: "Volume", icon: BarChart3 },
  { key: "liquidity", label: "Liquidity", icon: Droplets },
  { key: "end_date", label: "Ending Soon", icon: Clock },
];

export default async function MarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const sort = (params.sort as string) || "volume24hr";
  const category = params.category as string | undefined;

  let events: Awaited<ReturnType<typeof fetchEvents>> = [];
  try {
    events = await fetchEvents({
      active: true,
      closed: false,
      limit: 100,
      order: sort,
      ascending: false,
    });
  } catch (error) {
    events = [];
  }

  // Client-side category filter if provided
  const filteredEvents = category
    ? events.filter(
        (e) => e.category?.toLowerCase() === category.toLowerCase()
      )
    : events;

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Markets</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {filteredEvents.length} active markets
          {category && (
            <span>
              {" "}
              in{" "}
              <span className="text-primary capitalize">{category}</span>
            </span>
          )}
        </p>
      </div>

      {/* Sort tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {sortOptions.map((opt) => {
          const Icon = opt.icon;
          const isActive = sort === opt.key;
          return (
            <a
              key={opt.key}
              href={`/markets?sort=${opt.key}${category ? `&category=${category}` : ""}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {opt.label}
            </a>
          );
        })}
      </div>

      {/* Markets grid */}
      {filteredEvents.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => (
            <MarketCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="terminal-card p-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No markets found</h2>
          <p className="text-muted-foreground text-sm">
            {category
              ? `No active markets in the "${category}" category.`
              : "Unable to fetch markets. Try again later."}
          </p>
        </div>
      )}
    </div>
  );
}
