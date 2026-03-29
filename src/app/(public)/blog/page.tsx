import { createClient } from "@supabase/supabase-js";
import { BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog & Market Insights",
  description: "Prediction market insights, analysis, and guides from PolymarketFlow. Daily market intelligence, whale tracking strategies, and trading guides.",
  alternates: { canonical: "/blog" },
};

export const revalidate = 3600; // Revalidate hourly

export default async function BlogPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <div className="p-6 text-center"><p className="text-muted-foreground">Loading blog...</p></div>;
  }
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });

  const { data: posts } = await db
    .from("posts")
    .select("slug, title, excerpt, category, published_at, read_time, type")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(50);

  // Group by category
  const insights = (posts || []).filter((p: any) => p.type === "briefing" || p.category === "Market Insights");
  const articles = (posts || []).filter((p: any) => p.type === "article" && p.category !== "Market Insights");

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Blog & Market Insights
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Daily market intelligence, trading strategies, and prediction market guides
        </p>
      </div>

      {/* Market Insights (auto-generated daily) */}
      {insights.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Latest Market Insights
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {insights.slice(0, 6).map((post: any) => (
              <ArticleCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      )}

      {/* Guides & Strategy */}
      <div>
        <h2 className="text-lg font-bold mb-4">Guides & Strategy</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {articles.map((post: any) => (
            <ArticleCard key={post.slug} post={post} />
          ))}
        </div>
      </div>

      {/* No posts fallback */}
      {(!posts || posts.length === 0) && (
        <div className="terminal-card p-12 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No articles yet. Check back soon.</p>
        </div>
      )}
    </div>
  );
}

function ArticleCard({ post }: { post: any }) {
  const date = post.published_at ? new Date(post.published_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";
  return (
    <Link href={`/blog/${post.slug}`} className="terminal-card p-5 hover:border-primary/30 transition-colors group">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{post.category || post.type}</span>
        {date && <span>{date}</span>}
        {post.read_time && <span>{post.read_time}</span>}
      </div>
      <h3 className="text-sm font-semibold group-hover:text-primary transition-colors mb-1.5">{post.title}</h3>
      {post.excerpt && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{post.excerpt}</p>}
      <span className="text-xs text-primary flex items-center gap-1 mt-2">Read more <ArrowRight className="h-3 w-3" /></span>
    </Link>
  );
}
