"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import LogoMark from "@/app/components/LogoMark";

/* ── Tab color palette (matches main app) ──────────────────────────────── */
const TABS = {
  hiring:   { bg: "bg-emerald-50",  border: "border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-400", badge: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-200" },
  pulse:    { bg: "bg-sky-50",      border: "border-sky-200",     text: "text-sky-700",     dot: "bg-sky-400",     badge: "bg-sky-100 text-sky-700",     ring: "ring-sky-200"     },
  prep:     { bg: "bg-rose-50",     border: "border-rose-200",    text: "text-rose-700",    dot: "bg-rose-400",    badge: "bg-rose-100 text-rose-700",    ring: "ring-rose-200"    },
  events:   { bg: "bg-amber-50",    border: "border-amber-200",   text: "text-amber-700",   dot: "bg-amber-400",   badge: "bg-amber-100 text-amber-700",  ring: "ring-amber-200"   },
  learning: { bg: "bg-violet-50",   border: "border-violet-200",  text: "text-violet-700",  dot: "bg-violet-400",  badge: "bg-violet-100 text-violet-700", ring: "ring-violet-200" },
} as const;

/* ── Live stats ─────────────────────────────────────────────────────────── */
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

/* ── Email capture ──────────────────────────────────────────────────────── */
function EmailCapture() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle"|"loading"|"done"|"error">("idle");

  async function submit(e: React.FormEvent) {
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
    <p className="text-sm font-semibold text-emerald-600">✓ You&apos;re on the list — check your inbox.</p>
  );

  return (
    <form onSubmit={submit} className="flex gap-2 flex-wrap">
      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com" required
        className="flex-1 min-w-[180px] px-4 py-2.5 rounded-xl text-sm border border-[#c1c7cc]/60 bg-white text-[#191c1e] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#396477]/30" />
      <button type="submit" disabled={state === "loading"}
        className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#1A2B4A] text-white hover:bg-[#396477] transition-colors disabled:opacity-60">
        {state === "loading" ? "…" : "Get signals →"}
      </button>
      {state === "error" && <p className="w-full text-xs text-red-400">Something went wrong — try again.</p>}
    </form>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const stats = useLiveStats();

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Nav */}
      <header className="bg-white border-b border-[#c1c7cc]/40 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-bold text-xl text-[#1A2B4A] tracking-tight">Onlu</span>
          </Link>
          <div className="flex items-center gap-2">
            {/* 5 tab dots */}
            <div className="hidden sm:flex items-center gap-1 mr-2">
              {Object.values(TABS).map((t, i) => (
                <span key={i} className={`w-2 h-2 rounded-full ${t.dot}`} />
              ))}
            </div>
            <Link href="/this-week" className="hidden sm:inline text-xs text-[#71787c] hover:text-[#191c1e] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#f2f4f6]">Weekly Pulse</Link>
            <Link href="/" className="px-4 py-2 bg-[#1A2B4A] text-white text-sm font-bold rounded-xl hover:bg-[#396477] transition-colors">
              Open app →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — light, with 5 pastel tab badges */}
      <section className="bg-gradient-to-b from-[#f8fafb] to-white border-b border-[#c1c7cc]/30">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
          {/* 5 tab pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            {[
              { tab: "hiring",   label: "Hiring Watch" },
              { tab: "pulse",    label: "Market Pulse" },
              { tab: "prep",     label: "Edge Prep" },
              { tab: "events",   label: "Events" },
              { tab: "learning", label: "Learning" },
            ].map(({ tab, label }) => {
              const c = TABS[tab as keyof typeof TABS];
              return (
                <span key={tab} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${c.badge} ${c.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{label}
                </span>
              );
            })}
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight text-[#1A2B4A] max-w-3xl mb-5">
            Know which firms are hiring — before the job is posted.
          </h1>
          <p className="text-[#71787c] text-base sm:text-lg max-w-2xl leading-relaxed mb-8">
            Onlu tracks capital raises, scrapes 60+ firm career pages, and gives you firm-specific interview prep — all in one place. The edge most finance candidates never find.
          </p>
          <div className="max-w-lg mb-10">
            <EmailCapture />
            <p className="text-gray-400 text-xs mt-2">Free weekly digest · No spam · Unsubscribe anytime</p>
          </div>

          {/* Live stats — each in its tab color */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { n: stats.firms,   label: "Firms tracked",             tab: "hiring"   },
              { n: stats.roles,   label: "Roles live now",            tab: "pulse"    },
              { n: stats.sources, label: "Data sources",              tab: "prep"     },
              { n: stats.raises,  label: "Raises this week",          tab: "events"   },
            ].map(({ n, label, tab }) => {
              const c = TABS[tab as keyof typeof TABS];
              return (
                <div key={label} className={`rounded-xl px-4 py-3 border ${c.bg} ${c.border}`}>
                  <p className={`text-2xl font-bold ${c.text}`}>{n}</p>
                  <p className="text-xs text-[#71787c] mt-0.5">{label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="max-w-5xl mx-auto px-4 py-14 sm:py-16">
        <div className="grid sm:grid-cols-2 gap-10 items-start">
          <div className="bg-[#fafafa] rounded-2xl border border-[#c1c7cc]/40 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#71787c] mb-3">The problem</p>
            <h2 className="text-xl font-bold text-[#191c1e] mb-4 leading-snug">Most finance job seekers are flying blind.</h2>
            <div className="space-y-2.5">
              {[
                "Find out about roles weeks after they're filled",
                "LinkedIn shows the same postings everyone else sees",
                "No signal on which firms are actively building teams",
                "Interview prep is scattered across forums and PDFs",
              ].map(p => (
                <div key={p} className="flex items-start gap-2.5 text-sm text-[#71787c]">
                  <span className="text-red-300 mt-0.5 flex-shrink-0 font-bold">✕</span>{p}
                </div>
              ))}
            </div>
          </div>
          <div className={`rounded-2xl border p-6 ${TABS.hiring.bg} ${TABS.hiring.border}`}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${TABS.hiring.text}`}>The Onlu edge</p>
            <h2 className="text-xl font-bold text-[#191c1e] mb-4 leading-snug">One platform. Every signal that matters.</h2>
            <div className="space-y-2.5">
              {[
                "Track firms the moment they raise capital — hiring follows",
                "Live roles scraped directly from 60+ firm ATS pages",
                "Firm-specific prep for PE, credit & hedge fund interviews",
                "Weekly digest so you never miss an opening",
              ].map(p => (
                <div key={p} className="flex items-start gap-2.5 text-sm text-[#41484c]">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0 font-bold">✓</span>{p}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5 Feature cards — one per tab */}
      <section className="border-t border-[#c1c7cc]/30 bg-[#f8fafb]">
        <div className="max-w-5xl mx-auto px-4 py-14 sm:py-16">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#71787c] mb-2">Five tools, one platform</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1A2B4A]">Everything in one place</h2>
          </div>

          {/* Top 3 */}
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            {[
              {
                tab: "hiring", label: "Hiring Watch", href: "/?tab=hiring",
                title: "Roles before they go viral",
                desc: "Live jobs scraped from 60+ firm ATS pages — Greenhouse, Lever, Ashby, Workday — every 30 minutes.",
                points: ["Analyst → MD across all levels", "Hedge funds, PE, private credit", "Firm alerts via email", "Seniority & strategy filters"],
              },
              {
                tab: "pulse", label: "Market Pulse", href: "/?tab=pulse",
                title: "Capital raises → hiring signals",
                desc: "SEC EDGAR Form D filings tracked daily. When a fund closes, hiring follows within 90 days.",
                points: ["267 firms on our watch list", "Real-time filing alerts", "Raise → hiring correlation", "Fund strategy & AUM context"],
              },
              {
                tab: "prep", label: "Edge Prep", href: "/?tab=prep",
                title: "Prep for the specific firm",
                desc: "AI-powered firm briefs, case studies, and mock Q&A. Built for credit, PE, and special situations interviews.",
                points: ["Firm-specific strategy briefs", "Credit & restructuring cases", "Mock Q&A with AI feedback", "Outreach drafting tool"],
              },
            ].map(({ tab, label, href, title, desc, points }) => {
              const c = TABS[tab as keyof typeof TABS];
              return (
                <div key={tab} className={`rounded-2xl border p-5 flex flex-col ${c.bg} ${c.border}`}>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-3 ${c.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{label}
                  </span>
                  <h3 className="font-bold text-[#191c1e] text-base mb-2">{title}</h3>
                  <p className="text-sm text-[#71787c] leading-relaxed mb-3 flex-1">{desc}</p>
                  <ul className="space-y-1 mb-4">
                    {points.map(p => (
                      <li key={p} className="flex items-start gap-2 text-xs text-[#41484c]">
                        <span className={`font-bold mt-0.5 flex-shrink-0 ${c.text}`}>✓</span>{p}
                      </li>
                    ))}
                  </ul>
                  <Link href={href} className={`text-center py-2 rounded-xl text-xs font-bold border bg-white transition-colors hover:opacity-80 ${c.border} ${c.text}`}>
                    Explore →
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Bottom 2 */}
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                tab: "events", label: "Onlu Events", href: "/?tab=events",
                title: "Small-table finance dinners",
                desc: "Intimate 8-person sessions with practitioners. No pitch decks — just honest conversations about markets, careers, and what actually matters.",
                points: ["Curated attendees from buy-side firms", "Structured themes each session", "Real relationships, not networking theater"],
              },
              {
                tab: "learning", label: "Onlu Learning", href: "/?tab=learning",
                title: "Go deeper on what matters",
                desc: "Deep-dives on credit, macro, AI in finance, and career strategy. For practitioners and candidates who want more than surface-level content.",
                points: ["Credit & restructuring frameworks", "Macro & rates explainers", "AI tools for finance professionals"],
              },
            ].map(({ tab, label, href, title, desc, points }) => {
              const c = TABS[tab as keyof typeof TABS];
              return (
                <div key={tab} className={`rounded-2xl border p-5 flex flex-col ${c.bg} ${c.border}`}>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-3 ${c.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{label}
                  </span>
                  <h3 className="font-bold text-[#191c1e] text-base mb-2">{title}</h3>
                  <p className="text-sm text-[#71787c] leading-relaxed mb-3 flex-1">{desc}</p>
                  <ul className="space-y-1 mb-4">
                    {points.map(p => (
                      <li key={p} className="flex items-start gap-2 text-xs text-[#41484c]">
                        <span className={`font-bold mt-0.5 flex-shrink-0 ${c.text}`}>✓</span>{p}
                      </li>
                    ))}
                  </ul>
                  <Link href={href} className={`text-center py-2 rounded-xl text-xs font-bold border bg-white transition-colors hover:opacity-80 ${c.border} ${c.text}`}>
                    Explore →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-t border-[#c1c7cc]/30">
        <div className="max-w-5xl mx-auto px-4 py-14 sm:py-16">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#71787c] mb-2">How it works</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1A2B4A]">Three steps to the inside edge</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { n: "01", tab: "pulse",  title: "Watch the signals", desc: "Set alerts on funds you're targeting. Get notified the moment they file a capital raise or post a role." },
              { n: "02", tab: "hiring", title: "Find the right role", desc: "Browse live jobs by firm, seniority, and strategy. Apply direct from firm career pages — no recruiter needed." },
              { n: "03", tab: "prep",   title: "Walk in prepared",   desc: "Use firm briefs and AI prep to go into every conversation knowing their portfolio, strategy, and what they ask." },
            ].map(({ n, tab, title, desc }) => {
              const c = TABS[tab as keyof typeof TABS];
              return (
                <div key={n} className="flex gap-4">
                  <span className={`text-3xl font-black flex-shrink-0 leading-none mt-0.5 ${c.text} opacity-40`}>{n}</span>
                  <div>
                    <h3 className="font-bold text-[#191c1e] mb-1">{title}</h3>
                    <p className="text-sm text-[#71787c] leading-relaxed">{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Weekly pulse crosslink */}
      <section className={`border-t border-b ${TABS.pulse.border}`}>
        <div className={`${TABS.pulse.bg}`}>
          <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${TABS.pulse.text}`}>Weekly Pulse</span>
              <h3 className="font-bold text-[#191c1e] text-lg mt-1 mb-1">See this week&apos;s hiring signals</h3>
              <p className="text-sm text-[#71787c]">Who&apos;s actively hiring, which funds raised capital, and roles worth applying to — updated every week.</p>
            </div>
            <Link href="/this-week"
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold border bg-white transition-colors hover:opacity-80 ${TABS.pulse.border} ${TABS.pulse.text}`}>
              View this week →
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-4 py-14 sm:py-16 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#1A2B4A] mb-3">Start with the signals.</h2>
        <p className="text-[#71787c] text-base mb-8 max-w-xl mx-auto">
          Free weekly digest. No credit card. Unsubscribe anytime.
        </p>
        <div className="flex justify-center mb-6">
          <div className="w-full max-w-md">
            <EmailCapture />
          </div>
        </div>
        <Link href="/" className="text-[#71787c] text-sm hover:text-[#191c1e] transition-colors">
          Or go straight to the platform →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#c1c7cc]/30 bg-[#f8fafb]">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <LogoMark size={22} />
              <span className="font-bold text-[#1A2B4A]">Onlu</span>
            </div>
            <div className="flex items-center gap-1">
              {Object.values(TABS).map((t, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />
              ))}
            </div>
          </div>
          <div className="flex gap-4 text-xs text-[#71787c]">
            <Link href="/privacy"    className="hover:text-[#191c1e] transition-colors">Privacy</Link>
            <Link href="/terms"      className="hover:text-[#191c1e] transition-colors">Terms</Link>
            <Link href="/this-week"  className="hover:text-[#191c1e] transition-colors">Weekly Pulse</Link>
            <Link href="/"           className="hover:text-[#191c1e] transition-colors">App</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
