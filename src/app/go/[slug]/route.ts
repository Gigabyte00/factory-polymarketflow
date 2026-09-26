import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

import pmflowMap from "@/generated/pmflow-map.json";

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
 * Fail-safe order: DB row -> (only if the DB is UNAVAILABLE) build-time snapshot -> site homepage.
 * A row with active=false is a kill switch (redirects to the homepage). A genuine miss goes
 * straight to the homepage — the snapshot is for outages, not for resurrecting deleted rows.
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

/**
 * Build-time snapshot of pmflow.outbound_links (scripts/build_pmflow_map.mjs, npm `prebuild`).
 * Consulted ONLY when the database is unavailable — never on a genuine miss.
 *
 * This replaced a hand-maintained FALLBACK_LINKS table that had silently drifted. The monetized
 * destinations went live 2026-09-03 (migrations/README.md), but the table — last written in the
 * 2026-09-20 outage-hardening commit itself — still held the pre-launch URLs. So every outage sent
 * 100% of traffic to a bare polymarket.com with no ?via= referral: the redirect worked and earned
 * nothing. A snapshot rebuilt from the database on every deploy cannot drift; a hand-maintained
 * table IS the drift mechanism.
 *
 * ⚠ The referral lives in the destination's QUERY STRING (…?via=merchant-dash), which is what makes
 * appendPath safe: assigning URL.pathname leaves `search` untouched, so ?to=event/x yields
 * https://polymarket.com/event/x?via=merchant-dash. If the referral is ever moved into the PATH,
 * appendPath will clobber it.
 */
interface SnapLink {
  d: string;
  p: boolean;
  o: string | null;
}
interface PmflowMap {
  meta: { built_at: string | null; count: number; empty: boolean };
  links: Record<string, SnapLink>;
}
const SNAPSHOT = pmflowMap as unknown as PmflowMap;

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

// Outage hardening (2026-09-20, Block 12 §9): the fleet's PostgREST saturations (09-16, 09-20) make
// requests HANG rather than fail — the catch below never fires and the redirect hangs with it. Bound
// the lookup so a hung database degrades to the snapshot instead of holding the connection open.
const LOOKUP_BUDGET_MS = 2500;

/**
 * Why this is a union and not `LinkRow | null` (2026-09-26): a bare `null` meant FOUR different
 * things — missing env, query error, timeout, and a genuine "no such row" — so the caller could not
 * tell "the database is down" from "that slug does not exist" and had to treat them identically.
 * Information destroyed at this boundary cannot be recovered downstream, which is precisely what
 * made a correct fallback inexpressible. Only `unavailable` may consult the snapshot.
 */
type Lookup =
  | { kind: "row"; row: LinkRow }
  | { kind: "miss" }
  | { kind: "unavailable"; reason: string };

async function lookupLink(slug: string): Promise<Lookup> {
  try {
    if (!envOk()) return { kind: "unavailable", reason: "no-env" };
    const q = pmflowDb()
      .from("outbound_links")
      .select("destination, append_path, active, offer_id")
      .eq("slug", slug)
      .single();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const { data, error } = await Promise.race([
      q as unknown as Promise<{ data: unknown; error: { code?: string; message: string } | null }>,
      new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error(`db-timeout after ${LOOKUP_BUDGET_MS}ms`)), LOOKUP_BUDGET_MS); }),
    ]).finally(() => clearTimeout(timer));
    if (error) {
      // PGRST116 is .single() finding zero rows — the database ANSWERED, the slug simply is not there.
      if (error.code === "PGRST116") return { kind: "miss" };
      console.error(`[go] outbound_links lookup failed for "${slug}":`, error.message);
      return { kind: "unavailable", reason: error.message };
    }
    return data ? { kind: "row", row: data as LinkRow } : { kind: "miss" };
  } catch (e) {
    const reason = (e as Error).message;
    console.error(`[go] outbound_links lookup threw for "${slug}":`, reason);
    return { kind: "unavailable", reason };
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

  const look = await lookupLink(slug);

  // Kill switch: the row exists and was deactivated. Reachable only when the database ANSWERED, so
  // it always wins over the snapshot — a link killed before the last build is absent from the
  // snapshot anyway (the generator bakes active rows only).
  if (look.kind === "row" && look.row.active === false) {
    return redirect(homeUrl);
  }

  let destination: string | undefined;
  let appendPath = false;
  let offerId: string | null = null;

  if (look.kind === "row") {
    destination = look.row.destination;
    appendPath = look.row.append_path === true;
    offerId = look.row.offer_id;
  } else if (look.kind === "unavailable") {
    // Database unavailable — answer from the build-time snapshot rather than bouncing to the
    // homepage. A genuine `miss` deliberately does NOT land here: a row that was deleted should
    // stop redirecting, not keep working until the next deploy.
    const snap = SNAPSHOT.links[slug];
    if (snap) {
      destination = snap.d;
      appendPath = snap.p;
      offerId = snap.o;
    }
    console.warn(`[go] db-fallback slug=${slug} kind=${snap ? "redirect" : "unavailable"} reason=${look.reason}`);
  }

  if (!destination) {
    return redirect(homeUrl);
  }

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

  // Also attempted on the snapshot path — best-effort only: during a true outage this insert fails
  // too (it is fire-and-forget inside after(), so it can never slow or break the redirect). The win
  // from the snapshot is destination coverage, not measurement.
  if (offerId && request.method !== "HEAD" && envOk()) {
    logClick(request, offerId);
  }

  return redirect(target);
}
