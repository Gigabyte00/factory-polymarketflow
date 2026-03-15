"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  CreditCard,
  Globe,
  LayoutDashboard,
  LineChart,
  Settings,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  {
    title: "Explore",
    links: [
      { href: "/markets", label: "All Markets", icon: LayoutDashboard },
      { href: "/movers", label: "Market Movers", icon: TrendingUp },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    title: "Categories",
    links: [
      { href: "/markets?category=politics", label: "Politics", icon: Globe },
      { href: "/markets?category=crypto", label: "Crypto", icon: LineChart },
      { href: "/markets?category=sports", label: "Sports", icon: BarChart3 },
      { href: "/markets?category=culture", label: "Culture", icon: BookOpen },
    ],
  },
  {
    title: "Pro",
    badge: "PRO",
    links: [
      { href: "/whales", label: "Whale Tracker", icon: Users },
      { href: "/alerts", label: "Price Alerts", icon: Bell },
      { href: "/portfolio", label: "Portfolio", icon: Wallet },
    ],
  },
  {
    title: "Elite",
    badge: "ELITE",
    links: [
      { href: "/briefings", label: "AI Briefings", icon: Zap },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/pricing", label: "Upgrade", icon: CreditCard },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-card/30 py-4 overflow-y-auto">
      {sections.map((section) => (
        <div key={section.title} className="mb-4">
          <div className="flex items-center gap-2 px-4 mb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h3>
            {section.badge && (
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded",
                  section.badge === "PRO"
                    ? "bg-primary/20 text-primary"
                    : "bg-warning/20 text-warning"
                )}
              >
                {section.badge}
              </span>
            )}
          </div>
          <nav className="flex flex-col gap-0.5 px-2">
            {section.links.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href ||
                pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      {/* Status footer */}
      <div className="mt-auto px-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-profit animate-pulse" />
          <span>Data updated hourly</span>
        </div>
      </div>
    </aside>
  );
}
