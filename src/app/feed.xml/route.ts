import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

const BASE = "https://polymarketflow.com";

function esc(s: string): string {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** RSS 2.0 feed of the latest posts (daily briefings + articles). */
export async function GET() {
  let items = "";
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "pmflow" } }
    );
    const { data: posts } = await db
      .from("posts")
      .select("slug, title, excerpt, category, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(50);

    items = (posts || [])
      .map(
        (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${BASE}/blog/${p.slug}</link>
      <guid isPermaLink="true">${BASE}/blog/${p.slug}</guid>
      <description>${esc(p.excerpt || "")}</description>
      <category>${esc(p.category || "")}</category>
      <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>
    </item>`
      )
      .join("\n");
  } catch {
    // empty feed body on DB failure — still valid RSS
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PolymarketFlow — Prediction Market Intelligence</title>
    <link>${BASE}</link>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Daily prediction-market briefings, whale activity and Polymarket guides from PolymarketFlow.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
