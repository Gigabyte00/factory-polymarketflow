import Link from "next/link";
import { CalendarDays, Landmark, Percent, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** The evergreen live-data pages. Shared by the /odds index, page footers, nav and tools grid. */
export const DATA_PAGES: { href: string; label: string; desc: string; icon: LucideIcon }[] = [
  { href: "/odds/2026-midterms", label: "2026 Midterm Odds", desc: "House, Senate and every tracked race — live", icon: Landmark },
  { href: "/odds/fed-rate-cut", label: "Fed Rate Cut Odds", desc: "Next FOMC meeting, cuts in 2026, year-end rate", icon: Percent },
  { href: "/biggest-polymarket-bets", label: "Biggest Polymarket Bets", desc: "Largest whale positions and moves this week", icon: Trophy },
  { href: "/calendar", label: "Resolution Calendar", desc: "What resolves this week and this month", icon: CalendarDays },
];

export function DataPagesNav({ current }: { current?: string }) {
  const items = DATA_PAGES.filter((p) => p.href !== current);
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-3">More live data</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map((p) => {
          const Icon = p.icon;
          return (
            <Link key={p.href} href={p.href} className="terminal-card p-4 hover:border-primary/40 transition-colors group">
              <Icon className="h-4 w-4 text-primary mb-2" />
              <p className="text-sm font-semibold group-hover:text-primary transition-colors">{p.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
