import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /go/<slug> — outbound link redirect (affiliate-swappable).
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
 * active=false is a kill switch (redirects to the homepage). /go/ is
 * disallowed in robots.ts and links to it carry rel="sponsored nofollow".
 */

export const dynamic = "force-dynamic";

const FALLBACK_LINKS: Record<string, { destination: string; appendPath: boolean }> = {
  polymarket: { destination: "https://polymarket.com", appendPath: true },
  "polymarket-perps": { destination: "https://polymarket.com/perps", appendPath: false },
};

interface LinkRow {
  destination: string;
  append_path: boolean | null;
  active: boolean | null;
}

async function lookupLink(slug: string): Promise<LinkRow | null> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return null;
    }
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: "pmflow" } }
    );
    const { data, error } = await db
      .from("outbound_links")
      .select("destination, append_path, active")
      .eq("slug", slug)
      .single();
    if (error || !data) return null;
    return data as LinkRow;
  } catch {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const homeUrl = new URL("/", request.url);

  const row = await lookupLink(slug);

  // Kill switch: row exists but was deactivated.
  if (row && row.active === false) {
    return NextResponse.redirect(homeUrl, 302);
  }

  const fallback = FALLBACK_LINKS[slug];
  const destination = row?.destination || fallback?.destination;
  if (!destination) {
    return NextResponse.redirect(homeUrl, 302);
  }

  const appendPath = row ? row.append_path === true : fallback?.appendPath === true;

  let target: URL;
  try {
    target = new URL(destination);
    if (target.protocol !== "https:" && target.protocol !== "http:") throw new Error("bad protocol");
  } catch {
    return NextResponse.redirect(homeUrl, 302);
  }

  if (appendPath) {
    const suffix = sanitizePathSuffix(request.nextUrl.searchParams.get("to"));
    if (suffix) {
      target.pathname = `${target.pathname.replace(/\/+$/, "")}/${suffix}`;
    }
  }

  return NextResponse.redirect(target, 302);
}
