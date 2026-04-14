"use client";

import { useState } from "react";
import Link from "next/link";
import LogoMark from "@/app/components/LogoMark";

function EmailCapture() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

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
    <p className="text-sm font-semibold text-[#6aab8e]">✓ You&apos;re on the list — we&apos;ll be in touch.</p>
  );

  return (
    <form onSubmit={submit} className="flex gap-2 flex-wrap justify-center">
      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="you@yourfirm.com" required
        className="flex-1 min-w-[200px] max-w-xs px-5 py-3 rounded-full text-sm border border-[#c1c7cc]/60 bg-white text-[#191c1e] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6aab8e]/30" />
      <button type="submit" disabled={state === "loading"}
        className="px-6 py-3 rounded-full text-sm font-bold bg-[#1A2B4A] text-white hover:bg-[#396477] transition-colors disabled:opacity-60 whitespace-nowrap">
        {state === "loading" ? "…" : "Request access →"}
      </button>
      {state === "error" && <p className="w-full text-xs text-red-400 text-center">Something went wrong — try again.</p>}
    </form>
  );
}

export default function CoffeePage() {
  return (
    <div className="min-h-screen bg-[#faf7f2] font-sans text-[#191c1e] overflow-x-hidden">

      {/* Nav */}
      <header className="sticky top-0 z-20 bg-[#faf7f2]/90 backdrop-blur border-b border-[#c1c7cc]/30">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="font-bold text-lg tracking-tight" style={{ color: "#6aab8e" }}>Onlu</span>
            <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-[#8B5E3C] relative top-px">Intel</span>
          </Link>
          <div className="flex items-center gap-4">
            <a href="#products" className="hidden sm:inline text-xs text-[#71787c] hover:text-[#191c1e] transition-colors font-medium tracking-wide uppercase">Products</a>
            <a href="#who" className="hidden sm:inline text-xs text-[#71787c] hover:text-[#191c1e] transition-colors font-medium tracking-wide uppercase">Who it&apos;s for</a>
            <a href="#join" className="px-4 py-2 bg-[#1A2B4A] text-white text-sm font-bold rounded-full hover:bg-[#396477] transition-colors">
              Join waitlist
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-20 pb-12 sm:pt-28 sm:pb-16 relative">
        {/* Warm glow */}
        <div className="absolute right-0 top-1/3 w-80 h-80 rounded-full bg-[#6aab8e]/10 blur-[80px] pointer-events-none" />
        <div className="absolute right-1/4 top-2/3 w-40 h-40 rounded-full bg-[#8B5E3C]/10 blur-[60px] pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-[#1A2B4A] rounded-xl flex items-center justify-center text-lg">☕</div>
          <span className="text-[11px] font-bold tracking-[2px] uppercase text-[#8B5E3C]">Onlu Coffee</span>
          <span className="w-px h-4 bg-[#c1c7cc]" />
          <span className="text-[11px] text-[#71787c]">Our first product</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight tracking-tight text-[#1A2B4A] max-w-3xl mb-6">
          The right conversation<br />with the{" "}
          <span style={{ color: "#6aab8e" }}>right person.</span>
        </h1>

        <p className="text-[#71787c] text-base sm:text-lg max-w-xl leading-relaxed mb-10 font-light">
          Onlu Intel connects buyside professionals for curated 1:1 coffees, intimate dinners, and real idea exchange. No noise. No conferences. Just signal.
        </p>

        <div className="flex items-center gap-5 flex-wrap mb-14">
          <a href="#join"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#1A2B4A] text-white text-sm font-bold rounded-full hover:bg-[#396477] transition-all hover:-translate-y-0.5 hover:shadow-lg">
            Request early access →
          </a>
          <span className="text-sm text-[#71787c]"><strong className="text-[#191c1e]">280+</strong> on the waitlist</span>
        </div>

        {/* Product chips */}
        <div id="products" className="flex gap-3 flex-wrap">
          {[
            { icon: "☕", label: "Onlu Coffee", badge: "LIVE", active: true },
            { icon: "🍽", label: "Onlu Table",  badge: "SOON", active: false },
            { icon: "🎙", label: "Onlu Room",   badge: "2027", active: false },
          ].map(({ icon, label, badge, active }) => (
            <div key={label}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium border transition-all ${
                active
                  ? "bg-[#1A2B4A] text-white border-[#1A2B4A]"
                  : "bg-white text-[#71787c] border-[#c1c7cc]/50 opacity-60"
              }`}>
              <span>{icon}</span>
              {label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold tracking-wide ${
                active ? "bg-[#6aab8e]/30 text-[#6aab8e]" : "bg-[#c1c7cc]/30 text-[#71787c]"
              }`}>{badge}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Phone Mockups */}
      <section className="max-w-5xl mx-auto px-5 py-12 flex justify-center gap-5 flex-wrap">

        {/* Phone 1 — Coffee Matches */}
        <div className="w-60 bg-white rounded-3xl border border-[#c1c7cc]/40 shadow-xl p-4 shrink-0">
          <div className="w-20 h-5 bg-[#191c1e] rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-base font-bold text-[#191c1e]">Coffee matches</span>
            <div className="w-7 h-7 bg-[#1A2B4A] rounded-lg flex items-center justify-center text-xs">☕</div>
          </div>
          <p className="text-[10px] text-[#71787c] mb-3">3 new this week · NYC</p>

          {[
            { initials: "SL", name: "Sarah L.", role: "PM, Intl Small Cap · Fidelity", tags: ["Japan equities", "Value"], color: "#1A2B4A", cta: true },
            { initials: "MK", name: "Michael K.", role: "Analyst, EM · Capital Group", tags: ["Asia industrials", "GARP"], color: "#8B5E3C", cta: false },
            { initials: "RW", name: "Rachel W.", role: "Allocator · Endowment", tags: ["Intl equity", "Due diligence"], color: "#6b7b8d", cta: false },
          ].map(({ initials, name, role, tags, color, cta }) => (
            <div key={initials} className="bg-[#faf7f2] rounded-xl p-3 mb-2 border border-[#c1c7cc]/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: color }}>{initials}</div>
                <div>
                  <p className="text-xs font-semibold text-[#191c1e]">{name}</p>
                  <p className="text-[10px] text-[#71787c] leading-snug">{role}</p>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap mb-2">
                {tags.map(t => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#6aab8e]/10 text-[#6aab8e] font-medium">{t}</span>
                ))}
              </div>
              {cta && (
                <div className="flex gap-1.5">
                  <button className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-[#1A2B4A] text-white">☕ Grab coffee</button>
                  <button className="flex-1 py-1.5 rounded-lg text-[10px] font-medium bg-[#f2f4f6] text-[#71787c]">Later</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Phone 2 — Upcoming */}
        <div className="w-60 bg-white rounded-3xl border border-[#c1c7cc]/40 shadow-xl p-4 shrink-0">
          <div className="w-20 h-5 bg-[#191c1e] rounded-full mx-auto mb-4" />
          <p className="text-base font-bold text-[#191c1e] mb-0.5">Upcoming</p>
          <p className="text-[10px] text-[#71787c] mb-3">Your schedule · April</p>

          <div className="bg-[#1A2B4A] rounded-xl p-3.5 mb-2 text-white">
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1.5">☕ Onlu Coffee</p>
            <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Apr 22 · 4:00 PM</p>
            <p className="text-sm font-bold mb-0.5">Coffee w/ Sarah L.</p>
            <p className="text-[10px] opacity-60">Urbanspace · Midtown East</p>
          </div>

          {[
            { icon: "🍽", label: "Onlu Table", date: "Apr 28 · 7:00 PM", title: "EM Allocators Dinner", meta: "8 seats · West Village" },
            { icon: "☕", label: "Onlu Coffee", date: "May 2 · 8:30 AM", title: "Coffee w/ James T.", meta: "Blue Bottle · FiDi" },
          ].map(({ icon, label, date, title, meta }) => (
            <div key={title} className="bg-[#faf7f2] rounded-xl p-3.5 mb-2 border border-[#c1c7cc]/20">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#8B5E3C] mb-1.5">{icon} {label}</p>
              <p className="text-[10px] uppercase tracking-widest text-[#71787c] mb-1">{date}</p>
              <p className="text-sm font-semibold text-[#191c1e] mb-0.5">{title}</p>
              <p className="text-[10px] text-[#71787c]">{meta}</p>
            </div>
          ))}
        </div>

        {/* Phone 3 — Chat */}
        <div className="w-60 bg-white rounded-3xl border border-[#c1c7cc]/40 shadow-xl p-4 shrink-0 hidden sm:block">
          <div className="w-20 h-5 bg-[#191c1e] rounded-full mx-auto mb-4" />
          <p className="text-base font-bold text-[#191c1e] mb-0.5">Sarah L.</p>
          <p className="text-[10px] text-[#71787c] mb-4">PM, Intl Small Cap · Fidelity</p>

          <p className="text-[9px] text-[#71787c] text-center mb-3">Today, 2:14 PM</p>

          {[
            { text: "Hey — saw you cover Japanese industrials. Looked at any sub-¥50B construction equipment names?", sent: false },
            { text: "Yes — a couple with interesting owner-operator dynamics. Want to compare notes over coffee?", sent: true },
            { text: "Thursday works. Grand Central area?", sent: false },
            { text: "Urbanspace, 4pm?", sent: true },
            { text: "Done ✓", sent: false },
          ].map((msg, i) => (
            <div key={i}
              className={`text-[11px] leading-relaxed px-3 py-2.5 rounded-2xl mb-2 max-w-[88%] ${
                msg.sent
                  ? "bg-[#1A2B4A] text-white ml-auto rounded-br-sm"
                  : "bg-[#f2f4f6] text-[#191c1e] rounded-bl-sm"
              }`}>
              {msg.text}
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-5"><hr className="border-[#c1c7cc]/30" /></div>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-[#8B5E3C] mb-4">How Onlu Coffee works</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A2B4A] tracking-tight mb-10 max-w-md leading-snug">
          Less algorithm.<br />More intention.
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { n: "01", title: "Apply & get verified", desc: "We verify your background and match you with professionals in your vertical. No recruiters, no sales pitches, no noise." },
            { n: "02", title: "Get matched weekly",   desc: "Curated intros based on strategy, geography, and coverage overlap. People you'd actually want to sit down with." },
            { n: "03", title: "Grab coffee",          desc: "Accept a match, pick a spot, meet in person. One real conversation beats a hundred LinkedIn messages." },
          ].map(({ n, title, desc }) => (
            <div key={n} className="bg-white border border-[#c1c7cc]/40 rounded-2xl p-7 hover:-translate-y-1 transition-transform hover:shadow-md">
              <p className="text-4xl font-black text-[#6aab8e]/30 mb-4 leading-none">{n}</p>
              <h3 className="text-base font-bold text-[#191c1e] mb-2">{title}</h3>
              <p className="text-sm text-[#71787c] leading-relaxed font-light">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-5"><hr className="border-[#c1c7cc]/30" /></div>

      {/* Who it's for */}
      <section id="who" className="max-w-5xl mx-auto px-5 py-16">
        <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-[#8B5E3C] mb-4">Who it&apos;s for</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A2B4A] tracking-tight mb-10 max-w-md leading-snug">
          Built for the buyside.<br />Starting with NYC.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "📊", title: "Equity Analysts",    desc: "Compare notes on coverage, share variant perceptions, find idea sparring partners." },
            { icon: "🌏", title: "International PMs",  desc: "Connect with peers running EM, Japan, Europe, or global mandates." },
            { icon: "🏛️", title: "Allocators",         desc: "Endowments, family offices, and consultants sourcing differentiated managers." },
            { icon: "🔄", title: "Career Movers",      desc: "Pivoting from sell-side, credit, or banking? Meet people who've done it." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white border border-[#c1c7cc]/40 rounded-2xl p-6 text-center hover:-translate-y-1 transition-transform hover:shadow-md">
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="text-sm font-bold text-[#191c1e] mb-2">{title}</h3>
              <p className="text-xs text-[#71787c] leading-relaxed font-light">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-5"><hr className="border-[#c1c7cc]/30" /></div>

      {/* Roadmap */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-[#8B5E3C] mb-4">The Onlu Intel platform</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A2B4A] tracking-tight mb-10 max-w-md leading-snug">
          One network.<br />Multiple ways to connect.
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: "☕", title: "Onlu Coffee", status: "● Launching now", featured: true,
              desc: "Curated 1:1 intros with buyside peers. Weekly matches, your city, your schedule. The simplest way to expand your network with intention.",
            },
            {
              icon: "🍽", title: "Onlu Table", status: "Coming Q3 2026", featured: false,
              desc: "Intimate dinners of 6–8 people, organised by theme. Japan small caps, EM macro, credit-to-equity pivots — real conversations over real food.",
            },
            {
              icon: "🎙", title: "Onlu Room", status: "Coming 2027", featured: false,
              desc: "Deep-dive sessions and closed-door panels. 20 people, one topic, no recordings. The kind of room you'd want to be in.",
            },
          ].map(({ icon, title, status, featured, desc }) => (
            <div key={title}
              className={`rounded-2xl p-7 border hover:-translate-y-1 transition-transform hover:shadow-md ${
                featured
                  ? "bg-[#1A2B4A] border-transparent text-white"
                  : "bg-white border-[#c1c7cc]/40 text-[#191c1e]"
              }`}>
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="text-lg font-bold mb-2">{title}</h3>
              <p className={`text-sm leading-relaxed font-light mb-5 ${featured ? "text-white/70" : "text-[#71787c]"}`}>{desc}</p>
              <p className={`text-[10px] font-bold tracking-widest uppercase ${featured ? "text-[#6aab8e]" : "text-[#8B5E3C]"}`}>{status}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-5"><hr className="border-[#c1c7cc]/30" /></div>

      {/* CTA */}
      <section id="join" className="max-w-5xl mx-auto px-5 py-20 text-center">
        <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-[#8B5E3C] mb-4">Early access</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A2B4A] tracking-tight leading-tight mb-4">
          Your next coffee could<br />change your career.
        </h2>
        <p className="text-[#71787c] text-base mb-8 font-light">Launching in NYC. Request access below.</p>
        <div className="max-w-md mx-auto">
          <EmailCapture />
          <p className="text-xs text-[#71787c] mt-3">No spam · Unsubscribe anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#c1c7cc]/30 bg-white">
        <div className="max-w-5xl mx-auto px-5 py-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span className="font-bold text-sm" style={{ color: "#6aab8e" }}>Onlu</span>
            <span className="text-[9px] font-bold tracking-[2px] uppercase text-[#8B5E3C]">Intel</span>
          </div>
          <div className="flex gap-5 text-xs text-[#71787c]">
            <Link href="/" className="hover:text-[#191c1e] transition-colors">Platform →</Link>
            <Link href="/privacy" className="hover:text-[#191c1e] transition-colors">Privacy</Link>
            <Link href="/about" className="hover:text-[#191c1e] transition-colors">About</Link>
          </div>
          <p className="text-xs text-[#71787c]">© 2026 Onlu Intel. NYC first, then everywhere.</p>
        </div>
      </footer>

    </div>
  );
}
