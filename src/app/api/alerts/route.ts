import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
  });
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });
}

/**
 * POST /api/alerts - Create a new alert
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check tier
  const db = getDb();
  const { data: profile } = await db.from("users").select("tier").eq("id", user.id).single();
  const isPro = profile?.tier === "pro";

  // Free users get 3 alerts, Pro users get unlimited
  if (!isPro) {
    const { count } = await db
      .from("alert_rules")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count || 0) >= 3) {
      return NextResponse.json({
        error: "Free plan limited to 3 alerts. Upgrade to Pro for unlimited alerts.",
        limit: 3,
        current: count,
      }, { status: 403 });
    }
  }

  const body = await request.json();
  const { market_id, market_question, condition, threshold, channel } = body;

  if (!market_id || !condition || threshold === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data, error } = await db.from("alert_rules").insert({
    user_id: user.id,
    market_id,
    market_question: market_question || "",
    condition,
    threshold,
    channel: channel || "email",
    active: true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

/**
 * DELETE /api/alerts?id=xxx - Delete an alert
 */
export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const alertId = searchParams.get("id");
  if (!alertId) return NextResponse.json({ error: "Missing alert id" }, { status: 400 });

  const db = getDb();
  await db.from("alert_rules").delete().eq("id", alertId).eq("user_id", user.id);
  return NextResponse.json({ deleted: true });
}
