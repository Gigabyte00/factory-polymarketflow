import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/config";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "pmflow" } }
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const plan = session.metadata?.plan || "pro";

        if (userId) {
          // Update user tier
          await db.from("users").update({
            tier: plan,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          }).eq("id", userId);

          // Create subscription record
          await db.from("subscriptions").upsert({
            id: session.subscription as string,
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_price_id: session.metadata?.price_id || "",
            status: "active",
            current_period_start: new Date().toISOString(),
          }, { onConflict: "id" });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        await db.from("subscriptions").update({
          status: sub.status,
          cancel_at_period_end: sub.cancel_at_period_end,
          current_period_start: sub.current_period_start
            ? new Date(sub.current_period_start * 1000).toISOString()
            : undefined,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : undefined,
        }).eq("id", sub.id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        await db.from("subscriptions").update({ status: "canceled" }).eq("id", sub.id);

        // Downgrade user to free
        const { data: subscription } = await db
          .from("subscriptions")
          .select("user_id")
          .eq("id", sub.id)
          .single();

        if (subscription) {
          await db.from("users").update({ tier: "free" }).eq("id", subscription.user_id);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subId = invoice.subscription;
        if (subId) {
          await db.from("subscriptions").update({ status: "past_due" }).eq("id", subId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
