"use client";

import { StartupSearchFilters, RaiseBucket, FundingStage } from "@/app/types";

interface StartupFiltersProps {
  filters: StartupSearchFilters;
  onChange: (f: StartupSearchFilters) => void;
  total: number;
  loading: boolean;
}

const STAGE_OPTIONS: { value: "all" | FundingStage; label: string }[] = [
  { value: "all",      label: "All stages" },
  { value: "pre_seed", label: "Pre-Seed" },
  { value: "seed",     label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "series_c", label: "Series C" },
  { value: "growth",   label: "Growth" },
];

const BUCKET_OPTIONS: { value: "all" | RaiseBucket; label: string }[] = [
  { value: "all",   label: "All" },
  { value: "hot",   label: "🔥 Hot (80+)" },
  { value: "warm",  label: "Warm (60+)" },
  { value: "watch", label: "Watch (40+)" },
  { value: "low",   label: "Low (<40)" },
];

const DATE_OPTIONS = [
  { value: "30",  label: "Last 30 days" },
  { value: "60",  label: "Last 60 days" },
  { value: "90",  label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
];

const AMOUNT_OPTIONS = [
  { value: "",    label: "Any size" },
  { value: "1",   label: "$1M+" },
  { value: "5",   label: "$5M+" },
  { value: "10",  label: "$10M+" },
  { value: "25",  label: "$25M+" },
  { value: "50",  label: "$50M+" },
  { value: "100", label: "$100M+" },
];

export default function StartupFilters({ filters, onChange, total, loading }: StartupFiltersProps) {
  const set = <K extends keyof StartupSearchFilters>(key: K, value: StartupSearchFilters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Priority */}
        <div className="flex gap-1">
          {BUCKET_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => set("bucket", opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filters.bucket === opt.value
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 hidden sm:block" />

        {/* Stage */}
        <select
          value={filters.stage}
          onChange={(e) => set("stage", e.target.value as StartupSearchFilters["stage"])}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Date range */}
        <select
          value={filters.dateRange}
          onChange={(e) => set("dateRange", e.target.value as StartupSearchFilters["dateRange"])}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {DATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Min amount */}
        <select
          value={filters.minAmount}
          onChange={(e) => set("minAmount", e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {AMOUNT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Result count */}
        <span className="ml-auto text-xs text-gray-400">
          {loading ? "Searching…" : `${total} compan${total === 1 ? "y" : "ies"}`}
        </span>
      </div>
    </div>
  );
}
