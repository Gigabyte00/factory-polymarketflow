import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getWatchlistItemLimit, getWatchlistLimit, isStarter } from "@/lib/entitlements";

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
  });
  return (await supabase.auth.getUser()).data.user;
}

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });
}

/** GET /api/watchlist — list user's watchlists with items */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const { data: watchlists } = await db
    .from("watchlists")
    .select("*, watchlist_items(id, event_id, added_at, events(title, slug, image, volume_24h, category))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ watchlists: watchlists || [] });
}

/** POST /api/watchlist — create watchlist or add item */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const body = await request.json();

  // Check tier limits
  const { data: profile } = await db.from("users").select("tier").eq("id", user.id).single();
  const hasStarter = isStarter(profile);
  const wlLimit = getWatchlistLimit(profile);
  const itemLimit = getWatchlistItemLimit(profile);

  if (body.action === "create_watchlist") {
    // Free: max 2, Pro: unlimited
    if (!hasStarter && wlLimit !== null) {
      const { count } = await db.from("watchlists").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      if ((count || 0) >= wlLimit) {
        return NextResponse.json({ error: `Free plan limited to ${wlLimit} watchlists. Upgrade to Starter for unlimited.`, limit: wlLimit }, { status: 403 });
      }
    }
    const { data, error } = await db.from("watchlists").insert({ user_id: user.id, name: body.name || "My Watchlist" }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  if (body.action === "add_item") {
    if (!body.event_id) {
      return NextResponse.json({ error: "event_id required" }, { status: 400 });
    }

    let watchlistId = body.watchlist_id;
    let wl = null;
    if (watchlistId) {
      const res = await db.from("watchlists").select("id").eq("id", watchlistId).eq("user_id", user.id).single();
      wl = res.data;
    } else {
      const existing = await db.from("watchlists").select("id").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).single();
      wl = existing.data;
      if (!wl) {
        if (!hasStarter && wlLimit !== null) {
          const { count } = await db.from("watchlists").select("id", { count: "exact", head: true }).eq("user_id", user.id);
          if ((count || 0) >= wlLimit) {
            return NextResponse.json({ error: `Free plan limited to ${wlLimit} watchlists. Upgrade to Starter for unlimited.`, limit: wlLimit }, { status: 403 });
          }
        }
        const created = await db.from("watchlists").insert({ user_id: user.id, name: "My Watchlist" }).select().single();
        wl = created.data;
      }
      watchlistId = wl?.id;
    }

    if (!wl) return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });

    // Free: max 10 items, Starter/Pro: unlimited
    if (!hasStarter && itemLimit !== null) {
      const { count } = await db.from("watchlist_items").select("id", { count: "exact", head: true }).eq("watchlist_id", watchlistId);
      if ((count || 0) >= itemLimit) {
        return NextResponse.json({ error: `Free plan limited to ${itemLimit} items per watchlist. Upgrade to Starter.`, limit: itemLimit }, { status: 403 });
      }
    }
    const { data, error } = await db.from("watchlist_items").upsert({ watchlist_id: watchlistId, event_id: body.event_id }, { onConflict: "watchlist_id,event_id" }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/** DELETE /api/watchlist — remove item or watchlist */
export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("item_id");
  const watchlistId = searchParams.get("watchlist_id");

  const db = getDb();
  if (itemId) {
    await db.from("watchlist_items").delete().eq("id", itemId);
  } else if (watchlistId) {
    await db.from("watchlists").delete().eq("id", watchlistId).eq("user_id", user.id);
  }
  return NextResponse.json({ deleted: true });
}
