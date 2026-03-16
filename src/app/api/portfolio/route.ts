import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const DATA_BASE = "https://data-api.polymarket.com";

/**
 * GET /api/portfolio
 * Fetches the user's Polymarket positions using their connected wallet.
 */
export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user's wallet address
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });
  const { data: profile } = await db.from("users").select("polymarket_wallet, tier").eq("id", user.id).single();

  if (!profile?.polymarket_wallet) {
    return NextResponse.json({ error: "No wallet connected. Add your Polymarket wallet address in Settings.", wallet: null }, { status: 400 });
  }

  const isPro = profile.tier === "pro";

  try {
    // Fetch positions from Polymarket Data API
    const [positionsRes, tradesRes] = await Promise.all([
      fetch(`${DATA_BASE}/positions?user=${profile.polymarket_wallet}&limit=50&sortBy=VALUE&sortOrder=DESC`),
      fetch(`${DATA_BASE}/trades?user=${profile.polymarket_wallet}&limit=20`),
    ]);

    const positions = positionsRes.ok ? await positionsRes.json() : [];
    const trades = tradesRes.ok ? await tradesRes.json() : [];

    // Calculate portfolio stats
    let totalValue = 0;
    let totalPnl = 0;
    let openPositions = 0;

    const positionList = Array.isArray(positions) ? positions : positions?.positions || [];
    for (const pos of positionList) {
      const value = parseFloat(pos.currentValue || pos.value || "0");
      const cost = parseFloat(pos.initialValue || pos.cost || "0");
      totalValue += value;
      totalPnl += value - cost;
      openPositions++;
    }

    return NextResponse.json({
      wallet: profile.polymarket_wallet,
      stats: {
        total_value: totalValue,
        total_pnl: totalPnl,
        open_positions: openPositions,
        win_rate: null, // Would need resolved positions to calculate
      },
      positions: isPro ? positionList.slice(0, 50) : positionList.slice(0, 5),
      recent_trades: isPro ? trades.slice(0, 20) : trades.slice(0, 3),
      limited: !isPro,
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Failed to fetch portfolio: ${err.message}` }, { status: 500 });
  }
}
