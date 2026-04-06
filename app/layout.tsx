import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Onlu — Buyside Intelligence",
  description:
    "Fund signals, hiring intel, live markets, AI-powered interview prep, and community for buyside professionals. Know where opportunities are before they're posted.",
  metadataBase: new URL("https://onluintel.com"),
  alternates: { canonical: "https://onluintel.com" },
  openGraph: {
    title: "Onlu — Buyside Intelligence",
    description:
      "Fund signals, hiring intel, live markets, AI-powered interview prep, and community for buyside professionals.",
    url: "https://onluintel.com",
    siteName: "Onlu",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Onlu — Buyside Intelligence",
    description:
      "Fund signals, hiring intel, live markets, and AI-powered interview prep for buyside professionals.",
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
      <body className="min-h-full flex flex-col font-sans">{children}<Analytics /></body>
    </html>
  );
}
