#!/usr/bin/env node
/**
 * scripts/build_pmflow_map.mjs — build-time snapshot of pmflow.outbound_links for /go/[slug].
 *
 * WHY: the 2026-09-20 hardening bounded the lookup so a hung database can no longer hang the
 * redirect — but it fell back to a HARDCODED table, and that table had already drifted. The real
 * destinations went live 2026-09-03 (migrations/README.md: "perps destination = poly.market/g9oa58F,
 * generic = ?via=merchant-dash"); the hardcoded fallback still carried the pre-launch URLs. So every
 * outage sent 100% of traffic to a bare polymarket.com with no ?via= referral — the redirect worked
 * and earned nothing. A snapshot regenerated from the database on every deploy cannot drift; a
 * hand-maintained table is the drift mechanism.
 *
 * Runs as the npm `prebuild` hook (Vercel runs `npm run build`). Writes src/generated/pmflow-map.json.
 *
 * Exit contract — deliberately STRICTER than the fleet's build_go_map.mjs:
 *  - creds missing                      → EMPTY map, exit 0. Local dev and preview builds only:
 *    NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both configured on the `production`
 *    Vercel target, so a PRODUCTION build cannot reach this branch.
 *  - fetch fails after retries          → exit 1. Never ship a stale or partial snapshot.
 *  - creds present but ZERO active rows → exit 1. The fleet template tolerates an empty map; here it
 *    is never legitimate — this table holds the site's only two outbound links, and shipping empty
 *    would silently restore the homepage-bounce this script exists to prevent.
 *
 * ⚠ `Accept-Profile: pmflow` is MANDATORY. Without it PostgREST silently resolves against `public`
 * and returns a 404/empty for outbound_links. The table also has RLS enabled with no policies
 * (migrations/001_perps_launch.sql), so the service-role key is required — the anon key reads zero rows.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const OUT = resolve(process.cwd(), 'src/generated/pmflow-map.json');
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

const write = (map) => { mkdirSync(dirname(OUT), { recursive: true }); writeFileSync(OUT, JSON.stringify(map)); };

if (!BASE || !KEY) {
  write({ meta: { built_at: new Date().toISOString(), count: 0, empty: true }, links: {} });
  console.warn('[go-map] pmflow creds missing — wrote an EMPTY snapshot (local/preview only; production has both vars)');
  process.exit(0);
}

// PostgREST caps responses at 1000 rows regardless of `limit` → page by offset. (Two rows today;
// the paging is here so growth cannot silently truncate the snapshot.)
async function page(offset) {
  const q = `${BASE}/rest/v1/outbound_links`
    + `?select=slug,destination,append_path,active,offer_id&active=eq.true&limit=1000&offset=${offset}`;
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(q, {
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Accept-Profile': 'pmflow' },
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error(`PostgREST ${r.status}: ${(await r.text()).slice(0, 160)}`);
      return await r.json();
    } catch (e) {
      last = e;
      await new Promise((res) => setTimeout(res, 1500 * attempt));
    }
  }
  throw last;
}

try {
  const rows = [];
  for (let off = 0; ; off += 1000) {
    const r = await page(off);
    rows.push(...r);
    if (r.length < 1000) break;
  }

  const links = {};
  for (const l of rows) {
    const d = (l.destination ?? '').trim();
    if (!l.slug || !/^https?:\/\//.test(d)) continue; // a malformed destination would break the route
    links[l.slug] = { d, p: l.append_path === true, o: l.offer_id ?? null };
  }

  const count = Object.keys(links).length;
  if (count === 0) {
    console.error('[go-map] FAILED — credentials present but pmflow.outbound_links returned 0 active rows. '
      + 'Refusing to ship an empty snapshot: the /go fallback would silently bounce every click to the homepage.');
    process.exit(1);
  }

  write({ meta: { built_at: new Date().toISOString(), count, empty: false }, links });
  console.log(`[go-map] ${count} pmflow links from outbound_links (${rows.length} active rows)`);
} catch (e) {
  console.error('[go-map] FAILED — refusing to build with a stale or partial pmflow snapshot:', e?.message ?? e);
  process.exit(1);
}
