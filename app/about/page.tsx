import type { Metadata } from "next";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Onlu",
  description:
    "Onlu is an intelligence platform for finance professionals — fund signals, hiring intel, live markets, AI-powered interview prep, and community.",
};

const FEATURES = [
  {
    label: "Hiring Watch",
    href: "/?tab=hiring",
    desc: "Curated roles across hedge funds, PE, private credit, and alt asset managers — filtered for relevance, refreshed daily.",
  },
  {
    label: "Market Pulse",
    href: "/?tab=pulse",
    desc: "Live market data, AI briefs, SEC EDGAR fund signals, and distressed watch — in one place.",
  },
  {
    label: "Edge Prep",
    href: "/?tab=firmprep",
    desc: "Firm-specific interview prep, concept Q&A, case walkthroughs, and a credit cap structure search tool.",
  },
  {
    label: "Onlu Events",
    href: "/?tab=table",
    desc: "Small-group coffee chats for finance professionals. Capped at 8 — intentionally.",
  },
  {
    label: "Onlu Learning",
    href: "/?tab=learn",
    desc: "Practical write-ups on credit markets, macro, and career strategy — with visual deep-dives.",
  },
  {
    label: "1-on-1 Coaching",
    href: "/coaching",
    desc: "Resume reviews, mock interviews, and career strategy sessions with finance professionals.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#201B2E] flex flex-col" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <SiteNav />

      <main className="flex-1 w-full">

        {/* Hero */}
        <div className="bg-[#eef6f0] border-b border-[#d4ece0]">
          <div className="max-w-2xl mx-auto px-5 py-20">
            <p className="text-[11px] font-bold text-[#E9C989] uppercase tracking-widest mb-4">About Onlu</p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-snug mb-6 text-[#F4F0FA]">
              Built for Wall Street.<br />
              <span style={{ color: "#E9C989" }}>Signal-first.</span>
            </h1>
            <p className="text-[#B8B0C8] text-base leading-relaxed max-w-lg">
              Most platforms show what is already visible. Onlu is built to surface signals earlier —
              so you know which firms are raising, deploying, or likely to hire before the opportunity is broadly visible.
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 py-16 space-y-16">

          {/* Thesis */}
          <div className="space-y-4 text-[#B8B0C8] text-sm leading-relaxed">
            <p className="text-base font-bold text-[#F4F0FA]">The edge is not more information.</p>
            <p>
              It is knowing what to focus on, and when. Time is the scarcest resource in finance recruiting —
              and most tools are optimised for volume, not signal quality.
            </p>
            <p>
              Onlu combines fund activity data, hiring intelligence, and practical prep tools in one place —
              so candidates and professionals can spend less time searching and more time acting.
            </p>
          </div>

          {/* Features */}
          <div>
            <p className="text-[11px] font-bold text-[#9A93AC] uppercase tracking-widest mb-6">What&apos;s on the platform</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <Link key={f.label} href={f.href}
                  className="group bg-[#201B2E] border border-[#38324E] rounded-xl px-4 py-4 hover:border-[#396477]/40 hover:shadow-sm transition-all">
                  <p className="text-sm font-bold text-[#F4F0FA] group-hover:text-[#A78BFA] transition-colors mb-1">{f.label}</p>
                  <p className="text-xs text-[#9A93AC] leading-snug">{f.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Who it's for */}
          <div>
            <p className="text-[11px] font-bold text-[#9A93AC] uppercase tracking-widest mb-5">Who it&apos;s for</p>
            <div className="space-y-3">
              {[
                { title: "Candidates", desc: "Targeting roles at hedge funds, PE, private credit, and alternative asset managers." },
                { title: "Finance professionals", desc: "Tracking fund activity, market moves, and hiring trends across the industry." },
                { title: "Career switchers", desc: "Coming from banking or consulting and looking for a structured, signal-driven approach to breaking in." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7C3AED] flex-shrink-0 mt-2" />
                  <p className="text-sm text-[#B8B0C8]">
                    <span className="font-bold text-[#F4F0FA]">{item.title}</span> — {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-[#eef6f0] border border-[#c6e8d4] rounded-2xl px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[#F4F0FA] font-bold text-base mb-1">Ready to get started?</p>
              <p className="text-[#B8B0C8] text-sm">Hiring signals, market intel, and interview prep — all in one place.</p>
            </div>
            <Link href="/"
              className="flex-shrink-0 px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-bold rounded-xl hover:bg-[#171226] transition-colors text-center">
              Explore Onlu →
            </Link>
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
