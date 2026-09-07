import { MetadataRoute } from "next";

/**
 * /go/ is deliberately NOT disallowed: with it blocked, Googlebot never fetched
 * the redirects, never saw their X-Robots-Tag: noindex, and indexed externally
 * linked /go/ URLs "URL-only" (a /go/polymarket?to=event/… URL was earning
 * impressions). Letting it crawl means it follows the 302 off-site and drops
 * the URL. On-site links to /go/ still carry rel="sponsored nofollow".
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://polymarketflow.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/alerts", "/whales", "/portfolio", "/briefings", "/settings"],
      },
    ],
    sitemap: [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap-core.xml`],
  };
}
