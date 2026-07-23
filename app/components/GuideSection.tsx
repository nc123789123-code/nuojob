"use client";

import { useState } from "react";
import NewsletterCTA from "@/app/components/NewsletterCTA";

export default function GuideSection() {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showSampleForm, setShowSampleForm] = useState(false);

  const handleGetGuide = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout unavailable");
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Something went wrong.");
      setCheckoutLoading(false);
    }
  };

  return (
    <section id="guide" className="bg-[#eef6f2] border-t border-[#c1d9ce]/50 py-16 px-5">
      <div className="max-w-3xl mx-auto">

        {/* Section label */}
        <p className="text-[11px] font-semibold text-[#6aab8e] uppercase tracking-widest mb-4">
          Paid Resource
        </p>

        {/* Headline */}
        <h2 className="text-[#191c1e] text-2xl sm:text-3xl font-bold tracking-tight mb-4">
          Turn Interviews Into Offers
        </h2>

        {/* Intro */}
        <p className="text-[#41484c] text-sm leading-relaxed max-w-xl mb-2">
          Most candidates know where to apply. Few know how to pass.
        </p>
        <p className="text-[#41484c] text-sm leading-relaxed max-w-xl mb-8">
          This guide is designed to help candidates think like credit investors in interviews —
          not just memorise technicals.
        </p>

        {/* Product card */}
        <div className="bg-white border border-[#c1d9ce]/60 rounded-2xl p-7 mb-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold px-2.5 py-1 rounded-full mb-4">
                <span className="w-1 h-1 bg-amber-500 rounded-full" />
                Credit Interview Guide
              </div>

              <h3 className="text-[#191c1e] text-lg font-semibold mb-4">
                Interview-ready frameworks for private credit &amp; special situations
              </h3>

              <ul className="space-y-2.5">
                {[
                  "Case-based learning — work through real deal scenarios",
                  "Restructuring and special situations examples",
                  "Interview-ready frameworks and Q&A",
                  "Practical investor-style thinking, not textbook answers",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[#41484c] text-sm">
                    <span className="text-[#6aab8e] font-bold mt-0.5 flex-shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Price + CTA */}
            <div className="sm:text-right flex-shrink-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[#71787c] text-lg line-through font-normal">$25</span>
                <span className="text-[#191c1e] text-3xl font-bold">$10</span>
              </div>
              <div className="text-[#71787c] text-xs mb-5">one-time · instant access</div>

              <button
                onClick={handleGetGuide}
                disabled={checkoutLoading}
                className="w-full sm:w-auto px-6 py-3 bg-[#396477] text-white text-sm font-bold rounded-lg hover:bg-[#2d5162] transition-colors disabled:opacity-50 mb-2 block sm:inline-block"
              >
                {checkoutLoading ? "Redirecting…" : "Get Full Guide"}
              </button>

              <button
                onClick={() => setShowSampleForm((v) => !v)}
                className="w-full sm:w-auto px-6 py-3 bg-transparent border border-[#c1d9ce] text-[#396477] text-sm font-medium rounded-lg hover:border-[#6aab8e] hover:text-[#2d5162] transition-colors block sm:inline-block"
              >
                View Sample
              </button>

              {checkoutError && (
                <p className="text-red-500 text-xs mt-2 text-left sm:text-right">{checkoutError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Sample / guide interest email capture */}
        {showSampleForm && (
          <div className="mb-8">
            <NewsletterCTA
              intent="guide_interest"
              title="Get the sample before buying."
              description="Enter your email and we'll send you the table of contents and a sample chapter."
              cta="Get Sample"
              successMessage="Check your inbox — the sample is on its way."
              dark={false}
            />
          </div>
        )}

        {/* Trust note */}
        <p className="text-[#71787c] text-xs text-center">
          Secure checkout via Stripe · Instant access after payment · Questions? Email us any time.
        </p>
      </div>
    </section>
  );
}
