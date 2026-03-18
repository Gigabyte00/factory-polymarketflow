import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const INGEST_API_KEY = process.env.INGEST_API_KEY || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || "";

/**
 * POST /api/alerts/check
 * Processes all active alert rules against current market prices.
 * Called by n8n every 5 minutes.
 * - Checks each rule's condition vs current price
 * - Sends email/Slack for triggered alerts
 * - Logs to alert_history
 * - Rate limits: won't re-trigger same alert within 1 hour
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${INGEST_API_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "pmflow" } }
  );

  // 1. Fetch all active alert rules with user info
  const { data: rules } = await db
    .from("alert_rules")
    .select("*, users(email, alert_email_enabled, alert_slack_enabled, slack_webhook_url)")
    .eq("active", true);

  if (!rules || rules.length === 0) {
    return NextResponse.json({ status: "no_rules", checked: 0, triggered: 0 });
  }

  // 2. Get unique market IDs from rules
  const marketIds = [...new Set(rules.map((r: any) => r.market_id).filter(Boolean))];

  // 3. Fetch current prices for those markets
  const { data: markets } = await db
    .from("markets")
    .select("id, outcome_prices, question")
    .in("id", marketIds);

  const priceMap: Record<string, number> = {};
  const questionMap: Record<string, string> = {};
  for (const m of markets || []) {
    priceMap[m.id] = m.outcome_prices?.[0] || 0.5;
    questionMap[m.id] = m.question || "";
  }

  // 4. Check each rule
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  let triggered = 0;
  let checked = 0;
  let emailed = 0;
  let slacked = 0;

  for (const rule of rules) {
    checked++;
    const currentPrice = priceMap[rule.market_id];
    if (currentPrice === undefined) continue;

    // Rate limit: skip if triggered within last hour
    if (rule.last_triggered_at && rule.last_triggered_at > oneHourAgo) continue;

    // Check condition
    let shouldTrigger = false;
    if (rule.condition === "above" && currentPrice >= rule.threshold) shouldTrigger = true;
    if (rule.condition === "below" && currentPrice <= rule.threshold) shouldTrigger = true;
    if (rule.condition === "crosses") {
      // For "crosses", trigger if price is within 2% of threshold
      shouldTrigger = Math.abs(currentPrice - rule.threshold) <= 0.02;
    }

    if (!shouldTrigger) continue;

    triggered++;
    const user = (rule as any).users;
    const marketQuestion = rule.market_question || questionMap[rule.market_id] || "Unknown Market";
    const pricePercent = (currentPrice * 100).toFixed(1);
    const thresholdPercent = (rule.threshold * 100).toFixed(1);

    // 5. Send notifications
    const channel = rule.channel || "email";

    // Email
    if ((channel === "email" || channel === "both") && user?.email && RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "PolymarketFlow <noreply@polymarketflow.com>",
            to: [user.email],
            subject: `Alert: ${marketQuestion.substring(0, 50)} — ${pricePercent}%`,
            html: `
              <div style="font-family:system-ui;max-width:500px;margin:0 auto;background:#0d1117;color:#e2e8f0;padding:24px;border-radius:8px;">
                <h2 style="color:#22c55e;margin:0 0 16px;">Price Alert Triggered</h2>
                <p style="margin:0 0 8px;"><strong>${marketQuestion}</strong></p>
                <p style="margin:0 0 8px;">Current price: <strong style="color:#22c55e;">${pricePercent}%</strong></p>
                <p style="margin:0 0 8px;">Your alert: ${rule.condition} ${thresholdPercent}%</p>
                <p style="margin:16px 0 0;"><a href="https://polymarketflow.com/market/${rule.market_id}" style="color:#22c55e;">View Market →</a></p>
                <hr style="border-color:#1e293b;margin:16px 0;">
                <p style="color:#64748b;font-size:12px;margin:0;">PolymarketFlow • <a href="https://polymarketflow.com/alerts" style="color:#64748b;">Manage alerts</a></p>
              </div>
            `,
          }),
        });
        emailed++;
      } catch {}
    }

    // Slack
    if ((channel === "slack" || channel === "both") && SLACK_WEBHOOK_URL) {
      try {
        await fetch(SLACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `🔔 Alert: *${marketQuestion.substring(0, 60)}* — now at ${pricePercent}% (trigger: ${rule.condition} ${thresholdPercent}%)`,
          }),
        });
        slacked++;
      } catch {}
    }

    // 6. Log to alert_history
    await db.from("alert_history").insert({
      alert_rule_id: rule.id,
      user_id: rule.user_id,
      market_id: rule.market_id,
      market_question: marketQuestion,
      condition: rule.condition,
      threshold: rule.threshold,
      actual_price: currentPrice,
      channel,
      delivered: true,
      delivered_at: new Date().toISOString(),
    });

    // 7. Update last_triggered_at
    await db.from("alert_rules").update({ last_triggered_at: new Date().toISOString() }).eq("id", rule.id);
  }

  return NextResponse.json({
    status: "processed",
    checked,
    triggered,
    emailed,
    slacked,
    timestamp: new Date().toISOString(),
  });
}
