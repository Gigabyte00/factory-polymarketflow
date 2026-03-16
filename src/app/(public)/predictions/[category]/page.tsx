import { getEvents } from "@/lib/supabase/pmflow";
import { MarketCard } from "@/components/markets/market-card";
import { BreadcrumbSchema } from "@/components/structured-data";
import { Globe, TrendingUp, BarChart3, Cpu, Film, DollarSign, Cloud } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

const categoryMeta: Record<string, { title: string; desc: string; icon: any; intro: string }> = {
  politics: { title: "Politics Predictions", desc: "Track prediction market odds for elections, legislation, and political events worldwide.", icon: Globe, intro: "Political prediction markets aggregate the wisdom of thousands of traders to forecast election outcomes, policy decisions, and geopolitical events. Markets have consistently outperformed polls in accuracy." },
  crypto: { title: "Crypto Predictions", desc: "Bitcoin, Ethereum, and cryptocurrency prediction markets. Track price targets, ETF approvals, and regulatory decisions.", icon: TrendingUp, intro: "Cryptocurrency prediction markets let you track the implied probability of price targets, regulatory decisions, ETF approvals, and major protocol events. These markets are often the first to price in breaking crypto news." },
  sports: { title: "Sports Predictions", desc: "Sports betting odds and prediction markets for NFL, NBA, FIFA, and more.", icon: BarChart3, intro: "Sports prediction markets offer a unique perspective on game outcomes, championship winners, and player performance. Unlike traditional sportsbooks, prediction market odds reflect true probability rather than bookmaker margins." },
  "science-tech": { title: "Science & Tech Predictions", desc: "AI, space, biotech, and technology prediction markets.", icon: Cpu, intro: "Track the future of technology through prediction markets. From AI milestones and SpaceX launches to FDA approvals and semiconductor breakthroughs, these markets reflect expert and crowd consensus on tech timelines." },
  culture: { title: "Culture Predictions", desc: "Entertainment, awards, and pop culture prediction markets.", icon: Film, intro: "Prediction markets for entertainment events including the Oscars, Grammy Awards, box office performance, streaming wars, and celebrity events." },
  economics: { title: "Economics Predictions", desc: "Federal Reserve decisions, inflation, GDP, and economic indicator predictions.", icon: DollarSign, intro: "Economic prediction markets provide real-time probability estimates for Federal Reserve rate decisions, inflation targets, recession timing, and major economic indicators. Often more accurate than economist surveys." },
  weather: { title: "Weather Predictions", desc: "Hurricane, temperature, and climate prediction markets.", icon: Cloud, intro: "Weather and climate prediction markets track extreme weather events, temperature records, and climate milestones." },
};

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const meta = categoryMeta[category];
  if (!meta) return { title: "Predictions" };
  return {
    title: meta.title,
    description: meta.desc,
    alternates: { canonical: `/predictions/${category}` },
    openGraph: { title: meta.title, description: meta.desc },
  };
}

export function generateStaticParams() {
  return Object.keys(categoryMeta).map((category) => ({ category }));
}

export default async function PredictionsCategoryPage({ params }: Props) {
  const { category } = await params;
  const meta = categoryMeta[category];
  if (!meta) {
    return <div className="p-6 text-center"><p className="text-muted-foreground">Category not found.</p></div>;
  }

  const Icon = meta.icon;
  // Map URL slugs to DB category names
  const dbCategory = category === "science-tech" ? "Science & Tech" : category.charAt(0).toUpperCase() + category.slice(1);
  const events = await getEvents({ limit: 60, category: dbCategory });

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://polymarketflow.com" },
        { name: "Predictions", url: "https://polymarketflow.com/markets" },
        { name: meta.title, url: `https://polymarketflow.com/predictions/${category}` },
      ]} />

      {/* Category header with editorial intro */}
      <div className="terminal-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-6 w-6 text-primary" /></div>
          <h1 className="text-2xl font-bold">{meta.title}</h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{meta.intro}</p>
        <div className="mt-3 text-xs text-muted-foreground">{events.length} active markets</div>
      </div>

      {/* Related categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {Object.entries(categoryMeta).map(([key, val]) => (
          <Link key={key} href={`/predictions/${key}`} className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${key === category ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            {val.title.replace(" Predictions", "")}
          </Link>
        ))}
      </div>

      {/* Markets grid */}
      {events.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event: any) => <MarketCard key={event.id} event={event} />)}
        </div>
      ) : (
        <div className="terminal-card p-12 text-center">
          <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No {meta.title.toLowerCase()} markets</h2>
          <p className="text-muted-foreground text-sm">Check back soon or <Link href="/markets" className="text-primary hover:underline">browse all markets</Link>.</p>
        </div>
      )}
    </div>
  );
}
