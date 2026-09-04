-- ============================================================================
-- 001_perps_launch.sql — Polymarket Perps staged-launch infrastructure
-- ============================================================================
-- STATUS: APPLIED 2026-08-16 (via MCP; + service_role grants in pmflow_service_role_grants). Original instructions:
-- project that hosts the `pmflow` schema. Idempotent — safe to re-run.
--
-- Creates:
--   1. pmflow.site_settings   — key/value feature flags read by the app
--                               (src/lib/flags.ts). Seeds perps_live = false.
--   2. pmflow.outbound_links  — data-driven /go/<slug> redirect destinations
--                               (src/app/go/[slug]/route.ts). Seeds the
--                               'polymarket' and 'polymarket-perps' slugs.
--
-- The app FAILS SAFE before this migration is applied: perps_live reads as
-- false and /go/<slug> falls back to hardcoded polymarket.com destinations.
-- See migrations/README.md for the launch-flip and destination-swap steps.
-- ============================================================================

-- 1. Feature flags -----------------------------------------------------------
create table if not exists pmflow.site_settings (
  key         text primary key,
  value       jsonb not null default 'false'::jsonb,
  description text,
  updated_at  timestamptz not null default now()
);

-- Only the server (service role) reads this table; RLS with no policies
-- blocks anon/authenticated clients. Service role bypasses RLS.
alter table pmflow.site_settings enable row level security;

insert into pmflow.site_settings (key, value, description)
select
  'perps_live',
  'false'::jsonb,
  'Gates the Polymarket Perps launch: navbar item, alerts-feed/briefings banners, and /perps CTA blocks. false = /perps renders the coming-soon variant. Flip with: update pmflow.site_settings set value = ''true''::jsonb, updated_at = now() where key = ''perps_live'';'
where not exists (select 1 from pmflow.site_settings where key = 'perps_live');

-- 2. Outbound link redirects (/go/<slug>) ------------------------------------
create table if not exists pmflow.outbound_links (
  slug        text primary key,
  destination text not null,          -- absolute http(s) URL
  append_path boolean not null default false, -- allow /go/<slug>?to=<path> deep links
  active      boolean not null default true,  -- false = kill switch (redirects to site home)
  notes       text,
  updated_at  timestamptz not null default now()
);

alter table pmflow.outbound_links enable row level security;

-- Generic predictions outbound. append_path=true so market pages can deep-link
-- via /go/polymarket?to=event/<event-slug> -> https://polymarket.com/event/<event-slug>.
insert into pmflow.outbound_links (slug, destination, append_path, notes)
select
  'polymarket',
  'https://polymarket.com',
  true,
  'Predictions outbound. No referral param carried today (site links carried none before this migration). If a tracking deeplink is adopted later, set append_path=false when the tracker cannot accept path suffixes.'
where not exists (select 1 from pmflow.outbound_links where slug = 'polymarket');

-- Perps outbound. PLACEHOLDER destination — will be swapped to the Dub
-- deeplink (or https://polymarket.com/perps?c=<REFERRAL_CODE>) with a single
-- UPDATE once the affiliate/referral link exists. No code change needed:
--   update pmflow.outbound_links
--     set destination = '<DUB_OR_REFERRAL_URL>', updated_at = now()
--   where slug = 'polymarket-perps';
insert into pmflow.outbound_links (slug, destination, append_path, notes)
select
  'polymarket-perps',
  'https://polymarket.com/perps',
  false,
  'PLACEHOLDER destination. Swap to Dub deeplink / referral link (format: https://polymarket.com/perps?c=CODE) before or at launch flip. Perps access is referral-gated during early access, so the swap is what makes the CTA convert.'
where not exists (select 1 from pmflow.outbound_links where slug = 'polymarket-perps');
