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
    <p className="text-sm font-semibold text-[#E9C989]">✓ You&apos;re on the list — we&apos;ll be in touch.</p>
  );

  return (
    <form onSubmit={submit} className="flex gap-2 flex-wrap justify-center">
      <input type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="you@yourfirm.com" required
        className="flex-1 min-w-[200px] max-w-xs px-5 py-3 rounded-full text-sm border border-[#38324E]/60 bg-[#201B2E] text-[#F4F0FA] placeholder:text-[#8A8398] focus:outline-none focus:ring-2 focus:ring-[#6aab8e]/30" />
      <button type="submit" disabled={state === "loading"}
        className="px-6 py-3 rounded-full text-sm font-bold bg-[#7C3AED] text-white hover:bg-[#171226] transition-colors disabled:opacity-60 whitespace-nowrap">
        {state === "loading" ? "…" : "Request access →"}
      </button>
      {state === "error" && <p className="w-full text-xs text-red-400 text-center">Something went wrong — try again.</p>}
    </form>
  );
}

export default function CoffeePage() {
  return (
    <div className="min-h-screen bg-[#faf7f2] font-sans text-[#F4F0FA] overflow-x-hidden">

      {/* Nav */}
      <header className="sticky top-0 z-20 bg-[#faf7f2]/90 backdrop-blur border-b border-[#38324E]/30">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <LogoMark size={26} />
            <span className="font-bold text-lg tracking-tight" style={{ color: "#E9C989" }}>Onlu</span>
            <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-[#8B5E3C] relative top-px">Intel</span>
          </Link>
          <div className="flex items-center gap-4">
            <a href="#how" className="hidden sm:inline text-xs text-[#9A93AC] hover:text-[#F4F0FA] transition-colors font-medium tracking-wide uppercase">How it works</a>
            <a href="#who" className="hidden sm:inline text-xs text-[#9A93AC] hover:text-[#F4F0FA] transition-colors font-medium tracking-wide uppercase">Who it&apos;s for</a>
            <a href="#join" className="px-4 py-2 bg-[#7C3AED] text-white text-sm font-bold rounded-full hover:bg-[#171226] transition-colors">
              Join waitlist
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-20 pb-12 sm:pt-28 sm:pb-16 relative">
        <div className="absolute right-0 top-1/3 w-80 h-80 rounded-full bg-[#7C3AED]/10 blur-[80px] pointer-events-none" />
        <div className="absolute right-1/4 top-2/3 w-40 h-40 rounded-full bg-[#8B5E3C]/10 blur-[60px] pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-[#7C3AED] rounded-xl flex items-center justify-center text-lg">☕</div>
          <span className="text-[11px] font-bold tracking-[2px] uppercase text-[#8B5E3C]">Onlu Coffee</span>
          <span className="w-px h-4 bg-[#c1c7cc]" />
          <span className="text-[11px] text-[#9A93AC]">By Onlu Intel · NYC</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight tracking-tight text-[#F4F0FA] max-w-3xl mb-6">
          The finance network where no one asks{" "}
          <span style={{ color: "#E9C989" }}>what you&apos;re buying.</span>
        </h1>

        <p className="text-[#9A93AC] text-base sm:text-lg max-w-xl leading-relaxed mb-4 font-light">
          Curated 1:1 coffees for buyside professionals — credit, PE, restructuring, macro.
          Conversations structured around ideas, frameworks, and careers. Not deals. Not positions.
        </p>
        <p className="text-[#9A93AC] text-sm max-w-xl leading-relaxed mb-10 font-light">
          Compliance-safe by design. Interesting by default.
        </p>

        <div className="flex items-center gap-5 flex-wrap mb-14">
          <a href="#join"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#7C3AED] text-white text-sm font-bold rounded-full hover:bg-[#171226] transition-all hover:-translate-y-0.5 hover:shadow-lg">
            Request early access →
          </a>
          <span className="text-sm text-[#9A93AC]">Launching in NYC</span>
        </div>

        {/* Product chips */}
        <div className="flex gap-3 flex-wrap">
          {[
            { icon: "☕", label: "Onlu Coffee", badge: "NOW",  active: true  },
            { icon: "🪑", label: "Onlu Table",  badge: "SOON", active: false },
            { icon: "🎙", label: "Onlu Room",   badge: "2027", active: false },
          ].map(({ icon, label, badge, active }) => (
            <div key={label}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-medium border transition-all ${
                active
                  ? "bg-[#7C3AED] text-white border-[#1A2B4A]"
                  : "bg-[#201B2E] text-[#9A93AC] border-[#38324E]/50 opacity-60"
              }`}>
              <span>{icon}</span>
              {label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold tracking-wide ${
                active ? "bg-[#7C3AED]/30 text-[#E9C989]" : "bg-[#c1c7cc]/30 text-[#9A93AC]"
              }`}>{badge}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Phone Mockups */}
      <section className="max-w-5xl mx-auto px-5 py-12 flex justify-center gap-5 flex-wrap">

        {/* Phone 1 — Coffee Matches */}
        <div className="w-60 bg-[#201B2E] rounded-3xl border border-[#38324E]/40 shadow-xl p-4 shrink-0">
          <div className="w-20 h-5 bg-[#191c1e] rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-base font-bold text-[#F4F0FA]">Your matches</span>
            <div className="w-7 h-7 bg-[#7C3AED] rounded-lg flex items-center justify-center text-xs">☕</div>
          </div>
          <p className="text-[10px] text-[#9A93AC] mb-3">3 new this week · NYC</p>

          {[
            { initials: "JL", name: "James L.", role: "Credit Analyst · Ares Management", tags: ["Private credit", "LBO"], color: "#F4F0FA", cta: true },
            { initials: "RK", name: "Rachel K.", role: "VP Restructuring · Lazard", tags: ["Special sits", "Ch.11"], color: "#A78BFA", cta: false },
            { initials: "MW", name: "Marcus W.", role: "PE Associate · Apollo", tags: ["Distressed", "Credit"], color: "#6b7b8d", cta: false },
          ].map(({ initials, name, role, tags, color, cta }) => (
            <div key={initials} className="bg-[#faf7f2] rounded-xl p-3 mb-2 border border-[#38324E]/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: color }}>{initials}</div>
                <div>
                  <p className="text-xs font-semibold text-[#F4F0FA]">{name}</p>
                  <p className="text-[10px] text-[#9A93AC] leading-snug">{role}</p>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap mb-2">
                {tags.map(t => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#7C3AED]/10 text-[#E9C989] font-medium">{t}</span>
                ))}
              </div>
              {cta && (
                <div className="flex gap-1.5">
                  <button className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-[#7C3AED] text-white">☕ Grab coffee</button>
                  <button className="flex-1 py-1.5 rounded-lg text-[10px] font-medium bg-[#14111D] text-[#9A93AC]">Later</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Phone 2 — Upcoming */}
        <div className="w-60 bg-[#201B2E] rounded-3xl border border-[#38324E]/40 shadow-xl p-4 shrink-0">
          <div className="w-20 h-5 bg-[#191c1e] rounded-full mx-auto mb-4" />
          <p className="text-base font-bold text-[#F4F0FA] mb-0.5">Upcoming</p>
          <p className="text-[10px] text-[#9A93AC] mb-3">Your schedule · April</p>

          <div className="bg-[#7C3AED] rounded-xl p-3.5 mb-2 text-white">
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-50 mb-1.5">☕ Onlu Coffee</p>
            <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Apr 22 · 8:30 AM</p>
            <p className="text-sm font-bold mb-0.5">Coffee w/ James L.</p>
            <p className="text-[10px] opacity-60">Blue Bottle · FiDi</p>
          </div>

          {[
            { icon: "☕", label: "Onlu Coffee", date: "Apr 29 · 4:00 PM", title: "Coffee w/ Rachel K.", meta: "Bluestone Lane · Midtown" },
            { icon: "🪑", label: "Onlu Table",  date: "May 6 · 6:30 PM",  title: "Credit markets Q2", meta: "8 seats · West Village" },
          ].map(({ icon, label, date, title, meta }) => (
            <div key={title} className="bg-[#faf7f2] rounded-xl p-3.5 mb-2 border border-[#38324E]/20">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#8B5E3C] mb-1.5">{icon} {label}</p>
              <p className="text-[10px] uppercase tracking-widest text-[#9A93AC] mb-1">{date}</p>
              <p className="text-sm font-semibold text-[#F4F0FA] mb-0.5">{title}</p>
              <p className="text-[10px] text-[#9A93AC]">{meta}</p>
            </div>
          ))}
        </div>

        {/* Phone 3 — Chat */}
        <div className="w-60 bg-[#201B2E] rounded-3xl border border-[#38324E]/40 shadow-xl p-4 shrink-0 hidden sm:block">
          <div className="w-20 h-5 bg-[#191c1e] rounded-full mx-auto mb-4" />
          <p className="text-base font-bold text-[#F4F0FA] mb-0.5">James L.</p>
          <p className="text-[10px] text-[#9A93AC] mb-4">Credit Analyst · Ares Management</p>

          <p className="text-[9px] text-[#9A93AC] text-center mb-3">Today, 9:02 AM</p>

          {[
            { text: "Curious how you think about covenant packages in the current rate environment — maintenance vs incurrence.", sent: false },
            { text: "Lenders have been getting more protective lately. Happy to walk through how we frame it. Coffee this week?", sent: true },
            { text: "Thursday morning works. FiDi area?", sent: false },
            { text: "Blue Bottle on Stone St — 8:30?", sent: true },
            { text: "Done ✓", sent: false },
          ].map((msg, i) => (
            <div key={i}
              className={`text-[11px] leading-relaxed px-3 py-2.5 rounded-2xl mb-2 max-w-[88%] ${
                msg.sent
                  ? "bg-[#7C3AED] text-white ml-auto rounded-br-sm"
                  : "bg-[#14111D] text-[#F4F0FA] rounded-bl-sm"
              }`}>
              {msg.text}
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-5"><hr className="border-[#38324E]/30" /></div>

      {/* How it works */}
      <section id="how" className="max-w-5xl mx-auto px-5 py-16">
        <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-[#8B5E3C] mb-4">How it works</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F4F0FA] tracking-tight mb-10 max-w-md leading-snug">
          Structured enough to be safe.<br />Open enough to be useful.
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { n: "01", title: "Apply & get verified", desc: "We check you work in finance. No recruiters, no sales professionals, no one fishing for deal flow. Just practitioners." },
            { n: "02", title: "Get matched weekly",   desc: "Matched based on sector, strategy, and career stage. Conversations stay around frameworks, macro, and careers — never active deals or positions." },
            { n: "03", title: "Grab coffee",          desc: "Accept a match, pick a spot, meet in person. One real conversation beats a hundred LinkedIn messages." },
          ].map(({ n, title, desc }) => (
            <div key={n} className="bg-[#201B2E] border border-[#38324E]/40 rounded-2xl p-7 hover:-translate-y-1 transition-transform hover:shadow-md">
              <p className="text-4xl font-black text-[#E9C989]/30 mb-4 leading-none">{n}</p>
              <h3 className="text-base font-bold text-[#F4F0FA] mb-2">{title}</h3>
              <p className="text-sm text-[#9A93AC] leading-relaxed font-light">{desc}</p>
            </div>
          ))}
        </div>

        {/* Compliance note */}
        <div className="mt-8 bg-[#201B2E] border border-[#38324E]/40 rounded-2xl px-6 py-5 flex items-start gap-4">
          <span className="text-2xl shrink-0">🔒</span>
          <div>
            <p className="text-sm font-bold text-[#F4F0FA] mb-1">Designed around compliance</p>
            <p className="text-sm text-[#9A93AC] font-light leading-relaxed">
              Every session is structured around ideas, sector frameworks, and career paths — not active deals or current positions.
              Think of it like a conference panel, just with 2 people and better coffee.
              Your compliance team won&apos;t have a problem with it.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-5"><hr className="border-[#38324E]/30" /></div>

      {/* Who it's for */}
      <section id="who" className="max-w-5xl mx-auto px-5 py-16">
        <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-[#8B5E3C] mb-4">Who it&apos;s for</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F4F0FA] tracking-tight mb-10 max-w-md leading-snug">
          Built for buyside finance.<br />Starting with credit &amp; PE.
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "📋", title: "Credit Investors",   desc: "Private credit, direct lending, CLOs — find peers who think about leverage and recovery the same way you do." },
            { icon: "🏗️", title: "Restructuring",      desc: "Bankers, advisors, and distressed investors. Meet people who understand what a waterfall actually means." },
            { icon: "💼", title: "PE & Special Sits",  desc: "Associate to partner. Compare notes on sourcing, underwriting, and what the market is actually pricing." },
            { icon: "🔄", title: "Career Switchers",   desc: "Moving from banking or consulting to the buyside? Meet practitioners who made the same move." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-[#201B2E] border border-[#38324E]/40 rounded-2xl p-6 text-center hover:-translate-y-1 transition-transform hover:shadow-md">
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="text-sm font-bold text-[#F4F0FA] mb-2">{title}</h3>
              <p className="text-xs text-[#9A93AC] leading-relaxed font-light">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-5"><hr className="border-[#38324E]/30" /></div>

      {/* Roadmap */}
      <section className="max-w-5xl mx-auto px-5 py-16">
        <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-[#8B5E3C] mb-4">What&apos;s coming</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F4F0FA] tracking-tight mb-10 max-w-md leading-snug">
          One network.<br />Multiple ways to connect.
        </h2>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              icon: "☕", title: "Onlu Coffee", status: "● Launching now", featured: true,
              desc: "Curated 1:1 coffees with buyside peers. Weekly matches, your city, your schedule. No deal talk — just real conversation.",
            },
            {
              icon: "🪑", title: "Onlu Table", status: "Coming soon", featured: false,
              desc: "Small-group sessions of 6–8 people around a theme. Credit markets, PE careers, macro — structured conversation, not networking theatre.",
            },
            {
              icon: "🎙", title: "Onlu Room", status: "Coming 2027", featured: false,
              desc: "Closed-door sessions. 20 people, one topic, no recordings. The kind of room you actually want to be in.",
            },
          ].map(({ icon, title, status, featured, desc }) => (
            <div key={title}
              className={`rounded-2xl p-7 border hover:-translate-y-1 transition-transform hover:shadow-md ${
                featured
                  ? "bg-[#7C3AED] border-transparent text-white"
                  : "bg-[#201B2E] border-[#38324E]/40 text-[#F4F0FA]"
              }`}>
              <div className="text-3xl mb-4">{icon}</div>
              <h3 className="text-lg font-bold mb-2">{title}</h3>
              <p className={`text-sm leading-relaxed font-light mb-5 ${featured ? "text-white/70" : "text-[#9A93AC]"}`}>{desc}</p>
              <p className={`text-[10px] font-bold tracking-widest uppercase ${featured ? "text-[#E9C989]" : "text-[#8B5E3C]"}`}>{status}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-5"><hr className="border-[#38324E]/30" /></div>

      {/* CTA */}
      <section id="join" className="max-w-5xl mx-auto px-5 py-20 text-center">
        <p className="text-[11px] font-bold tracking-[2.5px] uppercase text-[#8B5E3C] mb-4">Early access</p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F4F0FA] tracking-tight leading-tight mb-4">
          Your next coffee could<br />change your career.
        </h2>
        <p className="text-[#9A93AC] text-base mb-2 font-light">Launching in NYC. Credit, PE, and restructuring first.</p>
        <p className="text-[#9A93AC] text-sm mb-8 font-light">No deal talk. No compliance issues. Just the right people.</p>
        <div className="max-w-md mx-auto">
          <EmailCapture />
          <p className="text-xs text-[#9A93AC] mt-3">No spam · Unsubscribe anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#38324E]/30 bg-[#201B2E]">
        <div className="max-w-5xl mx-auto px-5 py-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LogoMark size={20} />
            <span className="font-bold text-sm" style={{ color: "#E9C989" }}>Onlu</span>
            <span className="text-[9px] font-bold tracking-[2px] uppercase text-[#8B5E3C]">Intel</span>
          </div>
          <div className="flex gap-5 text-xs text-[#9A93AC]">
            <Link href="/" className="hover:text-[#F4F0FA] transition-colors">Platform →</Link>
            <Link href="/privacy" className="hover:text-[#F4F0FA] transition-colors">Privacy</Link>
            <Link href="/about" className="hover:text-[#F4F0FA] transition-colors">About</Link>
          </div>
          <p className="text-xs text-[#9A93AC]">© 2026 Onlu Intel. NYC first.</p>
        </div>
      </footer>

    </div>
  );
}
