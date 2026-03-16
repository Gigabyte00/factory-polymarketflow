import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getStripe, PRICE_IDS, type BillingInterval } from "@/lib/stripe/config";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const billing = (body.billing as BillingInterval) || "monthly";

  if (!["monthly", "annual"].includes(billing)) {
    return NextResponse.json({ error: "Invalid billing interval. Use 'monthly' or 'annual'." }, { status: 400 });
  }

  const priceId = PRICE_IDS[billing];
  if (!priceId) {
    return NextResponse.json({ error: "Price not configured for this interval." }, { status: 500 });
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: {
        plan: "pro",
        billing,
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          plan: "pro",
          billing,
          user_id: user.id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
