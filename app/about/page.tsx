import type { Metadata } from "next";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

export const metadata: Metadata = {
  title: "About — Onlu",
  description:
    "Onlu is an intelligence platform for candidates and professionals focused on private credit, special situations, and restructuring.",
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
            Onlu is an intelligence platform for candidates and professionals focused on private credit, special situations, and restructuring.
          </p>
        </div>

        <div className="space-y-10 text-[#41484c] text-sm leading-relaxed">
          {/* Mission */}
          <p>
            Most platforms show what is already visible. Onlu is built to surface signals earlier, helping users identify which firms may be raising capital, deploying, or likely to hire before opportunities are broadly visible.
          </p>
          <p>
            We combine fund activity, hiring signals, and market context into a more focused view of where attention should go. The goal is not more noise. It is better prioritization.
          </p>
          <p>
            Instead of scrolling through generic job boards or fragmented updates, users get a more targeted view of relevant platforms, supported by real signals and practical context.
          </p>

          {/* What makes it different */}
          <div>
            <h2 className="text-[#191c1e] text-base font-semibold mb-3">What makes Onlu different</h2>
            <p className="mb-4">
              Onlu sits between a job board, a market monitor, and an interview prep resource.
            </p>
            <p className="mb-4">The platform is designed to help users:</p>
            <ul className="space-y-2 pl-1">
              {[
                "track relevant firm and fund activity",
                "spot hiring and fundraising signals",
                "focus on the most actionable opportunities",
                "prepare for interviews with investor-style frameworks",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="text-[#396477] font-bold mt-0.5 flex-shrink-0">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Who it's for */}
          <div>
            <h2 className="text-[#191c1e] text-base font-semibold mb-3">Who it&apos;s for</h2>
            <p className="mb-4">Onlu is built for:</p>
            <ul className="space-y-2 pl-1">
              {[
                "candidates targeting private credit, special situations, and restructuring roles",
                "professionals tracking platform activity and team expansion",
                "users who want a more informed approach to finance recruiting",
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

          {/* Founder note */}
          <div className="border-t border-[#c1c7cc]/40 pt-8">
            <h2 className="text-[#191c1e] text-base font-semibold mb-3">Founder note</h2>
            <p className="text-[#41484c]">
              Onlu was built from real-world experience in private credit and special situations investing, with the goal of making recruiting intelligence more practical, targeted, and useful.
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
              View Fund Signals →
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
