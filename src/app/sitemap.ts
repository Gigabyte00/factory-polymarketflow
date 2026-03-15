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
  ];

  // Dynamic market pages
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "pmflow" } }
    );

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

    return [...staticPages, ...marketPages];
  } catch {
    return staticPages;
  }
}
