import type { Metadata } from "next";
import "./globals.css";
import AnalyticsProvider from "@/components/AnalyticsProvider";

export const metadata: Metadata = {
  title: "Onlu | Finance Career Intelligence — OnluIntel",
  description:
    "Onlu (OnluIntel) — fund signals, hiring intel, live markets, AI-powered interview prep, and community for finance professionals. Know where opportunities are before they're posted.",
  keywords: "onlu, onluintel, finance career intelligence, buy-side jobs, private equity jobs, hedge fund jobs, investment banking, finance hiring, market pulse",
  metadataBase: new URL("https://onluintel.com"),
  alternates: { canonical: "https://onluintel.com" },
  openGraph: {
    title: "Onlu — Finance Career Intelligence",
    description:
      "Fund signals, hiring intel, live markets, AI-powered interview prep, and community for finance professionals.",
    url: "https://onluintel.com",
    siteName: "Onlu",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Onlu — Finance Career Intelligence",
    description:
      "Fund signals, hiring intel, live markets, and AI-powered interview prep for finance professionals.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    google: "Pdt3olG3iKsJ8l6Ax6AMzoESmL3_bgECUNr0U1DTXDg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Onlu",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Onlu",
    "theme-color": "#1A2B4A",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icon-192" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Onlu",
            "alternateName": ["OnluIntel", "Onluintel", "onlu.ai"],
            "url": "https://onluintel.com",
            "logo": "https://onluintel.com/icon-192",
            "description": "Finance career intelligence platform. Fund signals, hiring intel, live markets, AI-powered interview prep, and community for finance professionals.",
            "sameAs": [],
            "foundingDate": "2024",
            "keywords": "onlu, onluintel, finance career, buy-side jobs, private equity, hedge fund, investment banking, finance intelligence"
          })}}
        />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function() {});
            });
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col">{children}<AnalyticsProvider /></body>
    </html>
  );
}
