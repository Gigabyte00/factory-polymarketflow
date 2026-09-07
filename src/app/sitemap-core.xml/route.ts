import { NextResponse } from "next/server";

/**
 * /sitemap-core.xml — a small, database-free sitemap of the evergreen trackers,
 * the Perps hub and the Perps guides, with hand-maintained <lastmod> dates.
 *
 * Why a second feed: the main sitemap is built from the pmflow DB and a live
 * Perps API, and during the Jun–Sep 2026 ingest outage it silently collapsed.
 * This one cannot collapse, and it gets its own Discovered/Indexed line in
 * Search Console, so the pages that matter most are visible on their own.
 * Bump a lastmod when the page's content materially changes.
 */
export const dynamic = "force-static";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://polymarketflow.com";

type Entry = { path: string; lastmod: string; changefreq: string; priority: string };

const CORE: Entry[] = [
  // Perps hub + tools
  { path: "/perps", lastmod: "2026-09-05", changefreq: "weekly", priority: "0.9" },
  { path: "/perps/markets", lastmod: "2026-09-05", changefreq: "hourly", priority: "0.9" },
  { path: "/perps/calculator", lastmod: "2026-09-05", changefreq: "weekly", priority: "0.8" },
  // Perps guides (pmflow.posts, category = Perps)
  { path: "/blog/polymarket-perps-tutorial", lastmod: "2026-09-03", changefreq: "monthly", priority: "0.8" },
  { path: "/blog/perps-vs-predictions-polymarket", lastmod: "2026-09-03", changefreq: "monthly", priority: "0.7" },
  { path: "/blog/polymarket-perps-risk-math", lastmod: "2026-09-03", changefreq: "monthly", priority: "0.7" },
  { path: "/blog/polymarket-perps-fees", lastmod: "2026-09-04", changefreq: "monthly", priority: "0.8" },
  { path: "/blog/polymarket-perps-countries", lastmod: "2026-09-04", changefreq: "monthly", priority: "0.8" },
  { path: "/blog/polymarket-perps-referral-code", lastmod: "2026-09-04", changefreq: "monthly", priority: "0.8" },
  { path: "/blog/polymarket-perps-vs-hyperliquid", lastmod: "2026-09-04", changefreq: "monthly", priority: "0.7" },
  { path: "/blog/polymarket-perps-vs-kalshi", lastmod: "2026-09-04", changefreq: "monthly", priority: "0.7" },
  { path: "/blog/is-polymarket-perps-safe", lastmod: "2026-09-04", changefreq: "monthly", priority: "0.7" },
  // Evergreen live-data trackers
  { path: "/odds", lastmod: "2026-09-05", changefreq: "daily", priority: "0.8" },
  { path: "/odds/2026-midterms", lastmod: "2026-09-05", changefreq: "hourly", priority: "0.9" },
  { path: "/odds/fed-rate-cut", lastmod: "2026-09-05", changefreq: "hourly", priority: "0.9" },
  { path: "/biggest-polymarket-bets", lastmod: "2026-09-05", changefreq: "hourly", priority: "0.9" },
  { path: "/calendar", lastmod: "2026-09-05", changefreq: "daily", priority: "0.8" },
  { path: "/whale-tracker", lastmod: "2026-09-05", changefreq: "hourly", priority: "0.9" },
  { path: "/leaderboard", lastmod: "2026-09-05", changefreq: "hourly", priority: "0.8" },
  { path: "/markets", lastmod: "2026-09-05", changefreq: "hourly", priority: "0.9" },
  { path: "/tools", lastmod: "2026-09-05", changefreq: "weekly", priority: "0.7" },
  { path: "/affiliate-disclosure", lastmod: "2026-09-07", changefreq: "monthly", priority: "0.3" },
];

export function GET() {
  const urls = CORE.map(
    (u) =>
      `  <url><loc>${BASE}${u.path}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
  ).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
