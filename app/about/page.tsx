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
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <SiteNav />

      <main className="flex-1 w-full">

        {/* Hero */}
        <div className="bg-[#eef6f0] border-b border-[#d4ece0]">
          <div className="max-w-2xl mx-auto px-5 py-20">
            <p className="text-[11px] font-bold text-[#6aab8e] uppercase tracking-widest mb-4">About Onlu</p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-snug mb-6 text-[#1A2B4A]">
              Built for Wall Street.<br />
              <span style={{ color: "#6aab8e" }}>Signal-first.</span>
            </h1>
            <p className="text-[#41484c] text-base leading-relaxed max-w-lg">
              Most platforms show what is already visible. Onlu is built to surface signals earlier —
              so you know which firms are raising, deploying, or likely to hire before the opportunity is broadly visible.
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 py-16 space-y-16">

          {/* Thesis */}
          <div className="space-y-4 text-[#41484c] text-sm leading-relaxed">
            <p className="text-base font-bold text-[#191c1e]">The edge is not more information.</p>
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
            <p className="text-[11px] font-bold text-[#71787c] uppercase tracking-widest mb-6">What&apos;s on the platform</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <Link key={f.label} href={f.href}
                  className="group bg-white border border-gray-200 rounded-xl px-4 py-4 hover:border-[#396477]/40 hover:shadow-sm transition-all">
                  <p className="text-sm font-bold text-[#191c1e] group-hover:text-[#396477] transition-colors mb-1">{f.label}</p>
                  <p className="text-xs text-gray-500 leading-snug">{f.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Who it's for */}
          <div>
            <p className="text-[11px] font-bold text-[#71787c] uppercase tracking-widest mb-5">Who it&apos;s for</p>
            <div className="space-y-3">
              {[
                { title: "Candidates", desc: "Targeting roles at hedge funds, PE, private credit, and alternative asset managers." },
                { title: "Finance professionals", desc: "Tracking fund activity, market moves, and hiring trends across the industry." },
                { title: "Career switchers", desc: "Coming from banking or consulting and looking for a structured, signal-driven approach to breaking in." },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#6aab8e] flex-shrink-0 mt-2" />
                  <p className="text-sm text-[#41484c]">
                    <span className="font-bold text-[#191c1e]">{item.title}</span> — {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Founder */}
          <div className="border-t border-gray-100 pt-10">
            <p className="text-[11px] font-bold text-[#71787c] uppercase tracking-widest mb-5">Founder</p>
            <div className="bg-[#f7f9fb] border border-gray-200 rounded-2xl px-6 py-6">
              <div className="flex items-start gap-4 mb-4">
                {/* Initials avatar */}
                <div className="w-12 h-12 rounded-full bg-[#1A2B4A] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold tracking-wide">KNC</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#191c1e]">Karlie Nuo Chen</p>
                  <p className="text-xs text-[#71787c] mt-0.5">Founder · New York</p>
                  <a href="https://www.linkedin.com/in/karliechen" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-[11px] text-[#396477] hover:underline font-medium">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                      <path d="M13.632 13.635h-2.37V9.922c0-.886-.018-2.025-1.234-2.025-1.235 0-1.424.964-1.424 1.96v3.778h-2.37V6H8.51v1.04h.03c.321-.609 1.105-1.232 2.252-1.232 2.409 0 2.855 1.587 2.855 3.648v4.179zM3.558 4.955a1.376 1.376 0 1 1 0-2.752 1.376 1.376 0 0 1 0 2.752zm1.188 8.68H2.37V6h2.376v7.635zM14.816 0H1.18C.528 0 0 .516 0 1.153v13.694C0 15.484.528 16 1.18 16h13.635c.652 0 1.185-.516 1.185-1.153V1.153C16 .516 15.467 0 14.815 0z"/>
                    </svg>
                    LinkedIn
                  </a>
                </div>
              </div>

              {/* Pull quote */}
              <blockquote className="border-l-2 border-[#6aab8e] pl-4 mb-4 italic text-sm text-[#396477] leading-relaxed">
                &ldquo;The signal was always there — it was just scattered across too many places. I built Onlu to put it in one room.&rdquo;
              </blockquote>

              <p className="text-sm text-[#41484c] leading-relaxed">
                Karlie spent years on the buyside across private credit, hybrid capital, and special situations. She kept noticing the same problem: the best intelligence — which firms were raising, deploying, or quietly building out a team — was fragmented, delayed, or only accessible if you already had the right network. Onlu is her attempt to fix that for everyone.
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-[#eef6f0] border border-[#c6e8d4] rounded-2xl px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[#1A2B4A] font-bold text-base mb-1">Ready to get started?</p>
              <p className="text-[#41484c] text-sm">Hiring signals, market intel, and interview prep — all in one place.</p>
            </div>
            <Link href="/"
              className="flex-shrink-0 px-5 py-2.5 bg-[#1A2B4A] text-white text-sm font-bold rounded-xl hover:bg-[#152238] transition-colors text-center">
              Explore Onlu →
            </Link>
          </div>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
