import { getEvents } from "@/lib/supabase/pmflow";
import { MarketCard } from "@/components/markets/market-card";
import { BarChart3, TrendingUp, Droplets, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 300; // ISR: revalidate every 5 minutes

export const metadata: Metadata = {
  title: "Markets",
  description: "Browse all active prediction markets on Polymarket.",
};

const PER_PAGE = 48;

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
  const search = params.q as string | undefined;
  const page = Math.max(1, parseInt((params.page as string) || "1"));

  let events: any[] = [];
  try {
    events = await getEvents({
      limit: PER_PAGE + 1, // fetch one extra to detect if there's a next page
      offset: (page - 1) * PER_PAGE,
      category,
      orderBy: sort,
      search,
    });
  } catch {
    events = [];
  }

  const hasNextPage = events.length > PER_PAGE;
  const displayEvents = events.slice(0, PER_PAGE);

  // Build query string for pagination
  const qs = (p: number) => {
    const parts = [`page=${p}`, `sort=${sort}`];
    if (category) parts.push(`category=${category}`);
    if (search) parts.push(`q=${search}`);
    return `/markets?${parts.join("&")}`;
  };

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Markets</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {displayEvents.length > 0 ? `Page ${page}` : "0 results"}
          {category && <span> in <span className="text-primary capitalize">{category}</span></span>}
          {search && <span> matching &ldquo;{search}&rdquo;</span>}
        </p>
      </div>

      {/* Sort tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2" role="tablist" aria-label="Sort markets">
        {sortOptions.map((opt) => {
          const Icon = opt.icon;
          const isActive = sort === opt.key;
          return (
            <a
              key={opt.key}
              href={`/markets?sort=${opt.key}${category ? `&category=${category}` : ""}${search ? `&q=${search}` : ""}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              role="tab"
              aria-selected={isActive}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {opt.label}
            </a>
          );
        })}
      </div>

      {/* Markets grid */}
      {displayEvents.length > 0 ? (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayEvents.map((event) => (
              <MarketCard key={event.id} event={event} />
            ))}
          </div>

          {/* Pagination */}
          <nav className="flex items-center justify-center gap-3 mt-8" aria-label="Pagination">
            {page > 1 ? (
              <Link href={qs(page - 1)} className="flex items-center gap-1 px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors">
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-4 py-2 rounded-md text-sm text-muted-foreground opacity-50">
                <ChevronLeft className="h-4 w-4" />
                Previous
              </span>
            )}

            <span className="text-sm text-muted-foreground font-mono">Page {page}</span>

            {hasNextPage ? (
              <Link href={qs(page + 1)} className="flex items-center gap-1 px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent transition-colors">
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-4 py-2 rounded-md text-sm text-muted-foreground opacity-50">
                Next
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </nav>
        </>
      ) : (
        <div className="terminal-card p-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-lg font-semibold mb-2">No markets found</h2>
          <p className="text-muted-foreground text-sm">Try adjusting your filters or search.</p>
        </div>
      )}
    </div>
  );
}
