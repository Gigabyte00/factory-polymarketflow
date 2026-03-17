import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { getTickerData } from "@/components/layout/live-ticker";
import { Sidebar } from "@/components/layout/sidebar";
import { Footer } from "@/components/layout/footer";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { OrganizationSchema, WebSiteSchema, SoftwareAppSchema } from "@/components/structured-data";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

export const metadata: Metadata = {
  metadataBase: new URL("https://polymarketflow.com"),
  title: {
    default: "PolymarketFlow - Prediction Market Intelligence",
    template: "%s | PolymarketFlow",
  },
  description:
    "Real-time analytics, whale tracking, and smart alerts for Polymarket traders. Track markets, follow smart money, and get notified when opportunities arise.",
  keywords: [
    "polymarket",
    "prediction market",
    "analytics",
    "whale tracker",
    "price alerts",
    "trading intelligence",
    "prediction market data",
    "polymarket whales",
    "polymarket alerts",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PolymarketFlow - Prediction Market Intelligence",
    description:
      "Real-time analytics, whale tracking, and smart alerts for Polymarket traders.",
    url: "https://polymarketflow.com",
    siteName: "PolymarketFlow",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PolymarketFlow - Prediction Market Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PolymarketFlow - Prediction Market Intelligence",
    description:
      "Real-time analytics, whale tracking, and smart alerts for Polymarket traders.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tickerData = await getTickerData();

  return (
    <html lang="en" className="dark">
      <head>
        {/* Google Analytics 4 */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <OrganizationSchema />
        <WebSiteSchema />
        <SoftwareAppSchema />
        <Navbar tickerData={tickerData} />
        <div className="flex flex-1" role="presentation">
          <Sidebar />
          <main className="flex-1 overflow-auto" role="main">{children}</main>
        </div>
        <Footer />

        {/* Vercel Analytics */}
        <Analytics />

        {/* Vercel Speed Insights */}
        <SpeedInsights />
      </body>
    </html>
  );
}
