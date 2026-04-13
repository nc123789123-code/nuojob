"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* ── Live stat hook ──────────────────────────────────────────────────────── */
function useLiveStats() {
  const [stats, setStats] = useState({ firms: 267, roles: 104, sources: 10, raises: 0 });
  useEffect(() => {
    Promise.allSettled([
      fetch("/api/daily").then(r => r.json()),
      fetch("/api/jobs?dateRange=30&category=all&signalTag=all").then(r => r.json()),
    ]).then(([d, j]) => {
      const raises = d.status === "fulfilled" ? (d.value.weekCount ?? 0) : 0;
      const roles  = j.status === "fulfilled" ? (j.value.total ?? 104) : 104;
      const srcs   = j.status === "fulfilled" ? (j.value.sources?.length ?? 10) : 10;
      setStats({ firms: 267, roles, sources: Math.max(srcs, 10), raises });
    });
  }, []);
  return stats;
}

/* ── Email subscribe ─────────────────────────────────────────────────────── */
function EmailCapture({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, intent: "signals_subscriber" }),
      });
      setState(res.ok ? "done" : "error");
    } catch { setState("error"); }
  }

  if (state === "done") return (
    <p className={`text-sm font-semibold ${dark ? "text-[#c3ecd7]" : "text-emerald-600"}`}>
      ✓ You&apos;re on the list — check your inbox.
    </p>
  );

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap">
      <input
        type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com" required
        className={`flex-1 min-w-[200px] px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#396477]/40 ${
          dark ? "bg-white/10 border-white/20 text-white placeholder:text-white/40" : "bg-white border-[#c1c7cc]/60 text-[#191c1e] placeholder:text-gray-400"
        }`}
      />
      <button type="submit" disabled={state === "loading"}
        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
          dark ? "bg-white text-[#396477] hover:bg-[#c3ecd7]" : "bg-[#396477] text-white hover:bg-[#2d5161]"
        } disabled:opacity-60`}>
        {state === "loading" ? "…" : "Get signals →"}
      </button>
      {state === "error" && <p className="w-full text-xs text-red-400">Something went wrong — try again.</p>}
    </form>
  );
}

/* ── Pillar card ─────────────────────────────────────────────────────────── */
function Pillar({ icon, color, tag, title, desc, points, cta, href }: {
  icon: React.ReactNode; color: string; tag: string; title: string; desc: string;
  points: string[]; cta: string; href: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#c1c7cc]/40 p-6 flex flex-col hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>{icon}</div>
      <span className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${color.replace("bg-", "text-").replace("/10", "-600").replace("/15", "-600")}`}>{tag}</span>
      <h3 className="text-lg font-bold text-[#191c1e] mb-2">{title}</h3>
      <p className="text-sm text-[#71787c] leading-relaxed mb-4">{desc}</p>
      <ul className="space-y-2 flex-1 mb-5">
        {points.map(p => (
          <li key={p} className="flex items-start gap-2 text-sm text-[#41484c]">
            <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>{p}
          </li>
        ))}
      </ul>
      <Link href={href}
        className="text-center py-2.5 rounded-xl text-sm font-bold border border-[#396477]/30 text-[#396477] hover:bg-[#396477] hover:text-white transition-colors">
        {cta}
      </Link>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const stats = useLiveStats();

  return (
    <div className="min-h-screen bg-[#f2f4f6] font-sans">

      {/* Nav */}
      <header className="bg-white border-b border-[#c1c7cc]/40 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-[#396477] tracking-tight">Onlu</Link>
          <div className="flex items-center gap-3">
            <Link href="/this-week" className="hidden sm:inline text-xs text-[#71787c] hover:text-[#191c1e] transition-colors">Weekly Pulse</Link>
            <Link href="/" className="px-4 py-2 bg-[#396477] text-white text-sm font-bold rounded-xl hover:bg-[#2d5161] transition-colors">
              Open app →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#1A2B4A] text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-[#c3ecd7] text-[11px] font-semibold tracking-wider uppercase rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-[#c3ecd7] rounded-full animate-pulse" />
            Finance Intelligence · Live Signals
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight max-w-3xl mb-6">
            Know which firms are hiring — before the job is posted.
          </h1>
          <p className="text-white/70 text-base sm:text-lg max-w-2xl leading-relaxed mb-8">
            Onlu tracks capital raises, scrapes 60+ firm career pages, and gives you firm-specific interview prep — all in one place. The edge most finance candidates never find.
          </p>
          <div className="max-w-lg mb-10">
            <EmailCapture dark />
            <p className="text-white/40 text-xs mt-2">Free. Weekly signals. Unsubscribe anytime.</p>
          </div>
          {/* Live stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { n: stats.firms,   label: "Firms tracked" },
              { n: stats.roles,   label: "Roles live now" },
              { n: stats.sources, label: "Data sources" },
              { n: stats.raises,  label: "Capital raises this week" },
            ].map(({ n, label }) => (
              <div key={label} className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <p className="text-2xl font-bold text-white">{n}</p>
                <p className="text-xs text-white/50 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="bg-white border-b border-[#c1c7cc]/30">
        <div className="max-w-5xl mx-auto px-4 py-14 sm:py-16">
          <div className="grid sm:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#71787c] mb-3">The problem</p>
              <h2 className="text-2xl font-bold text-[#191c1e] mb-4 leading-snug">Most finance job seekers are flying blind.</h2>
              <div className="space-y-3">
                {[
                  "You find out about roles weeks after they're filled",
                  "LinkedIn shows the same generic postings everyone sees",
                  "No signal on which firms are actively building teams",
                  "Interview prep is scattered across forums and PDFs",
                ].map(p => (
                  <div key={p} className="flex items-start gap-2.5 text-sm text-[#71787c]">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>{p}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3">The Onlu edge</p>
              <h2 className="text-2xl font-bold text-[#191c1e] mb-4 leading-snug">One platform. Every signal that matters.</h2>
              <div className="space-y-3">
                {[
                  "Track firms the moment they raise capital — hiring follows",
                  "Live roles scraped directly from 60+ firm ATS pages",
                  "Firm-specific interview prep built for PE, credit & HF",
                  "Weekly digest so you never miss an opening",
                ].map(p => (
                  <div key={p} className="flex items-start gap-2.5 text-sm text-[#41484c]">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>{p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three pillars */}
      <section className="max-w-5xl mx-auto px-4 py-14 sm:py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#71787c] mb-2">What you get</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#191c1e]">Everything in one place</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          <Pillar
            color="bg-sky-500/10"
            tag="Capital Signals"
            icon={<svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-sky-600" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><polyline points="3,14 7,9 11,11 17,5"/><line x1="3" y1="17" x2="17" y2="17"/></svg>}
            title="Know who's raising capital"
            desc="SEC EDGAR Form D filings tracked daily. When a fund closes, hiring almost always follows within 90 days."
            points={[
              "267 firms on our watch list",
              "Real-time Form D filing alerts",
              "Capital raise → hiring correlation",
              "Fund strategy & AUM context",
            ]}
            cta="View capital signals →"
            href="/?tab=capital"
          />
          <Pillar
            color="bg-emerald-500/10"
            tag="Live Jobs"
            icon={<svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-emerald-600" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="9" cy="9" r="5.5"/><path d="M13.5 13.5 17 17"/><path d="M7 9h4M9 7v4" strokeWidth="1.4"/></svg>}
            title="Roles before they go viral"
            desc="We scrape Greenhouse, Lever, Ashby, and Workday pages for 60+ firms — plus 10 job board aggregators — every 30 minutes."
            points={[
              "Analyst → MD roles across all levels",
              "Hedge funds, PE, private credit",
              "Set firm alerts for instant email",
              "Seniority and function filters",
            ]}
            cta="See open roles →"
            href="/?tab=hiring"
          />
          <Pillar
            color="bg-violet-500/10"
            tag="Interview Prep"
            icon={<svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-violet-600" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="3" y="3" width="14" height="14" rx="2.5"/><path d="M7 10l2.5 2.5L13 8"/></svg>}
            title="Prep for the specific firm"
            desc="AI-powered firm briefs, case studies, and mock Q&A — not generic interview tips. Built for credit, PE, and special situations."
            points={[
              "Firm-specific strategy briefs",
              "Credit & restructuring case studies",
              "Mock Q&A with AI feedback",
              "Outreach drafting tool",
            ]}
            cta="Start prepping →"
            href="/?tab=firmprep"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-[#c1c7cc]/30">
        <div className="max-w-5xl mx-auto px-4 py-14 sm:py-16">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#71787c] mb-2">How it works</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#191c1e]">Three steps to the inside edge</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { n: "01", title: "Watch the signals", desc: "Set alerts on funds you're targeting. Get notified the moment they file a capital raise or post a role — before anyone else." },
              { n: "02", title: "Find the right role", desc: "Browse live jobs filtered by firm, seniority, and strategy. No recruiter gatekeeping — apply direct from firm career pages." },
              { n: "03", title: "Walk in prepared", desc: "Use our firm briefs and AI prep to go into every conversation knowing their portfolio, strategy, and what they actually ask." },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-4">
                <span className="text-3xl font-black text-[#c1c7cc] flex-shrink-0 leading-none mt-0.5">{n}</span>
                <div>
                  <h3 className="font-bold text-[#191c1e] mb-1">{title}</h3>
                  <p className="text-sm text-[#71787c] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly pulse CTA */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl border border-[#c1c7cc]/40 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-[#396477] mb-1">Weekly Pulse</p>
            <h3 className="font-bold text-[#191c1e] text-lg mb-1">See this week&apos;s hiring signals</h3>
            <p className="text-sm text-[#71787c]">Who&apos;s actively hiring, which funds raised capital, and the roles worth applying to — updated every week.</p>
          </div>
          <Link href="/this-week"
            className="flex-shrink-0 px-5 py-2.5 bg-[#f2f4f6] border border-[#c1c7cc]/60 text-[#396477] font-bold text-sm rounded-xl hover:bg-[#396477] hover:text-white hover:border-[#396477] transition-colors">
            View this week →
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#396477]">
        <div className="max-w-5xl mx-auto px-4 py-14 sm:py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Start with the signals.</h2>
          <p className="text-white/70 text-base mb-8 max-w-xl mx-auto">
            Free weekly digest. No credit card. Unsubscribe anytime.
          </p>
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <EmailCapture dark />
            </div>
          </div>
          <div className="mt-6">
            <Link href="/" className="text-white/60 text-sm hover:text-white transition-colors">
              Or go straight to the platform →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1A2B4A] text-white/40 text-xs">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-3">
          <span className="font-bold text-white/60">Onlu</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/70 transition-colors">Terms</Link>
            <Link href="/this-week" className="hover:text-white/70 transition-colors">Weekly Pulse</Link>
            <Link href="/" className="hover:text-white/70 transition-colors">App</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
