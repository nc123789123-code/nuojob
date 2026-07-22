import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/app/components/SiteNav";
import SiteFooter from "@/app/components/SiteFooter";
import NewsletterCTA from "@/app/components/NewsletterCTA";

export const metadata: Metadata = {
  title: "Onlu for Universities — Free Finance Career Prep for Your Students",
  description:
    "Give your finance students an edge: real deal case studies, live market intelligence, AI-powered interview prep, and a daily jobs digest. Free access for university programs and finance clubs.",
  alternates: { canonical: "https://onluintel.com/universities" },
  openGraph: {
    title: "Onlu for Universities — Free Finance Career Prep",
    description:
      "Real case studies, live markets, AI interview prep, and a daily jobs digest — free for university finance programs.",
    url: "https://onluintel.com/universities",
    siteName: "Onlu",
    type: "website",
  },
};

const FEATURES = [
  {
    icon: "💼",
    title: "Daily Jobs Digest",
    desc: "Curated buy-side and banking roles across IB, PE, AM, and VC — delivered every weekday so students never miss an application window.",
  },
  {
    icon: "📁",
    title: "Real Deal Case Studies",
    desc: "Walk through actual M&A, LBO, and DCF cases from real transactions — the scenarios students actually get tested on.",
  },
  {
    icon: "🤖",
    title: "AI Interview Coach",
    desc: "Practice technical and behavioral questions with instant feedback across IB, PE, hedge fund, and AM formats.",
  },
  {
    icon: "📊",
    title: "Live Market Intelligence",
    desc: "Daily market pulse, fund signals, and sector news so students walk into interviews knowing what's moving markets today.",
  },
];

const TIERS = [
  {
    badge: "Free",
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    price: "$0",
    unit: "/ student",
    desc: "Share a link. Students sign up instantly. No contract needed.",
    features: ["3 case studies / month", "Daily market snapshot", "5 AI queries / day", "Jobs digest (3 roles)"],
  },
  {
    badge: "Student Pro",
    badgeCls: "bg-violet-50 text-violet-700 border-violet-200",
    price: "$5",
    unit: "/ month",
    desc: "Students upgrade individually — no school purchase required.",
    features: ["Unlimited case studies", "Full AI interview coach", "Full daily jobs digest", "Deep market data"],
  },
  {
    badge: "Campus License",
    badgeCls: "bg-[#eaf1f4] text-[#396477] border-[#396477]/20",
    price: "$300",
    unit: "/ year",
    desc: "Pro access for your entire finance club or cohort. One invoice.",
    features: ["Everything in Student Pro", "Up to 100 students", "Monthly usage report", "Co-branded welcome email"],
  },
  {
    badge: "Sponsored Issue",
    badgeCls: "bg-rose-50 text-rose-600 border-rose-200",
    price: "$100",
    unit: "/ issue",
    desc: "Sponsor our daily jobs digest sent to your students and alumni.",
    features: ["Logo in newsletter header", "Featured role placement", "Sent to the full list", "Performance report"],
  },
];

const STATS = [
  { num: "500+", label: "Case studies across IB, PE & AM" },
  { num: "Daily", label: "Jobs digest, Monday to Friday" },
  { num: "Free", label: "Forever for student accounts" },
  { num: "5 min", label: "Setup time for your school" },
];

export default function UniversitiesPage() {
  return (
    <div className="min-h-screen bg-[#f5f3ff] flex flex-col" style={{ fontFamily: "'Nunito', sans-serif" }}>
      <SiteNav />

      {/* Hero */}
      <section className="bg-violet-100 border-b border-violet-200">
        <div className="max-w-3xl mx-auto px-5 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-200/60 text-violet-700 text-[11px] font-semibold tracking-wider uppercase rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
            University Partnerships
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight mb-5 text-[#1A2B4A]">
            Give your finance students<br />an unfair advantage.
          </h1>
          <p className="text-[#41484c] text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Free access to real case studies, live market intelligence, AI-powered interview
            prep, and a daily jobs digest — the tools top firms actually test for.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#contact" className="px-6 py-3 rounded-lg bg-[#6aab8e] text-white text-sm font-bold hover:bg-[#5d9a7e] transition-colors">
              Get Free Access for Your School
            </a>
            <Link href="/" className="px-6 py-3 rounded-lg bg-white text-[#1A2B4A] text-sm font-bold border border-[#c1c7cc]/50 hover:bg-gray-50 transition-colors">
              See the Platform →
            </Link>
          </div>
        </div>
      </section>

      {/* Logos bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-5 py-7 text-center">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">
            Our readers prepare for roles at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-extrabold text-gray-400">
            {["Goldman Sachs", "Morgan Stanley", "Blackstone", "KKR", "JPMorgan", "Citadel"].map((f) => (
              <span key={f}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 py-16 w-full">
        <div className="text-center mb-12">
          <p className="text-xs font-bold text-[#6aab8e] uppercase tracking-widest mb-3">What&apos;s included</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A2B4A]">
            Everything students need to land their first role
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white border border-gray-100 rounded-2xl p-7 hover:shadow-[0_8px_32px_rgba(57,100,119,0.08)] transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-[#f5f3ff] flex items-center justify-center text-2xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold text-[#191c1e] mb-2">{f.title}</h3>
              <p className="text-sm text-[#41484c] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tiers */}
      <section className="bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-5 py-16">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-[#6aab8e] uppercase tracking-widest mb-3">Partnership tiers</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A2B4A]">
              Free for students. Flexible for schools.
            </h2>
            <p className="text-sm text-[#41484c] mt-3 max-w-md mx-auto">
              Every tier includes free student access — no credit card required for students.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TIERS.map((t) => (
              <div key={t.badge} className="border border-gray-200 rounded-2xl p-6 flex flex-col">
                <span className={`self-start inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${t.badgeCls} mb-4`}>
                  {t.badge}
                </span>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-extrabold tracking-tight text-[#1A2B4A]">{t.price}</span>
                  <span className="text-sm text-gray-400 font-medium">{t.unit}</span>
                </div>
                <p className="text-xs text-[#41484c] leading-relaxed mb-4">{t.desc}</p>
                <ul className="flex flex-col gap-2 mt-auto">
                  {t.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-xs text-[#191c1e]">
                      <span className="text-[#6aab8e] font-bold flex-shrink-0">✓</span>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto px-5 py-16 w-full">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-6 text-center">
              <div className="text-3xl font-extrabold tracking-tight text-[#6aab8e]">{s.num}</div>
              <div className="text-xs text-[#41484c] mt-2 font-medium leading-snug">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section id="contact" className="max-w-2xl mx-auto px-5 pb-20 w-full scroll-mt-24">
        <NewsletterCTA
          intent="guide_interest"
          title="Bring Onlu to your students"
          description="Drop your university email and we'll send a free access link within 24 hours — no sales call required."
          placeholder="you@university.edu"
          cta="Get Free Access"
          successMessage="Thanks! We'll be in touch within 24 hours."
          dark
        />
        <p className="text-center text-xs text-[#71787c] mt-4">
          Or email us directly at{" "}
          <a href="mailto:hello@onlu.ai" className="text-[#396477] font-semibold hover:underline">hello@onlu.ai</a>
        </p>
      </section>

      <SiteFooter />
    </div>
  );
}
