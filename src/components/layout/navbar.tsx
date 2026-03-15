"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  ChevronDown,
  LayoutDashboard,
  Search,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/markets", label: "Markets", icon: LayoutDashboard },
  { href: "/movers", label: "Movers", icon: TrendingUp },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Live market ticker */}
      <div className="border-b border-border bg-card/50 overflow-hidden">
        <div className="flex items-center h-8 animate-ticker-scroll whitespace-nowrap">
          <TickerItem label="BTC $100K" price="65%" change={2.1} />
          <TickerItem label="Fed Rate Cut" price="42%" change={-1.3} />
          <TickerItem label="Trump 2028" price="28%" change={0.5} />
          <TickerItem label="ETH $10K" price="18%" change={-0.8} />
          <TickerItem label="AI Singularity" price="12%" change={3.2} />
          <TickerItem label="Mars Landing" price="8%" change={0.0} />
          {/* Duplicate for seamless scroll */}
          <TickerItem label="BTC $100K" price="65%" change={2.1} />
          <TickerItem label="Fed Rate Cut" price="42%" change={-1.3} />
          <TickerItem label="Trump 2028" price="28%" change={0.5} />
          <TickerItem label="ETH $10K" price="18%" change={-0.8} />
          <TickerItem label="AI Singularity" price="12%" change={3.2} />
          <TickerItem label="Mars Landing" price="8%" change={0.0} />
        </div>
      </div>

      {/* Main nav */}
      <div className="flex items-center h-14 px-4 max-w-screen-2xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-8">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">
            <span className="text-primary">Polymarket</span>
            <span className="text-foreground">Flow</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {/* Search */}
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search markets...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              /
            </kbd>
          </button>

          {/* Alerts */}
          <button className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
          </button>

          {/* Sign in / Pro badge */}
          <Link
            href="/auth"
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Zap className="h-4 w-4" />
            Sign In
          </Link>
        </div>
      </div>
    </header>
  );
}

function TickerItem({
  label,
  price,
  change,
}: {
  label: string;
  price: string;
  change: number;
}) {
  return (
    <div className="inline-flex items-center gap-2 px-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold text-foreground">{price}</span>
      <span
        className={cn(
          "font-mono",
          change > 0 ? "text-profit" : change < 0 ? "text-loss" : "text-muted-foreground"
        )}
      >
        {change > 0 ? "+" : ""}
        {change.toFixed(1)}%
      </span>
      <span className="text-border mx-2">|</span>
    </div>
  );
}
