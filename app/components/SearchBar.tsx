"use client";

import { useRef } from "react";

const DEFAULT_QUICK_SEARCHES = [
  "private credit",
  "special situations",
  "direct lending",
  "distressed",
  "hedge fund",
  "multi-strategy",
  "mezzanine",
  "opportunistic credit",
];

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  placeholder?: string;
  quickSearches?: string[];
}

export default function SearchBar({ value, onChange, loading, placeholder, quickSearches }: SearchBarProps) {
  const resolvedQuickSearches = quickSearches ?? DEFAULT_QUICK_SEARCHES;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-400 focus-within:shadow-md focus-within:shadow-blue-50 transition-all">
        <svg
          className="w-5 h-5 text-gray-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Search fund name or strategy (e.g. "Owl Rock", "private credit")...'}
          className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none"
        />

        {loading && (
          <svg
            className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}

        {value && !loading && (
          <button
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {!value && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs text-gray-400">Quick:</span>
          {resolvedQuickSearches.map((term) => (
            <button
              key={term}
              onClick={() => onChange(term)}
              className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full transition-colors"
            >
              {term}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
