import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for PolymarketFlow. How we collect, use, and protect your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="terminal-card p-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p><strong className="text-foreground">Last updated:</strong> March 15, 2026</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">1. Information We Collect</h2>
        <p><strong className="text-foreground">Account Information:</strong> When you create an account, we collect your email address and optional display name.</p>
        <p><strong className="text-foreground">Wallet Address:</strong> If you use the Portfolio Tracker feature, you may voluntarily provide your Polymarket wallet address. This is a public blockchain address.</p>
        <p><strong className="text-foreground">Usage Data:</strong> We collect anonymous analytics data about how you use the Service, including pages visited and features used. This data is collected via Google Analytics and Vercel Analytics.</p>
        <p><strong className="text-foreground">Payment Data:</strong> Payment processing is handled by Stripe. We do not store your credit card information. See Stripe&apos;s privacy policy for details.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Provide and maintain the Service</li>
          <li>Send you alerts and notifications you&apos;ve configured</li>
          <li>Process subscription payments</li>
          <li>Improve the Service through anonymous usage analytics</li>
          <li>Communicate about service updates or changes</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground mt-6">3. Data Sharing</h2>
        <p>We do not sell your personal information. We share data only with:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong className="text-foreground">Stripe</strong> — for payment processing</li>
          <li><strong className="text-foreground">Supabase</strong> — for data storage and authentication</li>
          <li><strong className="text-foreground">Vercel</strong> — for hosting and analytics</li>
          <li><strong className="text-foreground">Google</strong> — for analytics (GA4)</li>
          <li><strong className="text-foreground">Resend</strong> — for transactional emails</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground mt-6">4. Cookies</h2>
        <p>We use essential cookies for authentication and session management. Analytics cookies are used to understand usage patterns. You can disable cookies in your browser settings.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">5. Data Retention</h2>
        <p>Account data is retained for as long as your account is active. You can delete your account at any time by contacting us. Market data (events, prices, etc.) is public information aggregated from Polymarket&apos;s APIs.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">6. Security</h2>
        <p>We use industry-standard security measures including encrypted connections (HTTPS/TLS), secure authentication, and encrypted data storage. However, no method of transmission over the Internet is 100% secure.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">7. Your Rights</h2>
        <p>You have the right to access, correct, or delete your personal data. Contact us at support@polymarketflow.com for any data-related requests.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">8. Changes</h2>
        <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>

        <h2 className="text-lg font-semibold text-foreground mt-6">9. Contact</h2>
        <p>For questions about this privacy policy, contact us at support@polymarketflow.com.</p>
      </div>
    </div>
  );
}
