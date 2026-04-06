import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Onlu — Private Credit & Special Situations Intelligence",
  description:
    "Track fund signals, hiring intel, and market insights across private credit, special situations, and restructuring. Know where opportunities are before they're posted.",
  metadataBase: new URL("https://onluintel.com"),
  alternates: { canonical: "https://onluintel.com" },
  openGraph: {
    title: "Onlu — Private Credit & Special Situations Intelligence",
    description:
      "Track fund signals, hiring intel, and market insights across private credit, special situations, and restructuring. Know where opportunities are before they're posted.",
    url: "https://onluintel.com",
    siteName: "Onlu",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Onlu — Private Credit & Special Situations Intelligence",
    description:
      "Track fund signals, hiring intel, and market insights across private credit, special situations, and restructuring.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    google: "Pdt3olG3iKsJ8l6Ax6AMzoESmL3_bgECUNr0U1DTXDg",
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
