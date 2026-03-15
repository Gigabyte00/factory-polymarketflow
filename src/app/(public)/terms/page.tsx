import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for PolymarketFlow prediction market intelligence platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <div className="terminal-card p-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p><strong className="text-foreground">Last updated:</strong> March 15, 2026</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">1. Acceptance of Terms</h2>
        <p>By accessing and using PolymarketFlow (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">2. Description of Service</h2>
        <p>PolymarketFlow provides analytics, tracking, and alert services for prediction markets. The Service aggregates publicly available data from Polymarket&apos;s APIs and provides derived analytics, whale tracking, and notification features.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">3. Not Financial Advice</h2>
        <p>The information provided by PolymarketFlow is for informational and educational purposes only. Nothing on this site constitutes financial advice, investment advice, trading advice, or any other sort of advice. You should not treat any of the content as such. PolymarketFlow does not recommend that any particular asset be bought, sold, or held by you. Trading decisions should be made based on your own research and risk tolerance.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">4. No Affiliation</h2>
        <p>PolymarketFlow is not affiliated with, endorsed by, or officially connected to Polymarket in any way. All product and company names are trademarks of their respective holders.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">5. Subscription Plans</h2>
        <p>PolymarketFlow offers free and paid subscription tiers. Paid subscriptions are billed monthly through Stripe. You may cancel at any time from your account settings. Cancellation takes effect at the end of the current billing period.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">6. Data Accuracy</h2>
        <p>While we strive to provide accurate and timely data, PolymarketFlow makes no guarantees regarding the accuracy, completeness, or timeliness of information. Market data is synced periodically and may not reflect real-time prices.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">7. Limitation of Liability</h2>
        <p>PolymarketFlow shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages resulting from your use of the Service, including but not limited to trading losses.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">8. Changes to Terms</h2>
        <p>We reserve the right to modify these terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">9. Contact</h2>
        <p>For questions about these terms, contact us at support@polymarketflow.com.</p>
      </div>
    </div>
  );
}
