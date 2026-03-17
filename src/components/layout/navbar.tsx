"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CreditCard,
  Filter,
  Globe,
  LayoutDashboard,
  LineChart,
  Menu,
  Search,
  Settings,
  Star,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/markets", label: "Markets", icon: LayoutDashboard },
  { href: "/movers", label: "Movers", icon: TrendingUp },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

const mobileMenuSections = [
  {
    title: "Explore",
    links: [
      { href: "/markets", label: "All Markets", icon: LayoutDashboard },
      { href: "/flow", label: "Flow", icon: Activity },
      { href: "/screener", label: "Screener", icon: Filter },
      { href: "/movers", label: "Market Movers", icon: TrendingUp },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    title: "Categories",
    links: [
      { href: "/predictions/politics", label: "Politics", icon: Globe },
      { href: "/predictions/crypto", label: "Crypto", icon: LineChart },
      { href: "/predictions/sports", label: "Sports", icon: BarChart3 },
    ],
  },
  {
    title: "Pro",
    links: [
      { href: "/flow", label: "Flow Feed", icon: Activity },
      { href: "/whales", label: "Whale Tracker", icon: Users },
      { href: "/alerts", label: "Price Alerts", icon: Bell },
      { href: "/watchlist", label: "Watchlist", icon: Star },
      { href: "/portfolio", label: "Portfolio", icon: Wallet },
      { href: "/briefings", label: "AI Briefings", icon: Zap },
    ],
  },
  {
    title: "More",
    links: [
      { href: "/whale-tracker", label: "Whale Tracker", icon: Users },
      { href: "/tools", label: "Free Tools", icon: BarChart3 },
      { href: "/blog", label: "Blog", icon: BookOpen },
      { href: "/pricing", label: "Pricing", icon: CreditCard },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface NavbarProps {
  tickerData?: { label: string; price: string; change: number }[];
}

export function Navbar({ tickerData }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const ticker = tickerData && tickerData.length > 0 ? tickerData : [
    { label: "Loading markets...", price: "—", change: 0 },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Live market ticker */}
      <div className="border-b border-border bg-card/50 overflow-hidden">
        <div className="flex items-center h-8 animate-ticker-scroll whitespace-nowrap">
          {ticker.map((t, i) => (
            <TickerItem key={i} label={t.label} price={t.price} change={t.change} />
          ))}
          {/* Duplicate for seamless scroll */}
          {ticker.map((t, i) => (
            <TickerItem key={`dup-${i}`} label={t.label} price={t.price} change={t.change} />
          ))}
        </div>
      </div>

      {/* Main nav */}
      <div className="flex items-center h-14 px-4 max-w-screen-2xl mx-auto">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden mr-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-8" aria-label="PolymarketFlow home">
          <Activity className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg tracking-tight">
            <span className="text-primary">Polymarket</span>
            <span className="text-foreground">Flow</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
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
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Link
            href="/markets?q="
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
            aria-label="Search markets"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search...</span>
          </Link>

          <Link href="/alerts" className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" aria-label="Price alerts">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
          </Link>

          <Link
            href="/auth"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Sign In</span>
          </Link>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-background/98 backdrop-blur max-h-[70vh] overflow-y-auto">
          <nav className="px-4 py-3 space-y-4" aria-label="Mobile navigation">
            {mobileMenuSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-2">{section.title}</h3>
                <div className="space-y-0.5">
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-2.5 px-2 py-2 rounded-md text-sm transition-colors",
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
                </div>
              </div>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function TickerItem({ label, price, change }: { label: string; price: string; change: number }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold text-foreground">{price}</span>
      <span className={cn("font-mono", change > 0 ? "text-profit" : change < 0 ? "text-loss" : "text-muted-foreground")}>
        {change > 0 ? "+" : ""}{change.toFixed(1)}%
      </span>
      <span className="text-border mx-2">|</span>
    </div>
  );
}
