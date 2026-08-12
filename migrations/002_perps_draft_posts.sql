-- ============================================================================
-- 002_perps_draft_posts.sql — 3 DRAFT blog posts for the Perps launch
-- ============================================================================
-- STATUS: NOT APPLIED. Run after 001_perps_launch.sql. Idempotent (skips
-- slugs that already exist).
--
-- All three posts insert with published = false (the repo's draft mechanism —
-- /blog and /blog/[slug] only select published = true). To publish at launch:
--
--   update pmflow.posts
--     set published = true, published_at = now()
--   where slug in (
--     'polymarket-perps-tutorial',
--     'perps-vs-predictions-polymarket',
--     'polymarket-perps-risk-math'
--   );
--
-- Content notes:
-- * Written from docs.polymarket.com/perps (fetched August 2026), NOT from
--   live trading. Numbers cited "as of August 2026".
-- * Uses the site renderer's markdown-lite dialect only: ## / ###, **bold**,
--   [text](url), "- " bullets, "1. " numbered lists, blank-line paragraphs.
--   No tables/images/code blocks (unsupported), no raw < > characters.
-- * **[Screenshot TODO: ...]** lines are placeholders for real screenshots.
-- * category = 'Perps' — src/app/(public)/blog/[slug]/page.tsx appends the
--   RiskDisclosure component (and a flag-gated CTA) for this category.
-- * If pmflow.posts has NOT NULL columns beyond the ones listed here, add
--   them before applying.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Post A: Complete tutorial
-- ---------------------------------------------------------------------------
insert into pmflow.posts (slug, title, excerpt, content, category, type, author, read_time, published, meta_title, meta_description)
select
  'polymarket-perps-tutorial',
  'Polymarket Perps: The Complete Tutorial (2026)',
  'How Polymarket Perps work end to end: funding your account with pUSD, choosing a market, opening and closing a leveraged position, and what funding, fees and margin actually cost you.',
  $md$Polymarket now offers more than YES/NO prediction markets. **Perps** — perpetual futures on indices, commodities, crypto and equities — let you go long or short with leverage, with no expiry date. This tutorial walks through the whole flow, written from Polymarket's official documentation (docs.polymarket.com/perps) as of August 2026. Perps are in **early access**, so details can change — always check the live app before trading.

One honest note before we start: this guide is built from the official docs, not from a live trading session. Where the docs describe the developer flow, we say so, and screenshots will be added as the app UI stabilizes.

## Before you start

You need three things:

- **A Polymarket account** — create one at Polymarket if you don't have one.
- **pUSD** — Perps collateral is pUSD, Polymarket's dollar-pegged balance. The minimum Perps deposit is 10 pUSD as of August 2026.
- **Early access** — Perps access currently requires a valid Perps referral link or code. A referral link looks like a normal Polymarket Perps URL with a code attached, and the code is applied to your account automatically when you open Perps through it. Each account can apply one code, once.

Also check eligibility: Perps have their own geographic restrictions, separate from prediction markets. If Perps don't appear for you, your region may not be supported yet.

**[Screenshot TODO: Perps tab in the Polymarket app with the deposit modal open]**

## Step 1: Fund your Perps account

Perps positions are margined from a dedicated Perps balance, not directly from your main Polymarket wallet. Funding is a two-part action: approve pUSD for Perps collateral, then deposit pUSD from your Polymarket wallet into the Perps account. In the app this is a deposit flow; in the developer SDK it is an explicit approvals-plus-deposit call.

Your Perps balance is the collateral that backs every position — the docs call the working number **equity**: collateral plus unrealized profit and loss, minus fees and funding owed.

## Step 2: Choose a market

Perps markets are listed as **instruments** — for example an S&P 500 index perp (SP500-USD in the docs' examples). Instruments span indices, commodities, crypto assets and equities. Before trading one, look at three parameters:

- **Max leverage** — set per instrument (some markets allow up to 20x as of August 2026; always confirm in the app since parameters change).
- **Session hours** — perps on assets that don't trade 24/7 use market sessions, which affect how the price feed behaves outside underlying trading hours.
- **The three prices** — the **traded price** (what fills actually execute at), the **index price** (Polymarket's estimate of fair value for the underlying) and the **mark price** (used to value your position for margin and liquidation). Your liquidation risk follows the mark price, not the last trade.

**[Screenshot TODO: instrument list showing symbol, category and max leverage columns]**

## Step 3: Open a position

Opening a position means submitting an order with:

1. **Side** — buy to go long (profit if price rises), sell to go short (profit if price falls).
2. **Size** — quantity of the instrument. Size times price is your **notional** exposure.
3. **Price and execution** — the docs' first-trade example places a limit order with immediate-or-cancel execution; the app's order ticket exposes the same concepts.
4. **Leverage** — how much notional you control per unit of collateral. Opening the position reserves **initial margin**, which equals notional divided by leverage. 500 pUSD at 10x leverage controls 5,000 pUSD of notional and reserves 500 pUSD.

**[Screenshot TODO: order ticket with side, size, leverage and margin summary]**

## Step 4: Know what it costs

Three costs apply, all denominated in pUSD as of August 2026:

- **Trading fees** — charged per fill on notional: fee equals notional times the rate. Base tier is 0.0400% taker / 0.0125% maker, improving with 30-day volume (down to 0.0250% / 0.0000% at the 500M tier, with a maker rebate at the top tier).
- **Funding** — settled **hourly** between longs and shorts to keep the perp near the index. When the perp trades rich (above index), longs pay shorts; when it trades cheap, shorts pay longs. Payment is proportional to your position size and the hourly rate, transferred directly between traders with no protocol fee.
- **Liquidation fees** — only if you get liquidated: fills executed by the liquidation engine carry the normal fee plus a per-market liquidation fee rate.

## Step 5: Watch your margin

Your account moves between three states, per the official margin docs:

- **Healthy** — equity at or above initial margin. Normal trading.
- **Margin call** — equity below initial margin but still above maintenance margin. You can only reduce exposure or deposit collateral.
- **Liquidation** — equity falls below **maintenance margin** and the system starts closing your position. Maintenance margin is notional times 0.5 divided by the market's max leverage — 2.5% of notional on a 20x market.

You can margin positions two ways: **cross** (your whole balance backs all positions) or **isolated** (a fixed slice of collateral backs one position, capping what that position can lose to its allocation).

**[Screenshot TODO: position panel showing equity, margin usage and liquidation price]**

## Step 6: Close the position

Close by trading the other side of your position (sell what you bought, or buy back what you sold) — a market or limit order for the position size, or a partial close. Profit and loss realizes into your Perps balance, and you can withdraw pUSD back to your main Polymarket wallet.

Positions can also close without your input: the liquidation engine closes them if equity falls below maintenance margin, and in extreme cases auto-deleveraging can reduce profitable positions when the insurance fund can't absorb a bankrupt counterparty. If you hold perps, check them regularly — funding accrues every hour, even while you sleep.

## Quick reference

- Collateral: pUSD, minimum 10 pUSD deposit
- Fees: from 0.0400% taker / 0.0125% maker, on notional, per fill
- Funding: hourly, longs pay shorts when the perp trades above index
- Initial margin: notional divided by leverage
- Maintenance margin: 0.5 divided by max leverage, times notional (2.5% at 20x)
- Liquidation: begins when equity falls below maintenance margin

Ready to see the markets yourself? [Open Polymarket Perps](/go/polymarket-perps) — start small, use isolated margin while learning, and read our [risk math guide](/blog/polymarket-perps-risk-math) before sizing up.

**Risk notice:** Perps are leveraged derivatives. Funding costs accrue hourly, liquidation can close your position automatically, and you can lose your entire deposit — liquidation is not a guaranteed stop-loss. Nothing here is investment advice. All mechanics cited from docs.polymarket.com/perps as of August 2026. We may earn a commission when you sign up through links on this site — this never affects our coverage.$md$,
  'Perps',
  'article',
  'PolymarketFlow Research',
  '9 min read',
  false,
  'Polymarket Perps Tutorial: Complete 2026 Guide',
  'Step-by-step Polymarket Perps tutorial: pUSD deposits, choosing an instrument, opening and closing leveraged positions, plus fees, hourly funding and margin states — from the official docs.'
where not exists (select 1 from pmflow.posts where slug = 'polymarket-perps-tutorial');

-- ---------------------------------------------------------------------------
-- Post B: Perps vs Predictions
-- ---------------------------------------------------------------------------
insert into pmflow.posts (slug, title, excerpt, content, category, type, author, read_time, published, meta_title, meta_description)
select
  'perps-vs-predictions-polymarket',
  'Perps vs Predictions on Polymarket: Which Fits How You Trade?',
  'Polymarket now runs two very different products: binary prediction markets and leveraged perpetual futures. Payoffs, costs, time horizons and risk — compared side by side.',
  $md$Polymarket started as a prediction market: binary YES/NO shares that resolve to one dollar or zero when an event settles. In 2026 it added **Perps** — perpetual futures on indices, commodities, crypto and equities. They share a wallet and a interface family, but they are fundamentally different instruments. Here's the comparison that matters, based on the official docs as of August 2026.

## The one-sentence version

**Predictions** pay you for being right about an outcome by a date. **Perps** pay you for being right about price direction over whatever window you hold, with leverage amplifying both sides.

## How the payoff works

**Predictions:** you buy YES or NO at a price between 0 and 1 dollar — effectively a probability. If the event resolves your way, each share pays 1 dollar; otherwise zero. Your maximum loss is what you paid, known the moment you click buy. Your maximum gain is equally capped.

**Perps:** you hold a position marked to the **mark price** continuously. Profit and loss is open-ended in both directions relative to your margin: notional times the price move, plus or minus funding and fees. There is no resolution date — the position runs until you close it or it gets liquidated.

## Leverage and what can be lost

**Predictions:** no leverage. A 100 dollar position risks exactly 100 dollars, and only if you're wrong at resolution. Prices swing, but you can always hold to settlement.

**Perps:** leverage up to the instrument's cap (some markets allow up to 20x as of August 2026). Initial margin is notional divided by leverage, and maintenance margin on a 20x market is 2.5% of notional. At 20x, a roughly 2.5% adverse move can put your position into liquidation — you can lose your entire margin without any event ever resolving against you. "Holding through the dip" is not always an option, because the liquidation engine doesn't wait.

## The cost of time

**Predictions:** holding costs nothing. Time is actually your friend or enemy only through the event itself. You can park a position for months for free.

**Perps:** holding costs (or pays) **funding every hour**. When the perp trades above the index price, longs pay shorts; below it, shorts pay longs. Funding is proportional to notional, so at high leverage a persistent funding rate meaningfully drains equity — that's the carry cost of a perpetual position. Trading fees also apply per fill on notional (from 0.0400% taker / 0.0125% maker at the base tier).

## What you need to be right about

- **Predictions** reward event judgment: probability estimation, information edges, patience through noise. Being early costs you nothing but opportunity.
- **Perps** reward path judgment: entries, exits, sizing and risk control. You can be right about the destination and still lose everything on the route if leverage is too high for the volatility in between.

## Risk profile at a glance

- Max loss on predictions: your stake, at resolution. Max loss on perps: your margin, any time the mark price moves far enough — and liquidation fees apply on the way out.
- Predictions have no margin calls. Perps have three margin states (healthy, margin call, liquidation) tracked on account equity in real time.
- Predictions resolve; disputes aside, the outcome is the outcome. Perps never resolve — risk management IS the exit.

## Which should you trade?

Trade **predictions** if you think in probabilities and events: elections, sports, macro data prints, deadlines. Your edge compounds slowly and your downside is bounded per position.

Trade **perps** if you think in price paths and can honestly manage risk: you want directional exposure to an index or asset without expiry, you understand funding drag, and you size positions so a normal bad day cannot liquidate you.

Plenty of traders use both — for example, expressing an event thesis in predictions while using a perp to hedge the market-level move around it. If you do combine them, remember the two books margin separately: profits in one do not stop a liquidation in the other.

Want to see the perps side for yourself? [Open Polymarket Perps](/go/polymarket-perps) — early access currently requires a referral link, and it's worth starting at low leverage while the product is new. New to the mechanics? Start with our [complete Perps tutorial](/blog/polymarket-perps-tutorial).

**Risk notice:** Perps are leveraged derivatives. Funding costs accrue hourly, liquidation can close your position automatically, and you can lose your entire deposit — liquidation is not a guaranteed stop-loss. Nothing here is investment advice. Mechanics cited from docs.polymarket.com/perps as of August 2026. We may earn a commission when you sign up through links on this site — this never affects our coverage.$md$,
  'Perps',
  'article',
  'PolymarketFlow Research',
  '7 min read',
  false,
  'Perps vs Predictions on Polymarket: Full Comparison (2026)',
  'Polymarket Perps vs prediction markets: payoff structure, leverage, hourly funding, liquidation risk and time horizon compared — and which one fits your trading style.'
where not exists (select 1 from pmflow.posts where slug = 'perps-vs-predictions-polymarket');

-- ---------------------------------------------------------------------------
-- Post C: The risk math
-- ---------------------------------------------------------------------------
insert into pmflow.posts (slug, title, excerpt, content, category, type, author, read_time, published, meta_title, meta_description)
select
  'polymarket-perps-risk-math',
  'Leverage, Funding and Liquidation on Polymarket Perps: The Risk Math',
  'The actual formulas behind Polymarket Perps risk — equity, initial and maintenance margin, hourly funding, fee drag at leverage, and exactly how far price has to move before liquidation.',
  $md$Perps look simple — pick a direction, pick leverage — but every part of your risk is a formula, and the formulas are public. This is the risk math of Polymarket Perps from the official documentation as of August 2026, with worked examples. Numbers and parameters can change (Perps are in early access), so treat this as the map, and the live app as the territory.

## The number that matters: equity

Everything keys off account **equity**:

**Equity = collateral + unrealized PnL at the mark price, minus fees due, minus funding due.**

Two details people miss. First, unrealized PnL uses the **mark price**, not the last traded price — you can be liquidated by the mark even if the order book last printed somewhere friendlier. Second, fees and funding owed are subtracted continuously, so a position bleeding funding is losing equity even when price goes nowhere.

## Margin: how much the position demands

- **Initial margin (IM)** — what you post to open: IM = notional divided by leverage. 2,000 pUSD notional at 10x means 200 pUSD IM.
- **Maintenance margin (MM)** — the floor that keeps the position alive: MM = notional times (0.5 divided by the market's max leverage). On a 20x-max market that's 2.5% of notional.

Leverage tiers also cap max leverage as positions grow — bigger positions must carry proportionally more collateral.

## Worked example: how far to liquidation?

Say you deposit **100 pUSD** into an isolated position on a market whose max leverage is 20x (MM rate 2.5%).

- **At 10x:** notional 1,000 pUSD, MM 25 pUSD. Liquidation begins when equity falls below 25 — roughly a **7.5% adverse move** (75 pUSD of unrealized loss on 1,000 notional), before counting fees and funding.
- **At 20x:** notional 2,000 pUSD, MM 50 pUSD. Now only about a **2.5% adverse move** (50 pUSD of loss on 2,000 notional) puts you into liquidation.

Same deposit, double the leverage, one-third the survivable move. On index and equity perps, 2.5% is an ordinary day. That's the entire risk story of leverage in two bullets.

Between healthy and liquidated sits the **margin call** state: equity below IM but above MM. There you can only reduce exposure or add collateral — no new risk.

## Funding: the hourly bleed

Funding settles **every hour**, computed from how far the perp trades from the index price (the docs sample the order book's impact price every 5 seconds and average the premium over the hour, add a small fixed interest leg of 0.01% per 8 hours, halve the result for non-crypto assets, and cap the hourly rate at plus or minus 4%). Positive rate: longs pay shorts. Negative: shorts pay longs. The transfer is trader-to-trader with no protocol fee.

The math that matters to you: **funding payment is proportional to notional, but you experience it against equity.** Take the 20x example — 2,000 notional on 100 equity — with a modest 0.01% hourly rate:

- Per hour: 0.20 pUSD. Sounds like nothing.
- Per day: 4.80 pUSD — **4.8% of your equity, daily**, if the rate persists and you're on the paying side.

And 0.01%/hour is calm weather. The cap is 4% per hour: in a badly dislocated market, a capped rate on that same position would be 80 pUSD per hour — your entire stack in about 75 minutes, without price moving at all. Extreme, rare, but the mechanism exists precisely for extremes.

## Fees: small percentages, multiplied by leverage

Base-tier fees as of August 2026: **0.0400% taker / 0.0125% maker**, charged on notional per fill. At 1x that's noise. At 20x, a taker open plus a taker close is 0.04% times 2 times 20 = **1.6% of your equity** in round-trip fees. High-leverage scalping starts every trade meaningfully behind.

## Liquidation: what actually happens

Liquidation is a process, not a single event, per the official liquidation docs:

1. The engine flags the account when equity falls below MM (margin ratio below 1).
2. It blocks new orders in scope and cancels your resting orders.
3. It closes the position with reduce-only, immediate-or-cancel market orders. Partial fills that lift equity back above the recovery threshold can stop the process early.
4. Every liquidation fill pays the normal trading fee **plus a per-market liquidation fee** — so liquidation itself costs extra, right when you can least afford it.
5. If equity has fallen so far the position is under water, the **insurance fund** can absorb it; failing that, **auto-deleveraging** force-closes traders on the profitable opposite side (most profitable, most leveraged first).

Two takeaways. Liquidation fills at whatever the book gives — in fast markets the engine can exhaust your collateral entirely, and the docs make no promise that losses conveniently stop at some comfortable buffer above zero. And because everything runs off the mark price, a spike in the mark can trigger the process even if the traded price barely printed there.

## The pre-trade checklist

- Compute your liquidation distance before opening: roughly (equity minus MM) divided by notional, as a percent. If a normal daily move covers it, your leverage is too high.
- Check the current funding rate and who's paying. You might be paid to hold your side — or bleeding 4-5% of equity a day.
- Prefer isolated margin while learning: it caps the damage to that position's allocation instead of your whole account.
- Size so fees don't matter: if a 1.6% round trip changes the trade's viability, the trade was too thin.
- Never post collateral you can't afford to lose entirely.

If the math above reads like a warning, good — it is one. It's also exactly the information you need to trade perps deliberately instead of accidentally. See the mechanics live: [open Polymarket Perps](/go/polymarket-perps), start at low leverage, and keep this page open next to your first position. For the basics first, read the [complete Perps tutorial](/blog/polymarket-perps-tutorial).

**Risk notice:** Perps are leveraged derivatives. Funding costs accrue hourly, liquidation can close your position automatically, and you can lose your entire deposit — liquidation is not a guaranteed stop-loss. Nothing here is investment advice. Formulas and parameters cited from docs.polymarket.com/perps as of August 2026 and may change. We may earn a commission when you sign up through links on this site — this never affects our coverage.$md$,
  'Perps',
  'article',
  'PolymarketFlow Research',
  '10 min read',
  false,
  'Polymarket Perps Risk Math: Leverage, Funding & Liquidation',
  'The formulas behind Polymarket Perps risk: equity, initial vs maintenance margin, liquidation distance by leverage, hourly funding drag and fee math — with worked examples.'
where not exists (select 1 from pmflow.posts where slug = 'polymarket-perps-risk-math');
