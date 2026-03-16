import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getStripe, getPriceId, type PlanType, type BillingInterval } from "@/lib/stripe/config";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const plan = (body.plan as PlanType) || "pro";
  const billing = (body.billing as BillingInterval) || "monthly";

  if (!["starter", "pro"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan. Use 'starter' or 'pro'." }, { status: 400 });
  }

  const priceId = getPriceId(plan, billing);
  if (!priceId) {
    return NextResponse.json({ error: "Price not configured." }, { status: 500 });
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success&plan=${plan}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
      client_reference_id: user.id,
      customer_email: user.email,
      subscription_data: {
        trial_period_days: 7, // 7-day free trial
        metadata: { plan, billing, user_id: user.id },
      },
      metadata: { plan, billing, user_id: user.id },
    });
    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
