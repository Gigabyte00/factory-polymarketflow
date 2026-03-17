import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { Star, Plus, Trash2 } from "lucide-react";
import { formatCompact, formatProbability } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { getWatchlistItemLimit, getWatchlistLimit, isStarter } from "@/lib/entitlements";

export const metadata: Metadata = { title: "Watchlist" };

export default async function WatchlistPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  const { data: watchlists } = await db
    .from("watchlists")
    .select("*, watchlist_items(id, event_id, added_at, events(id, title, slug, image, volume_24h, category, volume, liquidity))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: profile } = await db.from("users").select("tier").eq("id", user.id).single();
  const hasStarter = isStarter(profile);
  const wlLimit = getWatchlistLimit(profile);
  const itemLimit = getWatchlistItemLimit(profile);

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="h-6 w-6 text-primary" />Watchlist</h1>
          <p className="text-muted-foreground text-sm mt-1">{watchlists?.length || 0} watchlist{(watchlists?.length || 0) !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {watchlists && watchlists.length > 0 ? (
        <div className="space-y-6">
          {watchlists.map((wl: any) => (
            <div key={wl.id} className="terminal-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2"><Star className="h-4 w-4 text-primary" />{wl.name}</h2>
                <span className="text-xs text-muted-foreground">{wl.watchlist_items?.length || 0} markets</span>
              </div>
              {wl.watchlist_items && wl.watchlist_items.length > 0 ? (
                <div className="space-y-2">
                  {wl.watchlist_items.map((item: any) => {
                    const event = item.events;
                    if (!event) return null;
                    return (
                      <Link key={item.id} href={`/market/${event.slug}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{event.title}</p>
                          <p className="text-[10px] text-muted-foreground">{event.category} | {formatCompact(event.volume_24h || 0)} 24h vol</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-sm font-mono">{formatCompact(event.volume || 0)}</div>
                          <div className="text-[10px] text-muted-foreground">total vol</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No markets in this watchlist. Browse markets and click the star to add.</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="terminal-card p-16 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Star className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold mb-2">No watchlists yet</h2>
          <p className="text-sm text-muted-foreground mb-2">Track the markets you care about. Add markets from the explorer or market detail pages.</p>
          <p className="text-xs text-muted-foreground mb-6">{hasStarter ? "Unlimited watchlists with Starter/Pro" : `Free plan: ${wlLimit} watchlists, ${itemLimit} markets each`}</p>
          <Link href="/markets" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Browse Markets</Link>
        </div>
      )}
    </div>
  );
}
