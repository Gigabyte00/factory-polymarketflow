import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const INGEST_API_KEY = process.env.INGEST_API_KEY || "";

/**
 * POST /api/newsletter
 * Generates and sends the daily "Morning Odds" email digest.
 * Called by n8n daily at 7am ET.
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

  // 1. Get top movers (biggest price changes)
  const { data: movers } = await db
    .from("markets")
    .select("question, one_day_price_change, outcome_prices, volume_24h, events!inner(slug, title)")
    .eq("active", true)
    .not("one_day_price_change", "is", null)
    .order("volume_24h", { ascending: false, nullsFirst: false })
    .limit(100);

  const topGainers = (movers || [])
    .filter((m: any) => (m.one_day_price_change || 0) > 1)
    .sort((a: any, b: any) => b.one_day_price_change - a.one_day_price_change)
    .slice(0, 5);

  const topLosers = (movers || [])
    .filter((m: any) => (m.one_day_price_change || 0) < -1)
    .sort((a: any, b: any) => a.one_day_price_change - b.one_day_price_change)
    .slice(0, 5);

  // 2. Get recent whale activity (new large holders)
  const { data: whaleActivity } = await db
    .from("top_holders")
    .select("wallet_name, wallet_address, amount, markets(question, events(slug))")
    .order("snapshot_at", { ascending: false })
    .gt("amount", 5000)
    .limit(5);

  // 3. Platform stats
  const { count: activeMarkets } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("active", true);

  // 4. Build email HTML
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const moverRow = (m: any, direction: "up" | "down") => {
    const price = ((m.outcome_prices?.[0] || 0.5) * 100).toFixed(0);
    const change = m.one_day_price_change || 0;
    const color = direction === "up" ? "#22c55e" : "#ef4444";
    const sign = change > 0 ? "+" : "";
    const title = m.events?.title || m.question || "Unknown";
    const slug = m.events?.slug || "";
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #1e293b;">
        <a href="https://polymarketflow.com/market/${slug}" style="color:#e2e8f0;text-decoration:none;">${title.substring(0, 60)}</a>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #1e293b;text-align:right;font-family:monospace;">${price}%</td>
      <td style="padding:8px 12px;border-bottom:1px solid #1e293b;text-align:right;font-family:monospace;color:${color};">${sign}${change.toFixed(1)}%</td>
    </tr>`;
  };

  const whaleRow = (h: any) => {
    const name = h.wallet_name || `${(h.wallet_address || "").slice(0, 6)}...`;
    const market = h.markets?.question?.substring(0, 50) || "Unknown market";
    const amount = h.amount >= 1000 ? `$${(h.amount / 1000).toFixed(1)}K` : `$${h.amount.toFixed(0)}`;
    return `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #1e293b;color:#22c55e;">${name}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #1e293b;color:#94a3b8;">${market}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #1e293b;text-align:right;font-family:monospace;">${amount}</td>
    </tr>`;
  };

  const emailHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0d1117;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  
  <div style="text-align:center;padding:20px 0;border-bottom:1px solid #1e293b;">
    <span style="font-size:24px;font-weight:bold;"><span style="color:#22c55e;">Polymarket</span><span style="color:#e2e8f0;">Flow</span></span>
    <p style="color:#64748b;font-size:13px;margin:4px 0 0;">Morning Odds &mdash; ${today}</p>
  </div>

  <div style="padding:20px 0;">
    <h2 style="font-size:16px;margin:0 0 12px;color:#22c55e;">Top Gainers</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr style="color:#64748b;font-size:11px;text-transform:uppercase;">
        <th style="text-align:left;padding:4px 12px;">Market</th>
        <th style="text-align:right;padding:4px 12px;">Price</th>
        <th style="text-align:right;padding:4px 12px;">24h</th>
      </tr>
      ${topGainers.map((m: any) => moverRow(m, "up")).join("")}
    </table>
  </div>

  <div style="padding:20px 0;">
    <h2 style="font-size:16px;margin:0 0 12px;color:#ef4444;">Top Losers</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr style="color:#64748b;font-size:11px;text-transform:uppercase;">
        <th style="text-align:left;padding:4px 12px;">Market</th>
        <th style="text-align:right;padding:4px 12px;">Price</th>
        <th style="text-align:right;padding:4px 12px;">24h</th>
      </tr>
      ${topLosers.map((m: any) => moverRow(m, "down")).join("")}
    </table>
  </div>

  ${whaleActivity && whaleActivity.length > 0 ? `
  <div style="padding:20px 0;border-top:1px solid #1e293b;">
    <h2 style="font-size:16px;margin:0 0 12px;">Whale Activity</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      ${whaleActivity.map((h: any) => whaleRow(h)).join("")}
    </table>
  </div>
  ` : ""}

  <div style="padding:20px 0;border-top:1px solid #1e293b;text-align:center;">
    <p style="color:#64748b;font-size:12px;">Tracking ${activeMarkets || 0} active markets</p>
    <a href="https://polymarketflow.com/markets" style="display:inline-block;padding:10px 24px;background:#22c55e;color:#000;text-decoration:none;border-radius:6px;font-weight:bold;font-size:14px;margin:8px 0;">Explore Markets</a>
    <p style="color:#64748b;font-size:11px;margin-top:16px;">
      <a href="https://polymarketflow.com/movers" style="color:#22c55e;text-decoration:none;">Market Movers</a> &bull;
      <a href="https://polymarketflow.com/leaderboard" style="color:#22c55e;text-decoration:none;">Leaderboard</a> &bull;
      <a href="https://polymarketflow.com/pricing" style="color:#22c55e;text-decoration:none;">Get Pro Access</a>
    </p>
  </div>

  <div style="padding:16px 0;border-top:1px solid #1e293b;text-align:center;color:#475569;font-size:10px;">
    <p>PolymarketFlow &bull; polymarketflow.com</p>
    <p>Data for informational purposes only. Not financial advice.</p>
  </div>

</div>
</body></html>`;

  // 5. Get subscribers (all users with email alerts enabled)
  const { data: subscribers } = await db
    .from("users")
    .select("email")
    .eq("alert_email_enabled", true);

  // Also always send to support
  const recipients = new Set<string>(["support@polymarketflow.com"]);
  if (subscribers) {
    for (const s of subscribers) {
      if (s.email) recipients.add(s.email);
    }
  }

  // 6. Send via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "Resend not configured" }, { status: 503 });
  }

  let sent = 0;
  let failed = 0;
  for (const email of recipients) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "PolymarketFlow <noreply@polymarketflow.com>",
          to: [email],
          subject: `Morning Odds — ${today}`,
          html: emailHtml,
        }),
      });
      if (res.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    status: "sent",
    recipients: recipients.size,
    sent,
    failed,
    gainers: topGainers.length,
    losers: topLosers.length,
  });
}
