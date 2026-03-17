import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/pmflow";
import { redirect } from "next/navigation";
import { Brain, Zap, Calendar } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { canAccessBriefings, hasPersonalizedBriefings } from "@/lib/entitlements";

export const metadata: Metadata = { title: "AI Briefings" };

export default async function BriefingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const profile = await getUserProfile(user.id);
  const hasAccess = canAccessBriefings(profile);
  const personalized = hasPersonalizedBriefings(profile);

  if (!hasAccess) {
    return (
      <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
        <div className="terminal-card p-12 text-center max-w-lg mx-auto mt-12">
          <Brain className="h-12 w-12 text-warning mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">AI Market Briefings</h1>
          <p className="text-muted-foreground mb-6">Claude-powered daily intelligence reports. Available on Starter and Pro.</p>
          <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">Upgrade to Starter</Link>
        </div>
      </div>
    );
  }

  // Fetch briefings from pmflow.posts
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { db: { schema: "pmflow" } });
  const { data: briefings } = await db
    .from("posts")
    .select("*")
    .eq("type", "briefing")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(20);

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-warning" />AI Briefings</h1>
        <p className="text-muted-foreground text-sm mt-1">Daily market intelligence powered by Claude {personalized ? "(personalized)" : ""}</p>
      </div>

      {briefings && briefings.length > 0 ? (
        <div className="space-y-4">
          {briefings.map((b: any) => (
            <div key={b.id} className="terminal-card p-6">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Calendar className="h-3 w-3" />
                {new Date(b.published_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
              <h2 className="text-lg font-semibold mb-2">{b.title}</h2>
              {b.excerpt && <p className="text-sm text-muted-foreground">{b.excerpt}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="terminal-card p-12 text-center">
          <Zap className="h-8 w-8 text-warning mx-auto mb-2" />
          <h2 className="text-lg font-semibold mb-2">First briefing coming soon</h2>
          <p className="text-sm text-muted-foreground">AI briefings are generated every 6 hours. The first one will appear here shortly.</p>
        </div>
      )}
    </div>
  );
}
