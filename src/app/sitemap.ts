import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

/**
 * Sitemap. Two rules, both learned from the Jun–Sep 2026 ingest outage:
 *
 * 1. lastModified must be STABLE. `new Date()` on every fetch tells Google every
 *    URL changed every time it looks, so it stops trusting the field. Evergreen
 *    pages carry a hand-bumped date, live-data pages are truncated to the UTC
 *    day, per-row pages use their row's day, Perps instruments carry none.
 * 2. Fail LOUD, still emit. When the events query returned nothing for three
 *    months the sitemap silently shrank to ~44 URLs and nobody noticed. Every
 *    section now logs its count; an empty market section is an error.
 *
 * A second, DB-free feed of the pages that matter most lives at
 * /sitemap-core.xml (src/app/sitemap-core.xml/route.ts).
 */

type Freq = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

/** Bump when the informational pages materially change. */
const EVERGREEN = new Date("2026-09-07T00:00:00Z");

function day(v?: string | Date | null): Date {
  const d = v ? new Date(v) : new Date();
  if (Number.isNaN(d.getTime())) return day();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://polymarketflow.com";
  const today = day();
  const live = (path: string, changeFrequency: Freq, priority: number) => ({ url: `${baseUrl}${path}`, lastModified: today, changeFrequency, priority });
  const evergreen = (path: string, changeFrequency: Freq, priority: number) => ({ url: `${baseUrl}${path}`, lastModified: EVERGREEN, changeFrequency, priority });

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    live("", "daily", 1),
    live("/markets", "hourly", 0.9),
    live("/movers", "hourly", 0.8),
    live("/leaderboard", "hourly", 0.8),
    evergreen("/pricing", "weekly", 0.7),
    live("/flow", "hourly", 0.9),
    live("/screener", "hourly", 0.8),
    live("/alerts-feed", "hourly", 0.9),
    live("/scorecard", "daily", 0.7),
    evergreen("/tools", "weekly", 0.8),
    evergreen("/perps", "weekly", 0.8),
    live("/perps/markets", "hourly", 0.9),
    evergreen("/perps/calculator", "weekly", 0.8),
    live("/whale-tracker", "hourly", 0.9),
    live("/odds", "daily", 0.8),
    live("/odds/2026-midterms", "hourly", 0.9),
    live("/odds/fed-rate-cut", "hourly", 0.9),
    live("/biggest-polymarket-bets", "hourly", 0.9),
    live("/calendar", "daily", 0.8),
    evergreen("/blog", "weekly", 0.7),
    evergreen("/about", "monthly", 0.5),
    live("/accuracy", "daily", 0.7),
    evergreen("/affiliate-disclosure", "monthly", 0.3),
    evergreen("/terms", "monthly", 0.3),
    evergreen("/privacy", "monthly", 0.3),
  ];

  // Blog articles — from the database
  let blogPages: MetadataRoute.Sitemap = [];
  try {
    const blogDb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });
    const { data: posts, error } = await blogDb
      .from("posts")
      .select("slug, published_at, type")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    blogPages = (posts || []).map((p: any) => ({
      url: `${baseUrl}/blog/${p.slug}`,
      lastModified: day(p.published_at),
      changeFrequency: (p.type === "briefing" ? "daily" : "monthly") as "daily" | "monthly",
      priority: p.type === "briefing" ? 0.7 : 0.6,
    }));
  } catch (e) {
    console.error("[sitemap] posts query failed — falling back to legacy slugs:", (e as Error).message);
    const fallbackSlugs = ["what-is-polymarket", "whale-tracking-guide", "prediction-market-strategies", "understanding-polymarket-odds", "polymarket-vs-polls", "volume-spike-detection"];
    blogPages = fallbackSlugs.map((slug) => ({
      url: `${baseUrl}/blog/${slug}`,
      lastModified: EVERGREEN,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  }

  // Prediction category hub pages
  const categories = ["politics", "crypto", "sports", "science-tech", "culture", "economics", "weather"];
  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/predictions/${cat}`,
    lastModified: today,
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  // Daily snapshot pages (last 7 days)
  const dailyPages: MetadataRoute.Sitemap = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    dailyPages.push({
      url: `${baseUrl}/daily/${dateStr}`,
      lastModified: day(d),
      changeFrequency: i === 0 ? "hourly" as const : "daily" as const,
      priority: i === 0 ? 0.8 : 0.5,
    });
  }

  let marketPages: MetadataRoute.Sitemap = [];
  let traderPages: MetadataRoute.Sitemap = [];
  let perpsPages: MetadataRoute.Sitemap = [];
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "pmflow" } }
    );

    // Dynamic market pages (top 500 by 24h volume)
    const { data: events, error: eventsError } = await db
      .from("events")
      .select("slug, synced_at")
      .eq("active", true)
      .not("slug", "is", null)
      .order("volume_24h", { ascending: false })
      .limit(500);
    if (eventsError) console.error("[sitemap] events query failed:", eventsError.message);

    marketPages = (events || []).map((e: any) => ({
      url: `${baseUrl}/market/${e.slug}`,
      lastModified: day(e.synced_at),
      changeFrequency: "hourly" as const,
      priority: 0.6,
    }));
    if (marketPages.length === 0) {
      console.error("[sitemap] events query returned 0 rows — market URLs collapsed (is the ingest running?)");
    }

    // Trader profile pages (top 500 whales)
    const { data: whales, error: whalesError } = await db
      .from("whale_wallets")
      .select("wallet_address, updated_at")
      .order("total_volume", { ascending: false })
      .limit(500);
    if (whalesError) console.error("[sitemap] whale_wallets query failed:", whalesError.message);

    traderPages = (whales || []).map((w: any) => ({
      url: `${baseUrl}/trader/${w.wallet_address}`,
      lastModified: day(w.updated_at),
      changeFrequency: "daily" as const,
      priority: 0.5,
    }));
  } catch (e) {
    console.error("[sitemap] database section failed:", (e as Error).message);
  }

  // Per-instrument Perps pages (public Perps API; fail-safe, no lastModified — we can't know it)
  try {
    const res = await fetch("https://api.perpetuals.polymarket.com/v1/info/instruments", {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const instruments = (await res.json()) as { symbol: string }[];
      perpsPages = (instruments || []).map((i) => ({
        url: `${baseUrl}/perps/market/${i.symbol}`,
        changeFrequency: "hourly" as const,
        priority: 0.7,
      }));
    } else {
      console.error("[sitemap] perps instruments fetch returned", res.status);
    }
  } catch (e) {
    console.error("[sitemap] perps instruments fetch failed:", (e as Error).message);
  }

  console.log("[sitemap] sections", {
    static: staticPages.length, blog: blogPages.length, categories: categoryPages.length, daily: dailyPages.length,
    markets: marketPages.length, traders: traderPages.length, perps: perpsPages.length,
  });

  return [...staticPages, ...blogPages, ...categoryPages, ...dailyPages, ...marketPages, ...traderPages, ...perpsPages];
}
