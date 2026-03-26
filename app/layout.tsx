import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Onlu — Private Credit & Special Situations Intelligence",
  description:
    "Track fund signals, hiring intel, and market insights across private credit, special situations, and restructuring. Know where opportunities are before they're posted.",
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
