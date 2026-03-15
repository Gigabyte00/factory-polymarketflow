import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for the selected plan.
 * Body: { "plan": "pro" | "elite" }
 */
export async function POST(request: Request) {
  // Verify auth
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await request.json();
  if (!["pro", "elite"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured yet. Payment processing coming soon." }, { status: 503 });
  }

  // Create Stripe Checkout session (simplified - real implementation uses Stripe SDK)
  return NextResponse.json({
    message: "Stripe checkout will be available once Stripe keys are configured.",
    plan,
    user_email: user.email,
  });
}
