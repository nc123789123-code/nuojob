import type { Metadata } from "next";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

export const metadata: Metadata = {
  title: "About — Onlu",
  description:
    "Onlu is an intelligence platform for buyside professionals — fund signals, hiring intel, live markets, AI-powered interview prep, and community.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col">
      <SiteNav />

      <main className="flex-1 max-w-2xl mx-auto px-5 py-14 w-full">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] font-semibold text-[#71787c] uppercase tracking-widest mb-3">About</p>
          <h1 className="text-[#191c1e] text-2xl sm:text-3xl font-bold tracking-tight leading-snug mb-4">
            Onlu
          </h1>
          <p className="text-[#41484c] text-sm leading-relaxed">
            Onlu is an intelligence platform for buyside professionals and candidates — combining fund signals, hiring intel, live market data, AI-powered interview prep, and community in one place.
          </p>
        </div>

        <div className="space-y-10 text-[#41484c] text-sm leading-relaxed">
          {/* Mission */}
          <p>
            Most platforms show what is already visible. Onlu is built to surface signals earlier — helping users identify which firms are raising capital, deploying, or likely to hire before opportunities become broadly visible.
          </p>
          <p>
            The goal is not more noise. It is better prioritization, backed by real signals and practical context.
          </p>

          {/* What's on the platform */}
          <div>
            <h2 className="text-[#191c1e] text-base font-semibold mb-3">What&apos;s on the platform</h2>
            <ul className="space-y-3 pl-1">
              {[
                { label: "Hiring Watch", desc: "Curated job listings across hedge funds, private equity, private credit, and other alternative asset managers — filtered for relevance, updated daily." },
                { label: "Market Pulse (AI)", desc: "Live market data, AI-generated market briefs, fund signals from SEC EDGAR filings, and distressed watch — all in one place." },
                { label: "Edge Prep (AI)", desc: "Firm-specific interview prep, concept Q&A, case library (Hertz, Serta, J.Crew, Envision and more), and Credit Watch — search any leveraged company for bond prices and cap structure." },
                { label: "Onlu Events", desc: "Small-group weekend coffee chats for buyside professionals. Capped at 8 people — sign up to join the next session." },
                { label: "Onlu Learning", desc: "Practical write-ups on credit markets, AI, macro, and career prep — including visual deep-dives like Fixed Income 101 and The AI Ecosystem." },
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-2.5">
                  <span className="text-[#396477] font-bold mt-0.5 flex-shrink-0">→</span>
                  <span><span className="font-semibold text-[#191c1e]">{item.label}</span> — {item.desc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Who it's for */}
          <div>
            <h2 className="text-[#191c1e] text-base font-semibold mb-3">Who it&apos;s for</h2>
            <ul className="space-y-2 pl-1">
              {[
                "candidates targeting roles at hedge funds, private equity, private credit, and other alternative asset managers",
                "buyside professionals tracking fund activity, market moves, and hiring trends",
                "anyone who wants a more informed, signal-first approach to finance",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="text-[#396477] font-bold mt-0.5 flex-shrink-0">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Perspective */}
          <div>
            <h2 className="text-[#191c1e] text-base font-semibold mb-3">Our perspective</h2>
            <p className="mb-3">Time is the scarcest resource in recruiting.</p>
            <p className="mb-3">
              The edge is not having more information. It is knowing what to focus on, and when.
            </p>
            <p>Onlu is built around that idea.</p>
          </div>

          {/* Founder bio */}
          <div className="border-t border-[#c1c7cc]/40 pt-8">
            <h2 className="text-[#191c1e] text-base font-semibold mb-4">Founder</h2>
            <p>
              Karlie Nuo Chen founded Onlu after spending years on the buyside across private credit, hybrid capital, and special situations — and noticing how fragmented the signal landscape was for both investors and candidates. Onlu is her attempt to fix that.
            </p>
          </div>

          {/* CTA */}
          <div className="bg-sky-50 border border-sky-100 rounded-xl px-5 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
            <p className="text-sm text-[#396477] font-medium">
              Ready to explore fund signals and hiring intel?
            </p>
            <a
              href="/"
              className="flex-shrink-0 px-4 py-2 bg-[#396477] text-white text-xs font-semibold rounded-lg hover:bg-[#2d5162] transition-colors text-center"
            >
              Explore Onlu →
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
