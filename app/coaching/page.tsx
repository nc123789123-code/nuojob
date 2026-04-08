"use client";
import Link from "next/link";
import { useState } from "react";
import type { SessionType } from "../api/coaching-checkout/route";

const SESSIONS: { type: SessionType; label: string; price: number; duration: string; desc: string; bullets: string[] }[] = [
  {
    type: "resume",
    label: "Resume & Profile Review",
    price: 99,
    duration: "45 min",
    desc: "Sharpen how you present on paper and on LinkedIn before your first conversation.",
    bullets: [
      "CV and LinkedIn line-by-line review",
      "Positioning for credit, PE, or AM roles",
      "Deal and experience framing",
      "Concrete rewrites and edits",
    ],
  },
  {
    type: "mock",
    label: "Mock Interview",
    price: 149,
    duration: "60 min",
    desc: "Live simulation with real technicals — LBO, credit analysis, case study — plus direct feedback.",
    bullets: [
      "Technicals tailored to your target role",
      "LBO or credit case walkthrough",
      "Behavioral and fit questions",
      "Detailed debrief with actionable notes",
    ],
  },
  {
    type: "strategy",
    label: "Career Strategy Session",
    price: 199,
    duration: "60 min",
    desc: "Full recruiting roadmap: which firms to target, how to source intros, and how to close.",
    bullets: [
      "Target firm list and prioritisation",
      "Outreach and networking strategy",
      "Timeline and process planning",
      "Honest assessment of your candidacy",
    ],
  },
];

export default function CoachingPage() {
  const [loading, setLoading] = useState<SessionType | null>(null);
  const [error, setError] = useState("");

  async function book(type: SessionType) {
    setLoading(type);
    setError("");
    try {
      const res = await fetch("/api/coaching-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionType: type }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(null);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f3ff]" style={{ fontFamily: "'Nunito', sans-serif" }}>
      {/* Nav */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="font-extrabold text-xl tracking-tight" style={{ color: "#6aab8e" }}>Onlu</span>
            <span className="text-[10px] font-bold tracking-widest text-[#1A2B4A]/40 uppercase hidden sm:inline">Intel</span>
          </Link>
          <div className="w-px h-4 bg-gray-200" />
          <span className="text-xs font-bold text-[#7c6fcd] uppercase tracking-widest">Coaching</span>
          <Link href="/" className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors">← Platform</Link>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-[#1A2B4A] text-white">
        <div className="max-w-3xl mx-auto px-5 py-16 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-white/80 text-[11px] font-semibold tracking-wider uppercase rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-[#6aab8e] rounded-full" />
            1-on-1 Sessions
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-snug mb-4">
            Get into buyside.<br />With someone who&apos;s been there.
          </h1>
          <p className="text-white/70 text-base max-w-xl mx-auto leading-relaxed">
            One-on-one sessions with experienced credit and private equity professionals.
            Resume review, mock interviews, or full recruiting strategy — tailored to where you are right now.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-5 py-10">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 text-center">How it works</p>
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { n: "1", title: "Pick a session", desc: "Choose the format that fits where you are in your search." },
              { n: "2", title: "Pay & confirm", desc: "Secure checkout. You'll receive a calendar link immediately after." },
              { n: "3", title: "Show up ready", desc: "Come with questions. We'll make the time count." },
            ].map(s => (
              <div key={s.n}>
                <div className="w-8 h-8 rounded-full bg-[#1A2B4A]/10 text-[#1A2B4A] text-sm font-bold flex items-center justify-center mx-auto mb-3">{s.n}</div>
                <p className="text-sm font-bold text-[#191c1e] mb-1">{s.title}</p>
                <p className="text-xs text-gray-500 leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div className="max-w-4xl mx-auto px-5 py-14">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8 text-center">Choose your session</p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-center">{error}</p>
        )}

        <div className="grid gap-5 sm:grid-cols-3">
          {SESSIONS.map((s, i) => (
            <div key={s.type}
              className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col transition-all hover:shadow-lg ${
                i === 1 ? "border-[#1A2B4A] shadow-md" : "border-gray-200"
              }`}>
              {i === 1 && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#1A2B4A] text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wide uppercase">Most popular</span>
                </div>
              )}
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">{s.duration}</p>
                <h2 className="text-base font-bold text-[#191c1e] leading-snug mb-2">{s.label}</h2>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {s.bullets.map(b => (
                  <li key={b} className="flex items-start gap-2 text-xs text-[#41484c]">
                    <svg className="w-3.5 h-3.5 text-[#6aab8e] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 5" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-2xl font-bold text-[#191c1e] mb-3">${s.price} <span className="text-sm font-normal text-gray-400">USD</span></p>
                <button
                  onClick={() => book(s.type)}
                  disabled={loading !== null}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 ${
                    i === 1
                      ? "bg-[#1A2B4A] text-white hover:bg-[#152238]"
                      : "bg-gray-100 text-[#1A2B4A] hover:bg-gray-200"
                  }`}>
                  {loading === s.type
                    ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Loading…</span>
                    : "Book session →"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Trust signals */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-center">
          {[
            {
              color: "bg-violet-50 border-violet-100",
              iconBg: "bg-violet-100",
              iconColor: "text-violet-500",
              icon: (
                <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="9" width="12" height="8" rx="2"/>
                  <path d="M7 9V6a3 3 0 016 0v3"/>
                </svg>
              ),
              label: "Secure checkout",
              sub: "Powered by Stripe",
            },
            {
              color: "bg-sky-50 border-sky-100",
              iconBg: "bg-sky-100",
              iconColor: "text-sky-500",
              icon: (
                <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="14" height="13" rx="2"/>
                  <path d="M3 8h14M7 2v4M13 2v4"/>
                </svg>
              ),
              label: "Book instantly",
              sub: "Calendar link after payment",
            },
            {
              color: "bg-emerald-50 border-emerald-100",
              iconBg: "bg-emerald-100",
              iconColor: "text-emerald-600",
              icon: (
                <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="10" r="7"/>
                  <path d="M10 6v4l2.5 2.5"/>
                </svg>
              ),
              label: "Buyside-specific",
              sub: "Credit, PE, and AM focus",
            },
          ].map(t => (
            <div key={t.label} className={`rounded-xl border px-4 py-5 ${t.color}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-3 ${t.iconBg} ${t.iconColor}`}>{t.icon}</div>
              <p className="text-xs font-bold text-[#191c1e] mb-0.5">{t.label}</p>
              <p className="text-[11px] text-gray-500">{t.sub}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Questions? Email us at <a href="mailto:info@onluintel.com" className="text-[#396477] hover:underline">info@onluintel.com</a>
        </p>
      </div>
    </div>
  );
}
