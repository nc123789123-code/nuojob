"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SearchBar from "@/app/components/SearchBar";
import Filters from "@/app/components/Filters";
import FundCard from "@/app/components/FundCard";
import { FundFiling, SearchFilters, OutreachRecord } from "@/app/types";
import { exportToCsv } from "@/app/lib/export";

const DEFAULT_FILTERS: SearchFilters = {
  query: "",
  strategy: "all",
  dateRange: "90",
  bucket: "all",
  minAmount: "",
};

function useOutreachTracker() {
  const [records, setRecords] = useState<Record<string, OutreachRecord>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("outreach-records-v2");
      if (stored) setRecords(JSON.parse(stored));
    } catch {
      // ignore
    }
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

export default function Home() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [filings, setFilings] = useState<FundFiling[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "outreach">("search");
  const { records, updateRecord } = useOutreachTracker();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchFilings = useCallback(async (f: SearchFilters) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        query: f.query,
        strategy: f.strategy,
        dateRange: f.dateRange,
        bucket: f.bucket,
        minAmount: f.minAmount,
      });

      const res = await fetch(`/api/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");

      setFilings(data.filings || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load results. Please try again."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchFilings(filters), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters, fetchFilings]);

  const outreachFunds = Object.values(records).filter(
    (r) => r.status !== "not_contacted"
  );

  const handleExport = () => {
    exportToCsv(filings, records);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-base font-bold text-gray-900">
                Buyside Fundraising Intelligence
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Opportunity scores based on SEC Form D · Private credit &amp;
                hedge fund focus · Updated daily
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
              <button
                onClick={() => setActiveTab("search")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === "search"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Search
              </button>
              <button
                onClick={() => setActiveTab("outreach")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all relative ${
                  activeTab === "outreach"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Outreach Pipeline
                {outreachFunds.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {outreachFunds.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {activeTab === "search" ? (
          <>
            <SearchBar
              value={filters.query}
              onChange={(q) => setFilters((f) => ({ ...f, query: q }))}
              loading={loading}
            />

            <Filters
              filters={filters}
              onChange={setFilters}
              total={total}
              loading={loading}
              onExport={handleExport}
            />

            {/* How it works banner (dismissible) */}
            <HowItWorksBanner />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {loading && filings.length === 0 && <LoadingSkeleton />}

            {!loading && filings.length === 0 && !error && (
              <EmptyState />
            )}

            <div className="space-y-3">
              {filings.map((filing) => (
                <FundCard
                  key={filing.id}
                  filing={filing}
                  outreach={records[filing.id]}
                  onOutreachChange={updateRecord}
                />
              ))}
            </div>

            {filings.length > 0 && (
              <p className="text-center text-xs text-gray-400 py-4">
                Data from{" "}
                <a
                  href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-gray-600"
                >
                  SEC EDGAR Form D
                </a>{" "}
                · Hiring &amp; expansion signals coming in Phase 2
              </p>
            )}
          </>
        ) : (
          <OutreachPipeline
            records={outreachFunds}
            onSearchClick={() => setActiveTab("search")}
          />
        )}
      </main>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function HowItWorksBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem("banner-dismissed") === "true");
  }, []);

  if (dismissed) return null;

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex items-start gap-3">
      <div className="flex-1">
        <p className="font-semibold mb-1">How opportunity scores work</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          Each fund receives a score (0–100) based on public signals:{" "}
          <strong>45%</strong> fundraising (Form D recency, offering status,
          size), <strong>35%</strong> hiring signals{" "}
          <span className="opacity-60">(Phase 2)</span>, <strong>20%</strong>{" "}
          expansion signals <span className="opacity-60">(Phase 2)</span>. Recency
          multipliers decay: 1.0× within 30d → 0.1× after 1 year. Hot = 80+,
          Warm = 60–79, Watch = 40–59.
        </p>
      </div>
      <button
        onClick={() => {
          localStorage.setItem("banner-dismissed", "true");
          setDismissed(true);
        }}
        className="text-blue-400 hover:text-blue-600 flex-shrink-0"
      >
        ✕
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse"
        >
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16 text-gray-400">
      <div className="text-4xl mb-3">📋</div>
      <p className="font-medium text-gray-600">No funds found</p>
      <p className="text-sm mt-1">
        Try broadening the date range or changing the strategy filter
      </p>
    </div>
  );
}

function OutreachPipeline({
  records,
  onSearchClick,
}: {
  records: OutreachRecord[];
  onSearchClick: () => void;
}) {
  if (records.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">📬</div>
        <p className="font-medium text-gray-600">No outreach tracked yet</p>
        <p className="text-sm mt-1">
          Open a fund card and set its status to start tracking your pipeline
        </p>
        <button
          onClick={onSearchClick}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Search Funds
        </button>
      </div>
    );
  }

  const groups = {
    in_discussion: records.filter((r) => r.status === "in_discussion"),
    reached_out: records.filter((r) => r.status === "reached_out"),
    passed: records.filter((r) => r.status === "passed"),
  };

  const pipelineColorMap = {
    in_discussion: "text-green-700 bg-green-50 border-green-200",
    reached_out: "text-blue-700 bg-blue-50 border-blue-200",
    passed: "text-gray-600 bg-gray-50 border-gray-200",
  } as const;

  const pipelineTitles = {
    in_discussion: "In Discussion",
    reached_out: "Reached Out",
    passed: "Passed",
  } as const;

  return (
    <div className="space-y-6">
      {(["in_discussion", "reached_out", "passed"] as const).map((status) => {
        const group = groups[status];
        if (group.length === 0) return null;
        return (
          <div key={status}>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              {pipelineTitles[status]}{" "}
              <span className="text-gray-400 font-normal">
                ({group.length})
              </span>
            </h2>
            <div className="space-y-2">
              {group.map((record) => (
                <div
                  key={record.filingId}
                  className={`border rounded-xl px-4 py-3 ${pipelineColorMap[status]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm">
                        {record.entityName}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {record.strategy && (
                          <span className="text-xs opacity-70">
                            {record.strategy}
                          </span>
                        )}
                        {record.score !== undefined && (
                          <span className="text-xs opacity-60">
                            Score: {record.score}
                          </span>
                        )}
                        {record.contactedAt && (
                          <span className="text-xs opacity-60">
                            ·{" "}
                            {new Date(record.contactedAt).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                        )}
                      </div>
                      {record.notes && (
                        <p className="text-xs italic mt-1.5 opacity-80">
                          {record.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
