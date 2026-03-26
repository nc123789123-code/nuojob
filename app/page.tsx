"use client";

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
  category: "all", dateRange: "90", signalTag: "all",
};

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

type TopTab = "funds" | "jobs" | "insights";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as TopTab | null) ?? "funds";
  const [topTab, setTopTab] = useState<TopTab>(
    ["funds", "jobs", "insights"].includes(initialTab) ? initialTab : "funds"
  );

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
      const params = new URLSearchParams({ query: f.query, strategy: f.strategy, dateRange: f.dateRange, bucket: f.bucket, minAmount: f.minAmount });
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

  useEffect(() => {
    if (topTab !== "jobs") return;
    if (jobDebounceRef.current) clearTimeout(jobDebounceRef.current);
    jobDebounceRef.current = setTimeout(() => { jobFetchedRef.current = true; fetchJobs(jobFilters); }, 400);
    return () => { if (jobDebounceRef.current) clearTimeout(jobDebounceRef.current); };
  }, [jobFilters, fetchJobs, topTab]);

  useEffect(() => {
    if (topTab === "jobs" && !jobFetchedRef.current) { jobFetchedRef.current = true; fetchJobs(jobFilters); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topTab]);

  const outreachRecords = Object.values(records).filter((r) => r.status !== "not_contacted");

  return (
    <div className="min-h-screen bg-[#f7f9fb]">
      {/* Nav */}
      <header className="glass-panel sticky top-0 z-20 border-b border-[#c1c7cc]/30 shadow-[0_1px_8px_rgba(57,100,119,0.06)]">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <LogoMark size={28} />
            <span className="font-semibold text-sm tracking-tight" style={{ color: "#6aab8e" }}>Onlu</span>
          </div>
          <div className="w-px h-4 bg-[#c1c7cc]/50" />
          <nav className="flex items-center gap-1">
            <NavTab active={topTab === "jobs"} onClick={() => setTopTab("jobs")} label="Hiring Intel" badge />
            <NavTab active={topTab === "funds"} onClick={() => setTopTab("funds")} label="Fund Signals" />
            <NavTab active={topTab === "insights"} onClick={() => setTopTab("insights")} label="Insights" />
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <a href="#guide" className="hidden sm:inline text-[#41484c] hover:text-[#191c1e] text-xs transition-colors">Interview Guide</a>
            <Link href="/about" className="hidden sm:inline text-[#41484c] hover:text-[#191c1e] text-xs transition-colors">About</Link>
            <Link href="/contact" className="hidden sm:inline text-[#41484c] hover:text-[#191c1e] text-xs transition-colors">Contact</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="hero-gradient border-b border-sky-100/60">
        <div className="max-w-6xl mx-auto px-5 py-10">
          {topTab === "funds" && (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100/70 text-[#396477] text-[11px] font-semibold tracking-wider uppercase rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-[#396477] rounded-full" />
                Live fund intelligence
              </div>
              <h1 className="text-[#191c1e] text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
                Track Hiring Signals Across Private Credit &amp; Special Situations
              </h1>
              <p className="text-[#41484c] text-sm mt-3 max-w-xl leading-relaxed">
                Fund activity, job signals, and market insights — so you know where opportunities are before they&apos;re posted.
              </p>
              <p className="text-[#71787c] text-xs mt-2 max-w-xl">
                Built for candidates targeting private credit, special situations, and restructuring.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-5">
                <button
                  onClick={() => setTopTab("funds")}
                  className="px-4 py-2 bg-[#396477] text-white text-sm font-semibold rounded-lg hover:bg-[#2d5162] transition-colors shadow-[0_2px_8px_rgba(57,100,119,0.25)]"
                >
                  Explore Signals
                </button>
                <button
                  onClick={() => setTopTab("jobs")}
                  className="px-4 py-2 border border-[#c1c7cc] text-[#41484c] text-sm font-medium rounded-lg hover:border-[#71787c] hover:bg-white/60 transition-colors"
                >
                  View Jobs
                </button>
              </div>
              <p className="text-[#71787c] text-xs mt-5 italic">
                Built from real-world experience across private credit and special situations investing.
              </p>
            </>
          )}
          {topTab === "jobs" && (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#c3ecd7]/60 text-[#416656] text-[11px] font-semibold tracking-wider uppercase rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-[#416656] rounded-full" />
                Multi-source hiring intel
              </div>
              <h1 className="text-[#191c1e] text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
                See Where Finance Teams Are Hiring — and Why
              </h1>
              <p className="text-[#41484c] text-sm mt-3 max-w-xl leading-relaxed">
                Curated roles across private credit, restructuring, and leveraged finance — filtered for relevance, not volume.
              </p>
              <p className="text-[#71787c] text-xs mt-2 max-w-xl">
                Each role includes an Onlu analysis: what the signal means and whether it&apos;s worth your time.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-5">
                <button
                  onClick={() => setTopTab("funds")}
                  className="px-4 py-2 border border-[#c1c7cc] text-[#41484c] text-sm font-medium rounded-lg hover:border-[#71787c] hover:bg-white/60 transition-colors"
                >
                  Fund Signals
                </button>
                <a
                  href="#guide"
                  className="px-4 py-2 border border-[#c3ecd7] text-[#416656] text-sm font-medium rounded-lg hover:border-[#416656] hover:bg-[#c3ecd7]/30 transition-colors"
                >
                  Interview Guide
                </a>
              </div>
              <p className="text-[#71787c] text-xs mt-5 italic">
                Built from real-world experience across private credit and special situations investing.
              </p>
            </>
          )}
          {topTab === "insights" && (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e1ddf2]/70 text-[#5e5c6e] text-[11px] font-semibold tracking-wider uppercase rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-[#5e5c6e] rounded-full" />
                Credit &amp; Restructuring
              </div>
              <h1 className="text-[#191c1e] text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
                Insights
              </h1>
              <p className="text-[#41484c] text-sm mt-3 max-w-xl leading-relaxed">
                Practical write-ups on private credit, special situations, and restructuring — for practitioners and candidates who want to go deeper.
              </p>
            </>
          )}
        </div>
      </div>

      <DailyIntelBar daily={daily} loading={dailyLoading} onFundClick={(id) => {
        setTopTab("funds");
        setTimeout(() => document.getElementById(`fund-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
      }} onJobsClick={() => setTopTab("jobs")} />

      <main className="max-w-6xl mx-auto px-5 py-5 space-y-4">
        {topTab === "funds" && (
          <>
            <FundsSection
              filters={fundFilters} setFilters={setFundFilters}
              filings={fundFilings} total={fundTotal}
              loading={fundLoading} error={fundError}
              records={records} updateRecord={updateRecord}
              outreachRecords={outreachRecords}
              subTab={fundSubTab} setSubTab={setFundSubTab}
              onExport={() => exportToCsv(fundFilings, records)}
            />
            {/* Inter-section CTA: signals → guide */}
            <div className="bg-sky-50 border border-sky-100 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-[#396477]">
                Found opportunities worth pursuing? <span className="font-medium">Prepare for the interview with the full guide.</span>
              </p>
              <a href="#guide" className="flex-shrink-0 px-4 py-2 bg-[#396477] text-white text-xs font-semibold rounded-lg hover:bg-[#2d5162] transition-colors text-center">
                View the Guide →
              </a>
            </div>
            <NewsletterCTA
              intent="signals_subscriber"
              title="Stay ahead of the signals."
              description="Get new fund signals, relevant roles, and market insight in your inbox."
              cta="Subscribe"
            />
          </>
        )}
        {topTab === "jobs" && (
          <>
            <JobsSection
              filters={jobFilters} setFilters={setJobFilters}
              signals={jobSignals} total={jobTotal}
              loading={jobLoading} error={jobError}
              sources={jobSources}
            />
            {/* Inter-section CTA: jobs → guide */}
            <div className="bg-[#e1ddf2] border border-[#c7c4d8]/60 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-[#41484c]">
                Found the right role? <span className="font-medium">Prepare for the interview with the full guide.</span>
              </p>
              <a href="#guide" className="flex-shrink-0 px-4 py-2 bg-[#5e5c6e] text-white text-xs font-semibold rounded-lg hover:bg-[#4a4858] transition-colors text-center">
                Get the Interview Guide →
              </a>
            </div>
            <NewsletterCTA
              intent="signals_subscriber"
              title="Hiring signals, decoded."
              description="Get new fund signals, relevant roles, and market insight in your inbox."
              cta="Subscribe"
            />
          </>
        )}
        {topTab === "insights" && <InsightsSection />}
      </main>

      {/* Monetization section — always visible */}
      <GuideSection />
      <SiteFooter />
    </div>
  );
}

function NavTab({ active, onClick, label, badge }: { active: boolean; onClick: () => void; label: string; badge?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-1.5 rounded-md text-sm transition-all ${
        active
          ? "bg-sky-100 text-[#396477] font-bold"
          : "text-[#41484c] font-semibold hover:text-[#191c1e] hover:bg-[#f2f4f6]"
      }`}
    >
      {label}
      {badge && (
        <span className="absolute -top-1 -right-1.5 text-[9px] bg-[#c3ecd7] text-[#416656] font-bold px-1 py-0.5 rounded leading-none">
          NEW
        </span>
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

function ScoreTooltip() {
  return (
    <span className="group relative inline-flex items-center cursor-help">
      <span className="text-[10px] text-gray-300 border border-gray-200 rounded px-1 py-0.5 ml-1 hover:border-gray-400 hover:text-gray-500 transition-colors">?</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900 text-white text-[11px] rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 leading-relaxed shadow-lg">
        Priority score 1–10. Reflects fundraising recency, hiring and expansion signals, and source confidence. 8+ = act now. 6–8 = worth a reach-out. Under 6 = early signal.
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
      </span>
    </span>
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
            <span className="text-[11px] text-[#71787c] font-medium shrink-0">Top signals:</span>
            {daily.topFunds.slice(0, 4).map((f) => {
              const bucketColor = f.score.bucket === "hot" ? "bg-red-50 text-red-700 border border-red-100 hover:bg-red-100"
                : f.score.bucket === "warm" ? "bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100"
                : "bg-sky-50 text-[#396477] border border-sky-100 hover:bg-sky-100";
              return (
                <Link key={f.id} href={`/fund/${f.cik}`}
                  className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-1 transition-colors cursor-pointer ${bucketColor}`}>
                  <span className="font-bold">{f.score.overallScore}</span>
                  <span className="max-w-[140px] truncate">{f.entityName}</span>
                  {f.offeringStatus === "open" && <span className="text-[9px] opacity-60">raising</span>}
                </Link>
              );
            })}
          </div>
        )}

        {/* Top job signals */}
        {daily.topJobs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[#71787c] font-medium shrink-0">Hiring now:</span>
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

function SkeletonRows({ cols }: { cols: number }) {
  const colCls = cols === 6 ? "grid-cols-[56px_1fr_140px_160px_100px_72px]" : cols === 7 ? "grid-cols-[1fr_150px_120px_80px_130px_80px]" : "grid-cols-6";
  return (
    <div className="divide-y divide-gray-100">
      {[...Array(6)].map((_, i) => (
        <div key={i} className={`grid ${colCls} gap-3 px-4 py-3 animate-pulse`}>
          <div className="space-y-1.5"><div className="h-3.5 bg-gray-100 rounded w-2/3" /><div className="h-3 bg-gray-50 rounded w-1/2" /></div>
          <div className="h-5 bg-gray-100 rounded-full w-20" />
          <div className="h-3 bg-gray-100 rounded w-12" />
          <div className="h-3 bg-gray-100 rounded w-10" />
          <div className="h-5 bg-gray-100 rounded w-24" />
          <div className="h-3 bg-gray-100 rounded w-10" />
        </div>
      ))}
    </div>
  );
}

// ─── Top Opportunities ────────────────────────────────────────────────────────

function TopFundOpportunities({ filings, onClick }: { filings: FundFiling[]; onClick: (id: string) => void }) {
  const top = filings.filter((f) => f.score.overallScore >= 6.0).slice(0, Math.min(5, filings.length));
  if (top.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Top Opportunities This Week</h2>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">ranked by signal</span>
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
  const { score } = filing;
  const scoreBg = score.bucket === "hot" ? "bg-red-500" : score.bucket === "warm" ? "bg-amber-500" : "bg-yellow-400";
  const chips: Array<{ label: string; color: string }> = [];
  chips.push({ label: filing.formType === "D" ? "Form D" : "Form D/A", color: "blue" });
  if (filing.offeringStatus === "open") chips.push({ label: "In market", color: "green" });
  else if (filing.offeringStatus === "closed") chips.push({ label: "Closed", color: "purple" });
  if (filing.totalOfferingAmount) chips.push({ label: fmt(filing.totalOfferingAmount), color: "gray" });
  return (
    <button onClick={onClick} className="text-left bg-white border border-gray-200 rounded-xl p-3.5 hover:border-sky-200 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-1 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-gray-300 w-4 tabular-nums">{rank}</span>
          <div className={`w-7 h-7 rounded-lg ${scoreBg} flex items-center justify-center flex-shrink-0`}>
            <span className="text-white font-bold text-xs">{score.overallScore}</span>
          </div>
        </div>
        <span className="text-[10px] text-gray-200 group-hover:text-[#396477] transition-colors mt-0.5">↓</span>
      </div>
      <div className="font-semibold text-gray-900 text-xs leading-tight mb-1.5 group-hover:text-[#396477] transition-colors line-clamp-2">
        {filing.entityName}
      </div>
      {score.whyNow[0] && (
        <p className="text-[11px] text-gray-500 mb-2.5 leading-relaxed line-clamp-2">
          <span className="text-[#396477]">→ </span>{score.whyNow[0]}
        </p>
      )}
      <div className="flex flex-wrap gap-1">{chips.map((c) => <SignalChip key={c.label} label={c.label} color={c.color} />)}</div>
    </button>
  );
}


// ─── Funds section ────────────────────────────────────────────────────────────

function FundsSection({
  filters, setFilters, filings, total, loading, error,
  records, updateRecord, outreachRecords, subTab, setSubTab, onExport,
}: {
  filters: SearchFilters; setFilters: (f: SearchFilters) => void;
  filings: FundFiling[]; total: number; loading: boolean; error: string | null;
  records: Record<string, OutreachRecord>; updateRecord: (r: OutreachRecord) => void;
  outreachRecords: OutreachRecord[];
  subTab: "search" | "pipeline"; setSubTab: (t: "search" | "pipeline") => void;
  onExport: () => void;
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

      <div className="space-y-1 mb-1">
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          Identify which funds are raising capital, deploying, and likely to hire — before roles are publicly visible.
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
            <div className="grid grid-cols-[56px_1fr_140px_160px_100px_72px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Score<ScoreTooltip /></div>
              {["Fund / Firm", "Strategy", "Fundraising", "Location", "Updated"].map((h) => (
                <div key={h} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</div>
              ))}
            </div>
            {loading && filings.length === 0 && <SkeletonRows cols={6} />}
            {!loading && filings.length === 0 && !error && (
              <EmptyState
                icon="📋"
                title="No funds matched your current filters."
                hint="Try expanding the date range to 6 months or removing the strategy filter."
                onReset={() => setFilters({ query: "", strategy: "all", dateRange: "180", bucket: "all", minAmount: "" })}
              />
            )}
            {filings.map((f) => (
              <div key={f.id} id={`fund-row-${f.id}`}>
                <FundRow filing={f} outreach={records[f.id]} onOutreachChange={updateRecord} autoExpand={highlightId === f.id} />
              </div>
            ))}
          </div>
          {filings.length > 0 && <p className="text-center text-xs text-gray-400 py-1">Source: <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D" target="_blank" rel="noopener noreferrer" className="underline">SEC EDGAR Form D</a> · Hiring signals in Phase 2</p>}
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
  { v: "Equity Investing",   l: "Equity Investing"   },
  { v: "Investment Banking", l: "Investment Banking" },
  { v: "Quant",              l: "Quant"              },
  { v: "IR / Ops",           l: "IR / Ops"           },
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

function JobsSection({
  filters, setFilters, signals, total, loading, error, sources,
}: {
  filters: JobFilters; setFilters: (f: JobFilters) => void;
  signals: JobSignal[]; total: number; loading: boolean; error: string | null;
  sources: string[];
}) {
  const liveSourceCount = sources.filter((s) => s !== "edgar").length;
  const edgarOnly = !loading && sources.length > 0 && liveSourceCount === 0;

  return (
    <>
      <div className="space-y-1 mb-1">
        <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
          Curated roles across private credit, restructuring, and leveraged finance — filtered for relevance, not volume.
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
          <option value="14">Last 14d</option>
          <option value="30">Last 30d</option>
          <option value="60">Last 60d</option>
          <option value="90">Last 90d</option>
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
      <div className="space-y-3">
        {signals.map((s) => <RoleCard key={s.id} signal={s} />)}
      </div>

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
  paragraphs: string[];
}

const INSIGHTS: InsightPost[] = [
  {
    slug: "credit-hiring-capital-driven",
    title: "Why Credit Hiring Is Driven by Capital, Not Recruiting Cycles",
    date: "March 26, 2026",
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
    paragraphs: [
      `Many candidates approach credit interviews by focusing on memorizing technical concepts such as leverage ratios, FCCR, or yield calculations. While these are necessary, they are rarely what differentiates candidates in practice.`,
      `What interviewers are typically evaluating is whether a candidate can think through a situation as an investor. This includes the ability to identify key risks, understand how cash flow behaves under stress, and assess downside protection rather than simply describing a business at a high level.`,
      `Stronger candidates tend to frame their answers around questions such as: where does the capital structure break, what drives liquidity in a downside scenario, and how management decisions or documentation can impact recovery outcomes. In contrast, weaker candidates often stop at surface-level metrics without connecting them to real-world implications.`,
      `In this sense, credit interviews are less about recalling formulas and more about demonstrating judgment. The goal is not to show that you know the definitions, but that you can apply them in a way that reflects how investors actually underwrite risk.`,
    ],
  },
  {
    slug: "co-op-vs-rsa",
    title: "Co-op Agreements vs. Restructuring Support Agreements (RSA)",
    date: "March 26, 2026",
    paragraphs: [
      `Cooperation agreements ("Co-ops") and Restructuring Support Agreements (RSAs) are both commonly used in debt restructurings, but they serve distinct purposes and typically arise at different stages of a transaction.`,
      `Co-ops are generally agreements among creditors only and are most often used in the early stages of a situation. At this point, the company is typically not yet formally involved, and creditors use the agreement to coordinate strategy and present a unified negotiating position. These agreements are contractually binding among participating creditors and usually cover cooperation mechanics, cost sharing, information exchange, and economic incentives that differentiate early participants from those who join later. Co-ops also frequently include transfer restrictions, requiring any buyer of the debt to accede to the agreement, thereby preserving alignment within the creditor group.`,
      `In contrast, RSAs are entered into between the company and key creditor constituencies once a restructuring framework has largely been agreed. RSAs carry stronger legal weight and set out the terms of the proposed transaction in detail, including capital structure outcomes, treatment of various creditor classes, voting commitments, and key milestones. Their primary function is to lock in support from major stakeholders and provide execution certainty ahead of a formal restructuring process.`,
      `In practice, Co-ops function as a coordination tool during the negotiation phase, while RSAs represent a more definitive agreement that underpins transaction execution, often in the lead-up to or during a Chapter 11 process.`,
    ],
  },
];

function InsightsSection() {
  return (
    <div className="max-w-2xl space-y-16 py-2">
      {INSIGHTS.map((post) => (
        <article key={post.slug}>
          <header className="mb-6">
            <h2 className="text-[#191c1e] text-xl font-bold tracking-tight leading-snug mb-2">
              {post.title}
            </h2>
            <time className="text-xs text-[#71787c] font-medium">{post.date}</time>
          </header>
          <div className="space-y-4">
            {post.paragraphs.map((p, i) => (
              <p key={i} className="text-[#41484c] text-sm leading-[1.75]">
                {p}
              </p>
            ))}
          </div>
          <div className="mt-10 border-t border-[#c1c7cc]/30" />
        </article>
      ))}
    </div>
  );
}
