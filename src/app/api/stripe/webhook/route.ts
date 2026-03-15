import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/stripe/webhook
 * Handles Stripe webhook events for subscription management.
 */
export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  // In production, verify the webhook signature here with Stripe SDK
  // For now, return placeholder
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  try {
    const event = JSON.parse(body);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const tier = session.metadata?.plan || "pro";

        if (userId) {
          await db.from("users").update({
            tier,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
          }).eq("id", userId);

          await db.from("subscriptions").upsert({
            id: session.subscription,
            user_id: userId,
            stripe_customer_id: session.customer,
            stripe_price_id: session.metadata?.price_id || "",
            status: "active",
            current_period_start: new Date().toISOString(),
          }, { onConflict: "id" });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await db.from("subscriptions").update({ status: "canceled" }).eq("id", sub.id);
        // Downgrade user to free
        const { data: subscription } = await db.from("subscriptions").select("user_id").eq("id", sub.id).single();
        if (subscription) {
          await db.from("users").update({ tier: "free" }).eq("id", subscription.user_id);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
