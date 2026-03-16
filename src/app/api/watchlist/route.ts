import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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
  const isPro = profile?.tier === "pro";

  if (body.action === "create_watchlist") {
    // Free: max 2, Pro: unlimited
    if (!isPro) {
      const { count } = await db.from("watchlists").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      if ((count || 0) >= 2) {
        return NextResponse.json({ error: "Free plan limited to 2 watchlists. Upgrade to Pro for unlimited.", limit: 2 }, { status: 403 });
      }
    }
    const { data, error } = await db.from("watchlists").insert({ user_id: user.id, name: body.name || "My Watchlist" }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  if (body.action === "add_item") {
    if (!body.watchlist_id || !body.event_id) {
      return NextResponse.json({ error: "watchlist_id and event_id required" }, { status: 400 });
    }
    // Verify watchlist belongs to user
    const { data: wl } = await db.from("watchlists").select("id").eq("id", body.watchlist_id).eq("user_id", user.id).single();
    if (!wl) return NextResponse.json({ error: "Watchlist not found" }, { status: 404 });

    // Free: max 10 items, Pro: unlimited
    if (!isPro) {
      const { count } = await db.from("watchlist_items").select("id", { count: "exact", head: true }).eq("watchlist_id", body.watchlist_id);
      if ((count || 0) >= 10) {
        return NextResponse.json({ error: "Free plan limited to 10 items per watchlist. Upgrade to Pro.", limit: 10 }, { status: 403 });
      }
    }
    const { data, error } = await db.from("watchlist_items").upsert({ watchlist_id: body.watchlist_id, event_id: body.event_id }, { onConflict: "watchlist_id,event_id" }).select().single();
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
