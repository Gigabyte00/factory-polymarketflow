import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Activity,
  Bell,
  BarChart3,
  TrendingUp,
  Users,
  Wallet,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { canAccessBriefings, canAccessPortfolio, getTier, isPro, isStarter } from "@/lib/entitlements";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Fetch user profile from pmflow schema
  const { createClient } = await import("@supabase/supabase-js");
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await serviceClient
    .schema("pmflow")
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const tier = getTier(profile);
  const hasStarter = isStarter(profile);
  const hasPro = isPro(profile);

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      {/* Welcome header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back, {profile?.name || user.email}
        </p>
      </div>

      {/* Tier badge + upgrade CTA */}
      <div className="terminal-card p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`px-3 py-1 rounded-full text-sm font-bold ${
              hasPro
                ? "bg-primary/20 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {tier.toUpperCase()}
          </div>
          <span className="text-sm text-muted-foreground">
            {hasPro
              ? "Full access to all features"
              : hasStarter
                ? "Starter access enabled"
                : "Upgrade to unlock premium features"}
          </span>
        </div>
        {!hasPro && (
          <Link
            href="/pricing"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Upgrade
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {/* Quick actions grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <QuickAction
          icon={BarChart3}
          title="Explore Markets"
          description="Browse all active prediction markets"
          href="/markets"
          available
        />
        <QuickAction
          icon={TrendingUp}
          title="Market Movers"
          description="See what moved today"
          href="/movers"
          available
        />
        <QuickAction
          icon={Users}
          title="Whale Tracker"
          description="Follow smart money movements"
          href="/whales"
          available={hasPro}
          tier="PRO"
        />
        <QuickAction
          icon={Bell}
          title="Price Alerts"
          description="Get notified on price changes"
          href="/alerts"
          available={hasStarter}
          tier={hasStarter ? undefined : "STARTER"}
        />
        <QuickAction
          icon={Wallet}
          title="Portfolio"
          description="Track your positions and PnL"
          href="/portfolio"
          available={canAccessPortfolio(profile)}
          tier={hasStarter ? undefined : "STARTER"}
        />
        <QuickAction
          icon={Zap}
          title="AI Briefings"
          description="Daily market intelligence reports"
          href="/briefings"
          available={canAccessBriefings(profile)}
           tier={hasStarter ? undefined : "STARTER"}
        />
      </div>

      {/* Recent alerts */}
      <div className="terminal-card p-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Recent Alerts
        </h2>
        {hasStarter ? (
          <div className="text-center py-8">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No alerts configured yet.
            </p>
            <Link
              href="/alerts"
              className="text-sm text-primary hover:underline mt-1 inline-block"
            >
              Create your first alert
            </Link>
          </div>
        ) : (
          <div className="text-center py-8">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Price alerts are available with Starter.
            </p>
            <Link
              href="/pricing"
              className="text-sm text-primary hover:underline mt-1 inline-block"
            >
              Upgrade to Pro
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  title,
  description,
  href,
  available,
  tier,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  available: boolean;
  tier?: string;
}) {
  if (!available) {
    return (
      <div className="terminal-card p-4 opacity-60">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold text-sm">{title}</span>
          {tier && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                tier === "ELITE"
                  ? "bg-warning/20 text-warning"
                  : "bg-primary/20 text-primary"
              }`}
            >
              {tier}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="terminal-card p-4 hover:border-primary/30 transition-colors group"
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm group-hover:text-primary transition-colors">
          {title}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Link>
  );
}
