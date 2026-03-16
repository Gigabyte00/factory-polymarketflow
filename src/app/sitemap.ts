import { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://polymarketflow.com";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/markets`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/movers`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${baseUrl}/leaderboard`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/flow`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${baseUrl}/screener`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/accuracy`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  // Blog articles
  const blogSlugs = ["what-is-polymarket", "whale-tracking-guide", "prediction-market-strategies", "understanding-polymarket-odds", "polymarket-vs-polls", "volume-spike-detection"];
  const blogPages: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Prediction category hub pages
  const categories = ["politics", "crypto", "sports", "science-tech", "culture", "economics", "weather"];
  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/predictions/${cat}`,
    lastModified: new Date(),
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "pmflow" } }
    );

    // Dynamic market pages (top 500)
    const { data: events } = await db
      .from("events")
      .select("slug, synced_at")
      .eq("active", true)
      .not("slug", "is", null)
      .order("volume_24h", { ascending: false })
      .limit(500);

    const marketPages: MetadataRoute.Sitemap = (events || []).map((e: any) => ({
      url: `${baseUrl}/market/${e.slug}`,
      lastModified: new Date(e.synced_at),
      changeFrequency: "hourly" as const,
      priority: 0.6,
    }));

    // Trader profile pages (top 500 whales)
    const { data: whales } = await db
      .from("whale_wallets")
      .select("wallet_address, updated_at")
      .order("total_volume", { ascending: false })
      .limit(500);

    const traderPages: MetadataRoute.Sitemap = (whales || []).map((w: any) => ({
      url: `${baseUrl}/trader/${w.wallet_address}`,
      lastModified: new Date(w.updated_at || new Date()),
      changeFrequency: "daily" as const,
      priority: 0.5,
    }));

    return [...staticPages, ...blogPages, ...categoryPages, ...marketPages, ...traderPages];
  } catch {
    return [...staticPages, ...blogPages, ...categoryPages];
  }
}
