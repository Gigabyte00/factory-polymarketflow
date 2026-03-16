import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { BreadcrumbSchema } from "@/components/structured-data";
import type { Metadata } from "next";

// Blog article content - in production this would come from a CMS or database
const articles: Record<string, { title: string; category: string; date: string; readTime: string; content: string }> = {
  "what-is-polymarket": {
    title: "What Is Polymarket? A Complete Guide to Prediction Markets",
    category: "Guides",
    date: "March 15, 2026",
    readTime: "8 min read",
    content: `
## What is Polymarket?

Polymarket is the world's largest prediction market platform, where traders buy and sell shares based on the outcomes of real-world events. Think of it as a stock market for opinions — but instead of trading company shares, you're trading on whether specific events will happen.

## How Prediction Markets Work

Every market on Polymarket has two outcomes: **Yes** and **No**. Shares in each outcome are priced between $0.01 and $0.99, with the price reflecting the market's collective assessment of the probability that the event will occur.

For example, if shares of "Will Bitcoin hit $100K by December?" are trading at $0.65, the market is implying a 65% probability that Bitcoin will reach $100,000 by the end of the year.

## Why Prediction Markets Matter

Prediction markets have consistently outperformed traditional forecasting methods:

- **2020 US Election**: Polymarket's odds were more accurate than major polling averages
- **COVID-19 Vaccine Timeline**: Markets correctly estimated vaccine approval timelines when experts disagreed
- **Federal Reserve Decisions**: Market-implied probabilities regularly outperform economist surveys

The reason is simple: prediction markets aggregate information from thousands of participants who put their money where their mouth is. Unlike polls or expert opinions, traders have a financial incentive to be accurate.

## How to Read Polymarket Prices

| Price | Meaning |
|-------|---------|
| $0.01 - $0.10 | Very unlikely (1-10% probability) |
| $0.25 - $0.40 | Unlikely but possible |
| $0.45 - $0.55 | Toss-up / uncertain |
| $0.60 - $0.75 | Likely |
| $0.90 - $0.99 | Very likely (90-99% probability) |

## Getting Started with PolymarketFlow

While Polymarket provides the trading platform, **PolymarketFlow** gives you the intelligence layer:

- **Track 1,100+ active markets** with real-time price data
- **Follow whale wallets** to see what smart money is doing
- **Set price alerts** to get notified when markets move
- **AI-powered briefings** to understand what's driving the odds

[Explore Markets](/markets) | [View Pricing](/pricing)
`,
  },
  "whale-tracking-guide": {
    title: "How to Track Polymarket Whales: Follow the Smart Money",
    category: "Strategy",
    date: "March 14, 2026",
    readTime: "6 min read",
    content: `
## What Are Polymarket Whales?

In prediction markets, "whales" are traders who hold large positions — typically $10,000 or more in a single market. These traders often have better information, deeper analysis, or more experience than the average participant.

## Why Whale Tracking Matters

Research shows that large traders on prediction markets tend to be more accurate than the crowd average. When a whale takes a significant position, it can signal:

1. **Information advantage** — they may know something the market hasn't priced in yet
2. **Deep analysis** — they've done extensive research on the topic
3. **Market-moving intent** — their buy/sell pressure can shift prices

## How PolymarketFlow Tracks Whales

Our system automatically detects and monitors 1,400+ whale wallets:

- **Auto-detection**: Any wallet holding significant positions across multiple markets
- **Activity monitoring**: We track when whales enter, exit, increase, or decrease positions
- **Position mapping**: See exactly which markets each whale is active in

## Reading Whale Signals

Not all whale activity is created equal. Here's how to interpret what you see:

### Strong Signals
- A known profitable trader enters a new position
- Multiple whales converge on the same side of a market
- A whale increases their position after prices moved against them (conviction)

### Weak Signals
- A whale exits a position (could be taking profits, not a view change)
- A single whale takes a position in a low-volume market (could be market manipulation)

## Get Started

With PolymarketFlow Pro, you get real-time whale tracking across all markets, plus alerts when significant whale activity occurs.

[View Whale Tracker](/whales) | [Start Pro](/pricing)
`,
  },
  "prediction-market-strategies": {
    title: "5 Prediction Market Strategies That Actually Work",
    category: "Strategy",
    date: "March 13, 2026",
    readTime: "10 min read",
    content: `
## Strategy 1: Volume Spike Detection

When a prediction market sees a sudden spike in trading volume, it often precedes a significant price movement. News may have broken that hasn't been fully priced in yet.

**How to use it:** Monitor PolymarketFlow's volume spike alerts. When volume surges 3x or more above the rolling average, investigate the underlying catalyst.

## Strategy 2: Contrarian Betting at Extremes

Markets priced at $0.95+ or $0.05- tend to have poor risk/reward. A $0.95 market needs to resolve YES for you to make 5%, but if it resolves NO, you lose 95%.

**How to use it:** Look for markets at extreme prices where there's genuine uncertainty. A market at $0.95 that should be at $0.85 is a great short opportunity.

## Strategy 3: Smart Money Following

Track what the most profitable Polymarket traders are buying. Our whale tracker identifies wallets with strong track records and monitors their new positions.

**How to use it:** When multiple top-performing traders converge on the same market and same side, it's a strong signal.

## Strategy 4: Cross-Market Correlation

Some prediction markets are inherently correlated. If "Will the Fed cut rates?" goes up, "Will the stock market crash?" might go down. Finding these relationships lets you identify mispricings.

**How to use it:** Use PolymarketFlow's correlation analysis to find markets that should move together but have diverged.

## Strategy 5: Event Horizon Trading

Markets become more volatile as their resolution date approaches. Traders who specialize in the final 48-72 hours before resolution can capture significant moves as uncertainty resolves.

**How to use it:** Filter markets by "Ending Soon" and look for those with uncertain outcomes and high volume. These have the most potential for large moves.

[Explore Markets](/markets) | [View Movers](/movers)
`,
  },
  "understanding-polymarket-odds": {
    title: "Understanding Polymarket Odds: How Prices Become Probabilities",
    category: "Education",
    date: "March 12, 2026",
    readTime: "5 min read",
    content: `
## The Price-Probability Connection

Every share on Polymarket is priced between $0.01 and $0.99. This price directly represents the market's implied probability.

A YES share priced at $0.70 means the market thinks there's a 70% chance the event will happen. If it does happen, you get $1.00 per share — a 43% return on your $0.70 investment.

## How the Order Book Works

Polymarket uses a CLOB (Central Limit Order Book), just like a traditional stock exchange. Buyers place bids, sellers place asks, and when they match, a trade occurs.

The **midpoint** — the average of the best bid and best ask — is the most commonly cited "market price."

## Understanding Spread

The **spread** is the gap between the best bid and best ask. A tight spread (e.g., $0.69 bid / $0.71 ask) indicates good liquidity. A wide spread (e.g., $0.55 bid / $0.75 ask) means low liquidity and higher trading costs.

## What Moves Prices

Prices change when new information arrives or when large traders take positions:

- **News events**: A major announcement can shift probabilities instantly
- **Whale activity**: Large buys or sells move the price (track whales on PolymarketFlow)
- **Time decay**: As resolution approaches, uncertainty decreases and prices trend toward $0 or $1

[Track Live Prices](/markets) | [Follow Smart Money](/whales)
`,
  },
  "polymarket-vs-polls": {
    title: "Prediction Markets vs Polls: Which Forecasts Better?",
    category: "Analysis",
    date: "March 11, 2026",
    readTime: "7 min read",
    content: `
## The Track Record

Prediction markets have outperformed traditional polling in several high-profile events:

### 2020 US Presidential Election
- **Polymarket**: Showed Biden at 60-65% probability on election day
- **Polls**: Showed Biden with a 8-10 point national lead (implied >90%)
- **Result**: Biden won, but by much smaller margins than polls suggested

### 2024 US Presidential Election
- **Polymarket**: Showed Trump with a significant probability lead in final weeks
- **Polls**: Showed a toss-up or slight Harris lead
- **Result**: Polymarket was closer to the actual result

## Why Markets Beat Polls

1. **Skin in the game**: Traders lose money for being wrong; poll respondents face no consequences
2. **Information aggregation**: Markets incorporate all available information, not just sample surveys
3. **Real-time updates**: Prices change instantly when news breaks; polls take days to field
4. **No herding**: Traders profit from going against the crowd when they have better information

## When Polls Are Better

Polls still have advantages in some scenarios:
- **Low-information environments** where few people are paying attention
- **Non-liquid markets** where few traders participate
- **Complex multi-dimensional questions** that prediction markets haven't structured well

## Using Both Together

The smartest approach is to use both signals. When prediction markets and polls agree, confidence should be high. When they diverge, investigate why — one of them is wrong, and that's where the opportunity lies.

[View Current Odds](/markets) | [Historical Accuracy](/accuracy)
`,
  },
  "volume-spike-detection": {
    title: "Volume Spike Detection: Finding Alpha in Prediction Markets",
    category: "Strategy",
    date: "March 10, 2026",
    readTime: "6 min read",
    content: `
## What Is a Volume Spike?

A volume spike occurs when trading activity in a prediction market suddenly exceeds its recent average by a significant multiple (typically 3x or more). This often signals that new information has entered the market.

## Why Volume Spikes Matter

Volume precedes price. When a market that normally trades $50K/day suddenly sees $500K in volume, something is happening:

- **Breaking news** that hasn't been widely reported yet
- **Insider information** that informed traders are acting on
- **Institutional flow** from a large fund taking a position

## How PolymarketFlow Detects Spikes

Our system compares each market's current volume against its rolling average:

- **3x average**: Notable — worth investigating
- **5x average**: Significant — likely driven by a catalyst
- **10x+ average**: Exceptional — major event or insider activity

## Real Examples

Markets that saw volume spikes before major price moves include resolution of political events, regulatory decisions, and economic data releases. In many cases, the volume spike preceded the price move by hours or even days.

## Getting Alerts

With PolymarketFlow Pro, you can set custom alerts for volume spikes in any market category. Get notified via email or Slack when unusual activity occurs.

[View Market Movers](/movers) | [Set Up Alerts](/pricing)
`,
  },
};

type BlogProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: BlogProps): Promise<Metadata> {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) return { title: "Article Not Found" };
  return {
    title: article.title,
    description: article.content.substring(0, 160).replace(/[#\n*]/g, "").trim(),
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { title: article.title, type: "article" },
  };
}

export function generateStaticParams() {
  return Object.keys(articles).map((slug) => ({ slug }));
}

export default async function BlogArticlePage({ params }: BlogProps) {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) notFound();

  // Simple markdown-to-HTML (handles ##, **, |tables|, [links], lists)
  const htmlContent = article.content
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-8 mb-3">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal text-muted-foreground">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-sm text-muted-foreground leading-relaxed mb-4">')
    .replace(/\|.*\|/g, (match) => `<div class="text-xs font-mono text-muted-foreground">${match}</div>`);

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://polymarketflow.com" },
        { name: "Blog", url: "https://polymarketflow.com/blog" },
        { name: article.title, url: `https://polymarketflow.com/blog/${slug}` },
      ]} />

      <Link href="/blog" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="h-3 w-3" /> Back to Blog
      </Link>

      <article>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{article.category}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{article.date}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{article.readTime}</span>
        </div>
        <h1 className="text-2xl font-bold mb-6">{article.title}</h1>
        <div className="terminal-card p-6" dangerouslySetInnerHTML={{ __html: `<p class="text-sm text-muted-foreground leading-relaxed mb-4">${htmlContent}</p>` }} />
      </article>
    </div>
  );
}
