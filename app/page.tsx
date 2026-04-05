"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";
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

type TopTab = "funds" | "hiring" | "career" | "insights" | "market" | "firmprep";

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
    ["funds", "hiring", "career", "insights", "market", "firmprep"].includes(initialTab) ? initialTab : "hiring"
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
        <div className="max-w-6xl mx-auto px-8 h-24 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <LogoMark size={64} />
            <span className="font-bold text-2xl tracking-tight" style={{ color: "#6aab8e" }}>Onlu</span>
          </div>
          <div className="w-px h-4 bg-[#c1c7cc]/50" />
          <nav className="flex items-center gap-1">
            <NavTab active={topTab === "hiring"} onClick={() => setTopTab("hiring")} label="Hiring Watch" />
            <NavTab active={topTab === "firmprep"} onClick={() => setTopTab("firmprep")} label="Firm Prep" badge="AI" />
            <NavTab active={topTab === "market"} onClick={() => setTopTab("market")} label="Market Brief" badge="AI" />
            <NavTab active={topTab === "funds"} onClick={() => setTopTab("funds")} label="Fund Signals" />
            <NavTab active={topTab === "career"} onClick={() => setTopTab("career")} label="Career Prep" badge="Blog" />
            <NavTab active={topTab === "insights"} onClick={() => setTopTab("insights")} label="Insights" badge="Blog" />
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <a href="#guide" className="hidden sm:inline text-[#41484c] hover:text-[#191c1e] text-xs transition-colors">Interview Guide</a>
            <Link href="/about" className="hidden sm:inline text-[#41484c] hover:text-[#191c1e] text-xs transition-colors">About</Link>
            <Link href="/contact" className="hidden sm:inline text-[#41484c] hover:text-[#191c1e] text-xs transition-colors">Contact</Link>
            <AuthButton />
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
                SEC EDGAR · Form D
              </div>
              <h1 className="text-[#191c1e] text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
                Fund Signals — Track Capital Before It Moves
              </h1>
              <p className="text-[#41484c] text-sm mt-3 max-w-xl leading-relaxed">
                Search private fund filings directly from the SEC. Capital raises are one of the strongest leading indicators of near-term hiring — funds that close a new vehicle typically build headcount within one to three quarters.
              </p>
              <p className="text-[#71787c] text-xs mt-2 max-w-xl">
                Spot a firm raising capital? Switch to <button onClick={() => setTopTab("hiring")} className="underline hover:text-[#41484c] transition-colors">Hiring Watch</button> to see whether roles are already being posted.
              </p>
            </>
          )}
          {topTab === "hiring" && (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#c3ecd7]/60 text-[#416656] text-[11px] font-semibold tracking-wider uppercase rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-[#416656] rounded-full animate-pulse" />
                Hiring Intelligence · 28 firms monitored
              </div>
              <h1 className="text-[#191c1e] text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
                See which firms may hire before roles are posted.
              </h1>
              <p className="text-[#41484c] text-sm mt-3 max-w-xl leading-relaxed">
                Funds don&apos;t post roles on a schedule — they hire when capital moves. Hiring Watch tracks leading indicators across 28 private credit and special situations managers: fundraising filings, concurrent hiring patterns, and senior team changes. Each signal includes an interpretation of what it likely means for near-term headcount.
              </p>
              <p className="text-[#71787c] text-xs mt-2 max-w-xl">
                Early signals — firms with fresh EDGAR filings but no roles posted yet — are the most actionable. Outreach before a formal process gives the strongest edge.
              </p>
            </>
          )}
          {topTab === "career" && (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#c3ecd7]/60 text-[#416656] text-[11px] font-semibold tracking-wider uppercase rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-[#416656] rounded-full" />
                Career &amp; Interview Prep
              </div>
              <h1 className="text-[#191c1e] text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
                Career Prep
              </h1>
              <p className="text-[#41484c] text-sm mt-3 max-w-xl leading-relaxed">
                How credit hiring works, what interviews actually test, and how to position yourself effectively — from people who&apos;ve been on both sides of the table.
              </p>
            </>
          )}
          {topTab === "firmprep" && (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100/70 text-rose-700 text-[11px] font-semibold tracking-wider uppercase rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                AI-Powered · Firm-Specific
              </div>
              <h1 className="text-[#191c1e] text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
                Firm Prep — Know Before You Walk In
              </h1>
              <p className="text-[#41484c] text-sm mt-3 max-w-xl leading-relaxed">
                Search any buyside firm and get a tailored interview prep guide — behavioral, technical, what they really value, and what gets candidates cut. Built for credit, PE, and hedge fund interviews.
              </p>
            </>
          )}
          {topTab === "market" && (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/70 text-amber-700 text-[11px] font-semibold tracking-wider uppercase rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                Daily Market Brief · AI-Generated
              </div>
              <h1 className="text-[#191c1e] text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
                Market Brief
              </h1>
              <p className="text-[#41484c] text-sm mt-3 max-w-xl leading-relaxed">
                Morning and evening market analysis across U.S. equity, fixed income, international, macro, and alternatives — synthesized for buyside professionals.
              </p>
            </>
          )}
          {topTab === "insights" && (
            <>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e1ddf2]/70 text-[#5e5c6e] text-[11px] font-semibold tracking-wider uppercase rounded-full mb-4">
                <span className="w-1.5 h-1.5 bg-[#5e5c6e] rounded-full" />
                Industry Insights
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

      {topTab === "funds" && <DailyIntelBar daily={daily} loading={dailyLoading} onFundClick={(id) => {
        setTopTab("funds");
        setTimeout(() => document.getElementById(`fund-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
      }} onJobsClick={() => setTopTab("hiring")} />}

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
              jobSignals={jobSignals}
              onViewJobs={() => setTopTab("hiring")}
            />
            {/* Inter-section CTA: signals → guide */}
            <div className="bg-sky-50 border border-sky-100 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-[#396477]">
                Spotted a target firm? <span className="font-medium">Prepare for the interview before they post the role.</span>
              </p>
              <a href="#guide" className="flex-shrink-0 px-4 py-2 bg-[#396477] text-white text-xs font-semibold rounded-lg hover:bg-[#2d5162] transition-colors text-center">
                View the Guide →
              </a>
            </div>
            <NewsletterCTA
              intent="signals_subscriber"
              title="Get hiring signals before they become job postings."
              description="New fund filings, early signals, and hiring intelligence across 28 private credit and special situations managers."
              cta="Subscribe"
            />
          </>
        )}
        {topTab === "hiring" && (
          <>
            <HiringSection
              signals={jobSignals} loading={jobLoading}
              fundFilings={fundFilings}
              onViewSignals={() => setTopTab("funds")}
            />
            <div className="bg-[#e1ddf2] border border-[#c7c4d8]/60 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-[#41484c]">
                Found an active signal? <span className="font-medium">Prepare for the interview before you apply.</span>
              </p>
              <a href="#guide" className="flex-shrink-0 px-4 py-2 bg-[#5e5c6e] text-white text-xs font-semibold rounded-lg hover:bg-[#4a4858] transition-colors text-center">
                Get the Interview Guide →
              </a>
            </div>
            <NewsletterCTA
              intent="signals_subscriber"
              title="Hiring intelligence, not job board noise."
              description="Early signals, fund activity, and firm-level context — for buyside recruiting across private credit and special situations."
              cta="Subscribe"
            />
          </>
        )}
        {topTab === "career" && <CareerSection />}
        {topTab === "insights" && <InsightsSection />}
        {topTab === "market" && <MarketSection />}
        {topTab === "firmprep" && <FirmPrepSection />}
      </main>

      {/* Monetization section — always visible */}
      <GuideSection />
      <SiteFooter />
    </div>
  );
}

function AuthButton() {
  const { isSignedIn } = useUser();
  if (isSignedIn) {
    return <UserButton />;
  }
  return (
    <SignInButton mode="modal">
      <button className="px-3 py-1.5 bg-[#1A2B4A] text-white text-xs font-semibold rounded-lg hover:bg-[#243d6b] transition-colors">
        Sign in
      </button>
    </SignInButton>
  );
}

function NavTab({ active, onClick, label, badge }: { active: boolean; onClick: () => void; label: string; badge?: string }) {
  const badgeStyle = badge === "AI"
    ? "bg-violet-100 text-violet-600"
    : badge === "Blog"
    ? "bg-amber-100 text-amber-600"
    : "bg-[#c3ecd7] text-[#416656]";

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm transition-all ${
        active
          ? "bg-sky-100 text-[#396477] font-bold"
          : "text-[#41484c] font-semibold hover:text-[#191c1e] hover:bg-[#f2f4f6]"
      }`}
    >
      {label}
      {badge && (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${badgeStyle}`}>
          {badge}
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
    <button onClick={onClick} className="text-left bg-white border border-gray-200 rounded-xl p-3.5 hover:border-sky-200 hover:shadow-sm transition-all group">
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
          {filings.length > 0 && <p className="text-center text-xs text-gray-400 py-1">Source: <a href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D" target="_blank" rel="noopener noreferrer" className="underline">SEC EDGAR Form D</a> · Capital raises are leading indicators of front-office hiring</p>}
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

const INDUSTRY_POSTS: InsightPost[] = [
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
  "Interview Prep": "bg-violet-100 text-violet-700",
  "Career Prep":  "bg-violet-100 text-violet-700",
};

function PostList({ posts }: { posts: InsightPost[] }) {
  return (
    <div className="max-w-2xl space-y-16 py-2">
      {posts.map((post) => (
        <article key={post.slug}>
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

// ─── Firm Prep Section ───────────────────────────────────────────────────────

interface PrepQuestion { question: string; context: string; tip: string; }
interface InterviewPrep {
  firm: string; strategy: string; overview: string;
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

function FirmPrepSection() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(null); setPrep(null);
    try {
      const res = await fetch(`/api/interview-prep?firm=${encodeURIComponent(query.trim())}`);
      const d = await res.json();
      if (d.error) setError(`Error: ${d.error}`);
      else setPrep(d);
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to generate prep guide."); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-1 py-6 space-y-8">
      {/* Search */}
      <form onSubmit={search} className="flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search any firm — Ares, Citadel, Apollo, KKR…"
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A2B4A]/20 focus:border-[#1A2B4A]" />
        <button type="submit" disabled={loading}
          className="px-5 py-3 bg-[#1A2B4A] text-white text-sm font-semibold rounded-xl hover:bg-[#243d6b] transition-colors disabled:opacity-50">
          {loading ? "Generating…" : "Prep →"}
        </button>
      </form>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-[#71787c]">
          <div className="w-6 h-6 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Generating your firm-specific prep guide…</p>
          <p className="text-xs text-gray-400">This takes 5–10 seconds</p>
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
          </div>

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

function MarketSection() {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/market")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setAnalysis(d);
      })
      .catch(() => setError("Failed to load market brief."))
      .finally(() => setLoading(false));
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
    </div>
  );
}

function CareerSection() {
  return <PostList posts={CAREER_POSTS} />;
}

function InsightsSection() {
  return <PostList posts={INDUSTRY_POSTS} />;
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

const BACK_OFFICE_RE_CLIENT = /\b(software engineer|developer|devops|sysadmin|cybersecurity|HR|human resources|recruit|talent|office manager|admin|payroll|legal counsel|paralegal|attorney|marketing|content manager|social media|sales|business development|customer support|help desk|product manager|project manager|supply chain|procurement)\b/i;
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
    return `Actively raising${amt ? ` (${amt})` : ""} while hiring ${profile.frontOfficeCount} front-office roles — a concurrent signal of team expansion. Strong timing to engage.`;
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
    return `${profile.frontOfficeCount} front-office roles open concurrently — broad hiring push consistent with new fund deployment or an expanded mandate.`;
  }
  if (hasSenior) {
    return `Senior hire posted at ${profile.name}. Senior additions typically precede a junior team build — watch for analyst and associate roles to follow.`;
  }
  return `Active front-office hiring at ${profile.name}. Direct outreach may surface additional unlisted opportunities alongside posted roles.`;
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
    return `Closed${amt ? ` ${amt}` : ""} fund ${days}d ago. Post-close build-out phase is the most common precursor to front-office hiring — often begins 1–2 quarters after closing.`;
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
      if (foCount >= 3) sigs.push(`${foCount} front-office roles open`);
      else if (foCount > 0) sigs.push(`${foCount} front-office role${foCount > 1 ? "s" : ""} open`);
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
    <div className="bg-white border border-[#c1c7cc]/40 rounded-xl p-5 hover:shadow-[0_2px_12px_rgba(57,100,119,0.1)] transition-shadow">
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

// ─── Hiring Watch Section ─────────────────────────────────────────────────────

function FirmAlertWidget() {
  const [email, setEmail] = useState("");
  const [firm, setFirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !firm.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/alert-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), firm: firm.trim() }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Failed"); }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-[#eef6f2] border border-[#c1d9ce]/50 rounded-xl px-5 py-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#191c1e] mb-0.5">Get alerted when a firm posts a new role</p>
          <p className="text-xs text-[#71787c]">Enter a firm name and your email — we'll notify you the moment a matching role appears.</p>
        </div>
        {done ? (
          <div className="flex items-center gap-2 text-emerald-700 text-sm font-medium bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 flex-shrink-0">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Alert set
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            <input
              type="text"
              value={firm}
              onChange={(e) => setFirm(e.target.value)}
              placeholder="Firm name (e.g. Ares)"
              required
              className="text-sm border border-[#c1d9ce] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#6aab8e] w-40"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="text-sm border border-[#c1d9ce] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#6aab8e] w-44"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#396477] text-white text-sm font-semibold rounded-lg hover:bg-[#2d5162] transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {loading ? "…" : "Set Alert"}
            </button>
          </form>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}

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
        <span className="ml-auto text-xs text-gray-400">
          {loading ? "Loading…" : `${allRegistryProfiles.length} firms hiring · ${earlySignalFirms.length} early signals`}
        </span>
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
                <span className="text-xs text-[#71787c]">Firms with open front-office roles</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {allRegistryProfiles.map((p) => (
                  <HiringFirmCard key={p.firmId} profile={p} fundFilings={fundFilings} onViewSignals={onViewSignals} />
                ))}
              </div>
            </section>
          )}

          {allRegistryProfiles.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p className="font-semibold text-gray-700 text-sm">No roles found at monitored firms</p>
              <p className="text-xs mt-1.5 max-w-xs mx-auto">Try clearing the category filter.</p>
            </div>
          )}

          {/* Other roles (not in watchlist) */}
          {otherRoles.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-[#191c1e]">Other Front-Office Roles</h2>
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

          {/* ── Firm Alert widget ── */}
          <FirmAlertWidget />

          {/* ── Early Signals — the predictive layer ── */}
          {earlySignalFirms.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-sm font-bold text-[#191c1e]">Early Signals</h2>
                <span className="text-[10px] bg-[#e1ddf2]/70 text-[#5e5c6e] font-bold px-1.5 py-0.5 rounded border border-[#c7c4d8]/50">{earlySignalFirms.length}</span>
              </div>
              <p className="text-xs text-[#71787c] mb-4 max-w-2xl">
                These firms have recent EDGAR capital activity but no roles posted yet. Capital raises typically precede front-office hiring by one to three quarters. Engaging before a formal process is the most effective approach.
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

        if (visibleRoles.length === 0) return (
          <div className="text-center py-12 text-gray-400">
            <p className="font-semibold text-gray-700 text-sm">No roles found</p>
            <p className="text-xs mt-1.5">Try clearing the category filter.</p>
          </div>
        );

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

function HiringFirmCard({ profile, fundFilings, onViewSignals }: {
  profile: FirmIntelProfile;
  fundFilings: FundFiling[];
  onViewSignals: () => void;
}) {
  const filing = fundFilings.find((f) => matchFirm(f.entityName)?.id === profile.firmId);
  const topRoles = profile.openRoles.filter(r => r.classification.frontOffice).slice(0, 4);
  const watchStatus = getWatchStatus(profile.frontOfficeCount, filing);
  const signalNote = generateSignalNote(profile, filing);

  return (
    <div className="bg-white border border-[#c1c7cc]/40 rounded-xl p-5 hover:shadow-[0_2px_12px_rgba(57,100,119,0.1)] transition-shadow">
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

      {/* Signal note — the interpretation layer */}
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
    fetch("/api/jobs?dateRange=90")
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
                <span className="text-xs text-[#71787c]">3+ front-office roles open</span>
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
                <span className="text-xs text-[#71787c]">Known firms with open front-office roles</span>
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
                  These firms are on our watch list. No roles posted in the last 90 days — consider reaching out directly or monitoring their careers page.
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
