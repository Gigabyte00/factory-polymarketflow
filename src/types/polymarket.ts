/**
 * Polymarket API type definitions
 * Based on the Gamma, CLOB, and Data API schemas
 */

// ============ Gamma API Types ============

export interface PolymarketEvent {
  id: string;
  ticker: string | null;
  slug: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  resolutionSource: string | null;
  startDate: string | null;
  creationDate: string | null;
  endDate: string | null;
  image: string | null;
  icon: string | null;
  active: boolean | null;
  closed: boolean | null;
  archived: boolean | null;
  featured: boolean | null;
  restricted: boolean | null;
  liquidity: number | null;
  volume: number | null;
  openInterest: number | null;
  category: string | null;
  subcategory: string | null;
  competitive: number | null;
  volume24hr: number | null;
  volume1wk: number | null;
  volume1mo: number | null;
  commentCount: number | null;
  negRisk: boolean | null;
  markets: PolymarketMarket[];
  tags: PolymarketTag[];
}

export interface PolymarketMarket {
  id: string;
  question: string | null;
  conditionId: string;
  slug: string | null;
  endDate: string | null;
  category: string | null;
  liquidity: string | null;
  image: string | null;
  icon: string | null;
  description: string | null;
  outcomes: string | null; // JSON string: '["Yes", "No"]'
  outcomePrices: string | null; // JSON string: '["0.65", "0.35"]'
  volume: string | null;
  active: boolean | null;
  closed: boolean | null;
  volume24hr: number | null;
  volume1wk: number | null;
  volume1mo: number | null;
  clobTokenIds: string | null; // JSON string of token IDs
  enableOrderBook: boolean | null;
  liquidityNum: number | null;
  volumeNum: number | null;
  bestBid: number | null;
  bestAsk: number | null;
  lastTradePrice: number | null;
  spread: number | null;
  oneDayPriceChange: number | null;
  oneWeekPriceChange: number | null;
  oneMonthPriceChange: number | null;
}

export interface PolymarketTag {
  id: string;
  label: string | null;
  slug: string | null;
}

// ============ CLOB API Types ============

export interface PriceHistoryPoint {
  t: number; // Unix timestamp
  p: number; // Price (0-1)
}

export interface PriceHistoryResponse {
  history: PriceHistoryPoint[];
}

export interface OrderBook {
  market: string;
  asset_id: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  hash: string;
  timestamp: string;
}

export interface OrderBookLevel {
  price: string;
  size: string;
}

// ============ Data API Types ============

export interface TraderLeaderboardEntry {
  rank: string;
  proxyWallet: string;
  userName: string;
  vol: number;
  pnl: number;
  profileImage: string;
  xUsername: string;
  verifiedBadge: boolean;
}

export interface OpenInterestData {
  market: string;
  value: number;
}

export interface TopHolder {
  proxyWallet: string;
  bio: string;
  asset: string;
  pseudonym: string;
  amount: number;
  displayUsernamePublic: boolean;
  outcomeIndex: number;
  name: string;
  profileImage: string;
}

export interface MarketHolder {
  token: string;
  holders: TopHolder[];
}

export interface TradeData {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: "BUY" | "SELL";
  size: string;
  fee_rate_bps: string;
  price: string;
  status: string;
  match_time: string;
  last_update: string;
  outcome: string;
  bucket_index: number;
  owner: string;
  maker_address: string;
  transaction_hash: string;
  trader_side: "TAKER" | "MAKER";
  type: string;
}

// ============ Internal / Computed Types ============

export interface MarketMover {
  marketId: string;
  eventSlug: string;
  question: string;
  currentPrice: number;
  previousPrice: number;
  priceChange: number;
  percentChange: number;
  volume24h: number;
  category: string | null;
  image: string | null;
}

export interface VolumeSpike {
  marketId: string;
  eventSlug: string;
  question: string;
  currentVolume: number;
  averageVolume: number;
  spikeMultiplier: number;
  detectedAt: string;
}

export interface WhaleActivity {
  walletAddress: string;
  walletName: string | null;
  marketId: string;
  question: string;
  action: "ENTER" | "EXIT" | "INCREASE" | "DECREASE";
  amount: number;
  side: "YES" | "NO";
  detectedAt: string;
}

// ============ Subscription Types ============

export type SubscriptionTier = "free" | "pro" | "elite";

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  tier: SubscriptionTier;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
}

export interface AlertRule {
  id: string;
  userId: string;
  marketId: string;
  marketQuestion: string;
  condition: "above" | "below" | "crosses";
  threshold: number;
  channel: "email" | "slack" | "both";
  active: boolean;
  lastTriggered: string | null;
  createdAt: string;
}
