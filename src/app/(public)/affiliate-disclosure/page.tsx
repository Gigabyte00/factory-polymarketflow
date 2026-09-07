import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate Disclosure",
  description:
    "How PolymarketFlow earns money: referral links to Polymarket, what they pay, and what they never change about our coverage.",
  alternates: { canonical: "/affiliate-disclosure" },
};

export default function AffiliateDisclosurePage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Affiliate Disclosure</h1>

      <div className="space-y-6">
        <div className="terminal-card p-6 space-y-5 text-sm text-muted-foreground leading-relaxed">
          <p>
            PolymarketFlow is operated by Merchant Dash LLC. Some links on this site, in our videos and in our
            social posts are referral links. <strong className="text-foreground">We may earn a commission when
            you sign up through links on this site — this never affects our coverage.</strong> Odds, rankings,
            whale data and editorial verdicts are produced the same way whether or not a link can pay us.
          </p>

          <h2 className="text-base font-semibold text-foreground">How our links work</h2>
          <p>
            Outbound links that can earn us a commission go through <code className="text-foreground">/go/</code>{" "}
            on this domain and carry <code className="text-foreground">rel=&quot;sponsored&quot;</code>. They redirect
            you to Polymarket with our referral code attached. When such a link is clicked we record that a
            click happened — the page it came from, the time, your browser type and a one-way hash of your IP
            address — so we can see which pages are useful. We do not see what you do on Polymarket beyond what
            its partner program reports back to us in aggregate.
          </p>

          <h2 className="text-base font-semibold text-foreground">What we may earn</h2>
          <p>
            Through Polymarket&apos;s partner program we may receive a fixed bounty when a referred user makes a
            first deposit, and a share of the trading fees Polymarket collects from referred Perps traders. You
            never pay more by using our links, and Polymarket&apos;s own fees are the same with or without a
            referral.
          </p>

          <h2 className="text-base font-semibold text-foreground">Eligibility and risk</h2>
          <p>
            Per Polymarket&apos;s documentation, Perps order placement is blocked in the United States and Canada,
            and the main platform carries separate restrictions elsewhere. Confirm your own eligibility before
            signing up; circumventing geo-restrictions violates Polymarket&apos;s terms and we will never suggest a
            way around them. Perps are leveraged derivatives — leverage amplifies losses, funding accrues hourly,
            and liquidation is not a guaranteed stop-loss. Nothing on this site is investment, financial or
            legal advice.
          </p>

          <h2 className="text-base font-semibold text-foreground">Independence</h2>
          <p>
            PolymarketFlow is not affiliated with, endorsed by or operated by Polymarket. Odds shown are
            Polymarket market prices, presented for information only. The same referral links appear in our
            videos and social posts, each of which carries its own disclosure.
          </p>

          <h2 className="text-base font-semibold text-foreground">Contact</h2>
          <p>
            Questions about this disclosure: <a href="mailto:support@merchant-dash.com" className="text-primary hover:underline">support@merchant-dash.com</a>.
            See also our <Link href="/terms" className="text-primary hover:underline">Terms</Link> and{" "}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
