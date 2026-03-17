import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserAlerts, getUserProfile } from "@/lib/supabase/pmflow";
import { redirect } from "next/navigation";
import { Bell, Plus, Trash2 } from "lucide-react";
import { cn, formatProbability } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { getAlertLimit, getTier, isStarter } from "@/lib/entitlements";

export const metadata: Metadata = { title: "Price Alerts" };

export default async function AlertsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const profile = await getUserProfile(user.id);
  const tier = getTier(profile);
  const limit = getAlertLimit(profile);

  const alerts = await getUserAlerts(user.id);

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="h-6 w-6 text-primary" />Price Alerts</h1>
          <p className="text-muted-foreground text-sm mt-1">{alerts.length} active alerts{limit ? ` (${limit} max on ${tier})` : ""}</p>
        </div>
          <Link href="/markets" className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />New Alert
          </Link>
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="terminal-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{alert.market_question || "Unknown Market"}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Alert when price {alert.condition} {formatProbability(alert.threshold)} via {alert.channel}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${alert.active ? "bg-profit/20 text-profit" : "bg-muted text-muted-foreground"}`}>
                  {alert.active ? "ACTIVE" : "PAUSED"}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="terminal-card p-12 text-center">
          <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <h2 className="text-lg font-semibold mb-2">No alerts yet</h2>
          <p className="text-sm text-muted-foreground mb-4">Browse markets and click &ldquo;Set Alert&rdquo; to create your first price alert.</p>
          <Link href="/markets" className="text-sm text-primary hover:underline">Browse Markets</Link>
        </div>
      )}
    </div>
  );
}
