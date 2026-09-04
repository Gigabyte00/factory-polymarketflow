# Migrations — Polymarket Perps staged launch

**Status: APPLIED 2026-08-16, LAUNCHED 2026-09-03** (001+002 via MCP + service_role grants; perps destination = poly.market/g9oa58F, generic = ?via=merchant-dash). Flag flip + post publish executed by perps_watch on 2026-09-03 (Polymarket's wide Perps launch signal); post bodies then updated in-DB (geo-eligibility, Sept-3 launch status, TODO markers removed) — DB is source of truth for post content now, 002 is the historical seed. Original text: the app
fails safe until these run: `perps_live` reads as `false` (coming-soon /perps,
no nav item, no banners) and `/go/<slug>` uses hardcoded polymarket.com
fallbacks.

## Files

| File | What it does |
|---|---|
| `001_perps_launch.sql` | Creates `pmflow.site_settings` (feature flags, seeds `perps_live=false`) and `pmflow.outbound_links` (data-driven `/go/<slug>` redirects, seeds `polymarket` + `polymarket-perps`). Idempotent. |
| `002_perps_draft_posts.sql` | Inserts the 3 Perps blog posts as DRAFTS (`published=false`). Idempotent. |

## How to apply

Paste each file into the Supabase SQL editor for the project hosting the
`pmflow` schema (or `psql $DATABASE_URL -f migrations/001_perps_launch.sql`),
001 first. Both are safe to re-run.

## Launch-flip procedure (in order)

1. **Apply migrations** 001 then 002 (one-time).
2. **Swap the perps destination** from the placeholder to the real Dub
   deeplink / referral link (Perps access is referral-gated, so do this
   before flipping):
   ```sql
   update pmflow.outbound_links
     set destination = '<DUB_DEEPLINK_OR_https://polymarket.com/perps?c=CODE>',
         updated_at = now()
   where slug = 'polymarket-perps';
   ```
3. **Publish the draft posts** (optional but recommended at flip):
   ```sql
   update pmflow.posts
     set published = true, published_at = now()
   where slug in ('polymarket-perps-tutorial',
                  'perps-vs-predictions-polymarket',
                  'polymarket-perps-risk-math');
   ```
4. **Flip the flag:**
   ```sql
   update pmflow.site_settings
     set value = 'true'::jsonb, updated_at = now()
   where key = 'perps_live';
   ```
5. **Propagation:** the flag is cached 300s (`src/lib/flags.ts`) and every
   page's effective ISR is ~5 min (the root layout's 300s cache caps it, per
   the build's route table), so everything updates within ~10 minutes.
   Redeploy on Vercel to force it instantly.

Rollback = step 4 with `'false'::jsonb`. CTAs, nav item and banners disappear
on the same cadence; `/perps` reverts to the coming-soon variant; `/go/...`
redirects keep working either way.

## Destination-swap procedure (any time, no deploy)

`/go/<slug>` destinations are rows, not code. To repoint any outbound link:

```sql
update pmflow.outbound_links set destination = '<new-url>', updated_at = now() where slug = '<slug>';
```

- `append_path=true` (the `polymarket` row) lets `/go/polymarket?to=event/<slug>`
  deep-link to `https://polymarket.com/event/<slug>`. If you swap that
  destination to a tracker that can't take path suffixes, also set
  `append_path=false` (the `to` param is then ignored, traffic lands on the
  tracker URL).
- `active=false` on a row is a kill switch: `/go/<slug>` sends users to the
  site homepage instead.
- No referral params existed on the site's old hardcoded links, so nothing
  needed preserving in the seeds.

## Notes / assumptions

- `pmflow.posts` inserts use the columns the app reads (slug, title, excerpt,
  content, category, type, author, read_time, published, meta_title,
  meta_description). `published_at` stays NULL until publish. If the table has
  additional NOT NULL columns, the insert will fail loudly — add values and
  re-run.
- Both new tables get RLS enabled with no policies: only the server-side
  service-role client (the app's existing pattern) can read them.
