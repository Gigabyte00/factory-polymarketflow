import { BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Prediction market insights, analysis, and guides from PolymarketFlow. Learn how to track markets, follow whales, and trade smarter.",
  alternates: { canonical: "/blog" },
};

const articles = [
  {
    slug: "what-is-polymarket",
    title: "What Is Polymarket? A Complete Guide to Prediction Markets",
    excerpt: "Polymarket is the world's largest prediction market platform where traders buy and sell shares based on the outcomes of real-world events. Learn how it works, how prices reflect probabilities, and how to get started.",
    category: "Guides",
    date: "March 15, 2026",
    readTime: "8 min read",
  },
  {
    slug: "whale-tracking-guide",
    title: "How to Track Polymarket Whales: Follow the Smart Money",
    excerpt: "Large traders — or 'whales' — often move markets with their positions. Learn how to identify whale wallets, track their activity, and use their moves as signals for your own trading decisions.",
    category: "Strategy",
    date: "March 14, 2026",
    readTime: "6 min read",
  },
  {
    slug: "prediction-market-strategies",
    title: "5 Prediction Market Strategies That Actually Work",
    excerpt: "From contrarian betting to volume spike detection, these proven strategies help traders find edge in prediction markets. We break down each approach with real examples from Polymarket.",
    category: "Strategy",
    date: "March 13, 2026",
    readTime: "10 min read",
  },
  {
    slug: "understanding-polymarket-odds",
    title: "Understanding Polymarket Odds: How Prices Become Probabilities",
    excerpt: "Every market on Polymarket prices outcomes between $0 and $1. But what do these prices really mean? We explain the relationship between share prices, implied probability, and market efficiency.",
    category: "Education",
    date: "March 12, 2026",
    readTime: "5 min read",
  },
  {
    slug: "polymarket-vs-polls",
    title: "Prediction Markets vs Polls: Which Forecasts Better?",
    excerpt: "Prediction markets have consistently outperformed traditional polling in political forecasting. We examine the data, explain why markets work, and show how to use both signals together.",
    category: "Analysis",
    date: "March 11, 2026",
    readTime: "7 min read",
  },
  {
    slug: "volume-spike-detection",
    title: "Volume Spike Detection: Finding Alpha in Prediction Markets",
    excerpt: "Unusual trading volume often precedes major price movements. Learn how PolymarketFlow detects volume spikes and how you can use them to anticipate market-moving events before they're priced in.",
    category: "Strategy",
    date: "March 10, 2026",
    readTime: "6 min read",
  },
];

export default function BlogPage() {
  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Blog
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Prediction market insights, analysis, and guides
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {articles.map((article) => (
          <article key={article.slug} className="terminal-card p-6 hover:border-primary/30 transition-colors group">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{article.category}</span>
              <span>{article.date}</span>
              <span>{article.readTime}</span>
            </div>
            <h2 className="text-lg font-semibold group-hover:text-primary transition-colors mb-2">
              {article.title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              {article.excerpt}
            </p>
            <span className="text-sm text-primary flex items-center gap-1">
              Read more <ArrowRight className="h-3 w-3" />
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
