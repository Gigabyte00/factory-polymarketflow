import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/stripe/config";

const SUPPORT_EMAIL = "support@polymarketflow.com";

async function sendNotificationEmail(subject: string, html: string) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "PolymarketFlow <noreply@polymarketflow.com>",
        to: [SUPPORT_EMAIL],
        subject,
        html,
      }),
    });
  } catch {
    // Don't fail the webhook if email fails
  }
}

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
        const billing = session.metadata?.billing || "monthly";

        if (userId) {
          await db.from("users").update({
            tier: plan,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          }).eq("id", userId);

          await db.from("subscriptions").upsert({
            id: session.subscription as string,
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_price_id: session.metadata?.price_id || "",
            status: "active",
            current_period_start: new Date().toISOString(),
          }, { onConflict: "id" });

          // Send notification
          await sendNotificationEmail(
            `New Subscription: ${plan} (${billing})`,
            `<h2>New Subscription</h2>
            <p><strong>Plan:</strong> ${plan} (${billing})</p>
            <p><strong>Customer:</strong> ${session.customer_email || session.customer}</p>
            <p><strong>Subscription:</strong> ${session.subscription}</p>
            <p><strong>User ID:</strong> ${userId}</p>
            <p><strong>Amount:</strong> ${billing === "annual" ? "$1,990/yr" : "$199/mo"}</p>
            <p style="color:#22c55e;font-weight:bold;">Payment successful!</p>`
          );
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

        if (sub.cancel_at_period_end) {
          await sendNotificationEmail(
            "Subscription Cancellation Pending",
            `<h2>Subscription Cancellation</h2>
            <p>A subscription is set to cancel at period end.</p>
            <p><strong>Subscription:</strong> ${sub.id}</p>
            <p><strong>Customer:</strong> ${sub.customer}</p>
            <p><strong>Cancels at:</strong> ${sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : "unknown"}</p>`
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        await db.from("subscriptions").update({ status: "canceled" }).eq("id", sub.id);

        const { data: subscription } = await db
          .from("subscriptions")
          .select("user_id")
          .eq("id", sub.id)
          .single();

        if (subscription) {
          await db.from("users").update({ tier: "free" }).eq("id", subscription.user_id);
        }

        await sendNotificationEmail(
          "Subscription Canceled",
          `<h2>Subscription Canceled</h2>
          <p><strong>Subscription:</strong> ${sub.id}</p>
          <p><strong>Customer:</strong> ${sub.customer}</p>
          <p>User has been downgraded to free tier.</p>`
        );
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        await sendNotificationEmail(
          `Payment Received: $${(invoice.amount_paid / 100).toFixed(2)}`,
          `<h2>Payment Received</h2>
          <p><strong>Amount:</strong> $${(invoice.amount_paid / 100).toFixed(2)}</p>
          <p><strong>Customer:</strong> ${invoice.customer_email || invoice.customer}</p>
          <p><strong>Invoice:</strong> ${invoice.id}</p>
          <p><strong>Status:</strong> ${invoice.status}</p>
          <p style="color:#22c55e;">Payment successful</p>`
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const subId = invoice.subscription;
        if (subId) {
          await db.from("subscriptions").update({ status: "past_due" }).eq("id", subId);
        }

        await sendNotificationEmail(
          "ALERT: Payment Failed",
          `<h2 style="color:#ef4444;">Payment Failed</h2>
          <p><strong>Customer:</strong> ${invoice.customer_email || invoice.customer}</p>
          <p><strong>Amount:</strong> $${(invoice.amount_due / 100).toFixed(2)}</p>
          <p><strong>Invoice:</strong> ${invoice.id}</p>
          <p><strong>Subscription:</strong> ${invoice.subscription}</p>
          <p>Subscription has been marked as past_due.</p>`
        );
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
