"use client";

import { useState } from "react";
import Link from "next/link";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";

const FREE_FEATURES = [
  "Daily jobs digest — top 3 roles",
  "Fund signals — headline view",
  "3 case studies / month",
  "AI interview coach — 5 questions / day",
  "Daily market snapshot",
];

const PRO_FEATURES = [
  "Full jobs digest — every role, filterable",
  "Real-time fund signals + hiring alerts",
  "Unlimited case studies + full walkthroughs",
  "Unlimited AI interview coach",
  "Deep market data & history",
];

export default function PricingPage() {
  const [plan, setPlan] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function goPro() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/pro-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f3ff] flex flex-col" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <SiteNav />

      {/* Hero */}
      <section className="hero-gradient border-b border-[#2A2438]">
        <div className="max-w-3xl mx-auto px-5 py-14 sm:py-16 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-200/60 text-violet-700 text-[11px] font-semibold tracking-wider uppercase rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
            Pricing
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-4 text-[#1A2B4A]">
            Start free. Upgrade when you&apos;re serious.
          </h1>
          <p className="text-[#1a1e24] text-base max-w-lg mx-auto leading-relaxed">
            The core stays free for everyone. Pro unlocks the full feed, real-time signals,
            and unlimited prep — for the price of a coffee a month.
          </p>
        </div>
      </section>

      {/* Billing toggle */}
      <div className="max-w-4xl mx-auto px-5 pt-12 w-full">
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={() => setPlan("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              plan === "monthly" ? "bg-[#1A2B4A] text-white" : "bg-white text-[#1a1e24] border border-[#c1c7cc]/50"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPlan("annual")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${
              plan === "annual" ? "bg-[#1A2B4A] text-white" : "bg-white text-[#1a1e24] border border-[#c1c7cc]/50"
            }`}
          >
            Annual
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
              Save 25%
            </span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <section className="max-w-4xl mx-auto px-5 pb-16 w-full grid sm:grid-cols-2 gap-6">
        {/* Free */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">Free</p>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-extrabold tracking-tight text-[#1A2B4A]">$0</span>
          </div>
          <p className="text-sm text-[#1a1e24] mb-6">Everything you need to get started. No login required.</p>
          <ul className="flex flex-col gap-3 mb-8">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-[#191c1e]">
                <span className="text-[#6aab8e] font-bold flex-shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/"
            className="mt-auto block text-center px-5 py-3 rounded-lg border border-[#c1c7cc]/60 text-[#1A2B4A] text-sm font-bold hover:bg-gray-50 transition-colors"
          >
            Explore Free
          </Link>
        </div>

        {/* Pro */}
        <div className="bg-white border-2 border-[#6aab8e] rounded-2xl p-8 flex flex-col relative shadow-[0_12px_40px_rgba(106,171,142,0.15)]">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#6aab8e] text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full">
            Most Popular
          </span>
          <p className="text-xs font-bold text-[#6aab8e] uppercase tracking-widest mb-3">Pro</p>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-4xl font-extrabold tracking-tight text-[#1A2B4A]">
              {plan === "monthly" ? "$5" : "$45"}
            </span>
            <span className="text-sm text-gray-600 font-medium">/ {plan === "monthly" ? "month" : "year"}</span>
          </div>
          <p className="text-sm text-[#1a1e24] mb-6">
            {plan === "monthly" ? "Billed monthly. Cancel anytime." : "Billed yearly — like getting 3 months free."}
          </p>
          <ul className="flex flex-col gap-3 mb-8">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-[#191c1e]">
                <span className="text-[#6aab8e] font-bold flex-shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={goPro}
            disabled={loading}
            className="mt-auto block text-center px-5 py-3 rounded-lg bg-[#6aab8e] text-white text-sm font-bold hover:bg-[#5d9a7e] transition-colors disabled:opacity-50"
          >
            {loading ? "Redirecting…" : `Go Pro — ${plan === "monthly" ? "$5/mo" : "$45/yr"}`}
          </button>
          {error && <p className="text-red-500 text-xs mt-3 text-center">{error}</p>}
        </div>
      </section>

      {/* Reassurance */}
      <div className="max-w-2xl mx-auto px-5 pb-20 text-center">
        <p className="text-xs text-[#2b3138] leading-relaxed">
          Secure checkout via Stripe. Cancel anytime — no questions asked. Are you a university or finance club?{" "}
          <Link href="/universities" className="text-[#396477] font-semibold hover:underline">
            See partnership options →
          </Link>
        </p>
      </div>

      <SiteFooter />
    </div>
  );
}
