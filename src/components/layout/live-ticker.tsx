import { createClient } from "@supabase/supabase-js";

/**
 * Server component that fetches live market data for the ticker.
 * Rendered inside the layout, passed as data to the client navbar.
 */
export async function getTickerData(): Promise<{ label: string; price: string; change: number }[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "pmflow" } }
    );

    const { data: markets } = await db
      .from("markets")
      .select("question, outcome_prices, one_day_price_change, volume_24h, events!inner(title)")
      .eq("active", true)
      .eq("closed", false)
      .not("one_day_price_change", "is", null)
      .order("volume_24h", { ascending: false, nullsFirst: false })
      .limit(80);

    if (!markets || markets.length === 0) return [];

    // Filter: meaningful prices (5-95%), deduplicate by event title
    const seen = new Set<string>();
    return markets
      .filter((m: any) => {
        const p = m.outcome_prices?.[0] || 0.5;
        if (p <= 0.05 || p >= 0.95) return false;
        const title = (m as any).events?.title || m.question || "";
        const key = title.substring(0, 20);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8)
      .map((m: any) => {
        const price = ((m.outcome_prices?.[0] || 0.5) * 100).toFixed(0);
        const title = (m as any).events?.title || m.question || "Market";
        const label = title.length > 22 ? title.substring(0, 20) + "..." : title;
        return {
          label,
          price: `${price}%`,
          change: m.one_day_price_change || 0,
        };
      });
  } catch {
    return [];
  }
}

export async function getHeroMarkets(): Promise<{ label: string; price: string; change: string }[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: "pmflow" } }
    );

    const { data: markets } = await db
      .from("markets")
      .select("question, outcome_prices, one_day_price_change, volume_24h, events!inner(title)")
      .eq("active", true)
      .eq("closed", false)
      .not("one_day_price_change", "is", null)
      .order("volume_24h", { ascending: false, nullsFirst: false })
      .limit(60);

    if (!markets || markets.length === 0) return [];

    const seenHero = new Set<string>();
    return markets
      .filter((m: any) => {
        const p = m.outcome_prices?.[0] || 0.5;
        if (p <= 0.05 || p >= 0.95) return false;
        const title = (m as any).events?.title || m.question || "";
        const key = title.substring(0, 20);
        if (seenHero.has(key)) return false;
        seenHero.add(key);
        return true;
      })
      .slice(0, 5)
      .map((m: any) => {
        const price = ((m.outcome_prices?.[0] || 0.5) * 100).toFixed(0);
        const change = m.one_day_price_change || 0;
        const title = (m as any).events?.title || m.question || "Market";
        const label = title.length > 25 ? title.substring(0, 23) + "..." : title;
        return {
          label,
          price: `${price}%`,
          change: `${change > 0 ? "+" : ""}${change.toFixed(1)}%`,
        };
      });
  } catch {
    return [];
  }
}
