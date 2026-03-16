import { Activity } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30 mt-auto">
      <div className="max-w-screen-2xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-bold">
                <span className="text-primary">Polymarket</span>
                <span className="text-foreground">Flow</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Real-time intelligence for prediction market traders. Track markets,
              follow whales, get alerts.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/markets" className="hover:text-foreground transition-colors">Markets</Link></li>
              <li><Link href="/screener" className="hover:text-foreground transition-colors">Screener</Link></li>
              <li><Link href="/movers" className="hover:text-foreground transition-colors">Movers</Link></li>
              <li><Link href="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</Link></li>
              <li><Link href="/whale-tracker" className="hover:text-foreground transition-colors">Whale Tracker</Link></li>
              <li><Link href="/alerts-feed" className="hover:text-foreground transition-colors">Free Whale Alerts</Link></li>
              <li><Link href="/tools" className="hover:text-foreground transition-colors">All Tools</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
            </ul>
          </div>

          {/* Predictions */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Predictions</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/predictions/politics" className="hover:text-foreground transition-colors">Politics</Link></li>
              <li><Link href="/predictions/crypto" className="hover:text-foreground transition-colors">Crypto</Link></li>
              <li><Link href="/predictions/sports" className="hover:text-foreground transition-colors">Sports</Link></li>
              <li><Link href="/predictions/economics" className="hover:text-foreground transition-colors">Economics</Link></li>
              <li><Link href="/accuracy" className="hover:text-foreground transition-colors">Accuracy</Link></li>
              <li><Link href="/scorecard" className="hover:text-foreground transition-colors">Scorecard</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link href="/blog/what-is-polymarket" className="hover:text-foreground transition-colors">What is Polymarket?</Link></li>
              <li><Link href="/blog/whale-tracking-guide" className="hover:text-foreground transition-colors">Whale Tracking Guide</Link></li>
              <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>PolymarketFlow is not affiliated with Polymarket. Data provided for informational purposes only.</p>
          <p>Built with data from Polymarket APIs</p>
        </div>
      </div>
    </footer>
  );
}
