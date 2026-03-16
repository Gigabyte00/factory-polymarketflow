import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import { BreadcrumbSchema } from "@/components/structured-data";
import type { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const db = getDb();
  const { data: post } = await db.from("posts").select("title, excerpt, meta_title, meta_description").eq("slug", slug).eq("published", true).single();
  if (!post) return { title: "Article Not Found" };
  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || "",
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { title: post.meta_title || post.title, type: "article" },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const db = getDb();
  const { data: post } = await db
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!post) notFound();

  const date = post.published_at ? new Date(post.published_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "";

  // Get related posts (same category)
  const { data: related } = await db
    .from("posts")
    .select("slug, title, category")
    .eq("published", true)
    .neq("slug", slug)
    .order("published_at", { ascending: false })
    .limit(4);

  // Render markdown-like content
  const htmlContent = (post.content || "")
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-8 mb-3">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc text-muted-foreground">$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal text-muted-foreground">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-sm text-muted-foreground leading-relaxed mb-4">');

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <BreadcrumbSchema items={[
        { name: "Home", url: "https://polymarketflow.com" },
        { name: "Blog", url: "https://polymarketflow.com/blog" },
        { name: post.title, url: `https://polymarketflow.com/blog/${slug}` },
      ]} />

      <Link href="/blog" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="h-3 w-3" /> Back to Blog
      </Link>

      <article>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          {post.category && <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{post.category}</span>}
          {date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{date}</span>}
          {post.read_time && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{post.read_time}</span>}
          {post.author && <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.author}</span>}
        </div>
        <h1 className="text-2xl font-bold mb-6">{post.title}</h1>
        <div className="terminal-card p-6" dangerouslySetInnerHTML={{ __html: `<p class="text-sm text-muted-foreground leading-relaxed mb-4">${htmlContent}</p>` }} />
      </article>

      {/* Related articles */}
      {related && related.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold mb-3">More from the Blog</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {related.map((r: any) => (
              <Link key={r.slug} href={`/blog/${r.slug}`} className="terminal-card p-3 hover:border-primary/30 transition-colors group">
                <span className="text-xs font-medium group-hover:text-primary transition-colors">{r.title}</span>
                {r.category && <span className="block text-[10px] text-muted-foreground mt-0.5">{r.category}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
