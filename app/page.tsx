"use client";
// v2

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import LogoMark from "@/app/components/LogoMark";
import SearchBar from "@/app/components/SearchBar";
import FundRow from "@/app/components/FundCard";
import RoleCard from "@/app/components/RoleCard";
import FundFilterBar from "@/app/components/Filters";
import NewsletterCTA from "@/app/components/NewsletterCTA";
import GuideSection from "@/app/components/GuideSection";
import {
  FundFiling,
  SearchFilters,
  OutreachRecord,
  JobSignal,
  JobFilters,
  JobCategory,
  JobSignalTag,
} from "@/app/types";
import { exportToCsv } from "@/app/lib/export";

interface DailyIntel {
  todayCount: number;
  weekCount: number;
  topFunds: FundFiling[];
  topJobs: JobSignal[];
  lastUpdated: string;
}

const DEFAULT_FUND_FILTERS: SearchFilters = {
  query: "", strategy: "all", dateRange: "90", bucket: "all", minAmount: "",
};
const DEFAULT_JOB_FILTERS: JobFilters = {
  category: "all", dateRange: "45", signalTag: "all",
};

// ─── Animated counter hook ───────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    let start: number | null = null;
    let raf: number;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
      else setValue(target);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function AnimatedStat({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  const count = useCountUp(value);
  return (
    <div className="text-center counter-animate">
      <div className="text-3xl sm:text-4xl font-extrabold text-[#191c1e] tracking-tight">
        {count}{suffix}
      </div>
      <div className="text-[11px] font-medium text-[#71787c] mt-0.5 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function useOutreachTracker() {
  const [records, setRecords] = useState<Record<string, OutreachRecord>>({});
  useEffect(() => {
    try {
      const stored = localStorage.getItem("outreach-records-v2");
      if (stored) setRecords(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);
  const updateRecord = useCallback((record: OutreachRecord) => {
    setRecords((prev) => {
      const next = { ...prev, [record.filingId]: record };
      localStorage.setItem("outreach-records-v2", JSON.stringify(next));
      return next;
    });
  }, []);
  return { records, updateRecord };
}

type TopTab = "pulse" | "hiring" | "learn" | "firmprep" | "table";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TopTab | null) ?? "hiring";
  const [topTab, setTopTab] = useState<TopTab>(
    ["pulse", "hiring", "learn", "firmprep", "table"].includes(initialTab) ? initialTab : "hiring"
  );

  const [pulseSubTab, setPulseSubTab] = useState<"market" | "funds">("market");

  const [fundFilters, setFundFilters] = useState<SearchFilters>(DEFAULT_FUND_FILTERS);
  const [fundFilings, setFundFilings] = useState<FundFiling[]>([]);
  const [fundTotal, setFundTotal] = useState(0);
  const [fundLoading, setFundLoading] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  const [fundSubTab, setFundSubTab] = useState<"search" | "pipeline">("search");

  const [jobFilters, setJobFilters] = useState<JobFilters>(DEFAULT_JOB_FILTERS);
  const [jobSignals, setJobSignals] = useState<JobSignal[]>([]);
  const [jobTotal, setJobTotal] = useState(0);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [jobSources, setJobSources] = useState<string[]>([]);

  const [daily, setDaily] = useState<DailyIntel | null>(null);
  const [dailyLoading, setDailyLoading] = useState(true);

  useEffect(() => {
    fetch("/api/daily")
      .then((r) => r.json())
      .then((d) => setDaily(d))
      .catch(() => {/* silently ignore */})
      .finally(() => setDailyLoading(false));
  }, []);

  const { records, updateRecord } = useOutreachTracker();
  const fundDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jobDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fundFetchedRef = useRef(false);
  const jobFetchedRef = useRef(false);

  const fetchFunds = useCallback(async (f: SearchFilters) => {
    setFundLoading(true); setFundError(null);
    try {
      const params = new URLSearchParams({ query: f.query, strategy: f.strategy, dateRange: f.dateRange, minAmount: f.minAmount });
      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setFundFilings(data.filings || []); setFundTotal(data.total || 0);
    } catch (err) { setFundError(err instanceof Error ? err.message : "Failed"); }
    finally { setFundLoading(false); }
  }, []);

  const fetchJobs = useCallback(async (f: JobFilters) => {
    setJobLoading(true); setJobError(null);
    try {
      const params = new URLSearchParams({ dateRange: f.dateRange, category: f.category, signalTag: f.signalTag });
      const res = await fetch(`/api/jobs?${params}`);
      const text = await res.text();
      let data: { signals?: JobSignal[]; total?: number; sources?: string[]; error?: string };
      try { data = JSON.parse(text); } catch { throw new Error("Jobs service unavailable"); }
      if (!res.ok) throw new Error(data.error || "Search failed");
      setJobSignals(data.signals || []); setJobTotal(data.total || 0); setJobSources(data.sources || []);
    } catch (err) { setJobError(err instanceof Error ? err.message : "Failed"); }
    finally { setJobLoading(false); }
  }, []);

  useEffect(() => {
    if (fundDebounceRef.current) clearTimeout(fundDebounceRef.current);
    fundDebounceRef.current = setTimeout(() => { fundFetchedRef.current = true; fetchFunds(fundFilters); }, 400);
    return () => { if (fundDebounceRef.current) clearTimeout(fundDebounceRef.current); };
  }, [fundFilters, fetchFunds]);

  // Fetch jobs eagerly on mount so cross-linking works on Fund Signals tab too
  useEffect(() => {
    if (jobDebounceRef.current) clearTimeout(jobDebounceRef.current);
    jobDebounceRef.current = setTimeout(() => { jobFetchedRef.current = true; fetchJobs(jobFilters); }, 400);
    return () => { if (jobDebounceRef.current) clearTimeout(jobDebounceRef.current); };
  }, [jobFilters, fetchJobs]);

  const outreachRecords = Object.values(records).filter((r) => r.status !== "not_contacted");

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      {/* Nav */}
      <header className="glass-panel sticky top-0 z-20 border-b border-[#c1c7cc]/30 shadow-[0_1px_8px_rgba(57,100,119,0.06)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-8 h-16 sm:h-24 flex items-center gap-2 sm:gap-6">
          <div className="flex items-center gap-3">
            <LogoMark size={64} />
            <span className="font-bold text-2xl tracking-tight" style={{ color: "#6aab8e" }}>Onlu</span>
          </div>
          <div className="w-px h-4 bg-[#c1c7cc]/50 hidden sm:block" />
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1 sm:flex-none">
            <NavTab active={topTab === "hiring"} onClick={() => setTopTab("hiring")} label="Hiring Watch" />
            <NavTab active={topTab === "firmprep"} onClick={() => setTopTab("firmprep")} label="Edge Prep" badge="AI" />
            <NavTab active={topTab === "pulse"} onClick={() => setTopTab("pulse")} label="Market Pulse" badge="AI" />
            <NavTab active={topTab === "table"} onClick={() => setTopTab("table")} label="Onlu Events" />
            <NavTab active={topTab === "learn"} onClick={() => setTopTab("learn")} label="Onlu Learning" />
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <a href="#guide" className="hidden sm:inline text-[#41484c] hover:text-[#191c1e] text-xs transition-colors">Interview Guide</a>
            <Link href="/about" className="hidden sm:inline text-[#41484c] hover:text-[#191c1e] text-xs transition-colors">About</Link>
            <Link href="/contact" className="hidden sm:inline text-[#41484c] hover:text-[#191c1e] text-xs transition-colors">Contact</Link>
          </div>
        </div>
      </header>

      {/* Market Ticker Bar */}
      <MarketTickerBar />

      {/* Hero */}
      <div className="hero-gradient border-b border-sky-100/60">
        <div className="max-w-6xl mx-auto px-5 py-8">
          {topTab === "pulse" && (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100/70 text-[#396477] text-[11px] font-semibold tracking-wider uppercase rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-[#396477] rounded-full animate-pulse" />
                Market · Fund Intelligence · AI
              </div>
              <h1 className="text-[#191c1e] text-2xl sm:text-3xl font-bold tracking-tight leading-snug">Market Pulse</h1>
              <p className="text-[#41484c] text-sm mt-2 max-w-xl leading-relaxed">Live market analysis and fund signal intelligence — AI-generated briefs alongside SEC fundraising filings and hiring signals.</p>
            </>
          )}
          {topTab === "hiring" && (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#c3ecd7]/60 text-[#416656] text-[11px] font-semibold tracking-wider uppercase rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-[#416656] rounded-full animate-pulse" />
                Hiring Intelligence
              </div>
              <h1 className="text-[#191c1e] text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Know before<br className="hidden sm:block" /> the role is posted.
              </h1>
              <p className="text-[#41484c] text-sm mt-3 max-w-lg leading-relaxed">
                Capital raises predict hiring by 1–3 quarters. We track SEC filings, concurrent hiring patterns, and team changes across the buyside.
              </p>
              <div className="flex gap-8 mt-6">
                <AnimatedStat value={28} label="Firms tracked" />
                <AnimatedStat value={6} label="Data sources" />
                <AnimatedStat value={48} suffix="h" label="Signal refresh" />
              </div>
            </>
          )}
          {topTab === "learn" && (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e1ddf2]/70 text-[#5e5c6e] text-[11px] font-semibold tracking-wider uppercase rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-[#5e5c6e] rounded-full" />
                Onlu Learning
              </div>
              <h1 className="text-[#191c1e] text-2xl sm:text-3xl font-bold tracking-tight leading-snug">Onlu Learning</h1>
              <p className="text-[#41484c] text-sm mt-2 max-w-xl leading-relaxed">Career prep, market insights, and deep-dives on credit, AI, and macro — for practitioners and candidates who want to go deeper.</p>
            </>
          )}
          {topTab === "firmprep" && (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100/70 text-rose-700 text-[11px] font-semibold tracking-wider uppercase rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                AI-Powered · Firm-Specific
              </div>
              <h1 className="text-[#191c1e] text-2xl sm:text-3xl font-bold tracking-tight leading-snug">Edge Prep</h1>
              <p className="text-[#41484c] text-sm mt-2 max-w-xl leading-relaxed">Firm-specific interview prep, concept Q&A, and case studies — built for credit, PE, and special situations interviews.</p>
            </>
          )}

          {/* Feature map — same order as top nav, active tab highlighted */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-3xl">
            {([
              {
                icon: (
                  <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="9" r="5.5" />
                    <path d="M13.5 13.5 17 17" />
                    <path d="M7 9h4M9 7v4" strokeWidth="1.4" />
                  </svg>
                ),
                iconColor: "text-emerald-600",
                label: "Hiring Watch", desc: "Leading hiring indicators", tab: "hiring" as TopTab,
                color: "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50", active: "border-emerald-400 bg-emerald-50/60",
              },
              {
                icon: (
                  <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="14" height="14" rx="2.5" />
                    <path d="M7 10l2.5 2.5L13 8" />
                  </svg>
                ),
                iconColor: "text-rose-500",
                label: "Edge Prep", desc: "Firm guides & case library", tab: "firmprep" as TopTab,
                color: "border-rose-200 hover:border-rose-400 hover:bg-rose-50/50", active: "border-rose-400 bg-rose-50/60",
              },
              {
                icon: (
                  <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3,14 7,9 11,11 17,5" />
                    <line x1="3" y1="17" x2="17" y2="17" />
                  </svg>
                ),
                iconColor: "text-sky-500",
                label: "Market Pulse", desc: "Live prices & fund signals", tab: "pulse" as TopTab,
                color: "border-sky-200 hover:border-sky-400 hover:bg-sky-50/50", active: "border-sky-400 bg-sky-50/60",
              },
              {
                icon: (
                  <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="10" cy="10" r="7" />
                    <path d="M7 10c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3" />
                    <circle cx="10" cy="13" r="0.5" fill="currentColor" />
                  </svg>
                ),
                iconColor: "text-amber-500",
                label: "Onlu Events", desc: "Buyside catchups", tab: "table" as TopTab,
                color: "border-amber-200 hover:border-amber-400 hover:bg-amber-50/50", active: "border-amber-400 bg-amber-50/60",
              },
              {
                icon: (
                  <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h8l4 4v8a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    <path d="M12 4v4h4M7 11h6M7 14h4" />
                  </svg>
                ),
                iconColor: "text-violet-500",
                label: "Onlu Learning", desc: "Deep-dives on credit & macro", tab: "learn" as TopTab,
                color: "border-violet-200 hover:border-violet-400 hover:bg-violet-50/50", active: "border-violet-400 bg-violet-50/60",
              },
            ] as Array<{ icon: React.ReactNode; iconColor: string; label: string; desc: string; tab: TopTab; color: string; active: string }>).map(f => (
              <button key={f.tab} onClick={() => setTopTab(f.tab)}
                className={`card-lift text-left p-3 rounded-xl border bg-white transition-all ${topTab === f.tab ? f.active + " shadow-sm" : f.color}`}>
                <div className={`mb-1.5 ${topTab === f.tab ? f.iconColor : "text-gray-400"}`}>{f.icon}</div>
                <div className={`text-[11px] font-bold mb-0.5 ${topTab === f.tab ? "text-[#191c1e]" : "text-[#41484c]"}`}>{f.label}</div>
                <div className="text-[10px] text-gray-400 leading-snug hidden sm:block">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {topTab === "pulse" && <DailyIntelBar daily={daily} loading={dailyLoading} onFundClick={(id) => {
        setTopTab("pulse");
        setTimeout(() => document.getElementById(`fund-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
      }} onJobsClick={() => setTopTab("hiring")} />}

      <main className="max-w-6xl mx-auto px-5 py-5 space-y-4">
        {topTab === "pulse" && (
          <>
            <PulseSection
              pulseSubTab={pulseSubTab} setPulseSubTab={setPulseSubTab}
              fundFilters={fundFilters} setFundFilters={setFundFilters}
              fundFilings={fundFilings} fundTotal={fundTotal}
              fundLoading={fundLoading} fundError={fundError}
              records={records} updateRecord={updateRecord}
              outreachRecords={outreachRecords}
              fundSubTab={fundSubTab} setFundSubTab={setFundSubTab}
              onExport={() => exportToCsv(fundFilings, records)}
              jobSignals={jobSignals}
              onViewJobs={() => setTopTab("hiring")}
            />
            <NewsletterCTA
              intent="signals_subscriber"
              title="Get fund signals and market intel in your inbox."
              description="SEC filings, hiring signals, and AI market briefs — free weekly digest."
              cta="Subscribe free"
            />
          </>
        )}
        {topTab === "hiring" && (
          <>
            <HiringSection
              signals={jobSignals} loading={jobLoading}
              fundFilings={fundFilings}
              onViewSignals={() => setTopTab("pulse")}
            />
            <NewsletterCTA
              intent="signals_subscriber"
              title="Get hiring signals in your inbox every week."
              description="Fund filings, early signals, and distressed situations — before the roles are posted. Free."
              cta="Subscribe free"
            />
            <div className="bg-[#e1ddf2] border border-[#c7c4d8]/60 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-[#41484c]">
                Found an active signal? <span className="font-medium">Prepare for the interview before you apply.</span>
              </p>
              <a href="#guide" className="flex-shrink-0 px-4 py-2 bg-[#5e5c6e] text-white text-xs font-semibold rounded-lg hover:bg-[#4a4858] transition-colors text-center">
                Get the Interview Guide →
              </a>
            </div>
          </>
        )}
        {topTab === "learn" && (
          <>
            <LearnSection />
            <NewsletterCTA
              intent="signals_subscriber"
              title="Weekly buyside intelligence, in your inbox."
              description="Hiring signals, fund filings, distressed situations, and market context — delivered weekly. Free."
              cta="Subscribe free"
            />
          </>
        )}

        {topTab === "firmprep" && (
          <>
            <EdgeSection />
            <NewsletterCTA
              intent="signals_subscriber"
              title="Stay ahead — hiring signals straight to your inbox."
              description="Know which firms are actively hiring before roles are posted. Free weekly digest."
              cta="Subscribe free"
            />
          </>
        )}
        {topTab === "table" && (
          <>
            <OnluTableSection />
            <NewsletterCTA
              intent="signals_subscriber"
              title="Stay in the loop on buyside catchups."
              description="Get notified about upcoming events, hiring signals, and market intelligence. Free weekly digest."
              cta="Subscribe free"
            />
          </>
        )}
      </main>

      {/* Monetization section — always visible */}
      <GuideSection />
      <SiteFooter />
    </div>
  );
}


// ─── Market Ticker Bar ────────────────────────────────────────────────────────

interface MarketTicker {
  symbol: string; label: string; price: number;
  change: number; changePct: number; isYield: boolean;
}

function MarketTickerBar() {
  const [tickers, setTickers] = useState<MarketTicker[]>([]);

  useEffect(() => {
    fetch("/api/market-prices")
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d) && d.length) setTickers(d); })
      .catch(() => {});
  }, []);

  if (!tickers.length) return null;

  function fmt(t: MarketTicker): string {
    if (t.isYield) return `${t.price.toFixed(2)}%`;
    if (t.price >= 1000) return t.price.toLocaleString("en-US", { maximumFractionDigits: 0 });
    return t.price.toFixed(2);
  }

  return (
    <div className="bg-white border-b border-gray-100 overflow-x-auto">
      <div className="flex items-center gap-0 min-w-max px-4 h-9">
        {tickers.map((t, i) => {
          const up = t.changePct >= 0;
          return (
            <div key={t.symbol} className={`flex items-center gap-2.5 px-4 h-full text-xs ${i > 0 ? "border-l border-gray-100" : ""}`}>
              <span className="text-gray-400 font-medium">{t.label}</span>
              <span className="font-semibold text-[#191c1e]">{fmt(t)}</span>
              <span className={`font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>
                {up ? "▲" : "▼"} {Math.abs(t.changePct).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Market Data Panel (Market Brief tab) ────────────────────────────────────

const MARKET_GROUPS = [
  { title: "Equities", keys: ["S&P 500", "QQQ", "Russell 2K", "VIX"] },
  { title: "Fixed Income", keys: ["10Y Yield", "3M Yield", "DXY"] },
  { title: "Commodities", keys: ["WTI", "Gold"] },
];

function MarketDataPanel() {
  const [tickers, setTickers] = useState<MarketTicker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market-prices")
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setTickers(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function fmt(t: MarketTicker): string {
    if (t.isYield) return `${t.price.toFixed(2)}%`;
    if (t.price >= 1000) return t.price.toLocaleString("en-US", { maximumFractionDigits: 2 });
    return t.price.toFixed(2);
  }

  if (loading) return (
    <div className="border border-gray-200 bg-white rounded-xl px-5 py-6 flex items-center gap-2 text-xs text-gray-400">
      <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin" />
      Loading market data…
    </div>
  );

  if (!tickers.length) return null;

  return (
    <div className="border border-gray-200 bg-white rounded-xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100">
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Markets</span>
        <span className="ml-auto text-[11px] text-gray-400">Delayed ~15 min</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
        {MARKET_GROUPS.map(group => {
          const groupTickers = tickers.filter(t => group.keys.includes(t.label));
          return (
            <div key={group.title} className="px-5 py-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{group.title}</p>
              <div className="space-y-3">
                {groupTickers.map(t => {
                  const up = t.changePct >= 0;
                  return (
                    <div key={t.symbol} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">{t.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#191c1e]">{fmt(t)}</span>
                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                          {up ? "▲" : "▼"} {Math.abs(t.changePct).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

function NavTab({ active, onClick, label, badge }: { active: boolean; onClick: () => void; label: string; badge?: string }) {
  const badgeStyle = badge === "AI"
    ? "bg-violet-100 text-violet-600"
    : badge === "Blog"
    ? "bg-amber-100 text-amber-600"
    : badge === "Events"
    ? "bg-rose-100 text-rose-600"
    : "bg-[#c3ecd7] text-[#416656]";

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-all whitespace-nowrap ${
        active
          ? "text-[#396477]"
          : "text-[#41484c] hover:text-[#191c1e]"
      }`}
    >
      {label}
      {badge && (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${badgeStyle}`}>
          {badge}
        </span>
      )}
      {active && (
        <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[#396477]" />
      )}
    </button>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmt(amount?: number): string {
  if (!amount) return "";
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  return `$${(amount / 1_000).toFixed(0)}K`;
}

function SignalChip({ label, color }: { label: string; color: string }) {
  const cls: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-700 border-blue-100",
    green:  "bg-emerald-50 text-emerald-700 border-emerald-100",
    purple: "bg-violet-50 text-violet-700 border-violet-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    gray:   "bg-gray-50 text-gray-600 border-gray-100",
    red:    "bg-red-50 text-red-700 border-red-100",
    amber:  "bg-amber-50 text-amber-700 border-amber-100",
  };
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${cls[color] ?? cls.gray}`}>{label}</span>;
}

function ErrorBox({ message }: { message: string }) {
  return <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{message}</div>;
}

function EmptyState({ icon, title, hint, onReset }: { icon: string; title: string; hint: string; onReset?: () => void }) {
  return (
    <div className="text-center py-14 text-gray-400">
      <div className="text-3xl mb-3">{icon}</div>
      <p className="font-semibold text-gray-700 text-sm">{title}</p>
      <p className="text-xs mt-1.5 text-gray-400 max-w-xs mx-auto">{hint}</p>
      {onReset && (
        <button
          onClick={onReset}
          className="mt-4 px-4 py-2 text-xs font-medium bg-[#396477] text-white rounded-lg hover:bg-[#2d5162] transition-colors"
        >
          Reset filters
        </button>
      )}
      <p className="text-[11px] text-gray-300 mt-3">EDGAR data refreshes daily</p>
    </div>
  );
}


// ─── Daily Intel Bar ──────────────────────────────────────────────────────────

function DailyIntelBar({ daily, loading, onFundClick, onJobsClick }: {
  daily: DailyIntel | null;
  loading: boolean;
  onFundClick: (id: string) => void;
  onJobsClick: () => void;
}) {
  if (loading) {
    return (
      <div className="bg-white border-b border-[#c1c7cc]/30">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-3 animate-pulse">
          <div className="h-4 w-40 bg-[#e0e3e5] rounded" />
          <div className="h-4 w-32 bg-[#e0e3e5] rounded" />
          <div className="h-4 w-24 bg-[#e0e3e5] rounded" />
        </div>
      </div>
    );
  }
  if (!daily) return null;

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="bg-white border-b border-[#c1c7cc]/30">
      <div className="max-w-6xl mx-auto px-5 py-3 space-y-2.5">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[#71787c] text-xs font-medium">{today}</span>
          <div className="flex items-center gap-2">
            {daily.todayCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#c3ecd7] text-[#416656] border border-[#a8cfbc] rounded-full px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 bg-[#416656] rounded-full animate-pulse" />
                {daily.todayCount} new filing{daily.todayCount !== 1 ? "s" : ""} today
              </span>
            ) : (
              <span className="text-xs text-[#71787c]">No new filings today</span>
            )}
            {daily.weekCount > 0 && (
              <span className="text-xs text-[#71787c]">{daily.weekCount} this week</span>
            )}
          </div>
        </div>

        {/* Top fund signals */}
        {daily.topFunds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[#71787c] font-medium shrink-0">Recent filings:</span>
            {daily.topFunds.slice(0, 4).map((f) => {
              const bucketColor = f.offeringStatus === "open"
                ? "bg-[#c3ecd7]/60 text-[#416656] border border-[#a8cfbc]/50 hover:bg-[#c3ecd7]"
                : "bg-sky-50 text-[#396477] border border-sky-100 hover:bg-sky-100";
              return (
                <Link key={f.id} href={`/fund/${f.cik}`}
                  className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-1 transition-colors cursor-pointer ${bucketColor}`}>
                  <span className="max-w-[140px] truncate">{f.entityName}</span>
                  {f.offeringStatus === "open" && <span className="text-[9px] opacity-60">raising</span>}
                  {f.totalOfferingAmount && <span className="text-[9px] opacity-60">{fmt(f.totalOfferingAmount)}</span>}
                </Link>
              );
            })}
          </div>
        )}

        {/* Top job signals */}
        {daily.topJobs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[#71787c] font-medium shrink-0">Posted roles:</span>
            {daily.topJobs.slice(0, 4).map((j) => (
              <button key={j.id} onClick={onJobsClick}
                className="inline-flex items-center gap-1 text-[11px] text-[#41484c] border border-[#c1c7cc] bg-white hover:bg-[#f2f4f6] rounded-full px-2.5 py-1 transition-colors cursor-pointer">
                <span className="font-medium">{j.firm}</span>
                <span className="text-[#c1c7cc]">·</span>
                <span className="text-[#41484c] max-w-[120px] truncate">{j.role}</span>
              </button>
            ))}
            <button onClick={onJobsClick} className="text-[11px] text-[#396477] hover:text-[#2d5162] font-medium transition-colors">
              View all →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-gray-100">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="grid grid-cols-[1fr_140px_160px_72px] gap-3 px-4 py-3 animate-pulse">
          <div className="space-y-1.5"><div className="h-3.5 bg-gray-100 rounded w-2/3" /><div className="h-3 bg-gray-50 rounded w-1/2" /></div>
          <div className="h-5 bg-gray-100 rounded-full w-20" />
          <div className="h-3 bg-gray-100 rounded w-12" />
          <div className="h-3 bg-gray-100 rounded w-10" />
        </div>
      ))}
    </div>
  );
}

// ─── Top Opportunities ────────────────────────────────────────────────────────

function TopFundOpportunities({ filings, onClick }: { filings: FundFiling[]; onClick: (id: string) => void }) {
  // Show the 5 most recent filings
  const top = filings.slice(0, 5);
  if (top.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Most Recent Signals</h2>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">sorted by date</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
        {top.map((f, i) => (
          <TopFundCard key={f.id} filing={f} rank={i + 1} onClick={() => onClick(f.id)} />
        ))}
      </div>
    </div>
  );
}

function TopFundCard({ filing, rank, onClick }: { filing: FundFiling; rank: number; onClick: () => void }) {
  const statusColor = filing.offeringStatus === "open"
    ? "bg-[#c3ecd7] text-[#416656]"
    : filing.offeringStatus === "closed"
    ? "bg-[#e1ddf2]/70 text-[#5e5c6e]"
    : "bg-gray-100 text-gray-500";
  const statusLabel = filing.offeringStatus === "open" ? "In market"
    : filing.offeringStatus === "closed" ? "Closed"
    : "Filed";
  return (
    <button onClick={onClick} className="card-lift text-left bg-white border border-gray-200 rounded-xl p-3.5 hover:border-sky-200 transition-all group">
      <div className="flex items-start justify-between gap-1 mb-2.5">
        <span className="text-xs font-bold text-gray-300 w-4 tabular-nums">{rank}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusColor}`}>{statusLabel}</span>
      </div>
      <div className="font-semibold text-gray-900 text-xs leading-tight mb-1.5 group-hover:text-[#396477] transition-colors line-clamp-2">
        {filing.entityName}
      </div>
      {filing.score.whyNow[0] && (
        <p className="text-[11px] text-gray-500 mb-2.5 leading-relaxed line-clamp-2">
          <span className="text-[#396477]">→ </span>{filing.score.whyNow[0]}
        </p>
      )}
      <div className="text-[10px] text-gray-400 mt-auto">
        {filing.totalOfferingAmount ? fmt(filing.totalOfferingAmount) : filing.strategyLabel} · {filing.daysSinceFiling}d ago
      </div>
    </button>
  );
}


// ─── Funds section ────────────────────────────────────────────────────────────

function SignalJobsBridge({ filings, jobSignals, onViewJobs }: {
  filings: FundFiling[];
  jobSignals: JobSignal[];
  onViewJobs: () => void;
}) {
  // Find filings that have at least one matching job
  const pairs = filings
    .map((f) => ({ filing: f, jobs: getJobsForFiling(f, jobSignals) }))
    .filter(({ jobs }) => jobs.length > 0)
    .slice(0, 6);

  // Known firms in this filing set that have NO jobs
  const noJobFirms = filings
    .filter((f) => {
      const match = matchFirm(f.entityName);
      if (!match) return false;
      return getJobsForFiling(f, jobSignals).length === 0;
    })
    .map((f) => matchFirm(f.entityName)?.name ?? f.entityName)
    .filter((v, i, arr) => arr.indexOf(v) === i) // dedupe
    .slice(0, 4);

  if (pairs.length === 0 && noJobFirms.length === 0) return null;

  const totalRoles = pairs.reduce((sum, { jobs }) => sum + jobs.length, 0);

  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-[#396477]">
            Signals → Jobs
          </p>
          <p className="text-xs text-[#71787c] mt-0.5">
            Use signals to decide where to focus. These firms have both an active signal and open roles.
          </p>
        </div>
        {pairs.length > 0 && (
          <button
            onClick={onViewJobs}
            className="flex-shrink-0 text-xs font-semibold text-[#396477] border border-[#396477]/30 px-3 py-1.5 rounded-lg hover:bg-[#396477] hover:text-white transition-colors"
          >
            View {totalRoles} role{totalRoles !== 1 ? "s" : ""} →
          </button>
        )}
      </div>

      {pairs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {pairs.map(({ filing, jobs }) => (
            <button
              key={filing.id}
              onClick={onViewJobs}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-sky-200 rounded-lg text-xs font-medium text-[#396477] hover:border-[#396477]/50 hover:shadow-sm transition-all"
            >
              <span className="max-w-[140px] truncate">{matchFirm(filing.entityName)?.name ?? filing.entityName}</span>
              <span className="bg-[#396477]/10 text-[#396477] text-[10px] font-bold px-1 py-0.5 rounded">
                {jobs.length} role{jobs.length !== 1 ? "s" : ""}
              </span>
            </button>
          ))}
        </div>
      )}

      {noJobFirms.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-sky-100">
          <span className="text-[11px] text-[#71787c]">No roles posted yet:</span>
          {noJobFirms.map((name) => (
            <span key={name} className="text-[11px] text-[#71787c] bg-white border border-[#c1c7cc]/40 px-2 py-0.5 rounded-full">
              {name}
            </span>
          ))}
          <span className="text-[11px] text-[#71787c]">— consider reaching out directly.</span>
        </div>
      )}
    </div>
  );
}

// ─── Pulse Section (Market Brief + Fund Signals) ─────────────────────────────

function PulseSection({
  pulseSubTab, setPulseSubTab,
  fundFilters, setFundFilters, fundFilings, fundTotal, fundLoading, fundError,
  records, updateRecord, outreachRecords, fundSubTab, setFundSubTab, onExport,
  jobSignals, onViewJobs,
}: {
  pulseSubTab: "market" | "funds";
  setPulseSubTab: (t: "market" | "funds") => void;
  fundFilters: SearchFilters; setFundFilters: (f: SearchFilters) => void;
  fundFilings: FundFiling[]; fundTotal: number; fundLoading: boolean; fundError: string | null;
  records: Record<string, OutreachRecord>; updateRecord: (r: OutreachRecord) => void;
  outreachRecords: OutreachRecord[];
  fundSubTab: "search" | "pipeline"; setFundSubTab: (t: "search" | "pipeline") => void;
  onExport: () => void; jobSignals: JobSignal[]; onViewJobs: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-xl w-fit">
        <button
          onClick={() => setPulseSubTab("market")}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
            pulseSubTab === "market"
              ? "bg-amber-50 text-amber-700 shadow-sm"
              : "text-[#41484c] hover:text-[#191c1e] hover:bg-gray-50"
          }`}
        >
          📊 Market Brief
        </button>
        <button
          onClick={() => setPulseSubTab("funds")}
          className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${
            pulseSubTab === "funds"
              ? "bg-sky-50 text-[#396477] shadow-sm"
              : "text-[#41484c] hover:text-[#191c1e] hover:bg-gray-50"
          }`}
        >
          🔍 Fund Signals
        </button>
      </div>

      {pulseSubTab === "market" && <MarketSection />}

      {pulseSubTab === "funds" && (
        <>
          <FundsSection
            filters={fundFilters} setFilters={setFundFilters}
            filings={fundFilings} total={fundTotal}
            loading={fundLoading} error={fundError}
            records={records} updateRecord={updateRecord}
            outreachRecords={outreachRecords}
            subTab={fundSubTab} setSubTab={setFundSubTab}
            onExport={onExport}
            jobSignals={jobSignals}
            onViewJobs={onViewJobs}
          />
          <div className="bg-sky-50 border border-sky-100 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-[#396477]">
              Spotted a target firm? <span className="font-medium">Prepare for the interview before they post the role.</span>
            </p>
            <a href="#guide" className="flex-shrink-0 px-4 py-2 bg-[#396477] text-white text-xs font-semibold rounded-lg hover:bg-[#2d5162] transition-colors text-center">
              View the Guide →
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function FundsSection({
  filters, setFilters, filings, total, loading, error,
  records, updateRecord, outreachRecords, subTab, setSubTab, onExport,
  jobSignals, onViewJobs,
}: {
  filters: SearchFilters; setFilters: (f: SearchFilters) => void;
  filings: FundFiling[]; total: number; loading: boolean; error: string | null;
  records: Record<string, OutreachRecord>; updateRecord: (r: OutreachRecord) => void;
  outreachRecords: OutreachRecord[];
  subTab: "search" | "pipeline"; setSubTab: (t: "search" | "pipeline") => void;
  onExport: () => void;
  jobSignals: JobSignal[];
  onViewJobs: () => void;
}) {
  const [highlightId, setHighlightId] = useState<string | null>(null);

  return (
    <>
      {subTab === "search" && filings.length > 0 && !loading && (
        <TopFundOpportunities filings={filings} onClick={(id) => {
          setHighlightId(id);
          setTimeout(() => document.getElementById(`fund-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
        }} />
      )}

      {subTab === "search" && !loading && jobSignals.length > 0 && (
        <SignalJobsBridge filings={filings} jobSignals={jobSignals} onViewJobs={onViewJobs} />
      )}

      <div className="space-y-1 mb-1">
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          Search SEC Form D filings from private funds. Capital raises are leading indicators of hiring — firms that close a new vehicle typically build headcount within one to three quarters. Use Hiring Watch to see whether any are currently posting roles.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-200 rounded-lg p-0.5">
          <button onClick={() => setSubTab("search")} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${subTab === "search" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Search</button>
          <button onClick={() => setSubTab("pipeline")} className={`relative px-3 py-1 rounded-md text-xs font-medium transition-all ${subTab === "pipeline" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Pipeline
            {outreachRecords.length > 0 && <span className="absolute -top-1 -right-1 bg-[#396477] text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">{outreachRecords.length}</span>}
          </button>
        </div>
        <p className="text-xs text-gray-400">Capital &amp; hiring signals · SEC Form D</p>
      </div>

      {subTab === "search" ? (
        <>
          <SearchBar value={filters.query} onChange={(q) => setFilters({ ...filters, query: q })} loading={loading} />
          <FundFilterBar filters={filters} onChange={setFilters} total={total} loading={loading} onExport={onExport} />
          {error && <ErrorBox message={error} />}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_140px_160px_72px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              {["Fund / Firm", "Strategy", "Fundraising", "Filed"].map((h) => (
                <div key={h} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</div>
              ))}
            </div>
            {loading && filings.length === 0 && <SkeletonRows />}
            {!loading && filings.length === 0 && !error && (
              <EmptyState
                icon="📋"
                title="No funds matched your current filters."
                hint="Try expanding the date range to 6 months or removing the strategy filter."
                onReset={() => setFilters({ query: "", strategy: "all", dateRange: "180", bucket: "all" as const, minAmount: "" })}
              />
            )}
            {filings.map((f) => (
              <div key={f.id} id={`fund-row-${f.id}`}>
                <FundRow filing={f} outreach={records[f.id]} onOutreachChange={updateRecord} autoExpand={highlightId === f.id} openRolesCount={getJobsForFiling(f, jobSignals).length} />
              </div>
            ))}
          </div>
          {filings.length > 0 && <p className="text-center text-xs text-gray-400 py-1">Source: <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D" target="_blank" rel="noopener noreferrer" className="underline">SEC EDGAR Form D</a> · Capital raises are leading indicators of buyside hiring</p>}
        </>
      ) : (
        <OutreachPipeline records={outreachRecords} onBack={() => setSubTab("search")} />
      )}
    </>
  );
}


// ─── Market Hiring section ────────────────────────────────────────────────────

const JOB_CATEGORIES: Array<{ v: "all" | JobCategory; l: string }> = [
  { v: "all",                l: "All"                },
  { v: "Private Credit",     l: "Private Credit"     },
  { v: "Public Credit",      l: "Public Credit"      },
  { v: "Equity Research",    l: "Equity Research"    },
  { v: "Other Finance Roles",   l: "Other Finance Roles"   },
  { v: "Investment Banking", l: "Investment Banking" },
  { v: "Quant",              l: "Quant"              },
];

const JOB_SIGNAL_TAGS: Array<{ v: "all" | JobSignalTag; l: string }> = [
  { v: "all", l: "All signals" },
  { v: "In-market raise", l: "In-market raise" },
  { v: "Post-raise build-out", l: "Post-raise" },
  { v: "Fund scaling", l: "Fund scaling" },
  { v: "New fund", l: "New fund" },
];

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  adzuna:     { label: "Adzuna",            color: "bg-sky-50 text-[#396477] border-sky-100"             },
  muse:       { label: "The Muse",          color: "bg-[#e1ddf2]/70 text-[#5e5c6e] border-[#c7c4d8]/50"  },
  edgar:      { label: "EDGAR",             color: "bg-gray-50 text-gray-600 border-gray-200"             },
  greenhouse: { label: "Greenhouse",        color: "bg-[#c3ecd7]/50 text-[#416656] border-[#a8cfbc]/50"  },
  lever:      { label: "Lever",             color: "bg-teal-50 text-teal-700 border-teal-200"              },
  jobs14:     { label: "LinkedIn/Indeed",   color: "bg-sky-50 text-[#396477] border-sky-100"              },
  linkedin:   { label: "LinkedIn",          color: "bg-[#396477] text-white border-[#2d5162]"             },
};

function FundSignalBadge({ filing, onViewSignals }: { filing: FundFiling; onViewSignals: () => void }) {
  const isOpen = filing.offeringStatus === "open";
  const amt = filing.totalOfferingAmount ? fmt(filing.totalOfferingAmount) : null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onViewSignals(); }}
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-sky-50 text-[#396477] border-sky-200 hover:bg-sky-100 transition-colors"
      title="This firm has an active fund signal — click to view"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? "bg-[#396477] animate-pulse" : "bg-sky-400"}`} />
      Fund Signal{amt ? ` · ${amt}` : ""}
    </button>
  );
}

function JobsSection({
  filters, setFilters, signals, total, loading, error, sources,
  fundFilings, onViewSignals,
}: {
  filters: JobFilters; setFilters: (f: JobFilters) => void;
  signals: JobSignal[]; total: number; loading: boolean; error: string | null;
  sources: string[];
  fundFilings: FundFiling[];
  onViewSignals: () => void;
}) {
  const liveSourceCount = sources.filter((s) => s !== "edgar").length;
  const edgarOnly = !loading && sources.length > 0 && liveSourceCount === 0;

  // Split signals into "at signal firms" and "other"
  const signalPairs = signals.map((s) => ({
    signal: s,
    filing: getFilingForJob(s, fundFilings),
  }));
  const atSignalFirms = signalPairs.filter(({ filing }) => !!filing);
  const otherSignals  = signalPairs.filter(({ filing }) => !filing);

  return (
    <>
      {/* Context bridge banner */}
      {!loading && atSignalFirms.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-sky-50 border border-sky-100 rounded-xl px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-[#396477]">
              {atSignalFirms.length} role{atSignalFirms.length !== 1 ? "s" : ""} at firms with active fund signals
            </p>
            <p className="text-xs text-[#71787c] mt-0.5">
              These firms are raising or recently closed. Signal firms are shown first.
            </p>
          </div>
          <button
            onClick={onViewSignals}
            className="flex-shrink-0 text-xs font-medium text-[#396477] underline hover:no-underline transition-all whitespace-nowrap"
          >
            View signals ↗
          </button>
        </div>
      )}

      <div className="space-y-1 mb-1">
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          Curated roles across private credit, restructuring, and leveraged finance — filtered for relevance. Roles at firms with active fund signals are shown first.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {JOB_CATEGORIES.map((c) => (
          <button key={c.v} onClick={() => setFilters({ ...filters, category: c.v === filters.category && c.v !== "all" ? "all" : c.v })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              filters.category === c.v ? "bg-[#396477] text-white border-[#396477]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}>
            {c.l}
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 hidden sm:block" />
        <select value={filters.dateRange} onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as JobFilters["dateRange"] })}
          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#396477]">
          <option value="30">Last 30 days</option>
          <option value="45">Last 45 days</option>
          <option value="60">Last 60 days</option>
        </select>
        <span className="ml-auto text-xs text-gray-400">{loading ? "Loading…" : `${total} signal${total !== 1 ? "s" : ""}`}</span>
      </div>

      {error && <ErrorBox message={error} />}

      {/* Source badges */}
      {!loading && sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">Sources:</span>
          {sources.map((src) => {
            const meta = SOURCE_LABELS[src] || { label: src, color: "bg-gray-50 text-gray-600 border-gray-200" };
            return (
              <span key={src} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${meta.color}`}>
                {meta.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Setup prompt (EDGAR-only mode) */}
      {edgarOnly && (
        <div className="bg-sky-50 border border-sky-100 rounded-lg px-4 py-3 text-xs text-[#396477]">
          <p className="font-semibold mb-1">Add real job board data</p>
          <p className="mb-2">Currently showing inferred roles from SEC EDGAR signals only. To include live listings from Adzuna and The Muse, add API keys to <code className="bg-sky-100 px-1 py-0.5 rounded font-mono">.env.local</code>:</p>
          <pre className="bg-sky-100 rounded px-3 py-2 font-mono text-[11px] leading-relaxed overflow-x-auto">{`ADZUNA_APP_ID=your_id       # developer.adzuna.com (free)\nADZUNA_APP_KEY=your_key`}</pre>
        </div>
      )}

      {/* Inferred-only notice */}
      {!edgarOnly && sources.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5 text-xs text-amber-800 flex items-start gap-2">
          <span className="mt-0.5">ℹ</span>
          <span>EDGAR-inferred roles are included alongside live listings. They signal likely hiring based on recent capital raises — not scraped from job boards.</span>
        </div>
      )}

      {/* Role cards */}
      {loading && signals.length === 0 && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl px-5 py-4 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 bg-gray-100 rounded w-32" />
                <div className="h-5 bg-gray-100 rounded-full w-20" />
              </div>
              <div className="h-5 bg-gray-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-gray-50 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}
      {!loading && signals.length === 0 && !error && (
        <div className="text-center py-14 text-gray-400">
          <div className="text-3xl mb-3">📊</div>
          <p className="font-semibold text-gray-700 text-sm">No hiring signals found</p>
          <p className="text-xs mt-1.5 text-gray-400 max-w-xs mx-auto">Try expanding the date range or switching category.</p>
        </div>
      )}

      {/* Signal firms first */}
      {atSignalFirms.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] font-semibold text-[#396477] uppercase tracking-wide">At Signal Firms</span>
            <span className="text-[10px] bg-sky-100 text-[#396477] px-1.5 py-0.5 rounded font-bold">{atSignalFirms.length}</span>
            <div className="flex-1 h-px bg-sky-100" />
          </div>
          <div className="space-y-3">
            {atSignalFirms.map(({ signal, filing }) => (
              <div key={signal.id} className="relative">
                {filing && (
                  <div className="absolute top-3 right-14 z-10">
                    <FundSignalBadge filing={filing} onViewSignals={onViewSignals} />
                  </div>
                )}
                <RoleCard signal={signal} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Other roles */}
      {otherSignals.length > 0 && (
        <>
          {atSignalFirms.length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <span className="text-[11px] font-semibold text-[#71787c] uppercase tracking-wide">Other Roles</span>
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">{otherSignals.length}</span>
              <div className="flex-1 h-px bg-gray-100" />
              <button onClick={onViewSignals} className="text-[11px] text-[#71787c] hover:text-[#396477] transition-colors">
                Check signals for these firms →
              </button>
            </div>
          )}
          <div className="space-y-3">
            {otherSignals.map(({ signal }) => <RoleCard key={signal.id} signal={signal} />)}
          </div>
        </>
      )}

      {signals.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-1">
          Capital signals from <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D" target="_blank" rel="noopener noreferrer" className="underline">SEC EDGAR Form D</a> · Live listings from Greenhouse, Lever, Adzuna, The Muse
        </p>
      )}
    </>
  );
}

// ─── Outreach pipeline ────────────────────────────────────────────────────────

function OutreachPipeline({ records, onBack }: { records: OutreachRecord[]; onBack: () => void }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 bg-white border border-gray-200 rounded-xl">
        <div className="text-3xl mb-3">📬</div>
        <p className="font-medium text-gray-600">No outreach tracked yet</p>
        <p className="text-sm mt-1">Open a fund row and set its status to start tracking</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-[#396477] text-white rounded-lg text-sm font-medium hover:bg-[#2d5162]">Search Funds</button>
      </div>
    );
  }
  const groups = {
    in_discussion: records.filter((r) => r.status === "in_discussion"),
    reached_out:   records.filter((r) => r.status === "reached_out"),
    passed:        records.filter((r) => r.status === "passed"),
  };
  return (
    <div className="space-y-5">
      {(["in_discussion", "reached_out", "passed"] as const).map((status) => {
        const group = groups[status];
        if (!group.length) return null;
        const titles = { in_discussion: "In Discussion", reached_out: "Reached Out", passed: "Passed" };
        const colors = { in_discussion: "text-[#416656] bg-[#c3ecd7]/40 border-[#a8cfbc]/50", reached_out: "text-[#396477] bg-sky-50 border-sky-100", passed: "text-gray-600 bg-gray-50 border-gray-200" };
        return (
          <div key={status}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{titles[status]} <span className="font-normal">({group.length})</span></h2>
            <div className="space-y-1.5">
              {group.map((r) => (
                <div key={r.filingId} className={`border rounded-lg px-4 py-2.5 ${colors[status]}`}>
                  <div className="flex items-center justify-between">
                    <div><span className="font-medium text-sm">{r.entityName}</span>{r.strategy && <span className="text-xs opacity-60 ml-2">{r.strategy}</span>}</div>
                    {r.contactedAt && <span className="text-xs opacity-50">{new Date(r.contactedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                  </div>
                  {r.notes && <p className="text-xs italic mt-1 opacity-70">{r.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Insights ─────────────────────────────────────────────────────────────────

interface InsightPost {
  slug: string;
  title: string;
  date: string;
  tag: string;
  paragraphs: string[];
  richContent?: React.ReactNode;
}

const CAREER_POSTS: InsightPost[] = [
  {
    slug: "buyside-interview-questions",
    title: "What Buyside Interviews Are Really Asking (Even When the Questions Sound Different)",
    date: "March 30, 2026",
    tag: "Interview Prep",
    paragraphs: [
      `Spend enough time interviewing for buyside roles—whether in private credit, public credit, or special situations—and you start to notice a pattern. The surface-level questions vary slightly depending on the firm, the strategy, or the seniority of the seat. But underneath, the same handful of ideas come up again and again. The interview is less about what you know and more about how you think, how you prioritize, and how consistently you apply your framework under pressure.`,
      `Take the classic "walk me through your resume." On paper, it sounds like a warm-up question. In reality, it's one of the most important signals in the entire process. No one is looking for a chronological recap of your roles. What they're really assessing is whether your career path makes sense—whether each move reflects a deliberate decision rather than randomness. They're listening for a narrative that compounds: how you built skills, how your perspective evolved, and why this specific role is a natural next step. If your story feels inevitable in hindsight, you're in a strong position. If it feels stitched together, they'll notice.`,
      `The same applies to investment discussions. When someone asks you to walk through an idea you liked or didn't like, they're not testing whether you can find an interesting company. They're testing how you think about risk. Strong candidates instinctively start with downside—what can break, where the capital structure sits, how recovery looks in a stress case. They simplify complexity and focus on what actually drives outcomes. Weaker answers tend to drift into description: industry trends, surface-level growth narratives, or management quality without tying it back to valuation and risk-adjusted return. The difference is subtle, but it's decisive.`,
      `One of the most revealing moments often comes from a deceptively simple follow-up: "What could go wrong?" This is where intellectual honesty shows up. It's easy to present a clean investment case; it's much harder to articulate the real risks without defaulting to generic answers. Interviewers are listening for specificity and for evidence that you've actually pressure-tested your own thinking. In credit especially, this extends beyond business risk into structure—covenants, priming risk, liquidity pathways. If your risks sound interchangeable across any deal, it suggests you're not underwriting deeply enough.`,
      `Macro questions, like "where are we in the cycle," are less about being right and more about being coherent. There is no universally correct answer, and most interviewers aren't looking for one. What matters is whether you can connect your view of the environment to actual investment behavior. If spreads are tight, what does that change in how you size positions or evaluate risk? If liquidity tightens, how does that affect where you look for opportunity? Simply acknowledging uncertainty isn't enough; they want to see how your view translates into action.`,
      `Fit questions—"why this strategy" or "why this firm"—tend to be where otherwise strong candidates lose momentum. Generic answers stand out immediately. The bar here isn't memorizing facts about the firm; it's demonstrating that you understand what makes the strategy distinct and why that aligns with how you think about investing. This is also where self-awareness matters. Good answers reflect an understanding of what you're actually good at and why that maps onto the role. It's less about selling yourself broadly and more about showing a precise match.`,
      `Then there's the question almost everyone prepares for: "tell me about a time you were wrong." The intention is straightforward, but the execution often isn't. Many answers are either too polished or subtly defensive, framing the mistake as something external or unavoidable. The more compelling responses are the ones that are specific and uncomfortable in the right way. They show a clear misjudgment, a thoughtful diagnosis of what went wrong, and—most importantly—a change in process that came out of it. The underlying question isn't whether you've made mistakes; it's whether your mistakes have actually improved your underwriting.`,
      `Another question that tends to separate candidates is how they approach new ideas. When asked how you diligence an opportunity, interviewers aren't looking for a checklist. They're trying to understand how you allocate attention. What do you look at first? What causes you to walk away quickly? Where do you decide to spend incremental time because it might generate real insight? Investing, especially in buyside environments, is as much about filtering as it is about analysis. The ability to kill ideas early and go deep selectively is a core skill, and interviews are one of the few places where that process can be observed directly.`,
      `Finally, one of the highest-signal questions is often the simplest: "what are you working on right now?" This is where genuine curiosity—or the lack of it—becomes obvious. Candidates who are actively thinking about markets tend to have at least one idea they can discuss in depth, even if it's not fully formed. They can explain what's interesting, what's uncertain, and what they're trying to figure out next. Others rely entirely on prepared answers, and it shows. The difference isn't about having perfect ideas; it's about being engaged enough to generate them in the first place.`,
      `Stepping back, what ties all of these questions together is consistency. Buyside interviews are rarely about catching you out with something obscure. They're about observing whether you apply the same disciplined thinking across different contexts. Do you prioritize downside in every situation? Do you distinguish signal from noise? Can you communicate your reasoning clearly, even when the answer isn't obvious?`,
      `At a certain point, strong candidates stop feeling like they're responding to questions and start feeling like they're already doing the job. That shift—from answering to thinking out loud—is often what makes the difference.`,
    ],
  },
  {
    slug: "credit-hiring-capital-driven",
    title: "Why Credit Hiring Is Driven by Capital, Not Recruiting Cycles",
    date: "March 26, 2026",
    tag: "Career Prep",
    paragraphs: [
      `Unlike many corporate roles, hiring in credit funds is rarely driven by a fixed recruiting cycle. Instead, it is closely tied to capital availability and deployment needs.`,
      `When a fund raises a new vehicle, the immediate priority becomes putting capital to work. This often leads to incremental hiring within a relatively short window, particularly at the junior level where additional analytical capacity is required. Similarly, periods of increased market dislocation or strategy expansion can drive hiring as teams adjust to new opportunity sets.`,
      `Conversely, in periods where capital deployment slows or portfolios stabilize, hiring activity may be limited regardless of broader recruiting cycles. This dynamic means that many opportunities are filled opportunistically rather than through formal processes.`,
      `For candidates, this has an important implication: reacting to posted roles is often too late. A more effective approach is to understand which funds are likely to be active based on capital raises, market conditions, and strategy shifts, and to engage ahead of visible hiring processes.`,
    ],
  },
  {
    slug: "credit-avoiding-losses",
    title: "Credit Investing Is Primarily About Avoiding Losses, Not Finding Upside",
    date: "March 26, 2026",
    tag: "Career Prep",
    paragraphs: [
      `A common misconception among candidates transitioning from equity to credit is that the objective is to identify mispriced upside. In reality, credit investing is more fundamentally about avoiding permanent capital impairment.`,
      `This distinction drives a different analytical approach. Rather than focusing on how much a business can grow, credit investors prioritize how a business performs under stress and whether it can sustain its obligations across a range of downside scenarios. The emphasis is on durability of cash flow, asset coverage, and structural protections within the capital stack.`,
      `As a result, the key questions shift from "how good is this business" to "how bad can this get, and what protects us if it does." This includes evaluating liquidity runways, covenant flexibility, refinancing risk, and the potential behavior of other stakeholders in a distressed situation.`,
      `Understanding this mindset is critical not only for investing, but also for interviews. Candidates who frame their analysis around downside and recovery tend to align more closely with how credit decisions are actually made.`,
    ],
  },
  {
    slug: "what-credit-interviews-test",
    title: "What Credit Interviews Actually Test (and What They Don't)",
    date: "March 26, 2026",
    tag: "Career Prep",
    paragraphs: [
      `Many candidates approach credit interviews by focusing on memorizing technical concepts such as leverage ratios, FCCR, or yield calculations. While these are necessary, they are rarely what differentiates candidates in practice.`,
      `What interviewers are typically evaluating is whether a candidate can think through a situation as an investor. This includes the ability to identify key risks, understand how cash flow behaves under stress, and assess downside protection rather than simply describing a business at a high level.`,
      `Stronger candidates tend to frame their answers around questions such as: where does the capital structure break, what drives liquidity in a downside scenario, and how management decisions or documentation can impact recovery outcomes. In contrast, weaker candidates often stop at surface-level metrics without connecting them to real-world implications.`,
      `In this sense, credit interviews are less about recalling formulas and more about demonstrating judgment. The goal is not to show that you know the definitions, but that you can apply them in a way that reflects how investors actually underwrite risk.`,
    ],
  },
];

// ─── AI Ecosystem Post ───────────────────────────────────────────────────────

const AI_STACK_LAYERS = [
  { label: "Physical (EV / Robotics / Autonomy)",  color: "#4f46e5", gross: "10–20%",   note: "Largest TAM, lowest near-term margins",     companies: ["Tesla", "Waymo", "Figure AI", "Boston Dynamics", "Mobileye", "Rivian"] },
  { label: "Applications",                          color: "#0891b2", gross: "25–35%+",  note: "High margins; dependent on upstream costs",  companies: ["Salesforce", "Adobe", "ServiceNow", "Workday", "Cursor", "Perplexity"] },
  { label: "Middleware / Data Platforms",           color: "#059669", gross: "20–30%",   note: "Bridging layer; growing criticality",         companies: ["Palantir", "Databricks", "Snowflake", "Scale AI", "Weights & Biases"] },
  { label: "Foundation Models",                     color: "#d97706", gross: "Uncertain", note: "Innovation leader; risk of commoditisation",  companies: ["OpenAI", "Anthropic", "Meta (Llama)", "Google DeepMind", "Mistral"] },
  { label: "Cloud Infrastructure",                  color: "#dc2626", gross: "25–35%",   note: "Best durability; controls distribution",      companies: ["Microsoft Azure", "AWS", "Google Cloud", "Oracle Cloud"] },
  { label: "Networking & Optics",                   color: "#7c3aed", gross: "30–45%",   note: "Data-movement bottleneck; volume-driven",     companies: ["Broadcom", "Marvell", "Coherent Corp.", "Lumentum", "Ciena"] },
  { label: "Semiconductors / Compute",              color: "#ea580c", gross: "60–70%",   note: "Highest margin today; cyclical risk ahead",   companies: ["NVIDIA", "AMD", "Intel", "SK Hynix", "Micron", "Google TPU", "AWS Trainium"] },
];

const AI_MARGIN_BARS = [
  { label: "Semiconductors",     lo: 60, hi: 70, color: "#ea580c" },
  { label: "Networking & Optics",lo: 30, hi: 45, color: "#7c3aed" },
  { label: "Cloud",              lo: 25, hi: 35, color: "#dc2626" },
  { label: "Applications",       lo: 25, hi: 35, color: "#0891b2" },
  { label: "Middleware / Data",  lo: 20, hi: 30, color: "#059669" },
  { label: "Physical Systems",   lo: 10, hi: 20, color: "#4f46e5" },
  { label: "Foundation Models",  lo: 0,  hi: 15, color: "#d97706" },
];

const AI_POST_CONTENT = (
  <div className="space-y-5 text-[#41484c] text-sm leading-[1.75]">
    <p>Artificial intelligence is often reduced to a handful of names — large language models, chat interfaces, and a few hyperscalers. But AI is not a single layer. It is a full-stack ecosystem spanning semiconductors, infrastructure, data, software, and increasingly, the physical world. Understanding where value accrues requires looking across this entire chain. The most important opportunities are often not at the most visible layer.</p>

    {/* Stack diagram */}
    <div className="my-8 border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Figure 1 — The AI Value Chain Stack</p>
        <p className="text-[11px] text-gray-400 mt-0.5">Bottom = foundation layer · Top = end-user layer</p>
      </div>
      <div className="p-5 space-y-2">
        {AI_STACK_LAYERS.map((layer, i) => (
          <div key={i} className="flex items-stretch gap-3">
            <div className="w-2 rounded-full flex-shrink-0" style={{ backgroundColor: layer.color }} />
            <div className="flex-1 rounded-lg px-4 py-3 flex flex-col gap-2" style={{ backgroundColor: layer.color + "10" }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span className="text-xs font-bold" style={{ color: layer.color }}>{layer.label}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] text-gray-400">{layer.note}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border" style={{ color: layer.color, borderColor: layer.color + "40" }}>
                    {layer.gross} gross
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {layer.companies.map((co) => (
                  <span key={co} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">{co}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-6">The Foundation: Compute and the Hardware Layer</h3>
    <p>At the base of the ecosystem lies compute. Training and running modern AI models requires massive parallel processing, making GPUs the central building block. Companies like NVIDIA dominate through both hardware and a tightly integrated software ecosystem, while AMD and custom silicon efforts from Google and Amazon continue to scale.</p>
    <p>But compute does not operate in isolation. It sits within a broader hardware layer that includes memory, networking, and increasingly, optics. High-bandwidth memory from SK Hynix and Micron Technology is essential to model performance, while networking players like Broadcom and Marvell Technology enable GPUs to communicate across large clusters. As AI workloads scale, the bottleneck is shifting from compute itself to data movement — which is where optical interconnects become critical. Companies like Coherent Corp. and Lumentum Holdings provide optical components that allow data to move efficiently within and between data centers. In many respects, optics is becoming the circulatory system of AI infrastructure: less visible than GPUs, but equally essential for scaling.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-6">Cloud Infrastructure: The Aggregation Layer</h3>
    <p>Above hardware sits the cloud layer. Hyperscalers — Microsoft, Amazon, and Google — aggregate compute, storage, and networking into usable platforms, effectively acting as the operating system of modern AI development. Developers access AI resources without owning physical infrastructure. The economics here are powerful: capital intensive upfront, but highly scalable once deployed. Cloud providers sit at a central junction, capturing value from both upstream demand for compute and downstream demand for AI services. This is arguably the most structurally durable position in the stack — not because margins are the highest, but because control over distribution compounds over time.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-6">Models, Data, and Middleware</h3>
    <p>On top of infrastructure sits the model layer, where companies like OpenAI, Anthropic, and Meta Platforms develop large-scale foundation models. Yet competitive dynamics here are evolving quickly. Open-source alternatives and rapid iteration are compressing differentiation. Model quality still matters, but it is increasingly tied to data access and distribution rather than raw capability alone.</p>
    <p>If models are the engine, data is the constraint. Proprietary, well-structured data is becoming one of the most defensible assets in AI. Companies like Palantir Technologies are positioned around this thesis — focused not on frontier models but on integrating data, governance, and decision-making workflows within complex enterprise environments. Between models and applications, a growing middleware layer — including platforms like Databricks and Snowflake — is becoming critical. Value here accrues to companies that simplify complexity rather than add to it.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-6">Applications and the Physical World</h3>
    <p>At the top of the digital stack sits the application layer — copilots, automation tools, vertical-specific solutions. Companies like Salesforce and Adobe are embedding AI into existing workflows, while newer entrants build AI-native products. Historically this is where software margins have been highest, but in AI those margins are increasingly linked to upstream infrastructure costs.</p>
    <p>Finally, AI is extending into the physical world. Autonomous systems, robotics, and electric vehicles represent a layer where AI interacts directly with real environments. Companies like Tesla are integrating AI into self-driving platforms, while industrial players embed AI into manufacturing and logistics. This layer introduces new constraints — latency, safety, hardware integration — that do not exist in digital environments. Margins here are lower, but the total addressable market is arguably larger than any other layer.</p>

    {/* Margin comparison chart */}
    <div className="my-8 border border-gray-200 rounded-xl overflow-hidden bg-white">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Figure 2 — Gross Margin Range by Layer</p>
        <p className="text-[11px] text-gray-400 mt-0.5">Approximate ranges; foundation models excluded due to uncertain economics</p>
      </div>
      <div className="p-5 space-y-3">
        {AI_MARGIN_BARS.map((bar, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-36 flex-shrink-0 text-right">{bar.label}</span>
            <div className="flex-1 relative h-6 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="absolute top-0 h-full rounded-full"
                style={{
                  left: `${bar.lo}%`,
                  width: `${bar.hi - bar.lo}%`,
                  backgroundColor: bar.color,
                  opacity: 0.85,
                }}
              />
            </div>
            <span className="text-xs font-semibold w-16 flex-shrink-0" style={{ color: bar.color }}>
              {bar.lo === 0 ? "TBD" : `${bar.lo}–${bar.hi}%`}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-3 pt-1">
          <span className="w-36 flex-shrink-0" />
          <div className="flex-1 flex justify-between text-[10px] text-gray-400 px-1">
            <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>
          <span className="w-16 flex-shrink-0" />
        </div>
      </div>
    </div>

    <h3 className="font-bold text-[#191c1e] text-base mt-6">Where Value Actually Accrues</h3>
    <p>Semiconductors are capturing the highest gross margins today — 60–70% for leading AI chips, driven by scarcity, performance differentiation, and software lock-in. This advantage is real, but partly cyclical. Over time, competition from AMD and in-house silicon from hyperscalers will compress margins as supply catches up to demand.</p>
    <p>Networking and optics players benefit from the same scaling dynamic at more moderate margins, but with volume-driven demand across the entire ecosystem rather than dependence on any single application. The cloud layer commands moderate margins (25–35%) but compensates through durability and compounding. Cloud providers monetize both sides of the AI value chain and benefit from switching costs that grow over time. Application companies can still achieve strong margins (25–35%+), but they are increasingly dependent on upstream cost structures — a structural shift relative to previous software cycles.</p>
    <p>The physical layer — EV, robotics, autonomy — operates at the lowest margins (10–20%), but represents the largest long-term opportunity. As AI moves from digital environments into physical systems, the scope of impact expands significantly. Over a multi-decade horizon, this may become the largest single pool of economic value, even if it is not the most profitable on a percentage basis today.</p>

    <h3 className="font-bold text-[#191c1e] text-base mt-6">The Key Insight for Investors</h3>
    <p>In the near term, compute and infrastructure matter most because they are the binding constraint. That is why the market has rewarded semiconductor and infrastructure players so heavily in this cycle. Over the long term, value tends to migrate toward control points — layers that own distribution, data, or customer relationships. Today, that increasingly points to cloud and, selectively, to application companies with strong embedded workflows and proprietary data.</p>
    <p>The most important takeaway is that AI is not a winner-take-all market at a single layer. It is a multi-layer profit pool where leadership — and value capture — shifts over time. Understanding where we are in that cycle is what ultimately drives returns. AI is not just a product. It is a system-level shift. And like most system-level shifts, the winners are rarely confined to the top layer everyone is watching.</p>
  </div>
);

const AI_COMMODITY_POST_CONTENT = (
  <div className="space-y-6 text-[#41484c] text-sm leading-[1.75]">

    <p>The last great commodity supercycle was a China story. The next one may be an AI story. The buildout of artificial intelligence infrastructure — data centres, power grids, cooling systems, and the hardware stacks that run them — is creating a demand shock across several commodity markets that is only beginning to be understood. At the same time, AI is reshaping the supply side of commodity markets in ways that will compound over the next decade.</p>
    <p>This is not a speculative thesis. It is already visible in power demand forecasts, copper order books, and water utility filings. The question for analysts is not whether AI will move commodity markets — it is which commodities, by how much, and over what timeframe.</p>

    {/* Pull quote */}
    <div className="my-6 border-l-4 border-[#396477] pl-5 py-1 bg-[#f7fbfd] rounded-r-xl">
      <p className="text-base italic text-[#191c1e] font-medium leading-snug">"Training a single frontier AI model can consume more electricity than 100 US homes use in a year. Multiply that by thousands of models, millions of inference calls per day, and the demand curve becomes something commodity markets have not seen before."</p>
    </div>

    {/* Section 1 */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">The Demand Side</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    {[
      {
        num: "01", cat: "Energy",
        title: "Power: The Most Direct and Immediate Impact",
        paras: [
          "Data centres currently account for roughly 1–2% of global electricity consumption. By 2030, depending on the pace of AI deployment, estimates from the IEA and Goldman Sachs suggest that figure could reach 3–4% — with AI inference workloads as the primary driver. Unlike traditional enterprise computing, which runs on predictable schedules, AI inference is always-on: every ChatGPT query, every API call, every real-time recommendation system draws power continuously.",
          "The implication for natural gas is significant. Renewable capacity is being added rapidly, but it cannot be dispatched on demand. When a hyperscaler needs 500MW of guaranteed baseload power for a new data centre campus, gas turbines are the answer — not solar panels. This is already showing up in US power market data: several grid operators have reversed previous forecasts of flat electricity demand and now project sustained growth through the end of the decade.",
          "Nuclear power is experiencing a related renaissance. Microsoft signed a deal to restart Three Mile Island. Google has contracted for small modular reactor capacity. Amazon has acquired a data centre campus directly adjacent to a nuclear plant. Uranium, after a decade of bear market following Fukushima, has entered a structural bull cycle driven in part by AI's insatiable appetite for clean, firm, baseload power.",
        ],
      },
      {
        num: "02", cat: "Metals",
        title: "Copper, Aluminium, and the Infrastructure Multiplier",
        paras: [
          "A hyperscale data centre is an extraordinarily copper-intensive structure. Power distribution systems, server racks, cooling infrastructure, fibre runs, and the transmission lines that connect the facility to the grid all require copper. Estimates suggest a large data centre campus (100–500MW) requires 20–40 tonnes of copper per megawatt of capacity — comparable to the copper intensity of offshore wind. With hundreds of new data centre campuses announced globally through 2027, the incremental copper demand from AI infrastructure alone could represent several hundred thousand tonnes per year.",
          "Aluminium follows a similar logic. Liquid cooling systems — increasingly preferred over air cooling for high-density AI chips — use aluminium heat exchangers and manifolds. Transmission infrastructure upgrades, required to connect new data centre campuses to the grid, are heavily aluminium-intensive in overhead lines. And the chassis of every server rack, every network switch, every UPS system is aluminium.",
          "The timing creates a problem: copper mine supply is structurally constrained. No major new mine has come online in the past decade without significant delays and cost overruns. Chilean grades are declining. The pipeline of projects that could add meaningful supply before 2030 is thin. AI-driven demand is arriving into a market that was already structurally tight due to the energy transition — the two demand shocks are compounding.",
        ],
      },
      {
        num: "03", cat: "Critical Minerals",
        title: "Silicon, Rare Earths, and the Chip Supply Chain",
        paras: [
          "AI accelerators — Nvidia GPUs, Google TPUs, custom ASICs — require a specific set of critical minerals at scale. High-purity silicon for wafers. Cobalt and tantalum for capacitors. Indium for displays and transistors. Gallium and germanium for compound semiconductors. These are not commodities in the traditional sense — they do not trade on exchanges with transparent price discovery — but their supply dynamics are increasingly central to AI development timelines.",
          "China controls refining capacity for many of these materials at levels that dwarf its share of raw ore production. It refines roughly 80% of the world's gallium, 60% of germanium, and dominates rare earth processing globally. When China imposed export controls on gallium and germanium in 2023 — framed as a response to US chip export restrictions — it demonstrated that the critical mineral supply chain is a geopolitical pressure point, not just a manufacturing input.",
          "For commodity analysts, the actionable insight is that AI chip demand creates a new class of concentrated supply risk. Unlike copper or oil, where disruptions are priced into liquid futures markets, disruptions in gallium or high-purity quartz (used in chip furnaces) are invisible until they manifest as production delays — at which point the impact is transmitted indirectly through tech earnings and capex cuts.",
        ],
      },
      {
        num: "04", cat: "Water",
        title: "The Hidden Commodity: Water Consumption at Scale",
        paras: [
          "Data centres are thirsty. Evaporative cooling towers — the dominant cooling method for large facilities — consume between 1 and 5 litres of water per kilowatt-hour of electricity consumed. A 100MW data centre running continuously can consume 1–5 billion litres of water per year. Microsoft's data centres consumed 1.7 billion litres of water in 2021; by 2022 that figure had grown to 6.4 billion litres, driven largely by AI workloads from ChatGPT training and inference.",
          "This is creating direct conflicts with agricultural and municipal water users in regions where data centres are concentrated — Northern Virginia, Phoenix, central Iowa, the Netherlands. Water utilities in several of these areas have begun reporting increased industrial demand from hyperscalers as a material factor in their capacity planning. In drought-prone regions, regulators are starting to impose water use restrictions on new data centre permitting.",
          "Water is not a commodity that trades globally, but it is a constraint that increasingly affects where AI infrastructure can be built, how quickly it can be permitted, and what its operating costs will be. For investors in agricultural commodities, the competition for water between AI data centres and irrigation in arid farming regions is an underappreciated long-term risk.",
        ],
      },
    ].map(s => (
      <div key={s.num} className="border-t border-gray-100 pt-6">
        <div className="flex items-baseline gap-4 mb-3">
          <span className="font-bold text-3xl text-gray-100 leading-none select-none">{s.num}</span>
          <div>
            <div className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">{s.cat}</div>
            <h3 className="font-bold text-[#191c1e] text-base leading-snug mt-0.5">{s.title}</h3>
          </div>
        </div>
        <div className="space-y-3">
          {s.paras.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    ))}

    {/* Supply side */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">The Supply Side</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    <h3 className="font-bold text-[#191c1e] text-base">How AI Changes Commodity Production</h3>
    <p>The demand story gets most of the attention, but AI is also reshaping the supply side of commodity markets in ways that will matter over a longer horizon.</p>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
      {[
        { icon: "⛏️", title: "Mining optimisation", desc: "AI-driven drilling and blast pattern optimisation is improving ore recovery rates at existing mines. Rio Tinto's autonomous haulage system has reduced fuel consumption and improved productivity at its Pilbara iron ore operations. This extends mine life and reduces the marginal cost of production — capping long-run prices." },
        { icon: "🌾", title: "Precision agriculture", desc: "AI-powered crop monitoring, yield prediction, and variable-rate fertiliser application are improving agricultural productivity at the field level. Platforms like Climate Corporation (Bayer) and John Deere's See & Spray are beginning to show measurable yield improvements — adding supply at the margin for grains and oilseeds." },
        { icon: "🛢️", title: "Seismic interpretation", desc: "AI models trained on seismic data are dramatically accelerating exploration timelines in oil and gas. Processes that took geophysicists months now take days. This is already changing how E&P companies allocate exploration capex — potentially bringing more reserves to market faster." },
        { icon: "⚡", title: "Grid management", desc: "AI-based demand forecasting and grid balancing is improving the utilisation of renewable capacity, reducing the need for gas peaker plants as backup. Long-run, this structurally pressures gas demand for power generation — even as AI data centres increase overall electricity demand." },
      ].map(c => (
        <div key={c.title} className="border border-gray-200 rounded-xl p-4 bg-white">
          <div className="text-xl mb-2">{c.icon}</div>
          <div className="text-xs font-bold text-[#191c1e] mb-1.5">{c.title}</div>
          <p className="text-[12px] text-gray-500 leading-relaxed">{c.desc}</p>
        </div>
      ))}
    </div>

    {/* Matrix */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">Impact Summary</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Commodity</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">AI Demand Driver</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">AI Supply Effect</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Net Bias</th>
          </tr>
        </thead>
        <tbody>
          {[
            { name: "Electricity / Gas", demand: "Data centre baseload power, always-on inference workloads", supply: "Better grid efficiency, more renewables dispatch", bias: "Bullish", color: "text-red-600" },
            { name: "Copper", demand: "Data centre wiring, grid upgrades, cooling systems", supply: "AI optimises mine yields slightly", bias: "Strongly Bullish", color: "text-red-600" },
            { name: "Uranium", demand: "Nuclear preferred for firm clean baseload by hyperscalers", supply: "Limited new mine supply pipeline", bias: "Strongly Bullish", color: "text-red-600" },
            { name: "Aluminium", demand: "Liquid cooling, server chassis, transmission lines", supply: "Marginal efficiency gains in smelting", bias: "Bullish", color: "text-red-600" },
            { name: "Water", demand: "Evaporative cooling at hyperscale facilities", supply: "AI improves irrigation efficiency in agriculture", bias: "Regional — Bullish in arid zones", color: "text-amber-600" },
            { name: "Natural Gas", demand: "Peaker demand for data centre baseload", supply: "AI accelerates exploration; grid AI reduces peak demand", bias: "Mixed / Neutral", color: "text-gray-500" },
            { name: "Wheat / Corn", demand: "No direct link", supply: "AI precision ag improves yields over time", bias: "Mildly Bearish long-run", color: "text-emerald-600" },
            { name: "Gallium / Germanium", demand: "Compound semiconductors for AI chips", supply: "China-controlled; geopolitically constrained", bias: "Strongly Bullish", color: "text-red-600" },
          ].map((row, i) => (
            <tr key={row.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
              <td className="px-4 py-3 font-bold text-[#191c1e] align-top border-b border-gray-100">{row.name}</td>
              <td className="px-4 py-3 text-gray-500 align-top border-b border-gray-100 leading-relaxed">{row.demand}</td>
              <td className="px-4 py-3 text-gray-500 align-top border-b border-gray-100 leading-relaxed">{row.supply}</td>
              <td className={`px-4 py-3 font-semibold align-top border-b border-gray-100 ${row.color}`}>{row.bias}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {/* Conclusion */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">What This Means for Analysts</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    <p>The AI-commodity nexus is not a simple "AI is bullish for everything" story. It is a set of differentiated impacts that require commodity-by-commodity analysis. The clearest near-term trades are in power infrastructure (copper, uranium, natural gas for baseload) and critical minerals with concentrated supply chains (gallium, germanium, high-purity quartz). The supply-side improvements from AI — better mine optimisation, precision agriculture, faster seismic interpretation — are real but slower to materialise, with payoffs measured in years rather than quarters.</p>
    <p>For buyside analysts, the practical implication is twofold. First, any thesis on copper or uranium now requires a view on AI capex cycles — not just Chinese construction or EV adoption. Second, the geopolitical dimension of critical minerals has become a first-order risk factor in AI chip production, which feeds back into the capex of the hyperscalers, which feeds back into the power and metals demand forecasts. The commodity and technology sectors, historically analysed in separate silos, are now structurally linked.</p>

    <p className="text-[11px] text-gray-400 italic mt-2">For educational and informational purposes only. Not investment advice.</p>
  </div>
);

const COMMODITY_POST_CONTENT = (
  <div className="space-y-6 text-[#41484c] text-sm leading-[1.75]">
    {/* Intro */}
    <p>Commodities are the bedrock of the global economy. Oil powers transportation and petrochemicals; copper wires every building, vehicle, and data centre; wheat feeds billions; gold anchors monetary systems. Yet for all their importance, the price of a barrel of crude or a tonne of copper can swing 30%, 50%, even 100% within a single year — rewarding or ruining nations, corporations, and portfolios alike.</p>
    <p>Understanding what drives those swings requires thinking across multiple timescales simultaneously. A drought is measured in months. A new mine takes a decade to build. An energy transition redraws demand curves over decades. The analyst who can hold all of these timeframes in mind — and weigh them against each other — has a genuine edge.</p>
    <p>This piece sets out a systematic framework for commodity price analysis, covering the five major commodity classes — energy, metals, agricultural goods, precious metals, and soft commodities — and the structural drivers that cut across all of them: the US dollar, interest rates, geopolitical shocks, speculative positioning, and the long-cycle dynamics of capital expenditure.</p>

    {/* Pull quote */}
    <div className="my-6 border-l-4 border-[#396477] pl-5 py-1 bg-[#f7fbfd] rounded-r-xl">
      <p className="text-base italic text-[#191c1e] font-medium leading-snug">"Commodities are the original macro asset. Every price is simultaneously a signal about growth, geopolitics, technology, and climate — all at once."</p>
    </div>

    {/* Section: Five Classes */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">The Five Major Classes</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {[
        { icon: "🛢️", label: "Energy", sub: "Oil, Gas & Coal", desc: "The most geopolitically sensitive class. Crude oil alone accounts for roughly 3% of world GDP in annual trade value. OPEC+ supply decisions can move Brent by $10/bbl overnight." },
        { icon: "🔩", label: "Industrial Metals", sub: "Copper, Iron Ore, Aluminium", desc: "The classic economic growth proxies. Copper's correlation with Chinese PMI data is so reliable it earned the nickname \"Dr Copper.\" Mine supply pipelines stretch 10–15 years." },
        { icon: "🌾", label: "Agricultural", sub: "Wheat, Corn, Soybeans", desc: "Seasonally driven but profoundly affected by weather events, biofuel policy, and trade flows. The Russia-Ukraine conflict demonstrated how concentrated grain supply can be." },
        { icon: "🥇", label: "Precious Metals", sub: "Gold, Silver, Platinum", desc: "Gold functions as a monetary asset, inflation hedge, and fear gauge simultaneously. Its price is as much a reflection of real interest rates and central bank buying as of physical supply." },
        { icon: "☕", label: "Softs", sub: "Coffee, Sugar, Cotton", desc: "Highly weather-dependent. El Niño / La Niña cycles are the dominant structural driver, alongside chronic underinvestment in tropical agriculture in major producing nations." },
        { icon: "⚡", label: "Critical Minerals", sub: "Lithium, Cobalt, Nickel", desc: "The newest major class. Demand is driven by EV battery manufacturing and energy storage, but supply is geographically concentrated in a handful of politically complex jurisdictions." },
      ].map(c => (
        <div key={c.label} className="border border-gray-200 rounded-xl p-4 bg-white">
          <div className="text-xl mb-2">{c.icon}</div>
          <div className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider mb-1">{c.label}</div>
          <div className="text-xs font-bold text-[#191c1e] mb-1.5">{c.sub}</div>
          <p className="text-[12px] text-gray-500 leading-relaxed">{c.desc}</p>
        </div>
      ))}
    </div>

    {/* Section: Drivers */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">The Price Drivers in Depth</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    {[
      {
        num: "01", cat: "Supply Side",
        title: "Why Supply is Chronically Inelastic — and What That Means for Price Cycles",
        paras: [
          "The fundamental asymmetry in commodity markets is that demand can adjust relatively quickly — factories slow down, consumers switch fuels, countries alter diets — while supply responds with a lag measured in years, sometimes decades. Opening a new copper mine from discovery to first production takes 10–15 years and billions of dollars of capital. Planting new palm oil plantations and reaching maturity takes seven years. Developing a new deepwater oil field takes five to eight years.",
          "This creates the classic commodity cycle. High prices incentivise investment. Investment takes years to bear fruit. By the time new supply arrives, the market has already rebalanced — and the new supply creates a glut that depresses prices for years. Then underinvestment follows. And the cycle repeats. The 2004–2011 commodity supercycle and the subsequent 2012–2020 bear market are textbook examples of this mechanism playing out across energy and metals simultaneously.",
          "Supply is also subject to acute disruptions: pipeline explosions, mine strikes, droughts, hurricanes, sanctions, and export bans. These create price spikes whose duration is often inversely proportional to their severity — severe disruptions draw emergency production and demand destruction faster than mild ones. The analyst's job is to distinguish a temporary supply shock from a structural supply deficit.",
        ],
      },
      {
        num: "02", cat: "Demand Side",
        title: "China, the Energy Transition, and the Structural Demand Reshaping",
        paras: [
          "For two decades, China was the dominant demand variable in virtually every commodity market. Its urbanisation and industrialisation — the largest in human history — drove demand for steel, copper, cement, energy, and agricultural imports to levels that overwhelmed global supply pipelines. The commodity supercycle of the 2000s was, in large part, a China story.",
          "That story is now maturing. China's construction sector — the single largest consumer of steel and copper globally — is in structural contraction as the property bubble deflates. Chinese steel output may already be past its historical peak. The demand torch is partially passing to India, Southeast Asia, and sub-Saharan Africa, but none of these economies has the sheer scale to replicate China's impact in the near term.",
          "Simultaneously, the energy transition is creating a split within commodity markets. Fossil fuel demand faces long-run secular pressure as electrification accelerates. But the metals required to build that electrified world — copper for wiring, lithium for batteries, nickel for cathodes, rare earths for magnets — face a structural demand surge. A single electric vehicle contains roughly four times as much copper as an equivalent combustion engine vehicle. A utility-scale wind farm requires seven times the mineral inputs per unit of electricity as a gas-fired power plant. The transition is not a commodity demand destroyer; it is a commodity demand redirector.",
        ],
      },
      {
        num: "03", cat: "Macro Drivers",
        title: "The Dollar, Interest Rates, and Inflation: The Monetary Dimension",
        paras: [
          "Most commodities are priced in US dollars. This creates a direct mechanical link between the dollar's value and commodity prices: a stronger dollar makes commodities more expensive for non-dollar buyers, dampening demand and pressuring prices; a weaker dollar has the opposite effect. The DXY index and commodity indices show a strong negative correlation over medium-term horizons, with notable exceptions when commodity-specific supply shocks override the currency dynamic.",
          "Interest rates matter through two channels. First, they affect the opportunity cost of holding physical inventories — high rates make it expensive to finance commodity stockpiles, discouraging inventory building. Second, and more importantly, rates affect global growth expectations, which are the primary driver of industrial commodity demand. Rate hike cycles, by cooling credit-driven growth, historically coincide with commodity bear markets.",
          "Inflation creates a more nuanced dynamic. Commodity prices are simultaneously a cause of inflation (via energy and food costs) and a consequence of it (via money printing and negative real rates that push capital into hard assets). Gold is the clearest expression of this feedback loop: its price rises most strongly not when inflation is high per se, but when real interest rates — nominal rates minus inflation — are deeply negative.",
        ],
      },
      {
        num: "04", cat: "Geopolitics",
        title: "Resource Nationalism, Sanctions, and the Weaponisation of Commodities",
        paras: [
          "Geography concentrates commodity production in ways that create structural geopolitical risk. The Middle East holds two-thirds of proven oil reserves. The Democratic Republic of Congo produces roughly 70% of the world's cobalt. Chile and Peru account for nearly 40% of global copper mine output. Russia and Ukraine together were responsible for 29% of global wheat exports before 2022.",
          "Resource nationalism — governments seeking to capture a greater share of commodity rents through royalties, export taxes, and nationalisation — has been a recurring feature of high-price environments. Indonesia's 2022 nickel export ban, designed to force battery manufacturers to process ore domestically, sent nickel prices to record highs.",
          "The most dramatic recent example is Russia's invasion of Ukraine in 2022, which simultaneously disrupted global energy markets, grain markets, fertiliser markets, and metal markets. It demonstrated how a single geopolitical event can create cascading commodity shocks across multiple markets simultaneously — and why analysts must assess not just commodity fundamentals but the geopolitical fragility of supply chains.",
        ],
      },
      {
        num: "05", cat: "Inventories & Positioning",
        title: "Stocks-to-Use Ratios, Futures Curves, and Speculative Positioning",
        paras: [
          "In physical commodity markets, price is ultimately determined by the balance between supply and demand as reflected in inventory levels. The stocks-to-use ratio — the number of weeks of consumption held in storage — is the single most useful short-to-medium term price indicator in agricultural markets. When wheat stocks-to-use falls below eight weeks globally, prices become extremely sensitive to any supply disruption.",
          "Futures markets allow these expectations to be expressed in forward prices. The shape of the futures curve — whether it is in backwardation (spot price above futures) or contango (futures above spot) — encodes the market's view on near-term scarcity. A deeply backwardated crude oil curve signals physical tightness. A contango structure signals oversupply and incentivises physical storage.",
          "Speculative positioning — tracked via the CFTC's Commitment of Traders report — adds a short-term mean-reverting dynamic. When managed money is crowded long, small negative news can trigger violent liquidation. When speculators are max short, any positive catalyst sparks a short-covering rally. Extreme positioning can amplify price moves by 20–40% beyond what fundamentals alone would justify.",
        ],
      },
      {
        num: "06", cat: "Climate & Weather",
        title: "El Niño, Droughts, and the Increasingly Material Role of Climate Risk",
        paras: [
          "Weather has always been the dominant short-term driver of agricultural commodity prices — but climate change is making it increasingly relevant for energy and metals as well. Droughts reduce hydroelectric generation, forcing gas and coal substitution. European drought in 2022 reduced river levels so severely that coal barges in the Rhine couldn't reach German power plants.",
          "The El Niño-Southern Oscillation (ENSO) is the most reliably tradeable climate pattern. El Niño events — which occur every three to seven years — bring drought to Australia, Southeast Asia, and parts of South America while delivering excess moisture to the US corn belt. Traders who correctly identify an El Niño developing in May can position months ahead of market consensus.",
          "Looking forward, physical climate risk is increasingly embedded in long-duration commodity valuations. Water scarcity threatens copper processing in Chile's Atacama Desert. Permafrost thaw risks disrupting Arctic oil infrastructure. These risks are not yet fully priced by most market participants — creating both analytical hazard and opportunity.",
        ],
      },
    ].map(s => (
      <div key={s.num} className="border-t border-gray-100 pt-6">
        <div className="flex items-baseline gap-4 mb-3">
          <span className="font-bold text-3xl text-gray-100 leading-none select-none">{s.num}</span>
          <div>
            <div className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">{s.cat}</div>
            <h3 className="font-bold text-[#191c1e] text-base leading-snug mt-0.5">{s.title}</h3>
          </div>
        </div>
        <div className="space-y-3">
          {s.paras.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    ))}

    {/* Driver Table */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">Key Drivers by Commodity</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px] w-32">Commodity</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Key Supply Drivers</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Key Demand Drivers</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Risk Tags</th>
          </tr>
        </thead>
        <tbody>
          {[
            { name: "Crude Oil", supply: "OPEC+ quotas, US shale rig count, geopolitical outages, capex cycles", demand: "Global GDP, Chinese industrial activity, air travel, petrochemical feedstock", tags: [["geo","Geopolitical"],["macro","Dollar"],["demand","China Cycle"]] },
            { name: "Natural Gas", supply: "LNG export capacity, pipeline infrastructure, US production volumes", demand: "Weather (heating/cooling), coal-to-gas switching, industrial demand, LNG imports", tags: [["supply","Storage Levels"],["geo","Russia/Ukraine"]] },
            { name: "Copper", supply: "Mine grades (declining), labour strikes (Chile/Peru), concentrate availability", demand: "Chinese construction, energy transition (EVs, grids), global industrial production", tags: [["demand","EV Upside"],["geo","Resource Nationalism"],["supply","Long Lead Times"]] },
            { name: "Iron Ore", supply: "Australian/Brazilian output (Vale, Rio, BHP), weather, port logistics", demand: "Chinese steel production, real estate construction, infrastructure policy", tags: [["demand","China Property"],["supply","Seaborne Supply"]] },
            { name: "Gold", supply: "Mine production (stable), recycling supply, central bank sales", demand: "Real interest rates, USD direction, central bank buying, jewellery, ETF flows", tags: [["macro","Real Rates"],["macro","Dollar"],["geo","Risk-Off"]] },
            { name: "Lithium", supply: "Brine/hard rock expansion, conversion capacity, Chinese processing", demand: "EV battery production, grid storage, cell chemistry shifts (LFP vs NMC)", tags: [["demand","EV Adoption"],["supply","China Dominance"]] },
            { name: "Wheat", supply: "Black Sea production, US/EU/Australian harvests, acreage decisions", demand: "Population growth, food aid, biofuel mandates, animal feed", tags: [["supply","Drought"],["geo","Export Bans"]] },
            { name: "Soybeans", supply: "US/Brazil/Argentina harvest, La Niña (key for South American crops)", demand: "Chinese crush demand (meal for pigs, oil for food), biodiesel mandates", tags: [["supply","La Niña"],["demand","China Protein"],["geo","US-China Trade"]] },
            { name: "Coffee", supply: "Brazil biennial crop cycle, Colombian rain, El Niño in Vietnam (Robusta)", demand: "Global consumption growth, premiumisation, on-trade recovery", tags: [["supply","Brazil Frost"],["supply","El Niño"]] },
            { name: "Nickel", supply: "Indonesian laterite production, stainless steel scrap, Philippines ore", demand: "Stainless steel (60%), EV battery cathodes (growing), alloy use", tags: [["geo","Indonesia Policy"],["demand","Battery Chemistry"]] },
          ].map((row, i) => {
            const tagColors: Record<string,string> = { supply: "bg-green-50 text-green-700", demand: "bg-amber-50 text-amber-700", macro: "bg-blue-50 text-blue-700", geo: "bg-red-50 text-red-700" };
            return (
              <tr key={row.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                <td className="px-4 py-3 font-bold text-[#191c1e] align-top border-b border-gray-100">{row.name}</td>
                <td className="px-4 py-3 text-gray-500 align-top border-b border-gray-100 leading-relaxed">{row.supply}</td>
                <td className="px-4 py-3 text-gray-500 align-top border-b border-gray-100 leading-relaxed">{row.demand}</td>
                <td className="px-4 py-3 align-top border-b border-gray-100">
                  <div className="flex flex-wrap gap-1">
                    {(row.tags as [string,string][]).map(([type, label]) => (
                      <span key={label} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${tagColors[type]}`}>{label}</span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    {/* Conclusion */}
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest whitespace-nowrap">The Analyst's Checklist</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>

    <p>Good commodity analysis requires answering a set of structured questions for each market under review. First, where are we in the supply cycle? Is capacity being built out or mothballed? What does the futures curve backwardation or contango tell us about near-term physical tightness? Second, what is the demand trajectory on a 12-month, 3-year, and 10-year view — and what structural forces (policy, technology, demographics) are likely to inflect it?</p>
    <p>Third, what is the macro environment doing to the commodity's key financial drivers — the dollar, real rates, credit conditions? Fourth, what geopolitical risks sit in the supply chain, and are they currently priced in or ignored? And fifth, what is speculative positioning telling you? Crowded longs with weak fundamentals are a warning; maximum shorts in a tightening physical market are an opportunity.</p>

    {/* Watch list sidebar */}
    <div className="border border-gray-200 rounded-xl overflow-hidden mt-4">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Watch List: Key Indicators</p>
      </div>
      <ul className="divide-y divide-gray-50">
        {[
          "CFTC Commitment of Traders — weekly positioning data",
          "LME & COMEX warehouse stock levels",
          "Chinese Caixin PMI Manufacturing",
          "API & EIA weekly crude inventory reports",
          "ENSO forecasts (CPC / IRI) for climate-driven commodities",
          "US Dollar Index (DXY)",
          "US 10-year TIPS yield (real interest rates)",
          "Baltic Dry Index (shipping demand signal)",
          "USDA WASDE report — monthly grains & oilseeds",
          "IEA & OPEC monthly oil market reports",
        ].map(item => (
          <li key={item} className="flex items-start gap-3 px-4 py-2.5 text-xs text-gray-600">
            <span className="text-orange-500 font-bold mt-0.5">→</span>
            {item}
          </li>
        ))}
      </ul>
    </div>

    <p className="text-[11px] text-gray-400 italic mt-4">For educational and informational purposes only. Not investment advice. Commodity markets involve significant risk of loss.</p>
  </div>
);

const INDUSTRY_POSTS: InsightPost[] = [
  {
    slug: "ai-commodity-price-impact",
    title: "How AI Development Is Reshaping Commodity Markets",
    date: "April 8, 2026",
    tag: "Commodities",
    paragraphs: [],
    richContent: AI_COMMODITY_POST_CONTENT,
  },
  {
    slug: "commodity-price-drivers",
    title: "The Raw World: What Actually Moves Commodity Prices",
    date: "April 7, 2026",
    tag: "Commodities",
    paragraphs: [],
    richContent: COMMODITY_POST_CONTENT,
  },
  {
    slug: "ai-ecosystem-value-chain",
    title: "The AI Ecosystem: Mapping the Full Value Chain",
    date: "April 6, 2026",
    tag: "Tech / AI",
    paragraphs: [],
    richContent: AI_POST_CONTENT,
  },
  {
    slug: "fixed-income-101",
    title: "Fixed Income 101: How Credit Markets Actually Work",
    date: "April 6, 2026",
    tag: "Credit",
    paragraphs: [],
    richContent: (
      <div className="space-y-5 text-[#41484c] text-sm leading-[1.75]">
        <p>If equities are driven by growth and narrative, fixed income is driven by math, discipline, and risk. It is often perceived as the "safer" part of markets, but in reality, credit markets are where macro expectations, downside risk, and capital structure all intersect in the most direct way. To understand fixed income is to understand how the market prices time, risk, and uncertainty.</p>

        <p>At the most basic level, a bond is simple: you lend money, receive periodic payments, and get your principal back at maturity. But how that bond trades — and what it implies about the world — is far more complex. The first distinction most investors encounter is between current yield and yield to maturity. Current yield measures the income you receive today relative to the bond's price. Yield to maturity is the market's full return expectation — it incorporates the coupon, any gain or loss from buying above or below face value, and the time value of money. This is why credit investors anchor on yield to maturity: it reflects total economic return, assuming the issuer survives.</p>

        <h3 className="font-bold text-[#191c1e] text-base mt-6">The Yield Curve: The Market's Expectations in One Line</h3>
        <p>Beyond individual bonds, the yield curve provides a broader lens. By plotting interest rates across maturities, it becomes a real-time signal of how investors view growth and inflation. In a normal environment the curve slopes upward — longer-term rates exceed short-term ones, reflecting the uncertainty of time and expectations of growth. When the curve inverts, short-term rates exceed long-term ones, historically one of the most reliable signals of an approaching slowdown.</p>

        {/* Figure 1: Yield Curve SVG */}
        <div className="my-8 border border-gray-200 rounded-xl overflow-hidden bg-white">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Figure 1 — Yield Curve Shapes</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Illustrative; normal vs inverted curve across maturities</p>
          </div>
          <div className="p-5">
            <svg viewBox="0 0 480 200" className="w-full" style={{ fontFamily: "inherit" }}>
              {/* Grid lines */}
              {[0,1,2,3,4,5,6].map(y => (
                <line key={y} x1="48" y1={170 - y * 24} x2="460" y2={170 - y * 24} stroke="#f3f4f6" strokeWidth="1" />
              ))}
              {/* Y axis labels */}
              {[0,1,2,3,4,5,6].map(y => (
                <text key={y} x="42" y={174 - y * 24} textAnchor="end" fontSize="9" fill="#9ca3af">{y}%</text>
              ))}
              {/* X axis labels */}
              {["3M","1Y","2Y","5Y","10Y","30Y"].map((label, i) => (
                <text key={label} x={48 + i * 82} y="188" textAnchor="middle" fontSize="9" fill="#6b7280">{label}</text>
              ))}
              {/* Normal curve (green) */}
              <polyline
                points={[
                  [48,  170 - 2.0 * 24],
                  [130, 170 - 2.8 * 24],
                  [212, 170 - 3.4 * 24],
                  [294, 170 - 4.0 * 24],
                  [376, 170 - 4.6 * 24],
                  [458, 170 - 5.0 * 24],
                ].map(p => p.join(",")).join(" ")}
                fill="none" stroke="#059669" strokeWidth="2.5" strokeLinejoin="round"
              />
              {/* Inverted curve (red) */}
              <polyline
                points={[
                  [48,  170 - 5.3 * 24],
                  [130, 170 - 5.0 * 24],
                  [212, 170 - 4.6 * 24],
                  [294, 170 - 4.2 * 24],
                  [376, 170 - 3.9 * 24],
                  [458, 170 - 3.7 * 24],
                ].map(p => p.join(",")).join(" ")}
                fill="none" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="6 3" strokeLinejoin="round"
              />
              {/* Legend */}
              <line x1="56" y1="14" x2="76" y2="14" stroke="#059669" strokeWidth="2.5" />
              <text x="80" y="18" fontSize="10" fill="#374151">Normal (upward sloping) — growth expected</text>
              <line x1="56" y1="30" x2="76" y2="30" stroke="#dc2626" strokeWidth="2.5" strokeDasharray="5 3" />
              <text x="80" y="34" fontSize="10" fill="#374151">Inverted — slowdown signal</text>
            </svg>
          </div>
        </div>

        <p>For credit markets, the shape of the curve is not just academic. A steep curve supports lending and liquidity. An inverted curve tightens financial conditions and increases pressure on borrowers — it is not just a reflection of the economy, it actively influences it.</p>

        <h3 className="font-bold text-[#191c1e] text-base mt-6">Inflation, Central Banks, and the Rate-Credit Tension</h3>
        <p>If the yield curve represents expectations, inflation represents erosion. Fixed income securities are fundamentally exposed to inflation because their cash flows are fixed in nominal terms. When inflation rises, the real value of those payments declines and investors demand higher yields. Yields rise and bond prices fall — quickly. This is why inflation is often described as the silent driver of bond markets.</p>
        <p>Central bank policy interacts directly with this dynamic. When rates fall, existing bonds with higher coupons become more valuable. But rate cuts often occur in response to economic weakness, introducing a second force: rising credit risk. Government bonds may rally while lower-quality credit lags or declines. The balance between rates and credit is what defines performance across different segments of fixed income.</p>
        <p>This tension becomes most acute in stagflation. Inflation remains elevated while growth slows — constraining the usual policy response. Higher inflation pushes yields up, hurting bond prices. Weaker growth widens credit spreads. Unlike typical cycles where one asset class offsets another, stagflation pressures both simultaneously.</p>

        {/* Figure 2: Credit Spread Anatomy */}
        <div className="my-8 border border-gray-200 rounded-xl overflow-hidden bg-white">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Figure 2 — Anatomy of a Bond Yield</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Illustrative yield composition across credit quality</p>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: "US Treasury (Risk-Free)",  riskFree: 100, ig: 0,  hy: 0,  total: "~4.5%", color1: "#3b82f6", note: "Rates only" },
              { label: "Investment Grade Corp.",   riskFree: 72,  ig: 28, hy: 0,  total: "~6.2%", color1: "#3b82f6", color2: "#8b5cf6", note: "+IG spread ~150bp" },
              { label: "High Yield Corp.",         riskFree: 45,  ig: 18, hy: 37, total: "~9.8%", color1: "#3b82f6", color2: "#8b5cf6", note: "+HY spread ~500bp" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-600">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">{row.note}</span>
                    <span className="text-xs font-bold text-gray-800">{row.total}</span>
                  </div>
                </div>
                <div className="flex h-7 rounded-lg overflow-hidden gap-px">
                  <div style={{ width: `${row.riskFree}%`, backgroundColor: "#3b82f6" }} className="flex items-center justify-center">
                    {row.riskFree > 20 && <span className="text-[9px] font-semibold text-white">Risk-Free Rate</span>}
                  </div>
                  {row.ig > 0 && <div style={{ width: `${row.ig}%`, backgroundColor: "#8b5cf6" }} className="flex items-center justify-center">
                    {row.ig > 15 && <span className="text-[9px] font-semibold text-white">IG Spread</span>}
                  </div>}
                  {row.hy > 0 && <div style={{ width: `${row.hy}%`, backgroundColor: "#ef4444" }} className="flex items-center justify-center">
                    {row.hy > 15 && <span className="text-[9px] font-semibold text-white">HY Spread</span>}
                  </div>}
                </div>
              </div>
            ))}
            <div className="flex gap-4 pt-2">
              {[["#3b82f6","Risk-Free Rate"],["#8b5cf6","IG Credit Spread"],["#ef4444","HY Credit Spread"]].map(([color, label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <h3 className="font-bold text-[#191c1e] text-base mt-6">Credit Spreads: The Core of Credit Investing</h3>
        <p>At the heart of credit markets lies the credit spread — the additional yield investors demand over a risk-free benchmark. This spread compensates for default risk, liquidity risk, and uncertainty. In stable environments, spreads compress as confidence builds. In stress, they widen sharply. Understanding spreads is critical because they capture what is unique about credit investing. While rates reflect macro conditions, spreads reflect issuer-specific risk and market sentiment. The interplay between the two determines how a bond ultimately performs.</p>
        <p>Fixed income can ultimately be understood as the combination of two forces: rates, driven by inflation and central bank policy; and credit, driven by fundamentals and capital structure. Government bonds are primarily rate-driven. Investment-grade credit reflects a balance of both. High yield is largely credit-driven. The most important question in credit is rarely about a single bond — it is about where you are in the cycle and which force is dominant.</p>
        <p>Fixed income is often framed as a defensive asset class, but that framing understates its role. Credit markets are not just about preserving capital — they are about pricing risk with precision. They often react earlier than equities and provide a clearer signal of where stress is building. If equities reflect optimism about the future, fixed income reflects the cost of being wrong.</p>
      </div>
    ),
  },
  {
    slug: "iran-israel-geopolitical-shock",
    title: "Iran, Israel, and the U.S.: A Geopolitical Shock and Its Transmission Through Markets",
    date: "April 2, 2026",
    tag: "Macro",
    paragraphs: [
      `The conflict between Iran, Israel, and the United States represents a meaningful geopolitical shock with broad implications across macro, equity, and credit markets. Unlike traditional conflicts that primarily affect trade flows or regional demand, this situation transmits through the global economy mainly via energy markets. As tensions escalate, disruptions to oil supply—particularly through critical transit routes like the Strait of Hormuz—have driven a sharp increase in oil prices. This creates an immediate inflationary impulse that feeds into fuel costs, transportation, and ultimately food and core goods pricing, raising the risk of a stagflationary environment characterized by higher inflation and weaker growth.`,
      `From a macro perspective, the most important consequence is the constraint placed on central banks. Higher energy prices push inflation upward at a time when growth is already slowing, limiting the ability of policymakers to ease monetary conditions. This creates a challenging policy tradeoff: cutting rates risks entrenching inflation, while holding rates high exacerbates the slowdown. As a result, financial conditions tighten even without additional policy action, with markets repricing toward higher-for-longer rates and elevated real yields. Historically, this type of environment has been negative for risk assets, as both discount rates rise and growth expectations deteriorate simultaneously.`,
      `Equity markets reflect this dynamic through both direction and rotation. While broad indices tend to sell off in response to heightened geopolitical risk and tighter financial conditions, the more important shift occurs beneath the surface. Energy and defense sectors benefit directly from higher commodity prices and increased government spending, while commodities more broadly act as inflation hedges. In contrast, consumer discretionary sectors face pressure from declining real incomes, and industrials are squeezed by rising input costs. Technology and other long-duration assets are particularly vulnerable due to their sensitivity to higher discount rates. The net effect is not necessarily a uniform bear market, but rather a regime shift in leadership toward inflation beneficiaries and defensive sectors, accompanied by downward pressure on overall valuation multiples and earnings expectations.`,
      `The implications for credit markets are more subtle but potentially more severe. Higher rates increase the cost of servicing debt at the same time that economic growth—and therefore corporate earnings—comes under pressure. This combination weakens credit fundamentals, particularly for highly leveraged borrowers. At the same time, risk aversion reduces the availability of capital, making refinancing more difficult. This is especially problematic given the large cohort of companies that issued debt in the low-rate environment of 2020 to 2022 and now face a refinancing wall at significantly higher coupons. Public high yield and leveraged loan markets may see widening spreads and rising default expectations, but the greater risk may lie in private credit, where valuations are less transparent and adjustments to stress can be delayed.`,
      `Taken together, the transmission mechanism from geopolitics to markets follows a clear chain: conflict drives an energy shock, which feeds into inflation, constrains monetary policy, tightens financial conditions, and ultimately slows growth. This sequence creates simultaneous pressure on equities through both earnings and valuation channels, and on credit through deteriorating fundamentals and reduced liquidity. The result is a macro environment that increasingly resembles stagflation, a regime that has historically been challenging for both traditional risk assets and leveraged strategies.`,
      `Ultimately, the key risk for investors is mischaracterizing the conflict as a short-term volatility event rather than a structural shift. While markets may initially react to headlines, the more durable impact comes from second-order effects on inflation expectations, interest rates, and credit conditions. If energy disruptions persist, the conflict has the potential not only to delay the easing cycle but also to catalyze a broader credit cycle turn. In that sense, the most important takeaway is not the immediate move in oil prices, but the tightening of financial conditions that follows and its cascading effects across asset classes.`,
    ],
  },
  {
    slug: "co-op-vs-rsa",
    title: "Co-op Agreements vs. Restructuring Support Agreements (RSA)",
    date: "March 26, 2026",
    tag: "Credit",
    paragraphs: [
      `Cooperation agreements ("Co-ops") and Restructuring Support Agreements (RSAs) are both commonly used in debt restructurings, but they serve distinct purposes and typically arise at different stages of a transaction.`,
      `Co-ops are generally agreements among creditors only and are most often used in the early stages of a situation. At this point, the company is typically not yet formally involved, and creditors use the agreement to coordinate strategy and present a unified negotiating position. These agreements are contractually binding among participating creditors and usually cover cooperation mechanics, cost sharing, information exchange, and economic incentives that differentiate early participants from those who join later. Co-ops also frequently include transfer restrictions, requiring any buyer of the debt to accede to the agreement, thereby preserving alignment within the creditor group.`,
      `In contrast, RSAs are entered into between the company and key creditor constituencies once a restructuring framework has largely been agreed. RSAs carry stronger legal weight and set out the terms of the proposed transaction in detail, including capital structure outcomes, treatment of various creditor classes, voting commitments, and key milestones. Their primary function is to lock in support from major stakeholders and provide execution certainty ahead of a formal restructuring process.`,
      `In practice, Co-ops function as a coordination tool during the negotiation phase, while RSAs represent a more definitive agreement that underpins transaction execution, often in the lead-up to or during a Chapter 11 process.`,
    ],
  },
];

const TAG_STYLES: Record<string, string> = {
  "Macro":        "bg-amber-100 text-amber-700",
  "Credit":       "bg-sky-100 text-sky-700",
  "Equity":       "bg-emerald-100 text-emerald-700",
  "Tech / AI":    "bg-indigo-100 text-indigo-700",
  "Interview Prep": "bg-violet-100 text-violet-700",
  "Career Prep":  "bg-violet-100 text-violet-700",
  "Commodities":  "bg-orange-100 text-orange-700",
};

function PostList({ posts }: { posts: InsightPost[] }) {
  const [activeTag, setActiveTag] = useState<string>("All");
  const tags = ["All", ...Array.from(new Set(posts.map(p => p.tag).filter(Boolean))) as string[]];
  const filtered = activeTag === "All" ? posts : posts.filter(p => p.tag === activeTag);

  return (
    <div className="max-w-3xl py-2">
      {/* Topic navigator */}
      <div className="mb-8 space-y-4">
        {/* Tag filter */}
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                activeTag === tag
                  ? "bg-[#191c1e] text-white border-[#191c1e]"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        {/* Jump links */}
        <div className="border border-gray-100 rounded-xl px-4 py-3 bg-gray-50/60">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Jump to</p>
          <div className="space-y-1.5">
            {filtered.map(post => (
              <a
                key={post.slug}
                href={`#post-${post.slug}`}
                className="flex items-center gap-2 text-xs text-[#41484c] hover:text-[#191c1e] transition-colors group"
              >
                {post.tag && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${TAG_STYLES[post.tag] ?? "bg-gray-100 text-gray-600"}`}>
                    {post.tag}
                  </span>
                )}
                <span className="group-hover:underline underline-offset-2">{post.title}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-6">
        {filtered.map((post) => (
          <article key={post.slug} id={`post-${post.slug}`}
            className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 shadow-sm">
            <header className="mb-6">
              {post.tag && (
                <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3 ${TAG_STYLES[post.tag] ?? "bg-gray-100 text-gray-600"}`}>
                  {post.tag}
                </span>
              )}
              <h2 className="text-[#191c1e] text-xl font-bold tracking-tight leading-snug mb-2">
                {post.title}
              </h2>
              <time className="text-xs text-[#71787c] font-medium">{post.date}</time>
            </header>
            <div className="space-y-4">
              {post.richContent ?? post.paragraphs.map((p, i) => (
                <p key={i} className="text-[#41484c] text-sm leading-[1.75]">{p}</p>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ─── Firm Prep Section ───────────────────────────────────────────────────────

interface PrepQuestion { question: string; context: string; tip: string; }
interface InterviewPrep {
  firm: string; strategy: string; overview: string; culture: string;
  recentDevelopments: string[]; behavioral: PrepQuestion[];
  technical: PrepQuestion[]; whatTheyValue: string[]; redFlags: string[];
}

function PrepQuestionCard({ q, index }: { q: PrepQuestion; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors">
        <span className="text-xs font-bold text-gray-400 mt-0.5 w-5 flex-shrink-0">{index + 1}</span>
        <span className="text-sm font-medium text-[#191c1e] flex-1">{q.question}</span>
        <span className="text-gray-400 flex-shrink-0 mt-0.5">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
          <div className="bg-sky-50 rounded-lg p-3">
            <p className="text-[11px] font-semibold text-sky-700 uppercase tracking-wide mb-1">What they&apos;re testing</p>
            <p className="text-xs text-[#41484c] leading-relaxed">{q.context}</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide mb-1">How to answer</p>
            <p className="text-xs text-[#41484c] leading-relaxed">{q.tip}</p>
          </div>
        </div>
      )}
    </div>
  );
}



// ─── Firm Prep Section ───────────────────────────────────────────────────────
// ─── The Edge: wrapper with mode toggle ──────────────────────────────────────

function EdgeSection() {
  const [mode, setMode] = useState<"firm" | "concept" | "cases">("firm");

  const tabs: { id: "firm" | "concept" | "cases"; icon: React.ReactNode; label: string; desc: string }[] = [
    {
      id: "firm",
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17V8l7-5 7 5v9" />
          <rect x="7" y="11" width="2.5" height="3" rx="0.5" />
          <rect x="10.5" y="11" width="2.5" height="3" rx="0.5" />
          <path d="M3 17h14" />
        </svg>
      ),
      label: "Firm Prep",
      desc: "Strategy, culture & interview guide for any buyside firm",
    },
    {
      id: "concept",
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="7" />
          <path d="M10 11V9.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2" />
          <circle cx="10" cy="13.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      ),
      label: "Concept Q&A",
      desc: "Ask any finance concept — explained the way interviewers think",
    },
    {
      id: "cases",
      icon: (
        <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h12a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" />
          <path d="M7 5V4a1 1 0 011-1h4a1 1 0 011 1v1" />
          <path d="M7 10h6M7 13h4" />
        </svg>
      ),
      label: "Case Library",
      desc: "Real deal walkthroughs: LBOs, distressed, restructuring",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Mode selector cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setMode(t.id)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              mode === t.id
                ? "border-[#1A2B4A] bg-[#1A2B4A]/5 shadow-sm"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}>
            <div className={`mb-2 ${mode === t.id ? "text-[#1A2B4A]" : "text-gray-400"}`}>{t.icon}</div>
            <div className={`text-xs font-bold mb-1 ${mode === t.id ? "text-[#1A2B4A]" : "text-[#191c1e]"}`}>{t.label}</div>
            <div className="text-[11px] text-gray-400 leading-snug hidden sm:block">{t.desc}</div>
          </button>
        ))}
      </div>
      {mode === "firm" && <FirmPrepSection />}
      {mode === "concept" && <ConceptQASection />}
      {mode === "cases" && <CaseLibrarySection />}
    </div>
  );
}

// ─── Concept Q&A ─────────────────────────────────────────────────────────────

interface ConceptSection { title: string; content: string; bullets?: string[]; }
interface ConceptAnswer {
  concept: string; oneLiner: string;
  sections: ConceptSection[];
  interviewAngle: string;
  commonMistakes: string[];
  relatedConcepts: string[];
}

const CONCEPT_CHIPS = [
  "DCF", "LBO Model", "Credit Spreads", "Yield to Maturity", "Capital Structure",
  "Distressed Debt", "EBITDA", "Leverage Ratios", "Covenant Analysis",
  "IRR vs MOIC", "Waterfall Distribution", "PIK Interest", "Loan vs Bond",
  "Beta & Alpha", "Duration & Convexity", "Sector Rotation", "Short Selling",
  "Carry Trade", "Free Cash Flow", "Working Capital",
];

function ConceptQASection() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<ConceptAnswer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const search = async (concept: string) => {
    const q = concept.trim();
    if (!q) return;
    setQuery(q);
    setLoading(true); setError(null); setAnswer(null);
    try {
      const res = await fetch(`/api/concept-qa?concept=${encodeURIComponent(q)}`);
      const d = await res.json();
      if (d.error) setError(d.error);
      else {
        setAnswer(d);
        setHistory(prev => [q, ...prev.filter(h => h.toLowerCase() !== q.toLowerCase())].slice(0, 8));
      }
    } catch { setError("Something went wrong — please try again."); }
    finally { setLoading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); search(query); };

  return (
    <div className="max-w-3xl mx-auto px-1 py-6 space-y-6">
      {/* Search */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Ask any concept — DCF, LBO, credit spreads, convexity…"
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
        />
        <button type="submit" disabled={loading}
          className="px-5 py-3 bg-indigo-700 text-white text-sm font-semibold rounded-xl hover:bg-indigo-800 transition-colors disabled:opacity-50">
          {loading ? "…" : "Ask →"}
        </button>
      </form>

      {/* Suggested chips */}
      {!answer && !loading && (
        <div>
          <p className="text-xs text-gray-400 font-medium mb-2">Popular concepts</p>
          <div className="flex flex-wrap gap-2">
            {CONCEPT_CHIPS.map(chip => (
              <button key={chip} onClick={() => search(chip)}
                className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full hover:border-indigo-400 hover:text-indigo-700 transition-colors">
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent history */}
      {history.length > 0 && !loading && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-400 self-center">Recent:</span>
          {history.map(h => (
            <button key={h} onClick={() => search(h)}
              className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors">
              {h}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Explaining {query}…</p>
        </div>
      )}

      {error && <p className="text-center text-sm text-red-500 py-8">{error}</p>}

      {answer && (
        <div className="space-y-5">
          {/* Header */}
          <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl px-6 py-5">
            <h2 className="text-lg font-bold text-[#191c1e] mb-1">{answer.concept}</h2>
            <p className="text-sm text-indigo-700 font-medium leading-relaxed">{answer.oneLiner}</p>
          </div>

          {/* Sections */}
          {answer.sections.map((sec, i) => (
            <div key={i} className="border border-gray-200 bg-white rounded-xl px-5 py-4 space-y-2">
              <h3 className="text-sm font-bold text-[#191c1e]">{sec.title}</h3>
              <p className="text-sm text-[#41484c] leading-relaxed">{sec.content}</p>
              {sec.bullets && (
                <ul className="space-y-1 mt-2">
                  {sec.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-[#41484c]">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />{b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Interview angle */}
          <div className="border border-amber-200 bg-amber-50/40 rounded-xl px-5 py-4">
            <h3 className="text-sm font-bold text-[#191c1e] mb-2">🎯 Interview Angle</h3>
            <p className="text-sm text-[#41484c] leading-relaxed">{answer.interviewAngle}</p>
          </div>

          {/* Common mistakes */}
          <div className="border border-red-100 bg-red-50/30 rounded-xl px-5 py-4">
            <h3 className="text-sm font-bold text-[#191c1e] mb-2">🚩 Common Mistakes</h3>
            <ul className="space-y-1">
              {answer.commonMistakes.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#41484c]">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />{m}
                </li>
              ))}
            </ul>
          </div>

          {/* Related concepts */}
          <div>
            <p className="text-xs text-gray-400 font-medium mb-2">Explore related</p>
            <div className="flex flex-wrap gap-2">
              {answer.relatedConcepts.map(c => (
                <button key={c} onClick={() => search(c)}
                  className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full hover:border-indigo-400 hover:text-indigo-700 transition-colors">
                  {c} →
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-gray-400">AI-generated. Use as a study aid — verify with primary sources before interviews.</p>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

interface FirmEnrich {
  name: string; headcount: number | null; location: string | null;
  founded: number | null; industry: string | null;
  website: string | null; linkedin: string | null; description: string | null;
}

function FirmPrepSection() {
  const [query, setQuery] = useState("");
  const [teamGroup, setTeamGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [enrich, setEnrich] = useState<FirmEnrich | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(null); setPrep(null); setEnrich(null);
    try {
      const group = teamGroup.trim();
      const params = new URLSearchParams({ firm: query.trim() });
      if (group) params.set("group", group);

      // Fire both in parallel
      const [prepRes, enrichRes] = await Promise.allSettled([
        fetch(`/api/interview-prep?${params}`).then(r => r.json()),
        fetch(`/api/firm-enrich?firm=${encodeURIComponent(query.trim())}`).then(r => r.json()),
      ]);

      if (prepRes.status === "fulfilled") {
        if (prepRes.value.error) setError(`Error: ${prepRes.value.error}`);
        else setPrep(prepRes.value);
      } else {
        setError("Something went wrong.");
      }
      if (enrichRes.status === "fulfilled" && !enrichRes.value.error && enrichRes.value.headcount) {
        setEnrich(enrichRes.value);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setLoading(false); }
  };

  function fmtHeadcount(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return `${n}`;
  }

  return (
    <div className="max-w-3xl mx-auto px-1 py-6 space-y-8">

      {/* Search */}
      <div className="space-y-2">
        <form onSubmit={search} className="space-y-2">
          <div className="flex gap-2">
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search any firm — Ares, Citadel, Apollo, KKR…"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B4A]/20 focus:border-[#1A2B4A]" />
            <button type="submit" disabled={loading}
              className="px-5 py-3 bg-[#1A2B4A] text-white text-sm font-semibold rounded-xl hover:bg-[#243d6b] transition-colors disabled:opacity-50">
              {loading ? "Loading…" : "Prep →"}
            </button>
          </div>
          <input value={teamGroup} onChange={e => setTeamGroup(e.target.value)}
            placeholder="Team / group you're interviewing for (optional) — e.g. Direct Lending, Special Sits"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#41484c] focus:outline-none focus:ring-2 focus:ring-[#1A2B4A]/20 focus:border-[#1A2B4A] bg-gray-50" />
        </form>
        <p className="text-xs text-right text-[#71787c]">
        </p>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-[#71787c]">
          <div className="w-6 h-6 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Generating your firm-specific prep guide…</p>
          <p className="text-xs text-gray-400">This takes 15–25 seconds</p>
        </div>
      )}

      {error && <p className="text-center text-sm text-red-500 py-8">{error}</p>}

      {prep && (
        <div className="space-y-8">
          {/* Header */}
          <div className="border border-rose-200 bg-rose-50/30 rounded-xl px-6 py-5">
            <h2 className="text-xl font-bold text-[#191c1e] mb-1">{prep.firm}</h2>
            <p className="text-xs font-semibold text-rose-600 mb-3">{prep.strategy}</p>
            <p className="text-sm text-[#41484c] leading-relaxed">{prep.overview}</p>

            {/* Apollo enrichment stats bar */}
            {enrich && (
              <div className="mt-4 pt-4 border-t border-rose-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {enrich.headcount && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Employees</p>
                    <p className="text-sm font-bold text-[#191c1e] mt-0.5">{fmtHeadcount(enrich.headcount)}</p>
                  </div>
                )}
                {enrich.location && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">HQ</p>
                    <p className="text-sm font-bold text-[#191c1e] mt-0.5">{enrich.location}</p>
                  </div>
                )}
                {enrich.founded && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Founded</p>
                    <p className="text-sm font-bold text-[#191c1e] mt-0.5">{enrich.founded}</p>
                  </div>
                )}
                {enrich.industry && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sector</p>
                    <p className="text-sm font-bold text-[#191c1e] mt-0.5">{enrich.industry}</p>
                  </div>
                )}
                {(enrich.website || enrich.linkedin) && (
                  <div className="col-span-2 sm:col-span-4 flex gap-3 mt-1">
                    {enrich.website && (
                      <a href={enrich.website} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-[#396477] hover:underline">Website →</a>
                    )}
                    {enrich.linkedin && (
                      <a href={enrich.linkedin} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-[#396477] hover:underline">LinkedIn →</a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Culture */}
          {prep.culture && (
            <section>
              <h3 className="text-sm font-bold text-[#191c1e] mb-3">🏢 Culture & Work Environment</h3>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
                <p className="text-sm text-[#41484c] leading-relaxed">{prep.culture}</p>
              </div>
            </section>
          )}

          {/* Recent Developments */}
          {prep.recentDevelopments?.length > 0 && (
            <section>
              <h3 className="text-sm font-bold text-[#191c1e] mb-3">📰 Recent Developments</h3>
              <ul className="space-y-2">
                {prep.recentDevelopments.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#41484c]">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0" />{d}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-400 mt-2">Sourced from live news. Verify before your interview.</p>
            </section>
          )}

          {/* What They Value */}
          <section>
            <h3 className="text-sm font-bold text-[#191c1e] mb-3">⭐ What They Value in Candidates</h3>
            <div className="flex flex-wrap gap-2">
              {prep.whatTheyValue.map((v, i) => (
                <span key={i} className="px-3 py-1.5 bg-[#1A2B4A]/5 text-[#1A2B4A] text-xs font-medium rounded-full border border-[#1A2B4A]/10">{v}</span>
              ))}
            </div>
          </section>

          {/* Behavioral */}
          <section>
            <h3 className="text-sm font-bold text-[#191c1e] mb-3">💬 Behavioral Questions</h3>
            <div className="space-y-2">
              {prep.behavioral.map((q, i) => <PrepQuestionCard key={i} q={q} index={i} />)}
            </div>
          </section>

          {/* Technical */}
          <section>
            <h3 className="text-sm font-bold text-[#191c1e] mb-3">📊 Technical Questions</h3>
            <div className="space-y-2">
              {prep.technical.map((q, i) => <PrepQuestionCard key={i} q={q} index={i} />)}
            </div>
          </section>

          {/* Red Flags */}
          <section>
            <h3 className="text-sm font-bold text-[#191c1e] mb-3">🚩 Red Flags — What Gets Candidates Cut</h3>
            <ul className="space-y-2">
              {prep.redFlags.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[#41484c]">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />{r}
                </li>
              ))}
            </ul>
          </section>

          <p className="text-center text-xs text-gray-400">Strategy and cultural insights are AI-generated. Verify specific facts, names, and recent events independently before your interview.</p>
        </div>
      )}
    </div>
  );
}

// ─── Market Brief Section ─────────────────────────────────────────────────────

interface MarketSectionData {
  title: string;
  summary: string;
  bullets: string[];
  sentiment: "positive" | "negative" | "neutral" | "mixed";
}

interface MarketAnalysis {
  session: "morning" | "evening";
  date: string;
  headline: string;
  sections: MarketSectionData[];
  generatedAt: string;
}

const SENTIMENT_STYLE: Record<string, string> = {
  positive: "bg-emerald-50 text-emerald-700 border-emerald-200",
  negative: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-gray-50 text-gray-600 border-gray-200",
  mixed: "bg-amber-50 text-amber-700 border-amber-200",
};

// ─── Market Charts (30-day sparklines) ───────────────────────────────────────

interface SymbolHistory {
  symbol: string; label: string; isYield: boolean;
  closes: number[]; timestamps: number[]; change30d: number;
}

function Sparkline({ closes, up, width = 200, height = 52 }: { closes: number[]; up: boolean; width?: number; height?: number }) {
  if (closes.length < 2) return null;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const pad = 4;
  const pts = closes.map((c, i) => {
    const x = pad + (i / (closes.length - 1)) * (width - pad * 2);
    const y = pad + ((max - c) / range) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  // Fill area under line
  const first = `${pad},${height - pad}`;
  const last  = `${(width - pad).toFixed(1)},${height - pad}`;
  const fill  = up ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.10)";
  const stroke = up ? "#34d399" : "#ef4444";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <polygon points={`${first} ${pts} ${last}`} fill={fill} />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function MarketCharts({ tickers }: { tickers: MarketTicker[] }) {
  const [history, setHistory] = useState<SymbolHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/market-history")
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setHistory(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Yield curve from live tickers
  const y3m  = tickers.find(t => t.label === "3M Yield");
  const y10y = tickers.find(t => t.label === "10Y Yield");
  const inverted = y3m && y10y && y3m.price > y10y.price;

  // Labels for sparkline cards
  const SHOW = ["S&P 500", "QQQ", "10Y Yield", "WTI", "Gold", "VIX"];

  if (loading) return (
    <div className="border border-gray-200 bg-white rounded-xl px-5 py-6 flex items-center gap-2 text-xs text-gray-400">
      <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin" />
      Loading 30-day trends…
    </div>
  );

  return (
    <div className="border border-gray-200 bg-white rounded-xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">30-Day Trend</span>
        <span className="ml-auto text-[11px] text-gray-400">Daily closes · 1 month</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-gray-100">
        {SHOW.map(label => {
          const h = history.find(d => d.label === label);
          const live = tickers.find(t => t.label === label);
          if (!h && !live) return null;
          const up = h ? h.change30d >= 0 : (live?.changePct ?? 0) >= 0;
          const pct = h ? h.change30d : (live?.changePct ?? 0);
          const price = live ? (live.isYield ? `${live.price.toFixed(2)}%` : live.price >= 1000 ? live.price.toLocaleString("en-US", { maximumFractionDigits: 0 }) : live.price.toFixed(2)) : "—";

          return (
            <div key={label} className="px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-gray-500">{label}</span>
                <span className={`text-[10px] font-bold ${up ? "text-emerald-600" : "text-red-500"}`}>
                  {up ? "+" : ""}{pct.toFixed(2)}%
                </span>
              </div>
              <span className="text-sm font-bold text-[#191c1e]">{price}</span>
              {h?.closes && h.closes.length > 1
                ? <Sparkline closes={h.closes} up={up} />
                : <div className="h-13 flex items-center justify-center text-[10px] text-gray-300">No history</div>
              }
            </div>
          );
        })}
      </div>

      {/* Yield curve row */}
      {y3m && y10y && (
        <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-3">
          <span className="text-[11px] font-semibold text-gray-500">Yield Curve</span>
          <div className={`text-[10px] font-semibold px-2 py-0.5 rounded ${inverted ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
            {inverted ? `⚠️ Inverted` : `Normal`}
          </div>
          <span className="text-[11px] text-gray-400">
            3M {y3m.price.toFixed(2)}% · 10Y {y10y.price.toFixed(2)}% · spread {Math.abs(y10y.price - y3m.price).toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}

function MarketSection() {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickers, setTickers] = useState<MarketTicker[]>([]);

  useEffect(() => {
    fetch("/api/market")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setAnalysis(d);
      })
      .catch(() => setError("Failed to load market brief."))
      .finally(() => setLoading(false));
    fetch("/api/market-prices")
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d) && d.length) setTickers(d); })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-16 flex flex-col items-center gap-3 text-[#71787c]">
        <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Generating market brief…</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-12 text-center text-sm text-red-500">
        {error || "Unable to load market brief."}
      </div>
    );
  }

  const sessionLabel = analysis.session === "morning" ? "🌅 Morning Brief" : "🌆 Evening Brief";
  const updatedTime = new Date(analysis.generatedAt).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZoneName: "short", timeZone: "America/New_York",
  });

  return (
    <div className="max-w-6xl mx-auto px-5 py-8 space-y-6">
      {/* Live Market Data + Charts */}
      <MarketDataPanel />
      {tickers.length > 0 && <MarketCharts tickers={tickers} />}

      {/* Header */}
      <div className="border border-amber-200 bg-amber-50/40 rounded-xl px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">{sessionLabel} · {analysis.date}</span>
          <span className="text-xs text-gray-400">Updated {updatedTime}</span>
        </div>
        <p className="text-[#191c1e] text-lg font-semibold leading-snug">{analysis.headline}</p>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {analysis.sections.map((sec) => (
          <div key={sec.title} className="border border-gray-200 bg-white rounded-xl px-5 py-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-[#191c1e] text-sm">{sec.title}</h3>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${SENTIMENT_STYLE[sec.sentiment] ?? SENTIMENT_STYLE.neutral}`}>
                {sec.sentiment}
              </span>
            </div>
            <p className="text-[#41484c] text-xs leading-relaxed">{sec.summary}</p>
            <ul className="space-y-1">
              {sec.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#41484c]">
                  <span className="mt-1 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400">
        AI-generated from live news headlines. Not investment advice. Refreshes every 3 hours.
      </p>

      {/* Distressed Watch */}
      <DistressedWatch />
    </div>
  );
}

// ─── Distressed Watch ────────────────────────────────────────────────────────

interface DistressedSituation {
  id: string;
  company: string;
  filingDate: string;
  daysAgo: number;
  situationType: "chapter11" | "restructuring" | "distressed_exchange" | "bankruptcy";
  liabilities?: string;
  industry?: string;
  cik?: string;
  edgarUrl?: string;
  headline?: string;
  likelyFirms: string[];
  whyItMatters: string;
  bondPrice?: number | null;
  bondYield?: number | null;
  bondDesc?: string;
}

const SITUATION_STYLE: Record<string, { label: string; cls: string }> = {
  chapter11:           { label: "Chapter 11", cls: "bg-red-50 text-red-600 border-red-200" },
  distressed_exchange: { label: "Distressed Exchange", cls: "bg-orange-50 text-orange-600 border-orange-200" },
  restructuring:       { label: "Restructuring", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  bankruptcy:          { label: "Bankruptcy", cls: "bg-red-50 text-red-600 border-red-200" },
};

function DistressedWatch() {
  const [situations, setSituations] = useState<DistressedSituation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/distressed")
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setSituations(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="border border-gray-200 bg-white rounded-xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-gray-100">
        <span className="text-base">⚠️</span>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Distressed Watch</span>
        <span className="ml-1 text-[10px] text-gray-400">Chapter 11 · Restructuring · Special Situations</span>
        {!loading && situations.length > 0 && (
          <span className="ml-auto text-[10px] font-bold bg-red-50 text-red-500 border border-red-100 px-1.5 py-0.5 rounded-full">{situations.length} active</span>
        )}
      </div>

      {loading && (
        <div className="divide-y divide-gray-50">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="px-5 py-4 space-y-2 animate-pulse">
              <div className="flex items-center gap-2">
                <div className="h-4 w-36 bg-gray-100 rounded" />
                <div className="h-4 w-20 bg-gray-100 rounded-full" />
                <div className="h-4 w-12 bg-gray-50 rounded ml-auto" />
              </div>
              <div className="h-3 w-full bg-gray-50 rounded" />
              <div className="h-3 w-4/5 bg-gray-50 rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && situations.length === 0 && (
        <div className="px-5 py-8 text-center text-xs text-gray-400">No new filings in the last 60 days.</div>
      )}

      {!loading && situations.length > 0 && (
        <div className="divide-y divide-gray-50">
          {situations.slice(0, 8).map(s => {
            const style = SITUATION_STYLE[s.situationType] ?? SITUATION_STYLE.restructuring;
            const severity = (s.situationType === "chapter11" || s.situationType === "bankruptcy")
              ? { dot: "🔴", label: "Acute", cls: "text-red-500" }
              : s.daysAgo <= 14
              ? { dot: "🟡", label: "Developing", cls: "text-amber-500" }
              : { dot: "⚪", label: "Monitoring", cls: "text-gray-400" };
            return (
              <div key={s.id} className="px-5 py-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span title={severity.label} className="text-[11px]">{severity.dot}</span>
                  <span className="font-semibold text-sm text-[#191c1e]">{s.company}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${style.cls}`}>{style.label}</span>
                  {s.bondPrice != null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${s.bondPrice < 70 ? "bg-red-50 text-red-600 border-red-200" : s.bondPrice < 90 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                      {s.bondPrice.toFixed(1)}¢{s.bondYield != null ? ` / ${s.bondYield.toFixed(1)}% YTM` : ""}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400 ml-auto">{s.daysAgo === 0 ? "Today" : `${s.daysAgo}d ago`}</span>
                </div>
                {s.headline && (
                  <p className="text-xs text-[#41484c] leading-relaxed">{s.headline}</p>
                )}
                <p className="text-xs text-[#71787c] leading-relaxed">{s.whyItMatters}</p>
                <div className="flex items-center justify-end pt-0.5">
                  {s.edgarUrl && (
                    <a href={s.edgarUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] text-[#396477] hover:underline">
                      SEC filing →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="px-5 py-2.5 border-t border-gray-50 bg-gray-50/50">
        <p className="text-[10px] text-gray-400">Sourced from SEC EDGAR 8-K filings. Not investment advice.</p>
      </div>
    </div>
  );
}

function LearnSection() {
  const ALL_POSTS = [...INDUSTRY_POSTS, ...CAREER_POSTS];
  return <PostList posts={ALL_POSTS} />;
}

// ─── Client-side firm registry (mirrors app/lib/firms.ts) ────────────────────

const FIRM_REGISTRY = [
  // ── [PRIVATE CREDIT — MEGA PLATFORMS] ──────────────────────────────────────
  {
    id: "ares", name: "Ares Management", tier: 1 as const,
    category: "Private Credit",
    strategies: ["private_credit", "direct_lending"],
    keywords: ["ares"],
    careersUrl: "https://www.aresmgmt.com/careers",
    desc: "Largest private credit manager globally with $400B+ AUM. One of the most active direct lenders; consistently hiring across credit and direct lending.",
  },
  {
    id: "apollo", name: "Apollo Global Management", tier: 1 as const,
    category: "Private Credit",
    strategies: ["private_credit", "distressed", "special_sits"],
    keywords: ["apollo"],
    careersUrl: "https://www.apollo.com/careers",
    desc: "Hybrid value-investing platform deploying capital across credit, private equity, and real assets. Known for originating large, complex credit transactions.",
  },
  {
    id: "blackstone", name: "Blackstone Credit", tier: 1 as const,
    category: "Private Credit",
    strategies: ["private_credit", "direct_lending", "structured_credit"],
    keywords: ["blackstone"],
    careersUrl: "https://www.blackstone.com/careers",
    desc: "Blackstone's $300B+ credit platform spanning direct lending, CLOs, liquid credit, and insurance-linked strategies. One of the fastest-growing credit managers.",
  },
  {
    id: "kkr", name: "KKR Credit", tier: 1 as const,
    category: "Private Credit",
    strategies: ["private_credit", "direct_lending", "special_sits"],
    keywords: ["kkr"],
    careersUrl: "https://www.kkr.com/careers",
    desc: "Global credit platform with $200B+ AUM across direct lending, opportunistic credit, and structured credit. Highly active capital deployer across cycles.",
  },
  {
    id: "hps", name: "HPS Investment Partners", tier: 1 as const,
    category: "Private Credit",
    strategies: ["private_credit", "direct_lending", "special_sits"],
    keywords: ["hps"],
    careersUrl: "https://www.hpsinvest.com/careers",
    desc: "Top-tier direct lending and private credit firm ($100B+ AUM); recently acquired by BlackRock. Known for large-ticket capital solutions and complex transactions.",
  },
  {
    id: "blueowl", name: "Blue Owl Capital", tier: 1 as const,
    category: "Private Credit",
    strategies: ["direct_lending", "private_credit"],
    keywords: ["blue owl"],
    careersUrl: "https://www.blueowlcapital.com/careers",
    desc: "Permanent capital business focused on direct lending to upper middle market sponsor-backed companies. Raised $30B+ in flagship credit strategies.",
  },

  // ── [DIRECT LENDING] ───────────────────────────────────────────────────────
  {
    id: "golub", name: "Golub Capital", tier: 2 as const,
    category: "Direct Lending",
    strategies: ["direct_lending", "private_credit"],
    keywords: ["golub"],
    careersUrl: "https://www.golubcapital.com/careers",
    desc: "Direct lender focused on middle market sponsor finance. Known for one-stop lending and strong sponsor relationships; $70B+ in assets under management.",
  },
  {
    id: "antares", name: "Antares Capital", tier: 2 as const,
    category: "Direct Lending",
    strategies: ["direct_lending", "private_credit"],
    keywords: ["antares capital", "antares"],
    careersUrl: "https://www.antarescapital.com/careers",
    desc: "One of the largest middle market direct lenders, providing senior secured debt to sponsor-backed companies. Manages $65B+ in credit assets.",
  },
  {
    id: "benefit_street", name: "Benefit Street Partners", tier: 2 as const,
    category: "Direct Lending",
    strategies: ["private_credit", "direct_lending", "structured_credit"],
    keywords: ["benefit street"],
    careersUrl: "https://www.benefitstreetpartners.com",
    desc: "Franklin Templeton-owned credit manager with $75B+ AUM. Specializes in direct lending, special situations, and structured credit solutions.",
  },
  {
    id: "tpg_angelo", name: "TPG Angelo Gordon", tier: 2 as const,
    category: "Direct Lending",
    strategies: ["private_credit", "distressed", "special_sits"],
    keywords: ["angelo gordon", "tpg angelo"],
    careersUrl: "https://www.tpg.com/careers",
    desc: "Multi-strategy credit platform ($75B+ AUM) covering middle market direct lending, asset-backed credit, real estate, and special situations.",
  },
  {
    id: "neuberger", name: "Neuberger Berman Credit", tier: 2 as const,
    category: "Direct Lending",
    strategies: ["private_credit", "direct_lending", "structured_credit"],
    keywords: ["neuberger berman", "neuberger"],
    careersUrl: "https://www.nb.com/careers",
    desc: "Full-service credit platform with $100B+ in credit AUM. Active across direct lending, CLOs, structured products, and specialty finance globally.",
  },
  {
    id: "sixth_street", name: "Sixth Street Partners", tier: 2 as const,
    category: "Direct Lending",
    strategies: ["private_credit", "direct_lending", "special_sits"],
    keywords: ["sixth street"],
    careersUrl: "https://www.sixthstreet.com/careers",
    desc: "Flexible capital provider with $75B+ AUM. Known for large, complex financings across direct lending, specialty finance, and opportunistic credit.",
  },
  {
    id: "crescent", name: "Crescent Capital Group", tier: 2 as const,
    category: "Direct Lending",
    strategies: ["direct_lending", "private_credit"],
    keywords: ["crescent capital"],
    careersUrl: "https://www.crescentcapitalgroup.com",
    desc: "Mid-market direct lender with $40B+ AUM. Active in senior secured and unitranche lending to sponsor-backed US middle market companies.",
  },
  {
    id: "monroe", name: "Monroe Capital", tier: 3 as const,
    category: "Direct Lending",
    strategies: ["direct_lending", "private_credit"],
    keywords: ["monroe capital"],
    careersUrl: "https://www.monroecapitalllc.com",
    desc: "Lower middle market direct lender and credit manager specializing in senior and subordinated debt for sponsor-backed businesses.",
  },
  {
    id: "churchill", name: "Churchill Asset Management", tier: 2 as const,
    category: "Direct Lending",
    strategies: ["direct_lending", "private_credit"],
    keywords: ["churchill asset", "churchill"],
    careersUrl: "https://www.churchillam.com",
    desc: "Nuveen-affiliated middle market direct lender; $50B+ AUM. Focused on senior, unitranche, and equity co-investments in sponsor-backed companies.",
  },
  {
    id: "barings", name: "Barings", tier: 2 as const,
    category: "Direct Lending",
    strategies: ["direct_lending", "private_credit", "structured_credit"],
    keywords: ["barings"],
    careersUrl: "https://www.barings.com/careers",
    desc: "Global alternative asset manager with $40B+ in private finance. Active across US and European direct lending, CLOs, and structured credit.",
  },
  {
    id: "carlyle_credit", name: "Carlyle Credit", tier: 2 as const,
    category: "Direct Lending",
    strategies: ["private_credit", "direct_lending", "distressed"],
    keywords: ["carlyle credit", "carlyle"],
    careersUrl: "https://www.carlyle.com/careers",
    desc: "Global alternative credit platform within Carlyle ($50B+ AUM). Active across direct lending, CLOs, structured credit, and opportunistic credit.",
  },
  {
    id: "first_eagle", name: "First Eagle Alternative Capital", tier: 2 as const,
    category: "Direct Lending",
    strategies: ["direct_lending", "private_credit"],
    keywords: ["first eagle"],
    careersUrl: "https://www.firsteagle.com/careers",
    desc: "Middle market direct lender providing senior secured and unitranche loans to sponsor-backed businesses. Focuses on cash-generative, defensive companies.",
  },

  // ── [DISTRESSED / SPECIAL SITUATIONS] ─────────────────────────────────────
  {
    id: "oaktree", name: "Oaktree Capital Management", tier: 1 as const,
    category: "Distressed",
    strategies: ["distressed", "private_credit", "special_sits"],
    keywords: ["oaktree"],
    careersUrl: "https://www.oaktreecapital.com/careers",
    desc: "Distressed debt pioneer founded by Howard Marks; $190B+ AUM across opportunistic credit, high yield, and emerging markets. Core distressed franchise.",
  },
  {
    id: "centerbridge", name: "Centerbridge Partners", tier: 1 as const,
    category: "Distressed",
    strategies: ["distressed", "special_sits", "private_credit"],
    keywords: ["centerbridge"],
    careersUrl: "https://www.centerbridgepartners.com/careers",
    desc: "Multi-strategy firm with deep expertise in distressed and special situations. Known for high-complexity restructurings across the US and Europe.",
  },
  {
    id: "bain_credit", name: "Bain Capital Credit", tier: 2 as const,
    category: "Distressed",
    strategies: ["private_credit", "distressed", "special_sits"],
    keywords: ["bain capital credit", "bain capital"],
    careersUrl: "https://www.baincapital.com/careers",
    desc: "Multi-strategy credit manager with $50B+ AUM across leveraged credit, special situations, structured products, and European credit.",
  },
  {
    id: "elliott", name: "Elliott Management", tier: 1 as const,
    category: "Distressed",
    strategies: ["distressed", "special_sits"],
    keywords: ["elliott management", "elliott"],
    careersUrl: "https://www.elliottmgmt.com",
    desc: "Iconic activist and distressed credit manager ($70B+ AUM). Pursues complex situations including restructurings, sovereign debt, and special situations globally.",
  },
  {
    id: "cerberus", name: "Cerberus Capital Management", tier: 2 as const,
    category: "Distressed",
    strategies: ["distressed", "private_credit", "special_sits"],
    keywords: ["cerberus"],
    careersUrl: "https://www.cerberuscapital.com",
    desc: "Distressed and value-oriented alternative asset manager with $60B+ AUM. Active in distressed debt, non-performing loans, and real estate credit.",
  },
  {
    id: "fortress", name: "Fortress Investment Group", tier: 2 as const,
    category: "Distressed",
    strategies: ["distressed", "private_credit", "special_sits"],
    keywords: ["fortress"],
    careersUrl: "https://www.fortress.com/careers",
    desc: "Multi-strategy credit and PE manager ($48B+ AUM). Specializes in credit opportunities, distressed assets, real assets, and structured products.",
  },
  {
    id: "silverpoint", name: "Silver Point Capital", tier: 2 as const,
    category: "Distressed",
    strategies: ["distressed", "private_credit", "special_sits"],
    keywords: ["silver point"],
    careersUrl: "https://www.silverpointcapital.com",
    desc: "Credit-focused hedge fund specializing in distressed debt, corporate restructurings, and complex special situations across the capital structure.",
  },
  {
    id: "marathon", name: "Marathon Asset Management", tier: 2 as const,
    category: "Distressed",
    strategies: ["distressed", "special_sits", "structured_credit"],
    keywords: ["marathon asset"],
    careersUrl: "https://www.marathonam.com",
    desc: "Global opportunistic credit manager with $20B+ AUM. Invests across stressed/distressed credit, special situations, and structured products.",
  },
  {
    id: "brigade", name: "Brigade Capital Management", tier: 2 as const,
    category: "Distressed",
    strategies: ["distressed", "private_credit", "special_sits"],
    keywords: ["brigade capital"],
    careersUrl: "https://www.brigadecapital.com",
    desc: "Opportunistic and event-driven credit manager focused on high yield, leveraged loans, distressed debt, and capital structure arbitrage situations.",
  },
  {
    id: "kingstreet", name: "King Street Capital", tier: 2 as const,
    category: "Distressed",
    strategies: ["distressed", "special_sits", "private_credit"],
    keywords: ["king street"],
    careersUrl: "https://www.kingstreetcapital.com",
    desc: "Event-driven credit manager specializing in distressed, special situations, and private credit globally. Strong bankruptcy and restructuring expertise.",
  },
  {
    id: "monarch", name: "Monarch Alternative Capital", tier: 2 as const,
    category: "Distressed",
    strategies: ["distressed", "special_sits", "private_credit"],
    keywords: ["monarch alternative", "monarch capital"],
    careersUrl: "https://www.monarchalternative.com",
    desc: "Opportunistic credit and special situations manager. Focuses on complex, event-driven situations across stressed, distressed, and performing credit.",
  },
  {
    id: "mudrick", name: "Mudrick Capital Management", tier: 2 as const,
    category: "Distressed",
    strategies: ["distressed", "special_sits"],
    keywords: ["mudrick"],
    careersUrl: "https://www.mudrickcapital.com",
    desc: "Distressed and event-driven credit manager. Focuses on stressed/distressed credit, rescue financing, and corporate restructurings across the US.",
  },
  {
    id: "avenue", name: "Avenue Capital Group", tier: 2 as const,
    category: "Distressed",
    strategies: ["distressed", "private_credit"],
    keywords: ["avenue capital"],
    careersUrl: "https://www.avenuecapital.com",
    desc: "Distressed and special situations credit manager founded by Marc Lasry. Active in stressed and distressed credit across North America and Europe.",
  },
  {
    id: "canyon", name: "Canyon Capital Advisors", tier: 2 as const,
    category: "Distressed",
    strategies: ["distressed", "special_sits", "private_credit"],
    keywords: ["canyon capital", "canyon partners"],
    careersUrl: "https://www.canyonpartners.com",
    desc: "Diversified credit manager with $25B+ AUM. Active across corporate distressed, real estate credit, and structured credit special situations.",
  },
  {
    id: "whitebox", name: "Whitebox Advisors", tier: 2 as const,
    category: "Distressed",
    strategies: ["distressed", "special_sits"],
    keywords: ["whitebox"],
    careersUrl: "https://www.whiteboxadvisors.com",
    desc: "Multi-strategy credit and absolute return manager active in corporate credit arbitrage, distressed, and special situations across the capital structure.",
  },

  // ── [CLO / STRUCTURED CREDIT] ─────────────────────────────────────────────
  {
    id: "octagon", name: "Octagon Credit Investors", tier: 2 as const,
    category: "CLO",
    strategies: ["structured_credit", "private_credit"],
    keywords: ["octagon credit"],
    careersUrl: "https://www.octagoninv.com",
    desc: "Dedicated CLO manager with $35B+ AUM. One of the most active US CLO issuers; manages leveraged loan portfolios across new issue and refi CLO vehicles.",
  },
  {
    id: "cifc", name: "CIFC Asset Management", tier: 2 as const,
    category: "CLO",
    strategies: ["structured_credit", "private_credit"],
    keywords: ["cifc"],
    careersUrl: "https://www.cifcam.com",
    desc: "Top-10 US CLO manager with $40B+ in AUM. Active new issue CLO sponsor managing leveraged loan portfolios across multiple vehicles.",
  },
  {
    id: "soundpoint", name: "Sound Point Capital", tier: 2 as const,
    category: "CLO",
    strategies: ["structured_credit", "private_credit"],
    keywords: ["sound point"],
    careersUrl: "https://www.soundpointcapital.com",
    desc: "CLO-focused credit manager with $35B+ AUM. Regular CLO issuer across senior secured leveraged loans and middle market structures.",
  },
  {
    id: "palmersquare", name: "Palmer Square Capital", tier: 3 as const,
    category: "CLO",
    strategies: ["structured_credit", "private_credit"],
    keywords: ["palmer square"],
    careersUrl: "https://palmersquarecapital.com",
    desc: "Active CLO manager and structured credit specialist with growing AUM. Issues CLOs backed by leveraged loans and broadly syndicated credit.",
  },
  {
    id: "magnetar", name: "Magnetar Capital", tier: 2 as const,
    category: "CLO",
    strategies: ["distressed", "special_sits", "structured_credit"],
    keywords: ["magnetar"],
    careersUrl: "https://www.magnetar.com/careers",
    desc: "Multi-strategy alternative manager with expertise in credit arbitrage, distressed situations, and structured credit across the capital stack.",
  },

  // ── [BDC — Business Development Companies] ────────────────────────────────
  {
    id: "prospect", name: "Prospect Capital", tier: 2 as const,
    category: "BDC",
    strategies: ["direct_lending", "private_credit"],
    keywords: ["prospect capital"],
    careersUrl: "https://www.prospectstreet.com",
    desc: "Large BDC ($10B+ net assets) providing flexible capital to US middle market companies across first lien, second lien, and equity co-investments.",
  },
  {
    id: "mainstreet", name: "Main Street Capital", tier: 2 as const,
    category: "BDC",
    strategies: ["direct_lending", "private_credit"],
    keywords: ["main street capital"],
    careersUrl: "https://www.mainstcapital.com",
    desc: "Houston-based BDC focused on lower middle market companies. Provides long-term debt and equity capital; strong track record with above-average returns.",
  },
  {
    id: "hercules", name: "Hercules Capital", tier: 2 as const,
    category: "BDC",
    strategies: ["direct_lending", "private_credit"],
    keywords: ["hercules capital"],
    careersUrl: "https://www.htgc.com/careers",
    desc: "Largest venture lending BDC by AUM. Focuses on debt financing for tech, life sciences, and high-growth companies backed by VC/PE sponsors.",
  },
  {
    id: "newmountain_finance", name: "New Mountain Finance", tier: 2 as const,
    category: "BDC",
    strategies: ["direct_lending", "private_credit"],
    keywords: ["new mountain finance"],
    careersUrl: "https://www.newmountainfinance.com",
    desc: "Upper middle market direct lending BDC affiliated with New Mountain Capital PE. Focus on defensive growth industries with strong cash flow characteristics.",
  },
  {
    id: "gladstone_investment", name: "Gladstone Capital", tier: 3 as const,
    category: "BDC",
    strategies: ["direct_lending", "private_credit"],
    keywords: ["gladstone"],
    careersUrl: "https://www.gladstoneinvestment.com",
    desc: "BDC and investment manager providing debt and equity capital to lower middle market companies across multiple sectors.",
  },

  // ── [MULTI-STRATEGY HEDGE FUNDS] ──────────────────────────────────────────
  {
    id: "millennium", name: "Millennium Management", tier: 1 as const,
    category: "Multi-Strategy",
    strategies: ["multi_strategy", "distressed"],
    keywords: ["millennium management", "millennium"],
    careersUrl: "https://www.mlp.com/careers",
    desc: "Multi-strategy hedge fund managing $65B+. Credit-focused pods hire across distressed, high yield, and special situations; rapid internal mobility.",
  },
  {
    id: "citadel", name: "Citadel", tier: 1 as const,
    category: "Multi-Strategy",
    strategies: ["multi_strategy", "distressed", "macro"],
    keywords: ["citadel"],
    careersUrl: "https://www.citadel.com/careers",
    desc: "Top-performing multi-strategy hedge fund managing $65B+ AUM. Credit pods active in HY, leveraged loans, structured credit, and distressed situations.",
  },
  {
    id: "sculptor", name: "Sculptor Capital Management", tier: 2 as const,
    category: "Multi-Strategy",
    strategies: ["multi_strategy", "distressed", "special_sits"],
    keywords: ["sculptor", "oz management"],
    careersUrl: "https://www.sculptor.com/careers",
    desc: "Rithm-affiliated multi-strategy manager active in credit, real estate, and equity. Credit platform covers structured credit, distressed, and corporate credit.",
  },
  {
    id: "baupost", name: "Baupost Group", tier: 1 as const,
    category: "Multi-Strategy",
    strategies: ["distressed", "special_sits", "private_credit"],
    keywords: ["baupost"],
    careersUrl: "https://www.baupost.com",
    desc: "Value-oriented hedge fund with $30B+ AUM managed by Seth Klarman. Rare, high-impact hires focused on credit, special situations, and real assets.",
  },
  {
    id: "silverlake", name: "Silver Lake Credit", tier: 2 as const,
    category: "Multi-Strategy",
    strategies: ["private_credit", "special_sits"],
    keywords: ["silver lake"],
    careersUrl: "https://www.silverlake.com/careers",
    desc: "Technology-focused credit platform providing flexible capital solutions including direct lending, structured credit, and preferred equity to tech companies.",
  },
  {
    id: "tpg", name: "TPG Capital", tier: 1 as const,
    category: "Multi-Strategy",
    strategies: ["private_equity", "private_credit"],
    keywords: ["tpg capital", "tpg"],
    careersUrl: "https://www.tpg.com/careers",
    desc: "Global alternative asset manager with large private credit and equity platforms. Credit arm focuses on direct lending, real estate credit, and special situations.",
  },

  // ── Additional Tier 1 Mega-funds ──────────────────────────────────────────
  {
    id: "blackstone", name: "Blackstone", tier: 1 as const,
    category: "Private Credit",
    strategies: ["private_equity", "private_credit", "real_assets"],
    keywords: ["blackstone"],
    careersUrl: "https://www.blackstone.com/careers",
    desc: "World's largest alternative asset manager with $1T+ AUM. Credit platform spans direct lending, CLOs, liquid credit, and insurance-linked strategies.",
  },
  {
    id: "apollo", name: "Apollo Global Management", tier: 1 as const,
    category: "Private Credit",
    strategies: ["private_credit", "private_equity", "distressed"],
    keywords: ["apollo global", "apollo management"],
    careersUrl: "https://www.apollo.com/careers",
    desc: "Hybrid value-investing platform with $650B+ AUM. Known for large-scale credit origination, insurance assets, and complex structured transactions.",
  },
  {
    id: "carlyle", name: "The Carlyle Group", tier: 1 as const,
    category: "Private Credit",
    strategies: ["private_equity", "private_credit", "real_assets"],
    keywords: ["carlyle group", "carlyle"],
    careersUrl: "https://www.carlyle.com/careers",
    desc: "Global alternative asset manager with $425B+ AUM. Credit platform covers direct lending, structured credit, and opportunistic / distressed strategies.",
  },
  {
    id: "oaktree", name: "Oaktree Capital Management", tier: 1 as const,
    category: "Distressed",
    strategies: ["distressed", "private_credit", "special_sits"],
    keywords: ["oaktree"],
    careersUrl: "https://www.oaktreecapital.com/careers",
    desc: "Premier distressed and credit-focused manager founded by Howard Marks with $190B+ AUM. Dominant in distressed debt, high yield, and convertibles.",
  },

  // ── Real Assets / Infrastructure ──────────────────────────────────────────
  {
    id: "stonepeak", name: "Stonepeak", tier: 2 as const,
    category: "Private Credit",
    strategies: ["real_assets", "private_credit"],
    keywords: ["stonepeak"],
    careersUrl: "https://www.stonepeakpartners.com/careers",
    desc: "Infrastructure and real assets specialist with $70B+ AUM. Invests across digital infrastructure, energy transition, transport, and water globally.",
  },
  {
    id: "starwood", name: "Starwood Capital Group", tier: 2 as const,
    category: "Private Credit",
    strategies: ["real_assets", "private_credit"],
    keywords: ["starwood capital", "starwood"],
    careersUrl: "https://www.starwoodcapital.com/careers",
    desc: "Real estate and real assets manager with $115B+ AUM. Active across debt, equity, and opportunistic real estate credit globally.",
  },
  {
    id: "eqt", name: "EQT", tier: 2 as const,
    category: "Private Credit",
    strategies: ["private_equity", "private_credit", "real_assets"],
    keywords: ["eqt"],
    careersUrl: "https://www.eqtgroup.com/careers",
    desc: "Swedish PE giant with €230B+ AUM. Active across PE, infrastructure, real estate, and credit; one of Europe's most active buyers.",
  },

  // ── Growth Equity / PE ─────────────────────────────────────────────────────
  {
    id: "clearlake", name: "Clearlake Capital", tier: 2 as const,
    category: "Other Finance Roles",
    strategies: ["private_equity", "special_sits"],
    keywords: ["clearlake"],
    careersUrl: "https://www.clearlake.com/careers",
    desc: "Technology and operations-focused PE firm with $90B+ AUM. Known for operational engineering approach and control-oriented buyouts.",
  },
  {
    id: "advent", name: "Advent International", tier: 2 as const,
    category: "Other Finance Roles",
    strategies: ["private_equity"],
    keywords: ["advent international", "advent"],
    careersUrl: "https://www.adventinternational.com/careers",
    desc: "Global PE firm focused on buyouts with $25B+ in committed capital. Active across Europe, North America, and emerging markets.",
  },
  {
    id: "sixthstreet", name: "Sixth Street Partners", tier: 2 as const,
    category: "Private Credit",
    strategies: ["private_credit", "direct_lending", "special_sits"],
    keywords: ["sixth street"],
    careersUrl: "https://sixthstreet.com/careers",
    desc: "Multi-strategy credit platform with $75B+ AUM. Spans direct lending, asset-backed finance, TAO (tactical opportunities), and growth equity.",
  },
];

function matchFirm(firmName: string) {
  const lower = firmName.toLowerCase();
  return FIRM_REGISTRY.find((f) =>
    f.keywords.some((k) => lower.includes(k.toLowerCase()))
  );
}

// Bridge: find the best EDGAR filing for a given job's firm (if any)
function getFilingForJob(job: JobSignal, filings: FundFiling[]): FundFiling | undefined {
  const firmMatch = matchFirm(job.firm);
  if (!firmMatch) return undefined;
  return filings.find((f) => matchFirm(f.entityName)?.id === firmMatch.id);
}

// Bridge: get all jobs that match a given EDGAR filing's firm
function getJobsForFiling(filing: FundFiling, jobSignals: JobSignal[]): JobSignal[] {
  const firmMatch = matchFirm(filing.entityName);
  if (!firmMatch) return [];
  return jobSignals.filter((j) => matchFirm(j.firm)?.id === firmMatch.id);
}

const BACK_OFFICE_RE_CLIENT = /\b(software engineer|developer|devops|sysadmin|cybersecurity|HR|human resources|recruit|talent|office manager|admin|payroll|legal counsel|paralegal|attorney|marketing|content manager|social media|sales|business development|customer support|help desk|product manager|project manager|supply chain|procurement|investor relations|investor relation|client relations|client service|fundraising coordinator)\b/i;
const SENIORITY_RE_CLIENT: Array<[RegExp, string]> = [
  [/\b(intern|summer analyst|co-?op|summer associate)\b/i, "intern"],
  [/\b(analyst|research analyst|investment analyst|credit analyst|portfolio analyst|financial analyst)\b/i, "analyst"],
  [/\b(associate|investment associate|credit associate|portfolio associate|research associate)\b/i, "associate"],
  [/\b(vice president|vp|senior associate|senior analyst|portfolio manager|investment manager|fund manager|research manager)\b/i, "vp"],
  [/\b(director|principal|svp|senior vice president|senior portfolio manager|senior investment manager)\b/i, "director"],
  [/\b(managing director|md|head of|chief|cio|cco|cfo|executive director|general manager|investment officer|chief investment)\b/i, "md"],
  [/\b(partner|general partner|senior partner|co-head|co-founder)\b/i, "partner"],
];

function classifyClient(role: string, firm: string) {
  const frontOffice = !BACK_OFFICE_RE_CLIENT.test(role);
  let seniority = "other";
  for (const [re, s] of SENIORITY_RE_CLIENT) {
    if (re.test(role)) { seniority = s; break; }
  }
  const relevanceScore = !frontOffice ? 2
    : ["md", "partner"].includes(seniority) ? 9
    : ["director", "vp"].includes(seniority) ? 8
    : ["analyst", "associate"].includes(seniority) ? 7 : 5;
  const signal = ["md", "partner"].includes(seniority)
    ? `Senior hire at ${firm} — likely team build-out or strategy expansion`
    : /distress|restructur|special sit/i.test(role)
    ? `${firm} hiring for distressed/special sits — watch for deployment activity`
    : /private credit|direct lend/i.test(role)
    ? `${firm} expanding private credit team`
    : `${firm} hiring — ${role}`;
  return { frontOffice, seniority, relevanceScore, signal, strategies: [] as string[], signalType: "uncertain" as const };
}

// ─── Watch status + signal interpretation ─────────────────────────────────────

type WatchStatus = "Likely Active" | "Near-Term Watch" | "Building" | "Early Signal" | "On the Radar";

const WATCH_STATUS_STYLE: Record<WatchStatus, { badge: string; dot?: boolean }> = {
  "Likely Active":   { badge: "bg-[#c3ecd7] text-[#416656] border-[#a8cfbc]/70", dot: true },
  "Near-Term Watch": { badge: "bg-amber-50 text-amber-700 border-amber-200", dot: true },
  "Building":        { badge: "bg-sky-50 text-[#396477] border-sky-200" },
  "Early Signal":    { badge: "bg-[#e1ddf2]/70 text-[#5e5c6e] border-[#c7c4d8]/60" },
  "On the Radar":    { badge: "bg-gray-50 text-gray-500 border-gray-200" },
};

function getWatchStatus(foCount: number, filing?: FundFiling): WatchStatus {
  if (foCount >= 3) return "Likely Active";
  if (foCount >= 1 && filing?.offeringStatus === "open") return "Near-Term Watch";
  if (foCount >= 1) return "Building";
  if (filing) return "Early Signal";
  return "On the Radar";
}

function generateSignalNote(profile: FirmIntelProfile, filing?: FundFiling): string {
  const stratLabel = STRATEGY_LABELS[profile.strategies[0]] ?? profile.strategies[0];
  const hasSenior = profile.openRoles.some(r => ["md", "partner", "director"].includes(r.classification.seniority));
  const amt = filing?.totalOfferingAmount ? fmt(filing.totalOfferingAmount) : null;

  if (filing?.offeringStatus === "open" && profile.frontOfficeCount >= 2) {
    return `Actively raising${amt ? ` (${amt})` : ""} while hiring ${profile.frontOfficeCount} open roles — a concurrent signal of team expansion. Strong timing to engage.`;
  }
  if (filing?.offeringStatus === "open") {
    const days = filing.daysSinceFiling;
    return `In-market raise${amt ? ` (${amt})` : ""} filed ${days}d ago. ${stratLabel} teams typically add headcount during the deployment phase — roles likely to follow within 1–2 quarters.`;
  }
  if (filing?.offeringStatus === "closed" && profile.frontOfficeCount >= 1) {
    return `Post-raise build-out phase${amt ? ` following a ${amt} close` : ""}. Active posting confirms team expansion is underway — ${stratLabel} hiring typically continues for 2–3 quarters after close.`;
  }
  if (hasSenior && profile.frontOfficeCount >= 2) {
    return `Senior hires alongside ${profile.frontOfficeCount} open roles — signals a deliberate team build-out or new mandate, not routine backfill.`;
  }
  if (profile.frontOfficeCount >= 4) {
    return `${profile.frontOfficeCount} roles open concurrently — broad hiring push consistent with new fund deployment or an expanded mandate.`;
  }
  if (hasSenior) {
    return `Senior hire posted at ${profile.name}. Senior additions typically precede a junior team build — watch for analyst and associate roles to follow.`;
  }
  return `Active hiring at ${profile.name}. Direct outreach may surface additional unlisted opportunities alongside posted roles.`;
}

function hiringTimeline(days: number): { label: string; cls: string } | null {
  if (days <= 30)  return { label: "⏰ Outreach now — hiring likely 30–60d out", cls: "bg-red-50 text-red-700 border-red-200" };
  if (days <= 60)  return { label: "🟢 Hiring window open", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (days <= 90)  return { label: "📋 Active build-out phase", cls: "bg-violet-50 text-violet-700 border-violet-200" };
  if (days <= 180) return { label: "🔵 Post-close hiring", cls: "bg-sky-50 text-[#396477] border-sky-200" };
  return null;
}

function generateEarlySignalNote(filing: FundFiling): string {
  const amt = filing.totalOfferingAmount ? fmt(filing.totalOfferingAmount) : null;
  const days = filing.daysSinceFiling;
  const status = filing.offeringStatus;
  if (status === "open") {
    return `Filed${amt ? ` ${amt}` : ""} raise ${days}d ago — currently in market. No roles posted yet. Teams deploying new capital typically hire within 1–3 quarters. Engaging now, before formal posting, gives the strongest edge.`;
  }
  if (status === "closed") {
    return `Closed${amt ? ` ${amt}` : ""} fund ${days}d ago. Post-close build-out phase is the most common precursor to hiring — often begins 1–2 quarters after closing.`;
  }
  return `Form D filed ${days}d ago${amt ? ` (${amt})` : ""}. Capital activity on record — no roles posted yet. Worth monitoring for near-term hiring.`;
}

function buildIntelFromJobs(signals: JobSignal[]): IntelResponse {
  type ClassifiedSignal = JobSignal & { classification: ReturnType<typeof classifyClient> };
  const firmMap = new Map<string, { def: typeof FIRM_REGISTRY[0]; jobs: ClassifiedSignal[] }>();
  const allRolesArr: ClassifiedSignal[] = [];

  for (const s of signals) {
    const classified: ClassifiedSignal = { ...s, classification: classifyClient(s.role, s.firm) };
    allRolesArr.push(classified);
    const match = matchFirm(s.firm);
    if (!match) continue;
    if (!firmMap.has(match.id)) firmMap.set(match.id, { def: match, jobs: [] });
    firmMap.get(match.id)!.jobs.push(classified);
  }

  const profiles: FirmIntelProfile[] = Array.from(firmMap.values())
    .filter(({ jobs }) => jobs.length > 0)
    .map(({ def, jobs }) => {
      const foCount = jobs.filter((j) => j.classification.frontOffice).length;
      const sigs: string[] = [];
      if (foCount >= 3) sigs.push(`${foCount} roles open`);
      else if (foCount > 0) sigs.push(`${foCount} role${foCount > 1 ? "s" : ""} open`);
      return {
        firmId: def.id,
        name: def.name,
        tier: def.tier,
        desc: def.desc,
        strategies: def.strategies,
        openRoles: jobs as FirmIntelProfile["openRoles"],
        frontOfficeCount: foCount,
        signals: sigs,
        hiringPush: foCount >= 3,
        postRaiseHiring: false,
      };
    })
    .sort((a, b) => b.frontOfficeCount - a.frontOfficeCount);

  allRolesArr.sort((a, b) => b.classification.relevanceScore - a.classification.relevanceScore);

  return {
    hiringPush: profiles.filter((p) => p.hiringPush),
    postRaise: profiles.filter((p) => !p.hiringPush && p.frontOfficeCount > 0),
    strategyBuilds: [],
    allRoles: allRolesArr as IntelResponse["allRoles"],
    totalFirms: profiles.length,
    lastUpdated: new Date().toISOString(),
  };
}

// ─── Firm Intel ───────────────────────────────────────────────────────────────

interface FirmIntelProfile {
  firmId: string;
  name: string;
  tier: 1 | 2 | 3;
  desc?: string;
  strategies: string[];
  openRoles: Array<{
    id: string;
    role: string;
    location: string;
    daysAgo: number;
    edgarUrl?: string;
    classification: {
      frontOffice: boolean;
      seniority: string;
      relevanceScore: number;
      signal: string;
      signalType: string;
    };
  }>;
  frontOfficeCount: number;
  signals: string[];
  hiringPush: boolean;
  edgarRaise?: { amountStr: string; date: string; status: string };
  postRaiseHiring: boolean;
  strategyBuildout?: string;
}

interface IntelResponse {
  hiringPush: FirmIntelProfile[];
  postRaise: FirmIntelProfile[];
  strategyBuilds: FirmIntelProfile[];
  allRoles: Array<{ id: string; firm: string; role: string; location: string; daysAgo: number; edgarUrl?: string; source?: string; classification: { frontOffice: boolean; seniority: string; relevanceScore: number; signal: string } }>;
  totalFirms: number;
  lastUpdated: string;
}

const SENIORITY_LABELS: Record<string, string> = {
  analyst: "Analyst", associate: "Associate", vp: "VP",
  director: "Director", md: "MD", partner: "Partner",
  intern: "Intern", other: "Professional",
};

const STRATEGY_LABELS: Record<string, string> = {
  private_credit: "Private Credit", distressed: "Distressed", special_sits: "Special Sits",
  hedge_fund: "Hedge Fund", macro: "Macro", quant: "Quant",
  private_equity: "PE", growth: "Growth", structured_credit: "Structured",
  public_credit: "Public Credit", equity: "Equity",
};

function TierBadge({ tier }: { tier: 1 | 2 | 3 }) {
  const cls = tier === 1
    ? "bg-[#396477]/10 text-[#396477] border-[#396477]/20"
    : tier === 2
    ? "bg-[#e1ddf2]/70 text-[#5e5c6e] border-[#c7c4d8]/50"
    : "bg-gray-50 text-gray-500 border-gray-200";
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}>
      T{tier}
    </span>
  );
}

function StrategyTag({ s }: { s: string }) {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#f2f4f6] text-[#41484c] border border-[#e0e3e5]">
      {STRATEGY_LABELS[s] ?? s}
    </span>
  );
}

function SeniorityBadge({ seniority, frontOffice }: { seniority: string; frontOffice: boolean }) {
  const isSenior = ["md", "partner", "director"].includes(seniority);
  const cls = !frontOffice
    ? "bg-gray-50 text-gray-400 border-gray-200"
    : isSenior
    ? "bg-[#c3ecd7]/60 text-[#416656] border-[#a8cfbc]/50"
    : "bg-sky-50 text-[#396477] border-sky-100";
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}>
      {SENIORITY_LABELS[seniority] ?? seniority}
    </span>
  );
}

function FirmCard({ profile }: { profile: FirmIntelProfile }) {
  const topRoles = profile.openRoles
    .filter((r) => r.classification.frontOffice)
    .slice(0, 4);

  return (
    <div className="card-lift bg-white border border-[#c1c7cc]/40 rounded-xl p-5">
      {/* Firm header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TierBadge tier={profile.tier} />
            <span className="font-bold text-[#191c1e] text-sm">{profile.name}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {profile.strategies.slice(0, 3).map((s) => <StrategyTag key={s} s={s} />)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs font-bold text-[#396477]">{profile.frontOfficeCount} open</span>
          {profile.edgarRaise && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              profile.edgarRaise.status === "open"
                ? "bg-[#c3ecd7] text-[#416656]"
                : "bg-sky-100 text-[#396477]"
            }`}>
              {profile.edgarRaise.status === "open" ? "Raising" : "Closed raise"}
              {profile.edgarRaise.amountStr ? ` · ${profile.edgarRaise.amountStr}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {profile.desc && (
        <p className="text-[12px] text-[#41484c] leading-relaxed mb-3">
          {profile.desc}
        </p>
      )}

      {/* Signal tags */}
      {profile.signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {profile.signals.map((sig, i) => (
            <span key={i} className="text-[11px] text-[#41484c] bg-[#f7f9fb] border border-[#e0e3e5] px-2 py-0.5 rounded-full">
              {sig}
            </span>
          ))}
        </div>
      )}

      {/* Top roles */}
      {topRoles.length > 0 && (
        <div className="space-y-1.5 mt-3">
          {topRoles.map((r) => (
            <a
              key={r.id}
              href={r.edgarUrl || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <SeniorityBadge seniority={r.classification.seniority} frontOffice={r.classification.frontOffice} />
                <span className="text-xs text-[#41484c] group-hover:text-[#396477] truncate transition-colors">
                  {r.role}
                </span>
              </div>
              <span className="text-[10px] text-[#71787c] flex-shrink-0">{r.daysAgo}d</span>
            </a>
          ))}
          {profile.frontOfficeCount > 4 && (
            <p className="text-[11px] text-[#71787c] pt-1">+{profile.frontOfficeCount - 4} more roles</p>
          )}
        </div>
      )}

      {/* LLM signal */}
      {topRoles[0]?.classification.signal && (
        <p className="text-[11px] text-[#71787c] italic mt-3 leading-relaxed border-t border-[#f0f2f4] pt-3">
          {topRoles[0].classification.signal}
        </p>
      )}
    </div>
  );
}

// ─── Case Library ────────────────────────────────────────────────────────────

interface StaticCase {
  deal: string; company: string; year: string;
  type: "distressed" | "lbo" | "credit" | "restructuring" | "ma";
  size: string; keyPlayers: string[];
  snapshot: string; mechanics: string[];
  interviewQ: string; modelAnswer: string; lessons: string[];
}

const STATIC_CASES: StaticCase[] = [
  {
    deal: "Hertz Chapter 11 (2020)", company: "Hertz", year: "2020", type: "distressed",
    size: "$19B in liabilities", keyPlayers: ["Knighthead Capital", "Certares Management"],
    snapshot: "Hertz filed Chapter 11 in May 2020 after COVID-19 collapsed travel demand overnight. The business was fundamentally sound — it owned a massive fleet of vehicles — but its ABS-backed capital structure had no liquidity to survive a sudden revenue stop. The case became famous for an unexpected twist: used car prices surged during the bankruptcy, flipping the recovery math and allowing equity to survive.",
    mechanics: ["Fleet financed through vehicle ABS — cars were ring-fenced collateral, insulating ABS investors from corporate distress", "Corporate creditors faced a binary outcome: recovery depended entirely on whether fleet liquidation values covered the debt stack", "Used car prices surged 20–30% in 2020–2021 (chip shortage + stimulus demand) — asset value rose during the restructuring", "Emerged in 2021 with $5.9B in new equity from Knighthead/Certares; existing equity recovered ~$1.50/share — highly unusual post-Chapter 11"],
    interviewQ: "Walk me through why Hertz equity recovered value in Chapter 11 — isn't equity supposed to be wiped out?",
    modelAnswer: "In a standard Chapter 11, equity is last in the waterfall and typically recovers nothing in an over-levered restructuring. Hertz was different because the key asset — its car fleet — appreciated materially during the bankruptcy. Used car prices rose sharply due to the chip shortage and stimulus-driven demand, so the fleet's liquidation value exceeded initial estimates. This moved enough value to equity that a group led by Knighthead and Certares bid for the equity, paying ~$1.50/share. The core lesson is that distressed outcomes are not static: asset price moves during a restructuring can dramatically change recovery analysis.",
    lessons: ["Distressed outcomes are path-dependent — asset prices during the process matter as much as entry leverage", "ABS structures ring-fence fleet collateral from corporate distress, creating sharp credit stratification", "Equity can retain value in Chapter 11 if asset appreciation pushes enterprise value above the debt stack"],
  },
  {
    deal: "Toys R Us Liquidation (2017)", company: "Toys R Us", year: "2017", type: "distressed",
    size: "$5B in debt", keyPlayers: ["KKR", "Bain Capital", "Vornado Realty"],
    snapshot: "Toys R Us filed Chapter 11 in 2017, weighed down by $5B of LBO debt from a 2005 buyout by KKR, Bain, and Vornado. Despite attempts to restructure, the business couldn't compete with Amazon and Walmart and liquidated in 2018 — eliminating 33,000 jobs. It became the defining cautionary tale of over-leveraged LBOs.",
    mechanics: ["2005 LBO loaded $6.6B of debt onto the balance sheet, consuming all free cash flow in interest", "Debt maturity wall hit simultaneously with Amazon disrupting physical toy retail", "Secured lenders recovered near par; unsecured bondholders and trade creditors were largely wiped out", "Real estate was key value driver — Vornado's stake in the leases held residual value even in liquidation"],
    interviewQ: "What went wrong with the Toys R Us LBO and what does it tell you about credit underwriting?",
    modelAnswer: "The LBO was underwritten on the assumption that the business could sustain its cash flows, but the debt load left zero cushion to invest in e-commerce or compete on price with Amazon and Walmart. A core lesson is that LBO debt analysis must stress-test not just cyclical downturns but structural disruption — especially in retail. Lenders should have demanded lower leverage or maintenance covenants that would have forced a restructuring earlier, before the business deteriorated to the point of liquidation.",
    lessons: ["High LBO leverage leaves no room to invest in the business during disruption", "Structural industry shifts (e-commerce) can be more damaging than cyclical downturns", "Secured vs unsecured recovery analysis is critical — same bankruptcy, very different outcomes by tranche"],
  },
  {
    deal: "Twitter LBO (2022)", company: "Twitter / X", year: "2022", type: "lbo",
    size: "$44B acquisition, $13B of debt", keyPlayers: ["Morgan Stanley", "Bank of America", "Barclays"],
    snapshot: "Elon Musk acquired Twitter for $44B in October 2022, financing it with $13B of leveraged loans and bonds underwritten by seven banks. The banks were unable to syndicate the debt — stuck holding it at a loss — in what became the largest hung debt deal since the 2008 financial crisis. The deal is a masterclass in LBO financing risk.",
    mechanics: ["$13B debt package: $6.5B term loan, $3B secured bridge, $3B unsecured bridge — all held by banks unable to sell", "EBITDA declined sharply post-acquisition as advertisers fled; debt/EBITDA ballooned above 10x", "Banks marked the loans at ~60 cents on the dollar, crystallising ~$4B in paper losses", "Apollo and Ares provided $1.25B of preferred equity to help refinance some bank exposure in 2023"],
    interviewQ: "Why were the banks unable to syndicate the Twitter debt and what does this tell you about hung deal risk?",
    modelAnswer: "The banks committed to the financing before Musk's acquisition closed, but by the time they tried to sell the debt the credit market had deteriorated sharply with rising rates and recession fears. More importantly, Twitter's fundamentals deteriorated post-close as advertisers pulled spend, making the credit story harder to sell to institutional investors. The lesson is that commitment letters expose banks to market risk between signing and syndication — and that credit underwriting must account for business quality, not just leverage multiples.",
    lessons: ["Underwriting risk: banks bear market risk between commitment and syndication", "Business quality matters as much as leverage ratio in credit underwriting", "Preferred equity from private credit firms is a common solution to rescue hung bank debt"],
  },
  {
    deal: "WeWork Collapse (2023)", company: "WeWork", year: "2023", type: "restructuring",
    size: "$18B in lease liabilities", keyPlayers: ["SoftBank"],
    snapshot: "WeWork filed Chapter 11 in November 2023 after burning through billions in SoftBank capital and failing to right-size its massive lease portfolio. Once valued at $47B, it emerged with ~$450M in equity value — a 99% wipeout. The case is a study in unsustainable unit economics masked by growth.",
    mechanics: ["$18B in long-term lease obligations — fixed costs — against short-term flexible memberships — variable revenue", "Second lien noteholders (King Street, Brigade) converted debt to equity through the restructuring plan", "SoftBank, as the largest equity holder, was wiped out despite injecting $16B+ over the company's life", "Emerged with ~500 locations vs 800 pre-filing after rejecting uneconomic leases in bankruptcy"],
    interviewQ: "What were the fundamental credit flaws in WeWork's business model?",
    modelAnswer: "WeWork had a classic asset-liability mismatch: it signed 10-15 year leases creating fixed long-term obligations, then rented space on short 1-month to 12-month terms, creating highly variable revenue. In a downturn or demand shock, revenue disappears while lease payments continue. Combined with negative unit economics at most locations and an unsustainable cash burn rate, there was no scenario where the capital structure was serviceable without fundamental business model change.",
    lessons: ["Asset-liability mismatch between fixed costs and variable revenue is a critical credit risk", "Revenue quality — recurring, contracted, sticky — matters as much as revenue size", "High valuation and brand hype can mask fundamentally broken unit economics for years"],
  },
  {
    deal: "Revlon Chapter 11 (2022)", company: "Revlon", year: "2022", type: "distressed",
    size: "$3.7B in debt", keyPlayers: ["Citi"],
    snapshot: "Revlon filed Chapter 11 in June 2022, unable to manage $3.7B of debt amid supply chain disruptions and competition from indie beauty brands. The case is also famous for Citibank's $900M operational error — accidentally sending lenders full loan repayment — and the ensuing legal battle over who had to return the money.",
    mechanics: ["2020 term loan amendment allowed Revlon to transfer IP assets to an unrestricted subsidiary — the 'trap door' move — angering senior lenders", "The so-called J.Crew blocker provision was absent, enabling the IP transfer that subordinated lenders", "Citibank mistakenly sent $900M to lenders; courts initially ruled lenders could keep it (later reversed)", "Emerged in 2023 with debt reduced from $3.7B to ~$700M; equity went to creditors"],
    interviewQ: "What is the significance of the Revlon trap door transaction and what should credit investors watch for?",
    modelAnswer: "The Revlon IP transfer illustrated how covenant-lite loan documentation can allow management to move valuable assets out of the reach of senior creditors — known as a trap door or liability management transaction. Credit investors must scrutinise restricted payment baskets, unrestricted subsidiary permissions, and asset transfer covenants in loan documents. The absence of a J.Crew blocker — a provision specifically preventing IP transfers — was a critical documentation gap that sophisticated lenders now require.",
    lessons: ["Covenant documentation is as important as financial metrics in credit underwriting", "Liability management transactions (LMTs) are a growing risk in covenant-lite markets", "Operational errors at custodians/agents can have massive legal consequences — Citi's $900M mistake"],
  },
  {
    deal: "Energy Future Holdings (2014)", company: "Energy Future Holdings (TXU)", year: "2014", type: "lbo",
    size: "$48B LBO — largest ever at the time", keyPlayers: ["KKR", "TPG", "Goldman Sachs"],
    snapshot: "The $48B leveraged buyout of TXU (renamed Energy Future Holdings) in 2007 by KKR, TPG, and Goldman Sachs was the largest LBO in history. The thesis relied on natural gas prices staying high — they collapsed. The company filed Chapter 11 in 2014 with $42B in debt, wiping out equity entirely. KKR and TPG lost their entire $8B equity investment.",
    mechanics: ["LBO thesis underwritten on natural gas at $7-8/MMBtu — shale revolution crashed it to $2-3", "Regulated utility (Oncor) ring-fenced from bankruptcy, creating complex inter-creditor disputes", "EFIH (holding company) and TCEH (operating company) had separate capital structures with different creditor groups", "Reorganisation took 4+ years due to tax disputes and creditor group conflicts"],
    interviewQ: "What does the EFH LBO teach you about commodity risk in leveraged buyouts?",
    modelAnswer: "EFH is the canonical example of commodity price risk destroying an LBO underwriting. The sponsors modelled natural gas prices using forward curves and recent history — both of which failed to anticipate the shale revolution. In commodity-linked businesses, LBO debt sizing must be stress-tested against a wide range of commodity scenarios, not just base cases. The structure also showed how complex multi-tranche capital structures across regulated and unregulated subsidiaries create massive inter-creditor complexity in restructuring.",
    lessons: ["Never underwrite commodity-linked cash flows at spot or forward prices without severe stress tests", "Complex holding company structures create inter-creditor disputes that drag out restructurings", "Regulated utility assets can be ring-fenced, protecting value for specific creditor classes"],
  },
  {
    deal: "J.Crew IP Drop-Down (2017)", company: "J.Crew", year: "2017", type: "credit",
    size: "$566M IP transfer", keyPlayers: ["Anchorage Capital", "GSO / Blackstone Credit"],
    snapshot: "J.Crew executed a landmark liability management transaction in 2017, transferring its brand intellectual property to an unrestricted subsidiary and issuing new priority debt secured by that IP. Existing term loan lenders were structurally subordinated overnight — without a vote, without a default, and without recourse. The transaction defined an era of creditor-on-creditor aggression and spawned the 'J.Crew blocker' clause now standard in every new leveraged loan.",
    mechanics: ["Brand IP ($250M+ of trademark value) transferred to an unrestricted subsidiary using existing investment baskets in the credit agreement", "New $566M secured notes issued against the IP — sitting ahead of the legacy term loan in the waterfall", "Legacy lenders were left with the weaker retail operating company; the most valuable asset was gone", "Chapter 11 followed in 2020 — by then the IP transfer had already set the creditor hierarchy for the restructuring"],
    interviewQ: "What is collateral mobility risk and how does the J.Crew case illustrate it?",
    modelAnswer: "Collateral mobility risk is the danger that a borrower can move valuable assets out of the collateral package — legally, without triggering a default — leaving lenders with a weakened or hollow claim. J.Crew showed this perfectly: the brand was the business's most valuable asset, and the credit agreement's loose basket provisions allowed management to transfer it to an unrestricted subsidiary and raise new senior debt against it. From a credit underwriting perspective, it means analysing not just what the collateral is today, but whether the documentation prevents it from being moved. J.Crew blockers emerged precisely to close this gap.",
    lessons: ["Underwrite the covenant documentation as hard as the EBITDA — baskets and carve-outs define your real protection", "Collateral mobility risk means valuable assets can be legally stripped before a default is triggered", "J.Crew blockers (and Chewy, Serta blockers) are direct responses to specific liability management abuses"],
  },
  {
    deal: "SVB Collapse (2023)", company: "Silicon Valley Bank", year: "2023", type: "restructuring",
    size: "$209B in assets at failure", keyPlayers: ["FDIC", "First Citizens BancShares"],
    snapshot: "Silicon Valley Bank failed in March 2023 — the second-largest US bank failure ever — after a classic bank run triggered by duration mismatch losses in its bond portfolio. Rising rates had crushed the mark-to-market value of its long-duration treasury holdings. When losses were disclosed, tech startups pulled deposits en masse, forcing a fire sale. The FDIC stepped in within 48 hours.",
    mechanics: ["SVB held ~55% of assets in long-duration MBS and treasuries — extremely rate-sensitive", "Held-to-maturity (HTM) accounting masked $15B+ of unrealised losses from regulatory capital ratios", "Deposit base was concentrated in uninsured tech startups (>$250K) — highly correlated withdrawal risk", "FDIC resolution: First Citizens acquired deposits and loans; Apollo/Centerbridge acquired loan portfolios"],
    interviewQ: "What does the SVB failure tell you about bank credit analysis and interest rate risk?",
    modelAnswer: "SVB illustrates that bank credit analysis must go beyond headline capital ratios to examine the quality and duration of asset portfolios. HTM accounting allowed SVB to avoid reporting losses that were economically real — a due diligence red flag. More fundamentally, it shows concentration risk: SVB's depositor base was unusually correlated — all tech, all uninsured — which meant a single narrative could trigger simultaneous withdrawals. For credit investors in bank paper, analysing deposit stability, duration gaps, and unrealised losses in the securities portfolio is as important as loan quality.",
    lessons: ["HTM vs AFS accounting treatment can mask real economic losses in bank portfolios", "Deposit concentration and correlation risk is as important as deposit size", "Duration mismatch between assets and liabilities is the oldest bank risk — and still lethal"],
  },
  {
    deal: "Tricolor Holdings Restructuring (2023–2024)", company: "Tricolor Holdings", year: "2024", type: "distressed",
    size: "Warehouse + ABS financing", keyPlayers: ["Warehouse lenders", "ABS investors"],
    snapshot: "Tricolor Holdings, a subprime auto lender and used car dealer focused on Hispanic borrowers in the US, hit a liquidity wall in 2023–2024. The business model depended on warehouse lines and ABS securitization to fund loan origination — but rising rates compressed margins, subprime credit deteriorated, and ABS execution worsened. Warehouse lenders tightened advance rates, triggering a liquidity squeeze that forced a restructuring. Critically, this was a financing model failure, not a pure operating failure.",
    mechanics: ["Warehouse lines (senior secured, borrowing-base driven) were the critical funding mechanism — tightening advance rates triggered immediate liquidity stress", "ABS investors held ring-fenced loan pools at the SPV level — structurally ahead of any corporate creditors", "Corporate creditors were structurally subordinated: ABS SPVs and warehouse lenders sat ahead in the waterfall", "Going-concern value (platform + servicing + origination franchise) far exceeded liquidation value — creating strong incentive to amend-and-extend rather than liquidate"],
    interviewQ: "What is the key difference between a liquidity failure and a solvency failure, and how does Tricolor illustrate it?",
    modelAnswer: "A liquidity failure means the business cannot fund itself despite having fundamental value — the platform is viable but the funding model is broken. A solvency failure means the business has no intrinsic value to recover. Tricolor was a liquidity failure: the loan origination platform had real value, but it depended on warehouse lines and ABS markets that became inaccessible as rates rose and credit performance deteriorated. The restructuring focused on preserving the securitization engine — because in specialty finance, the platform's ability to originate and securitize is the core asset. Warehouse lenders, not bondholders, were the fulcrum control point.",
    lessons: ["In specialty finance, control resides with warehouse lenders — not unsecured creditors", "Funding model risk (dependency on capital markets) can be more dangerous than operating risk", "Huge gap between going-concern and liquidation value creates lender incentive to restructure, not foreclose"],
  },
  {
    deal: "Serta Simmons Uptier (2020)", company: "Serta Simmons Bedding", year: "2020", type: "credit",
    size: "$1.9B first-lien term loan", keyPlayers: ["Apollo Global Management", "Angelo Gordon"],
    snapshot: "Serta Simmons Bedding executed one of the most controversial liability management transactions in leveraged finance history in June 2020. A majority lender group — holding over 50% of the first-lien debt — exchanged into new super-priority debt alongside fresh money, while minority lenders were left in their original first-lien position, now subordinated. The transaction ignited 'lender-on-lender violence' as a defining feature of modern distressed credit.",
    mechanics: ["Documentation loophole: the credit agreement permitted 'open market purchases' and non-pro rata exchanges — the majority group exploited both", "Participating lenders exchanged existing first-lien debt into new super-priority notes + contributed new cash, jumping to the front of the waterfall", "Non-participating minority lenders remained in the old first-lien — now primed by the super-priority debt they didn't vote to create", "Litigation from excluded lenders ran 2020–2022; Serta filed Chapter 11 in 2023, where participating lenders' structural advantage held"],
    interviewQ: "What is an uptier transaction and why does it represent a systemic risk for credit investors?",
    modelAnswer: "An uptier transaction allows a company working with a majority lender group to exchange existing debt into new super-priority debt, legally subordinating the minority lenders who did not participate. It works by exploiting loose credit agreement language — particularly open-market purchase baskets and non-pro rata exchange provisions — rather than triggering an actual default. The systemic risk is that creditors can be primed overnight by the majority group, making the outcome of a restructuring depend less on fundamental analysis and more on which lender group you belong to. Post-Serta, sophisticated credit investors now review coordination risk as part of every position: if you're not in the controlling group, your recovery can be impaired before a restructuring even formally begins.",
    lessons: ["Documentation risk: open-market purchase baskets and non-pro rata language can enable priming without a default", "In distressed situations, being in the majority lender group — not fundamental analysis — can determine your recovery", "Serta blockers are now negotiated in new credit agreements to prevent non-pro rata debt exchanges"],
  },
  {
    deal: "Envision Healthcare Chapter 11 (2023)", company: "Envision Healthcare", year: "2023", type: "distressed",
    size: "$7.7B in liabilities", keyPlayers: ["KKR"],
    snapshot: "Envision Healthcare, the largest physician staffing company in the US, filed Chapter 11 in May 2023. KKR's 2018 $9.9B take-private was underwritten on stable physician staffing cash flows — but the No Surprises Act (2021) structurally reset reimbursement economics, collapsing EBITDA. Unlike Serta or J.Crew, there was no documentation trick here: this was a fundamental impairment case where enterprise value simply fell below the debt stack.",
    mechanics: ["No Surprises Act eliminated out-of-network billing — Envision's key margin driver — causing a structural EBITDA reset", "With ~$7B of debt on a business with reset earnings, the fulcrum security moved from second lien to first lien", "First-lien lenders became the controlling class: they received equity in the reorganised business", "Second-lien and unsecured creditors were substantially impaired; KKR's equity was wiped out entirely"],
    interviewQ: "What does Envision teach you about the difference between regulatory risk and cyclical risk in credit underwriting?",
    modelAnswer: "Regulatory risk is structurally different from cyclical risk because it doesn't revert. When the No Surprises Act eliminated out-of-network billing economics, Envision's EBITDA reset permanently — no operational improvement could get it back. Cyclical downturns eventually recover; regulatory repricing of a business model does not. In healthcare services credit underwriting, you must stress-test payer mix concentration and model scenarios where regulatory or contractual changes reprice the revenue base. A highly leveraged capital structure with no resilience to a permanent earnings reset is the definition of a fragile credit.",
    lessons: ["Regulatory shock is permanent impairment — unlike cyclical downturns, it does not revert", "When fundamental value falls below the debt stack, only the fulcrum creditor class wins — all junior claims are impaired", "Healthcare services LBOs require explicit payer concentration and reimbursement change stress tests"],
  },
  {
    deal: "Pluralsight Creditor Takeover (2024)", company: "Pluralsight", year: "2024", type: "credit",
    size: "$2.4B in debt", keyPlayers: ["Vista Equity Partners", "Blue Owl (Owl Rock)"],
    snapshot: "Pluralsight, a technology skills platform taken private by Vista Equity Partners in 2017 for $3.5B, underwent a creditor-led restructuring in 2024 after revenue growth stalled and the company couldn't service $2.4B of private credit debt. Private credit lenders including Blue Owl converted their debt to equity, effectively taking ownership of the business while wiping out Vista's equity. It is one of the clearest recent examples of private credit lenders becoming owners through restructuring.",
    mechanics: ["Vista's 2017 take-private was underwritten on aggressive growth assumptions that didn't materialise as the edtech market matured", "Debt was held largely by direct lenders (private credit funds) rather than broadly syndicated — enabling a faster, private restructuring without court involvement", "Debt-to-equity conversion: lenders exchanged their debt claims for 100% of the equity, wiping out Vista's $1B+ equity investment", "Out-of-court process: because the debt was held by a small number of institutional lenders, the restructuring was negotiated privately and completed without Chapter 11"],
    interviewQ: "What is a creditor-led takeover and how does private credit's hold-to-maturity structure enable it?",
    modelAnswer: "A creditor-led takeover occurs when lenders convert their debt to equity through a restructuring, becoming the owners of the business. Private credit funds are uniquely positioned to execute these efficiently because they hold debt in concentrated, bilateral positions — unlike broadly syndicated loans held by hundreds of investors. With a small group of sophisticated lenders at the table, you can negotiate an out-of-court restructuring in weeks rather than months. The lenders effectively decide: is it better to foreclose and own the business, or continue as creditors? When the equity is underwater and the business has fundamental value, taking ownership and waiting for recovery is often the better outcome.",
    lessons: ["Private credit's concentrated hold structure enables faster out-of-court restructurings vs broadly syndicated markets", "Debt-to-equity conversions give credit funds equity-like upside — blurring the line between credit and PE investing", "Aggressive LBO growth assumptions in software/edtech create fragile capital structures when growth disappoints"],
  },
];

const CASE_TYPE_STYLE: Record<string, { label: string; cls: string }> = {
  distressed:    { label: "Distressed", cls: "bg-red-50 text-red-600 border-red-200" },
  lbo:           { label: "LBO", cls: "bg-violet-50 text-violet-600 border-violet-200" },
  credit:        { label: "Credit", cls: "bg-sky-50 text-[#396477] border-sky-200" },
  restructuring: { label: "Restructuring", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ma:            { label: "M&A", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

interface AiCase {
  deal: string; company: string; year: string;
  type: string; size: string; keyPlayers: string[];
  snapshot: string; mechanics: string[];
  interviewQ: string; modelAnswer: string; lessons: string[];
}

function CaseLibrarySection() {
  const [selected, setSelected] = useState<StaticCase | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [aiInput, setAiInput] = useState("");
  const [aiCase, setAiCase] = useState<AiCase | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const filters = ["all", "distressed", "lbo", "credit", "restructuring"];
  const visible = filter === "all" ? STATIC_CASES : STATIC_CASES.filter(c => c.type === filter);

  async function fetchAiCase() {
    const deal = aiInput.trim();
    if (!deal) return;
    setAiLoading(true); setAiError(null); setAiCase(null);
    try {
      const r = await fetch(`/api/case-study?deal=${encodeURIComponent(deal)}`);
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || "Failed");
      setAiCase(d);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Failed to generate case study");
    } finally {
      setAiLoading(false);
    }
  }

  const displayCase = selected ?? (aiCase as unknown as StaticCase | null);

  if (displayCase) {
    const style = CASE_TYPE_STYLE[displayCase.type] ?? CASE_TYPE_STYLE.distressed;
    return (
      <div className="space-y-5">
        <button onClick={() => { setSelected(null); setAiCase(null); }}
          className="flex items-center gap-1.5 text-xs text-[#396477] hover:text-[#2d5162] font-medium transition-colors">
          ← Back to cases
        </button>
        <div className="border border-gray-200 bg-white rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${style.cls}`}>{style.label}</span>
              <span className="text-[11px] text-gray-400">{displayCase.year} · {displayCase.size}</span>
            </div>
            <h2 className="text-[#191c1e] text-lg font-bold">{displayCase.deal}</h2>
            <p className="text-xs text-[#41484c] mt-2 leading-relaxed">{displayCase.snapshot}</p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {displayCase.keyPlayers.map(f => (
                <span key={f} className="text-[10px] px-1.5 py-0.5 bg-sky-50 text-[#396477] border border-sky-100 rounded font-medium">{f}</span>
              ))}
            </div>
          </div>
          <div className="px-6 py-4 border-b border-gray-100 space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Key Mechanics</p>
            <ul className="space-y-1.5">
              {displayCase.mechanics.map((m, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#41484c]">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-[#396477] flex-shrink-0" />
                  {m}
                </li>
              ))}
            </ul>
          </div>
          <div className="px-6 py-4 border-b border-gray-100 bg-rose-50/30 space-y-3">
            <p className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">Interview Question</p>
            <p className="text-sm font-medium text-[#191c1e] italic">&ldquo;{displayCase.interviewQ}&rdquo;</p>
            <div className="bg-white border border-rose-100 rounded-lg px-4 py-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Model Answer</p>
              <p className="text-xs text-[#41484c] leading-relaxed">{displayCase.modelAnswer}</p>
            </div>
          </div>
          <div className="px-6 py-4 space-y-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Key Lessons</p>
            <ul className="space-y-1.5">
              {displayCase.lessons.map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#41484c]">
                  <span className="text-emerald-500 font-bold flex-shrink-0">{i + 1}.</span>
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all capitalize ${
              filter === f ? "bg-[#396477] text-white border-[#396477]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}>
            {f === "all" ? "All Cases" : CASE_TYPE_STYLE[f]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Static case grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map(c => {
          const style = CASE_TYPE_STYLE[c.type] ?? CASE_TYPE_STYLE.distressed;
          return (
            <button key={c.deal} onClick={() => setSelected(c)}
              className="text-left border border-gray-200 bg-white rounded-xl px-4 py-4 hover:border-[#396477]/40 hover:shadow-sm transition-all group">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${style.cls}`}>{style.label}</span>
                <span className="text-[11px] text-gray-400">{c.year}</span>
              </div>
              <p className="font-semibold text-sm text-[#191c1e] group-hover:text-[#396477] transition-colors">{c.company}</p>
              <p className="text-xs text-gray-500 mt-0.5">{c.size}</p>
              <p className="text-xs text-[#71787c] mt-2 leading-relaxed line-clamp-2">{c.snapshot.split(".")[0]}.</p>
            </button>
          );
        })}
      </div>

      {/* AI on-demand */}
      <div className="border border-dashed border-gray-300 rounded-xl px-5 py-5 space-y-3 bg-gray-50/50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Analyze Any Deal with AI</p>
        <p className="text-xs text-gray-400">Enter any deal name — e.g. "Sears bankruptcy", "Dell go-private", "Envision Healthcare restructuring"</p>
        <div className="flex gap-2">
          <input
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchAiCase()}
            placeholder="e.g. Sears Chapter 11, Dell LBO, Envision Healthcare..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#396477] bg-white"
          />
          <button onClick={fetchAiCase} disabled={aiLoading || !aiInput.trim()}
            className="px-4 py-2 bg-[#396477] text-white text-xs font-semibold rounded-lg hover:bg-[#2d5162] disabled:opacity-40 transition-colors flex-shrink-0">
            {aiLoading ? "Generating…" : "Analyze →"}
          </button>
        </div>
        {aiError && <p className="text-xs text-red-500">{aiError}</p>}
        {aiLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-3 h-3 border border-gray-300 border-t-[#396477] rounded-full animate-spin" />
            Building case study…
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Hiring Watch Section ─────────────────────────────────────────────────────

function HiringSection({
  signals, loading, fundFilings, onViewSignals,
}: {
  signals: JobSignal[];
  loading: boolean;
  fundFilings: FundFiling[];
  onViewSignals: () => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [view, setView] = useState<"firms" | "roles">("firms");
  const [compact, setCompact] = useState(false);

  const filtered = categoryFilter === "all"
    ? signals
    : signals.filter((s) => s.category === categoryFilter);

  const intel = buildIntelFromJobs(filtered);

  const activeIds = new Set([...intel.hiringPush, ...intel.postRaise].map((f) => f.firmId));
  const allRegistryProfiles = [...intel.hiringPush, ...intel.postRaise];

  // Early signals: firms in FIRM_REGISTRY with EDGAR filings but no posted roles
  const earlySignalFirms = FIRM_REGISTRY
    .filter((f) => !activeIds.has(f.id))
    .map((f) => ({ def: f, filing: fundFilings.find((fi) => matchFirm(fi.entityName)?.id === f.id) }))
    .filter(({ filing }) => !!filing);

  // On the radar: no EDGAR filing either
  const onRadarFirms = FIRM_REGISTRY.filter((f) => {
    if (activeIds.has(f.id)) return false;
    return !fundFilings.some((fi) => matchFirm(fi.entityName)?.id === f.id);
  });

  // Other roles from outside the watchlist
  const otherRoles = intel.allRoles.filter((r) => !matchFirm(r.firm) && r.classification.frontOffice);

  return (
    <div className="space-y-8 py-1">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setView("firms")} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${view === "firms" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            Watch List
          </button>
          <button onClick={() => setView("roles")} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${view === "roles" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            All Roles ({intel.allRoles.filter(r => r.classification.frontOffice).length})
          </button>
        </div>
        <div className="w-px h-5 bg-gray-200 hidden sm:block" />
        {JOB_CATEGORIES.slice(0, 5).map((c) => (
          <button key={c.v} onClick={() => setCategoryFilter(categoryFilter === c.v && c.v !== "all" ? "all" : c.v)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              categoryFilter === c.v ? "bg-[#396477] text-white border-[#396477]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}>
            {c.l}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setCompact(c => !c)}
            title={compact ? "Card view" : "Compact view"}
            className={`p-1.5 rounded-lg border text-gray-400 hover:text-gray-600 transition-colors ${compact ? "bg-gray-100 border-gray-300 text-gray-600" : "bg-white border-gray-200"}`}>
            {compact
              ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" strokeWidth="2" rx="1"/><rect x="14" y="3" width="7" height="7" strokeWidth="2" rx="1"/><rect x="3" y="14" width="7" height="7" strokeWidth="2" rx="1"/><rect x="14" y="14" width="7" height="7" strokeWidth="2" rx="1"/></svg>
              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" strokeWidth="2"/><line x1="3" y1="12" x2="21" y2="12" strokeWidth="2"/><line x1="3" y1="18" x2="21" y2="18" strokeWidth="2"/></svg>
            }
          </button>
          <span className="text-xs text-gray-400">
            {loading ? "Loading…" : `${allRegistryProfiles.length} firms hiring · ${earlySignalFirms.length} early signals`}
          </span>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-[#c1c7cc]/40 rounded-xl p-5 animate-pulse">
              <div className="h-4 w-48 bg-[#e0e3e5] rounded mb-3" />
              <div className="h-3 w-full bg-[#f0f2f4] rounded mb-2" />
              <div className="h-3 w-3/4 bg-[#f0f2f4] rounded" />
            </div>
          ))}
        </div>
      )}

      {view === "firms" && !loading && (
        <>
          {/* Active + Near-Term Watch firms */}
          {allRegistryProfiles.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-sm font-bold text-[#191c1e]">Active Signals</h2>
                <span className="text-[10px] bg-[#c3ecd7] text-[#416656] font-bold px-1.5 py-0.5 rounded">{allRegistryProfiles.length}</span>
                <span className="text-xs text-[#71787c]">Firms actively hiring</span>
              </div>
              <div className={compact ? "space-y-1" : "grid gap-4 sm:grid-cols-2"}>
                {allRegistryProfiles.map((p) => (
                  <HiringFirmCard key={p.firmId} profile={p} fundFilings={fundFilings} onViewSignals={onViewSignals} compact={compact} />
                ))}
              </div>
            </section>
          )}

          {allRegistryProfiles.length === 0 && null}

          {/* Other roles (not in watchlist) */}
          {otherRoles.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-[#191c1e]">Other Roles</h2>
                <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded">{otherRoles.length}</span>
                <span className="text-xs text-[#71787c]">Outside the watch list</span>
              </div>
              <div className="space-y-2">
                {otherRoles.slice(0, 12).map((r) => (
                  <a key={r.id} href={r.edgarUrl || "#"} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-white border border-[#c1c7cc]/40 rounded-xl px-4 py-3 hover:border-[#396477]/30 hover:shadow-sm transition-all group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <SeniorityBadge seniority={r.classification.seniority} frontOffice={r.classification.frontOffice} />
                        <span className="font-semibold text-sm text-[#191c1e] group-hover:text-[#396477] transition-colors truncate">{r.role}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#71787c]">
                        <span className="font-medium text-[#41484c]">{r.firm}</span>
                        <span>·</span><span>{r.location}</span>
                        <span>·</span><span>{r.daysAgo}d ago</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* ── Early Signals — the predictive layer ── */}
          {earlySignalFirms.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-bold text-[#191c1e]">Early Signals</h2>
                <span className="text-[10px] bg-[#e1ddf2]/70 text-[#5e5c6e] font-bold px-1.5 py-0.5 rounded border border-[#c7c4d8]/50">{earlySignalFirms.length}</span>
              </div>
              <p className="text-xs text-[#71787c] mb-4 max-w-2xl">
                These firms have recent EDGAR capital activity but no roles posted yet. Capital raises typically precede hiring by one to three quarters. Engaging before a formal process is the most effective approach.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {earlySignalFirms.map(({ def: f, filing }) => (
                  <div key={f.id} className="bg-white border border-[#c7c4d8]/50 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <WatchStatusBadge status="Early Signal" />
                          <button onClick={onViewSignals} className="text-[10px] font-semibold text-[#396477] hover:underline">
                            Fund signal{filing!.totalOfferingAmount ? ` · ${fmt(filing!.totalOfferingAmount)}` : ""} ↗
                          </button>
                          {(() => { const t = hiringTimeline(filing!.daysSinceFiling); return t ? <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${t.cls}`}>{t.label}</span> : null; })()}
                        </div>
                        <span className="font-bold text-[#191c1e] text-sm">{f.name}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {f.strategies.slice(0, 2).map((s) => <StrategyTag key={s} s={s} />)}
                        </div>
                      </div>
                      {f.careersUrl && (
                        <a href={f.careersUrl} target="_blank" rel="noopener noreferrer"
                          className="flex-shrink-0 text-[10px] font-semibold text-[#396477] border border-[#396477]/30 px-2 py-0.5 rounded hover:bg-[#396477] hover:text-white transition-colors mt-0.5">
                          Careers →
                        </a>
                      )}
                    </div>
                    <p className="text-[12px] text-[#41484c] leading-relaxed bg-[#f7f9fb] border border-[#e8eaec] rounded-lg px-3 py-2">
                      {generateEarlySignalNote(filing!)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* On the Radar */}
          {onRadarFirms.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-bold text-[#191c1e]">On the Radar</h2>
                <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded">{onRadarFirms.length}</span>
              </div>
              <p className="text-xs text-[#71787c] mb-3">Monitored firms with no current signal. These managers hire, but often through headhunters or proprietary pipelines — check career pages directly.</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {onRadarFirms.map((f) => (
                  <div key={f.id} className="bg-white border border-[#c1c7cc]/30 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <WatchStatusBadge status="On the Radar" />
                      <span className="font-semibold text-sm text-[#41484c] truncate">{f.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {f.strategies.slice(0, 2).map((s) => <StrategyTag key={s} s={s} />)}
                    </div>
                    <p className="text-[11px] text-[#71787c] leading-relaxed mb-2">{f.desc}</p>
                    {f.careersUrl && (
                      <a href={f.careersUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-semibold text-[#396477] border border-[#396477]/30 px-2 py-0.5 rounded hover:bg-[#396477] hover:text-white transition-colors inline-block">
                        Careers →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {view === "roles" && !loading && (() => {
        const visibleRoles = intel.allRoles.filter(
          r => r.classification.frontOffice && r.classification.seniority !== "other"
        );
        const internRoles   = visibleRoles.filter(r => r.classification.seniority === "intern");
        const juniorRoles   = visibleRoles.filter(r => ["analyst", "associate"].includes(r.classification.seniority));
        const seniorRoles   = visibleRoles.filter(r => ["vp", "director", "md", "partner"].includes(r.classification.seniority));

        const RoleList = ({ roles }: { roles: typeof visibleRoles }) => (
          <div className="space-y-2">
            {roles.map((r) => (
              <a key={r.id} href={r.edgarUrl || "#"} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 bg-white border border-[#c1c7cc]/40 rounded-xl px-4 py-3 hover:border-[#396477]/30 hover:shadow-sm transition-all group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <SeniorityBadge seniority={r.classification.seniority} frontOffice={r.classification.frontOffice} />
                    <span className="font-semibold text-sm text-[#191c1e] group-hover:text-[#396477] transition-colors truncate">{r.role}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#71787c]">
                    <span className="font-medium text-[#41484c]">{r.firm}</span>
                    <span>·</span><span>{r.location}</span>
                    <span>·</span><span>{r.daysAgo}d ago</span>
                    {r.source && <><span>·</span><span className="capitalize">{r.source}</span></>}
                  </div>
                  {r.classification.signal && (
                    <p className="text-[11px] text-[#71787c] italic mt-1 leading-relaxed">{r.classification.signal}</p>
                  )}
                </div>
              </a>
            ))}
          </div>
        );

        if (visibleRoles.length === 0) return null;

        return (
          <div className="space-y-8">
            {seniorRoles.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-[#191c1e]">Senior Roles</h3>
                  <span className="text-[10px] bg-violet-100 text-violet-700 font-bold px-1.5 py-0.5 rounded">{seniorRoles.length}</span>
                  <span className="text-xs text-[#71787c]">VP · Director · MD · Partner</span>
                </div>
                <RoleList roles={seniorRoles} />
              </section>
            )}
            {juniorRoles.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-[#191c1e]">Experienced Junior Roles</h3>
                  <span className="text-[10px] bg-sky-100 text-sky-700 font-bold px-1.5 py-0.5 rounded">{juniorRoles.length}</span>
                  <span className="text-xs text-[#71787c]">Analyst · Associate</span>
                </div>
                <RoleList roles={juniorRoles} />
              </section>
            )}
            {internRoles.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-bold text-[#191c1e]">Internships</h3>
                  <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded">{internRoles.length}</span>
                  <span className="text-xs text-[#71787c]">Summer · Co-op · Intern</span>
                </div>
                <RoleList roles={internRoles} />
              </section>
            )}
          </div>
        );
      })()}

      {(signals.length > 0 || !loading) && (
        <p className="text-center text-xs text-gray-400 py-1">
          Sourced from firm career pages, SEC EDGAR · 28 firms monitored · Updated continuously
        </p>
      )}
    </div>
  );
}

function WatchStatusBadge({ status }: { status: WatchStatus }) {
  const { badge, dot } = WATCH_STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 animate-pulse" />}
      {status}
    </span>
  );
}

function HiringFirmCard({ profile, fundFilings, onViewSignals, compact = false }: {
  profile: FirmIntelProfile;
  fundFilings: FundFiling[];
  onViewSignals: () => void;
  compact?: boolean;
}) {
  const filing = fundFilings.find((f) => matchFirm(f.entityName)?.id === profile.firmId);
  const topRoles = profile.openRoles.filter(r => r.classification.frontOffice).slice(0, 4);
  const watchStatus = getWatchStatus(profile.frontOfficeCount, filing);
  const signalNote = generateSignalNote(profile, filing);

  if (compact) {
    return (
      <div className="bg-white border border-[#c1c7cc]/40 rounded-lg px-4 py-2.5 flex items-center gap-3 hover:border-[#396477]/40 transition-colors">
        <WatchStatusBadge status={watchStatus} />
        <span className="font-semibold text-sm text-[#191c1e] flex-1 truncate">{profile.name}</span>
        <span className="text-xs text-[#396477] font-bold flex-shrink-0">{profile.frontOfficeCount} open</span>
        {filing && (
          <button onClick={(e) => { e.stopPropagation(); onViewSignals(); }}
            className="text-[10px] font-semibold text-[#71787c] hover:text-[#396477] transition-colors flex-shrink-0">
            signal ↗
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="card-lift bg-white border border-[#c1c7cc]/40 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <WatchStatusBadge status={watchStatus} />
            {filing && (
              <button onClick={(e) => { e.stopPropagation(); onViewSignals(); }}
                className="text-[10px] font-semibold text-[#396477] hover:underline transition-colors">
                Fund signal{filing.totalOfferingAmount ? ` · ${fmt(filing.totalOfferingAmount)}` : ""} ↗
              </button>
            )}
          </div>
          <span className="font-bold text-[#191c1e] text-sm">{profile.name}</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {profile.strategies.slice(0, 3).map((s) => <StrategyTag key={s} s={s} />)}
          </div>
        </div>
        <span className="text-xs font-bold text-[#396477] flex-shrink-0 pt-0.5">{profile.frontOfficeCount} open</span>
      </div>

      {/* Signal note */}
      <p className="text-[12px] text-[#41484c] leading-relaxed bg-[#f7f9fb] border border-[#e8eaec] rounded-lg px-3 py-2 mb-3">
        {signalNote}
      </p>

      {/* Roles */}
      {topRoles.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-[#f0f2f4]">
          {topRoles.map((r) => (
            <a key={r.id} href={r.edgarUrl || "#"} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 group">
              <div className="flex items-center gap-2 min-w-0">
                <SeniorityBadge seniority={r.classification.seniority} frontOffice={r.classification.frontOffice} />
                <span className="text-xs text-[#41484c] group-hover:text-[#396477] truncate transition-colors">{r.role}</span>
              </div>
              <span className="text-[10px] text-[#71787c] flex-shrink-0">{r.daysAgo}d</span>
            </a>
          ))}
          {profile.frontOfficeCount > 4 && (
            <p className="text-[11px] text-[#71787c] pt-0.5">+{profile.frontOfficeCount - 4} more</p>
          )}
        </div>
      )}
    </div>
  );
}

function IntelSection() {
  const [data, setData] = useState<IntelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"firms" | "roles">("firms");

  useEffect(() => {
    // Use the proven /api/jobs endpoint — aggregates Greenhouse, Lever, EDGAR,
    // Adzuna, LinkedIn. Intel tab does firm-level grouping client-side.
    fetch("/api/jobs?dateRange=45")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || `Error ${r.status}`);
        setData(buildIntelFromJobs(d.signals ?? []));
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-2">
          <div className="h-4 w-32 bg-[#e0e3e5] rounded animate-pulse" />
          <div className="h-4 w-24 bg-[#e0e3e5] rounded animate-pulse" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-[#c1c7cc]/40 rounded-xl p-5 animate-pulse">
            <div className="h-4 w-48 bg-[#e0e3e5] rounded mb-3" />
            <div className="h-3 w-32 bg-[#f0f2f4] rounded mb-2" />
            <div className="h-3 w-40 bg-[#f0f2f4] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>;
  }

  if (!data) return null;

  const allFirms = [...(data.hiringPush ?? []), ...(data.postRaise ?? []), ...(data.strategyBuilds ?? [])];

  return (
    <div className="space-y-8 py-2">
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setView("firms")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${view === "firms" ? "bg-[#396477] text-white" : "bg-[#f2f4f6] text-[#41484c] hover:bg-[#e8eaec]"}`}
        >
          Firms ({allFirms.length})
        </button>
        <button
          onClick={() => setView("roles")}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${view === "roles" ? "bg-[#396477] text-white" : "bg-[#f2f4f6] text-[#41484c] hover:bg-[#e8eaec]"}`}
        >
          All Roles ({data.allRoles.filter((r) => r.classification.frontOffice).length})
        </button>
      </div>

      {view === "firms" && (
        <>
          {data.hiringPush.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-[#191c1e]">Firms on a Hiring Push</h2>
                <span className="text-[10px] bg-[#c3ecd7] text-[#416656] font-bold px-1.5 py-0.5 rounded">
                  {data.hiringPush.length}
                </span>
                <span className="text-xs text-[#71787c]">3+ roles open</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.hiringPush.map((p) => <FirmCard key={p.firmId} profile={p} />)}
              </div>
            </section>
          )}

          {data.postRaise.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-[#191c1e]">Active Hiring</h2>
                <span className="text-[10px] bg-sky-100 text-[#396477] font-bold px-1.5 py-0.5 rounded">
                  {data.postRaise.length}
                </span>
                <span className="text-xs text-[#71787c]">Known firms with open roles</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.postRaise.map((p) => <FirmCard key={p.firmId} profile={p} />)}
              </div>
            </section>
          )}

          {data.strategyBuilds.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-[#191c1e]">Strategy Buildouts</h2>
                <span className="text-[10px] bg-[#e1ddf2]/70 text-[#5e5c6e] font-bold px-1.5 py-0.5 rounded">
                  {data.strategyBuilds.length}
                </span>
                <span className="text-xs text-[#71787c]">Hiring into new asset class</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.strategyBuilds.map((p) => <FirmCard key={p.firmId} profile={p} />)}
              </div>
            </section>
          )}

          {allFirms.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-3xl mb-3">🔍</div>
              <p className="font-semibold text-gray-700 text-sm">No firm signals found in the last 30 days</p>
              <p className="text-xs mt-1.5 max-w-xs mx-auto">Career pages are checked every 30 minutes. Check back later or expand the date range.</p>
            </div>
          )}

          {/* Watched firms with no current roles */}
          {(() => {
            const activeIds = new Set(allFirms.map((f) => f.firmId));
            const quiet = FIRM_REGISTRY.filter((f) => !activeIds.has(f.id)).slice(0, 8);
            if (quiet.length === 0) return null;
            return (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-bold text-[#191c1e]">Monitored — No Roles Posted Yet</h2>
                  <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded">{quiet.length}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {quiet.map((f) => (
                    <div key={f.id} className="bg-white border border-[#c1c7cc]/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <TierBadge tier={f.tier} />
                          <span className="font-semibold text-sm text-[#41484c]">{f.name}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {f.strategies.slice(0, 2).map((s) => <StrategyTag key={s} s={s} />)}
                        </div>
                      </div>
                      <span className="text-[10px] text-[#71787c] whitespace-nowrap flex-shrink-0">No open roles</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#71787c] mt-3">
                  These firms are on our watch list. No roles posted in the last 45 days — consider reaching out directly or monitoring their careers page.
                </p>
              </section>
            );
          })()}
        </>
      )}

      {view === "roles" && (
        <div className="space-y-2">
          {data.allRoles
            .filter((r) => r.classification.frontOffice)
            .slice(0, 50)
            .map((r) => (
              <a
                key={r.id}
                href={r.edgarUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 bg-white border border-[#c1c7cc]/40 rounded-xl px-4 py-3 hover:border-[#396477]/30 hover:shadow-[0_1px_6px_rgba(57,100,119,0.08)] transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <SeniorityBadge seniority={r.classification.seniority} frontOffice={r.classification.frontOffice} />
                    <span className="font-semibold text-sm text-[#191c1e] group-hover:text-[#396477] transition-colors truncate">
                      {r.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#71787c]">
                    <span className="font-medium text-[#41484c]">{r.firm}</span>
                    <span>·</span>
                    <span>{r.location}</span>
                    <span>·</span>
                    <span>{r.daysAgo}d ago</span>
                    {r.source && (
                      <>
                        <span>·</span>
                        <span className="capitalize">{r.source}</span>
                      </>
                    )}
                  </div>
                  {r.classification.signal && (
                    <p className="text-[11px] text-[#71787c] italic mt-1 leading-relaxed">
                      {r.classification.signal}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <span className="text-xs font-bold text-[#396477]">{r.classification.relevanceScore}/10</span>
                </div>
              </a>
            ))}
        </div>
      )}

      <p className="text-[11px] text-[#71787c] text-center pt-2">
        Sourced from career pages, SEC EDGAR, Indeed, and LinkedIn · Grouped by firm · Updated every 30 min
      </p>
    </div>
  );
}

// ─── Onlu Table Section ───────────────────────────────────────────────────────

interface TableSession {
  id: string;
  date: string;          // e.g. "Saturday, April 19"
  time: string;          // e.g. "11:00 AM – 1:00 PM ET"
  location: string;      // e.g. "NYC – Midtown"
  theme: string;         // e.g. "Private Credit & Direct Lending"
  capacity: number;
  spotsLeft: number;
  description: string;
}

const UPCOMING_SESSIONS: TableSession[] = [
  {
    id: "apr-19-credit",
    date: "Saturday, April 19",
    time: "11:00 AM – 1:00 PM ET",
    location: "NYC – Midtown",
    theme: "Private Credit & Direct Lending",
    capacity: 8,
    spotsLeft: 6,
    description: "Small-group coffee chat for professionals in private credit, direct lending, and special situations. Compare notes on deal flow, career paths, and what's moving the market.",
  },
  {
    id: "apr-26-pe",
    date: "Saturday, April 26",
    time: "10:30 AM – 12:30 PM ET",
    location: "NYC – Flatiron",
    theme: "Private Equity & Growth",
    capacity: 8,
    spotsLeft: 5,
    description: "For PE associates, analysts, and growth equity investors. Casual conversation on portfolio company dynamics, deal sourcing, and buyside career moves.",
  },
  {
    id: "may-3-multi",
    date: "Saturday, May 3",
    time: "11:00 AM – 1:00 PM ET",
    location: "NYC – Lower Manhattan",
    theme: "Hedge Funds & Multi-Strategy",
    capacity: 8,
    spotsLeft: 7,
    description: "Open table for hedge fund analysts and multi-strat PMs. Topics: market structure, pod dynamics, career mobility, and what's interesting right now.",
  },
];

function OnluTableSection() {
  const [selected, setSelected] = useState<TableSession | null>(null);
  const [form, setForm] = useState({ name: "", email: "", firm: "", role: "", linkedin: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch("/api/table-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, session: selected }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Something went wrong");
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => { setSelected(null); setSubmitted(false); setForm({ name: "", email: "", firm: "", role: "", linkedin: "", note: "" }); };

  return (
    <div className="max-w-3xl mx-auto px-1 py-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-[#1A2B4A]">Onlu Events</h2>
        <p className="text-sm text-[#71787c] leading-relaxed">
          Small-group weekend coffee chats for finance and buyside professionals in NYC.
          Max 8 people per session — curated for meaningful conversation, not networking theatre.
        </p>
      </div>

      {/* Session cards */}
      {!selected && (
        <div className="space-y-4">
          {UPCOMING_SESSIONS.map((s) => (
            <div key={s.id} className="border border-gray-200 rounded-2xl p-5 bg-white hover:border-[#1A2B4A]/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#1A2B4A]/8 text-[#1A2B4A]">{s.theme}</span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.spotsLeft <= 2 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"}`}>
                      {s.spotsLeft} spot{s.spotsLeft !== 1 ? "s" : ""} left
                    </span>
                  </div>
                  <p className="text-[15px] font-semibold text-[#1A2B4A] mt-2">{s.date}</p>
                  <p className="text-xs text-[#71787c]">{s.time} · {s.location}</p>
                  <p className="text-sm text-[#41484c] mt-2 leading-relaxed">{s.description}</p>
                </div>
              </div>
              <button
                onClick={() => { setSelected(s); setSubmitted(false); }}
                disabled={s.spotsLeft === 0}
                className="mt-4 w-full py-2.5 bg-[#1A2B4A] text-white text-sm font-semibold rounded-xl hover:bg-[#243d6b] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {s.spotsLeft === 0 ? "Full" : "Request a Seat →"}
              </button>
            </div>
          ))}
          <p className="text-[11px] text-[#71787c] text-center pt-1">
            Sessions added every few weeks · NYC only for now · All levels welcome
          </p>
        </div>
      )}

      {/* Signup form */}
      {selected && !submitted && (
        <div className="border border-gray-200 rounded-2xl p-6 bg-white space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#71787c]">{selected.date} · {selected.time}</p>
              <p className="text-base font-semibold text-[#1A2B4A] mt-0.5">{selected.theme} — {selected.location}</p>
            </div>
            <button onClick={reset} className="text-xs text-[#71787c] hover:text-[#1A2B4A] transition-colors">← Back</button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#41484c] mb-1">Full name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B4A]/20 focus:border-[#1A2B4A]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#41484c] mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jane@example.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B4A]/20 focus:border-[#1A2B4A]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#41484c] mb-1">Firm *</label>
                <input required value={form.firm} onChange={e => setForm(f => ({ ...f, firm: e.target.value }))}
                  placeholder="Ares Management"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B4A]/20 focus:border-[#1A2B4A]" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#41484c] mb-1">Role *</label>
                <input required value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  placeholder="Credit Analyst"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B4A]/20 focus:border-[#1A2B4A]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#41484c] mb-1">LinkedIn URL <span className="text-[#71787c] font-normal">(optional)</span></label>
              <input value={form.linkedin} onChange={e => setForm(f => ({ ...f, linkedin: e.target.value }))}
                placeholder="linkedin.com/in/janesmith"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B4A]/20 focus:border-[#1A2B4A]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#41484c] mb-1">What do you want to get out of this? <span className="text-[#71787c] font-normal">(optional)</span></label>
              <textarea rows={3} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="e.g. Looking to connect with peers in private credit, compare notes on the market…"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B4A]/20 focus:border-[#1A2B4A] resize-none" />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button type="submit" disabled={submitting}
              className="w-full py-3 bg-[#1A2B4A] text-white text-sm font-semibold rounded-xl hover:bg-[#243d6b] transition-colors disabled:opacity-50">
              {submitting ? "Submitting…" : "Request My Seat →"}
            </button>
            <p className="text-[11px] text-[#71787c] text-center">
              We&apos;ll confirm your spot by email within 24 hours. Seats are limited to 8 per session.
            </p>
          </form>
        </div>
      )}

      {/* Success */}
      {selected && submitted && (
        <div className="border border-emerald-200 rounded-2xl p-8 bg-emerald-50 text-center space-y-3">
          <div className="text-2xl">☕</div>
          <p className="text-base font-semibold text-[#1A2B4A]">You&apos;re on the list</p>
          <p className="text-sm text-[#41484c]">
            We&apos;ll send a confirmation to <strong>{form.email}</strong> within 24 hours with location details and who else is joining.
          </p>
          <button onClick={reset} className="mt-2 text-sm text-[#1A2B4A] underline hover:text-[#243d6b]">Browse other sessions</button>
        </div>
      )}
    </div>
  );
}
