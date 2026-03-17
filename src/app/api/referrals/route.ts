import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });
  const [profileRes, referralsRes] = await Promise.all([
    db.from("users").select("referral_code, referred_by").eq("id", user.id).single(),
    db.from("referrals").select("status, reward_applied, referred_email, created_at").eq("referrer_user_id", user.id).order("created_at", { ascending: false }),
  ]);

  const referrals = referralsRes.data || [];
  return NextResponse.json({
    referral_code: profileRes.data?.referral_code || null,
    referred_by: profileRes.data?.referred_by || null,
    stats: {
      total: referrals.length,
      signed_up: referrals.filter((r: any) => r.status === "signed_up" || r.status === "subscribed").length,
      subscribed: referrals.filter((r: any) => r.status === "subscribed").length,
      rewards: referrals.filter((r: any) => r.reward_applied).length,
    },
    referrals,
  });
}
