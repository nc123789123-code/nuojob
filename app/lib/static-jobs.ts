/**
 * Curated static jobs — manually sourced buy-side roles.
 * Dates are YYYY-MM-DD. daysAgo is computed at call time so results
 * respect the caller's maxDays filter.
 */

import { JobSignal, JobCategory, JobSignalTag } from "@/app/types";

interface StaticJob {
  firm: string;
  role: string;
  category: JobCategory;
  location: string;
  dateAdded: string; // YYYY-MM-DD
  url?: string;
  signalTag: JobSignalTag;
  why: string;
}

const STATIC_JOBS: StaticJob[] = [
  // Add only verified roles with direct job listing URLs here.
  {
    firm: "Kerrisdale Capital",
    role: "Research Analyst",
    category: "Other Finance Roles",
    location: "New York, NY",
    dateAdded: "2026-04-11",
    url: "https://www.kerrisdalecap.com/analyst-hiring",
    signalTag: "New fund",
    why: "Kerrisdale Capital is actively hiring research analysts. Concentrated equity L/S fund known for short-selling and activist theses. Apply directly via firm website.",
  },
  {
    firm: "Deutsche Bank",
    role: "Investment Banking / Capital Markets Professional",
    category: "Investment Banking",
    location: "New York, NY",
    dateAdded: "2026-04-11",
    url: "https://careers.db.com/professionals/search-roles/",
    signalTag: "Post-raise build-out",
    why: "Deutsche Bank posts roles on their own careers portal (not standard job boards). Check careers.db.com for current IB, leveraged finance, and credit openings.",
  },
]

/**
 * Returns static curated jobs filtered to maxDays recency.
 * daysAgo is computed fresh on each call so it stays accurate.
 */
export function getStaticJobs(maxDays: number): JobSignal[] {
  const today = new Date();
  const out: JobSignal[] = [];
  STATIC_JOBS.forEach((j, i) => {
    const added = new Date(j.dateAdded);
    const days = Math.floor((today.getTime() - added.getTime()) / 86_400_000);
    if (days > maxDays) return;
    out.push({
      id: `curated-${i}`,
      firm: j.firm,
      role: j.role,
      category: j.category,
      location: j.location,
      daysAgo: days,
      signalTag: j.signalTag,
      why: j.why,
      score: 0,
      edgarUrl: j.url,
      source: "curated",
    });
  });
  return out;
}
