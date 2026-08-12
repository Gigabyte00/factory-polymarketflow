/**
 * Feature flags, read from pmflow.site_settings (see migrations/001_perps_launch.sql).
 *
 * ── HOW TO FLIP `perps_live` ────────────────────────────────────────────────
 * 1. One-time setup: apply migrations/001_perps_launch.sql (creates
 *    pmflow.site_settings and seeds perps_live=false). Full launch runbook,
 *    including the /go destination swap and publishing the draft posts, is in
 *    migrations/README.md.
 * 2. Flip ON:
 *      update pmflow.site_settings
 *        set value = 'true'::jsonb, updated_at = now()
 *      where key = 'perps_live';
 *    Flip OFF: same statement with 'false'::jsonb.
 * 3. Propagation: this module caches the flag for 300s, and the effective ISR
 *    of every page is ~5 min (the root layout's 300s ticker cache caps it —
 *    verified in the build's route table), so a flip typically reaches all
 *    pages within ~10 minutes. Redeploy on Vercel to force it instantly.
 *
 * FAIL-SAFE: any problem (missing env, table not yet migrated, network error,
 * missing row) reads as `false` — the site behaves as if Perps aren't live.
 */
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

async function fetchPerpsLive(): Promise<boolean> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return false;
    }
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { db: { schema: "pmflow" } }
    );
    const { data, error } = await db
      .from("site_settings")
      .select("value")
      .eq("key", "perps_live")
      .single();
    if (error || !data) return false;
    // value is jsonb: accept boolean true or string "true"
    return data.value === true || data.value === "true";
  } catch {
    return false;
  }
}

/**
 * Whether the Polymarket Perps launch is live. Server-only (uses the service
 * role key). Cached for 5 minutes across all callers.
 */
export const isPerpsLive = unstable_cache(fetchPerpsLive, ["flag-perps-live"], {
  revalidate: 300,
});
