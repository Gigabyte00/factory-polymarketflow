import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Free, Starter & Pro Plans",
  description:
    "PolymarketFlow pricing: free market explorer and whale feed, Starter ($49/mo) with real-time whale alerts and screener, Pro ($199/mo) with flow feed, smart money signals and AI briefings. 7-day free trial on paid plans.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "PolymarketFlow Pricing",
    description:
      "Free prediction-market analytics, or go Starter/Pro for real-time whale alerts, flow feed and smart money signals.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
