import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

/**
 * GET /go/<slug> — outbound link redirect (affiliate-swappable) + click log.
 *
 * Destinations are DATA, not code: rows in pmflow.outbound_links (see
 * migrations/001_perps_launch.sql). Swapping a link to a Dub deeplink or a
 * referral URL is a single-row UPDATE — no deploy (procedure in
 * migrations/README.md).
 *
 * Optional `?to=<relative-path>` deep-links under the destination when the
 * row has append_path=true (used by market pages:
 * /go/polymarket?to=event/<event-slug> -> https://polymarket.com/event/<event-slug>).
 * The suffix is sanitized to a plain relative path — no scheme/host/.. — so
 * this can't be abused as an open redirect.
 *
 * Fail-safe order: DB row -> FALLBACK_LINKS -> site homepage. A row with
 * active=false is a kill switch (redirects to the homepage).
 *
 * MEASUREMENT: every tracked redirect (row has offer_id) writes one row to the
 * fleet table public.offer_clicks AFTER the 302 has been sent (`after()`), so
 * logging can never slow or break the redirect. A redirect that works is not
 * the same as a redirect that is measured — until 2026-09-07 this route logged
 * nothing and the only click counter for the site lived in Dub's dashboard.
 * Bot/monitor filtering happens in the view public.v_real_offer_clicks, not here.
 * Prefetches (Next-Router-Prefetch / Sec-Purpose: prefetch) get a 204 before
 * any DB work so they neither log nor redirect. HEAD (auto-derived from GET by
 * Next) redirects but never logs.
 */

export const dynamic = "force-dynamic";

/** public.sites row for polymarketflow in the fleet DB (offer_clicks.site_id). */
const SITE_ID = "412d27f3-f75b-4fc3-a415-929217ef1f66";

const FALLBACK_LINKS: Record<string, { destination: string; appendPath: boolean }> = {
  polymarket: { destination: "https://polymarket.com", appendPath: true },
  "polymarket-perps": { destination: "https://polymarket.com/perps", appendPath: false },
};

interface LinkRow {
  destination: string;
  append_path: boolean | null;
  active: boolean | null;
  offer_id: string | null;
}

function envOk(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function pmflowDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "pmflow" } }
  );
}

/** Default (public) schema — where the fleet's offer_clicks table lives. */
function publicDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function lookupLink(slug: string): Promise<LinkRow | null> {
  try {
    if (!envOk()) return null;
    const { data, error } = await pmflowDb()
      .from("outbound_links")
      .select("destination, append_path, active, offer_id")
      .eq("slug", slug)
      .single();
    if (error) {
      // Loud: a failed lookup means the UNTRACKED fallback destination is about to be used.
      if (error.code !== "PGRST116") console.error(`[go] outbound_links lookup failed for "${slug}":`, error.message);
      return null;
    }
    return (data as LinkRow) ?? null;
  } catch (e) {
    console.error(`[go] outbound_links lookup threw for "${slug}":`, (e as Error).message);
    return null;
  }
}

/** Allow only a plain relative path segment list: letters/digits/-/_ and single slashes. */
function sanitizePathSuffix(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/^\/+/, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9/_-]*$/.test(cleaned)) return null;
  if (cleaned.includes("//") || cleaned.includes("..")) return null;
  return cleaned;
}

/** Browser/router prefetch — answer empty, log nothing, redirect nothing. */
function isPrefetch(request: NextRequest): boolean {
  const purpose = `${request.headers.get("purpose") ?? ""} ${request.headers.get("sec-purpose") ?? ""}`;
  return request.headers.get("next-router-prefetch") === "1" || /prefetch/i.test(purpose);
}

function redirect(url: URL): NextResponse {
  const res = NextResponse.redirect(url, 302);
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Referrer-Policy", "no-referrer-when-downgrade");
  return res;
}

/** Queue the click row; runs after the response is sent. Never throws into the request. */
function logClick(request: NextRequest, offerId: string): void {
  const ipRaw =
    (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "";
  const ip_hash = ipRaw ? createHash("sha256").update(ipRaw).digest("hex").slice(0, 32) : null;
  const q = request.nextUrl.searchParams;
  const row = {
    offer_id: offerId,
    site_id: SITE_ID,
    referrer: (request.headers.get("referer") ?? "").slice(0, 500),
    user_agent: (request.headers.get("user-agent") ?? "").slice(0, 300),
    ip_hash,
    utm_source: q.get("utm_source"),
    utm_medium: q.get("utm_medium"),
    utm_campaign: q.get("utm_campaign"),
  };
  after(async () => {
    try {
      const { error } = await publicDb().from("offer_clicks").insert(row);
      if (error) console.error("[go] offer_clicks insert failed:", error.message);
    } catch (e) {
      console.error("[go] offer_clicks insert threw:", (e as Error).message);
    }
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (isPrefetch(request)) {
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  const { slug } = await params;
  const homeUrl = new URL("/", request.url);

  const row = await lookupLink(slug);

  // Kill switch: row exists but was deactivated.
  if (row && row.active === false) {
    return redirect(homeUrl);
  }

  const fallback = FALLBACK_LINKS[slug];
  const destination = row?.destination || fallback?.destination;
  if (!destination) {
    return redirect(homeUrl);
  }
  if (!row && fallback) {
    console.error(`[go] no outbound_links row for "${slug}" — serving UNTRACKED fallback ${fallback.destination}`);
  }

  const appendPath = row ? row.append_path === true : fallback?.appendPath === true;

  let target: URL;
  try {
    target = new URL(destination);
    if (target.protocol !== "https:" && target.protocol !== "http:") throw new Error("bad protocol");
  } catch {
    return redirect(homeUrl);
  }

  if (appendPath) {
    const suffix = sanitizePathSuffix(request.nextUrl.searchParams.get("to"));
    if (suffix) {
      target.pathname = `${target.pathname.replace(/\/+$/, "")}/${suffix}`;
    }
  }

  if (row?.offer_id && request.method !== "HEAD" && envOk()) {
    logClick(request, row.offer_id);
  }

  return redirect(target);
}
