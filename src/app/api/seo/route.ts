import { NextResponse } from "next/server";

const INGEST_API_KEY = process.env.INGEST_API_KEY || "";

/**
 * POST /api/seo
 * Called daily by n8n to resubmit sitemap to Google Search Console.
 * Requires the SA credentials to be available as env vars.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${INGEST_API_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = {};

  // 1. Resubmit sitemap to GSC
  // This requires a Google service account JWT — we'll use the same one
  // For now, we can use the Webmasters API directly if we have SA credentials
  // Since SA credentials are on the local machine, this endpoint just does
  // what it can: validate sitemap and report stats

  try {
    // Verify our sitemap is accessible and valid
    const sitemapRes = await fetch("https://polymarketflow.com/sitemap.xml");
    const sitemapText = await sitemapRes.text();
    const urlCount = (sitemapText.match(/<loc>/g) || []).length;

    results.sitemap = {
      accessible: sitemapRes.ok,
      urls: urlCount,
      size_bytes: sitemapText.length,
    };
  } catch (err: any) {
    results.sitemap = { error: err.message };
  }

  // 2. Check key pages are accessible using HEAD requests (avoids triggering SSR)
  const keyPages = ["/", "/markets", "/whale-tracker", "/tools", "/alerts-feed", "/screener", "/blog", "/predictions/politics"];

  const checks = await Promise.all(
    keyPages.map(page =>
      fetch(`https://polymarketflow.com${page}`, { method: "HEAD" })
        .then(r => ({ page, status: r.status, ok: r.ok }))
        .catch(e => ({ page, status: 0, ok: false, error: (e as Error).message }))
    )
  );

  const pageChecks: Record<string, boolean> = {};
  for (const c of checks) {
    pageChecks[c.page] = c.ok;
  }

  results.page_checks = pageChecks;
  results.all_accessible = Object.values(pageChecks).every(Boolean);

  return NextResponse.json({
    status: results.all_accessible ? "healthy" : "issues",
    timestamp: new Date().toISOString(),
    results,
  });
}
