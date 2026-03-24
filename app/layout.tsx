import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Onlu",
  description:
    "Search hedge funds and credit funds actively raising capital · SEC EDGAR Form D signals with opportunity scoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
