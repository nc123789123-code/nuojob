"use client";

import { StartupSearchFilters, RaiseBucket, FundingStage } from "@/app/types";

interface Props {
  filters: StartupSearchFilters;
  onChange: (f: StartupSearchFilters) => void;
  total: number;
  loading: boolean;
}

const BUCKETS: Array<{ v: RaiseBucket | "all"; l: string }> = [
  { v: "all",   l: "All" },
  { v: "hot",   l: "🔥 Hot" },
  { v: "warm",  l: "Warm" },
  { v: "watch", l: "Watch" },
];

const STAGES: Array<{ v: "all" | FundingStage; l: string }> = [
  { v: "all",      l: "All stages" },
  { v: "pre_seed", l: "Pre-Seed" },
  { v: "seed",     l: "Seed" },
  { v: "series_a", l: "Series A" },
  { v: "series_b", l: "Series B" },
  { v: "series_c", l: "Series C" },
  { v: "growth",   l: "Growth" },
];

export default function StartupFilterBar({ filters, onChange, total, loading }: Props) {
  const set = <K extends keyof StartupSearchFilters>(k: K, v: StartupSearchFilters[K]) => onChange({ ...filters, [k]: v });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {BUCKETS.map((b) => (
        <button
          key={b.v}
          onClick={() => set("bucket", b.v as StartupSearchFilters["bucket"])}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            filters.bucket === b.v
              ? "bg-slate-900 text-white border-slate-900"
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          }`}
        >
          {b.l}
        </button>
      ))}

      <div className="w-px h-5 bg-gray-200 hidden sm:block" />

      <select
        value={filters.stage}
        onChange={(e) => set("stage", e.target.value as StartupSearchFilters["stage"])}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
      >
        {STAGES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
      </select>

      <select
        value={filters.dateRange}
        onChange={(e) => set("dateRange", e.target.value as StartupSearchFilters["dateRange"])}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
      >
        <option value="30">Last 30d</option>
        <option value="60">Last 60d</option>
        <option value="90">Last 90d</option>
        <option value="180">Last 6mo</option>
      </select>

      <select
        value={filters.minAmount}
        onChange={(e) => set("minAmount", e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
      >
        <option value="">Any size</option>
        <option value="1">$1M+</option>
        <option value="5">$5M+</option>
        <option value="10">$10M+</option>
        <option value="25">$25M+</option>
        <option value="50">$50M+</option>
        <option value="100">$100M+</option>
      </select>

      <span className="ml-auto text-xs text-gray-400">
        {loading ? "Searching…" : `${total} compan${total !== 1 ? "ies" : "y"}`}
      </span>
    </div>
  );
}
