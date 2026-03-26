/**
 * /api/intel — Curated buy-side intelligence feed
 *
 * Aggregates job signals from all direct career pages (Greenhouse, Lever, Ashby),
 * classifies them via the hybrid heuristic+LLM pipeline, cross-references with
 * EDGAR fundraising signals, and returns firm-level intelligence profiles.
 *
 * Product outputs:
 *   • hiringPush    — firms with 3+ front-office roles open right now
 *   • postRaise     — firms with an active EDGAR raise + front-office hiring
 *   • strategyBuilds — firms adding new strategy/asset-class capability
 *   • allRoles      — every classified role, sorted by relevance score
 */

import { NextRequest } from "next/server";
import { getGreenhouseFirms, getLeverFirms, getAshbyFirms, findFirmByName, FIRMS } from "@/app/lib/firms";
import { fetchAshbyPostings } from "@/app/lib/scrapers/ashby";
import { classifyJobs, classifyHeuristic, type JobClassification } from "@/app/lib/classify";
import type { JobSignal, JobCategory } from "@/app/types";

export const runtime = "nodejs";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClassifiedJob extends JobSignal {
  classification: JobClassification;
}

export interface FirmIntelProfile {
  firmId: string;
  name: string;
  tier: 1 | 2 | 3;
  strategies: string[];
  openRoles: ClassifiedJob[];
  frontOfficeCount: number;
  /** Curated signal strings for UI display */
  signals: string[];
  /** 3+ front-office roles open */
  hiringPush: boolean;
  /** Active EDGAR raise detected for this firm name */
  edgarRaise?: { amountStr: string; date: string; status: string };
  /** Has EDGAR raise AND front-office hiring */
  postRaiseHiring: boolean;
  /** Roles in a strategy not typical for this firm */
  strategyBuildout?: string;
}

export interface IntelResponse {
  hiringPush: FirmIntelProfile[];
  postRaise: FirmIntelProfile[];
  strategyBuilds: FirmIntelProfile[];
  allRoles: ClassifiedJob[];
  totalFirms: number;
  lastUpdated: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(dateStr: string): number {
  if (!dateStr) return 999;
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / 86_400_000);
}

/** Finance-relevant title guard */
const FINANCE_RE = /\b(credit|equity|fund|hedge|portfolio|investment|investor|analyst|quant|fixed income|distressed|lending|capital|asset|securities|trading|research|finance|financial|private|debt|yield|macro|strategy|associate|vice president|managing director|principal|director)\b/i;
const BACK_OFFICE_RE = /\b(software engineer|developer|devops|sysadmin|cybersecurity|security engineer|data engineer|machine learning|HR|human resources|recruit|talent|office manager|facilities|executive assistant|admin|receptionist|payroll|legal counsel|paralegal|attorney|general counsel|marketing|content manager|social media|SEO|sales manager|account executive|business development|customer support|help desk|product manager|project manager|scrum master|supply chain|logistics|procurement)\b/i;

function isRelevant(title: string): boolean {
  return FINANCE_RE.test(title) && !BACK_OFFICE_RE.test(title);
}

function classifyTitleToCategory(title: string): JobCategory {
  const t = title.toLowerCase();
  if (/private credit|direct lend|distressed|special situations?|mezzanine|unitranche|leveraged credit/i.test(t)) return "Private Credit";
  if (/high yield|investment grade|credit research|credit trading|fixed income|public credit/i.test(t)) return "Public Credit";
  if (/equity research|research analyst|sell.?side|coverage analyst/i.test(t)) return "Equity Research";
  if (/quant|quantitative|systematic|algo/i.test(t)) return "Quant";
  if (/investor relation|fund oper|compliance.*fund/i.test(t)) return "IR / Ops";
  if (/investment bank|m&a|mergers|leveraged finance.*(bank|group)/i.test(t)) return "Investment Banking";
  return "Equity Investing";
}

function fmtAmount(n?: number): string {
  if (!n) return "";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

// ─── Scrapers ─────────────────────────────────────────────────────────────────

interface GreenhouseResp { jobs: Array<{ id: number; title: string; updated_at: string; absolute_url: string; location?: { name?: string } }> }
interface LeverPosting { id: string; text: string; createdAt: number; applyUrl?: string; hostedUrl?: string; categories?: { location?: string } }

async function fetchT(url: string, init?: RequestInit, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal, next: { revalidate: 1800 } } as RequestInit)
    .finally(() => clearTimeout(timer));
}

async function scrapeGreenhouse(maxDays: number): Promise<ClassifiedJob[]> {
  const firms = getGreenhouseFirms();
  const results = await Promise.allSettled(
    firms.map(async ({ slug, firm, strategies, tier }) => {
      try {
        const res = await fetchT(`https://boards.greenhouse.io/${slug}/jobs.json`);
        if (!res.ok) return [] as ClassifiedJob[];
        const data = await res.json() as GreenhouseResp;
        const out: ClassifiedJob[] = [];
        for (const job of data?.jobs ?? []) {
          const days = daysAgo(job.updated_at);
          if (days > maxDays || !isRelevant(job.title)) continue;
          const baseJob: JobSignal = {
            id: `gh-${slug}-${job.id}`,
            firm,
            role: job.title,
            category: classifyTitleToCategory(job.title),
            location: job.location?.name?.split(",")?.[0]?.trim() || "—",
            daysAgo: days,
            signalTag: "Post-raise build-out",
            why: "Direct from firm careers page",
            score: 60 + Math.max(0, 30 - days),
            edgarUrl: job.absolute_url,
            source: "greenhouse",
          };
          out.push({ ...baseJob, classification: classifyHeuristic(baseJob) });
        }
        return out;
      } catch { return [] as ClassifiedJob[]; }
    })
  );
  return results.flatMap((r) => r.status === "fulfilled" ? r.value : []);
}

async function scrapeLever(maxDays: number): Promise<ClassifiedJob[]> {
  const firms = getLeverFirms();
  const results = await Promise.allSettled(
    firms.map(async ({ slug, firm }) => {
      try {
        const res = await fetchT(`https://api.lever.co/v0/postings/${slug}?mode=json`);
        if (!res.ok) return [] as ClassifiedJob[];
        const jobs = await res.json() as LeverPosting[];
        if (!Array.isArray(jobs)) return [] as ClassifiedJob[];
        const out: ClassifiedJob[] = [];
        for (const job of jobs) {
          const days = Math.floor((Date.now() - job.createdAt) / 86_400_000);
          if (days > maxDays || !isRelevant(job.text)) continue;
          const baseJob: JobSignal = {
            id: `lever-${slug}-${job.id}`,
            firm,
            role: job.text,
            category: classifyTitleToCategory(job.text),
            location: job.categories?.location?.split(",")?.[0]?.trim() || "—",
            daysAgo: days,
            signalTag: "Post-raise build-out",
            why: "Direct from firm careers page",
            score: 60 + Math.max(0, 30 - days),
            edgarUrl: job.applyUrl || job.hostedUrl,
            source: "lever",
          };
          out.push({ ...baseJob, classification: classifyHeuristic(baseJob) });
        }
        return out;
      } catch { return [] as ClassifiedJob[]; }
    })
  );
  return results.flatMap((r) => r.status === "fulfilled" ? r.value : []);
}

async function scrapeAshby(maxDays: number): Promise<ClassifiedJob[]> {
  const firms = getAshbyFirms();
  const results = await Promise.allSettled(
    firms.map(async ({ slug, firm }) => {
      try {
        const postings = await fetchAshbyPostings(slug);
        if (!postings) return [] as ClassifiedJob[];
        const out: ClassifiedJob[] = [];
        for (const p of postings) {
          const days = daysAgo(p.publishedDate || "");
          if (days > maxDays || !isRelevant(p.title)) continue;
          if (p.employmentType === "Intern" || p.employmentType === "PartTime") continue;
          const baseJob: JobSignal = {
            id: `ashby-${slug}-${p.id}`,
            firm,
            role: p.title,
            category: classifyTitleToCategory(p.title),
            location: p.locationName?.split(",")?.[0]?.trim() || "—",
            daysAgo: days,
            signalTag: "Post-raise build-out",
            why: "Direct from firm careers page (Ashby)",
            score: 60 + Math.max(0, 30 - days),
            edgarUrl: p.applyUrl || p.externalLink,
            source: "ashby",
          };
          out.push({ ...baseJob, classification: classifyHeuristic(baseJob) });
        }
        return out;
      } catch { return [] as ClassifiedJob[]; }
    })
  );
  return results.flatMap((r) => r.status === "fulfilled" ? r.value : []);
}

// ─── EDGAR cross-reference ────────────────────────────────────────────────────

interface EdgarRaise {
  entityName: string;
  amountStr: string;
  date: string;
  status: string;
}

async function fetchEdgarRaises(maxDays: number): Promise<EdgarRaise[]> {
  const terms = ["private credit", "special situations", "direct lending", "distressed", "hedge fund"];
  const end = new Date().toISOString().split("T")[0];
  const start = new Date(Date.now() - maxDays * 86_400_000).toISOString().split("T")[0];
  const EDGAR_HEADERS = { "User-Agent": "Onlu/1.0 research@onlu.com", "Accept": "application/json" };

  const searchResults = await Promise.allSettled(
    terms.map(async (term) => {
      const p = new URLSearchParams({ q: `"${term}"`, forms: "D", dateRange: "custom", startdt: start, enddt: end });
      const res = await fetchT(`https://efts.sec.gov/LATEST/search-index?${p}`, { headers: EDGAR_HEADERS });
      if (!res.ok) return [];
      const data = await res.json() as { hits?: { hits?: Array<{ _source?: { display_names?: string[]; adsh?: string; file_date?: string } }> } };
      return data?.hits?.hits ?? [];
    })
  );

  // Skip XML parsing entirely — just use entity names from search results.
  // XML parsing is slow (sequential, per-filing HTTP calls) and times out at scale.
  // Entity name alone is sufficient to cross-reference with the firm registry.
  const seen = new Set<string>();
  const raises: EdgarRaise[] = [];

  for (const r of searchResults) {
    if (r.status !== "fulfilled") continue;
    for (const hit of r.value) {
      const src = hit._source;
      const adsh = src?.adsh;
      if (!adsh || seen.has(adsh)) continue;
      seen.add(adsh);
      const name = (src?.display_names?.[0] || "").replace(/\s*\(CIK\s+\d+\)\s*$/, "").trim();
      if (!name) continue;
      // Only include if this name matches a known firm in the registry
      if (!findFirmByName(name)) continue;
      raises.push({ entityName: name, amountStr: "", date: src?.file_date || "", status: "open" });
    }
  }
  return raises;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const maxDays = parseInt(searchParams.get("dateRange") || "30");
  const useLlm = searchParams.get("llm") !== "0";

  try {
    // Scrape all direct career pages in parallel
    const [ghJobs, leverJobs, ashbyJobs, edgarRaises] = await Promise.all([
      scrapeGreenhouse(maxDays),
      scrapeLever(maxDays),
      scrapeAshby(maxDays),
      fetchEdgarRaises(maxDays),
    ]);

    const rawJobs: ClassifiedJob[] = [...ghJobs, ...leverJobs, ...ashbyJobs];

    // Deduplicate
    const seen = new Set<string>();
    const dedupedJobs = rawJobs.filter((j) => {
      const key = `${j.firm.toLowerCase()}|${j.role.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Upgrade heuristic classifications with Claude (if key available)
    let classifiedJobs = dedupedJobs;
    if (useLlm && process.env.ANTHROPIC_API_KEY) {
      const upgraded = await classifyJobs(dedupedJobs);
      classifiedJobs = upgraded;
    }

    // Sort by relevance score
    classifiedJobs.sort((a, b) => b.classification.relevanceScore - a.classification.relevanceScore);

    // Build firm-level profiles
    const firmMap = new Map<string, FirmIntelProfile>();

    for (const firmDef of FIRMS) {
      firmMap.set(firmDef.id, {
        firmId: firmDef.id,
        name: firmDef.name,
        tier: firmDef.tier,
        strategies: firmDef.strategies,
        openRoles: [],
        frontOfficeCount: 0,
        signals: [],
        hiringPush: false,
        postRaiseHiring: false,
      });
    }

    // Assign jobs to firms
    for (const job of classifiedJobs) {
      const firmDef = findFirmByName(job.firm);
      if (!firmDef) continue;
      const profile = firmMap.get(firmDef.id)!;
      profile.openRoles.push(job);
      if (job.classification.frontOffice) profile.frontOfficeCount++;
    }

    // Cross-reference EDGAR raises with known firms
    for (const raise of edgarRaises) {
      const firmDef = findFirmByName(raise.entityName);
      if (!firmDef) continue;
      const profile = firmMap.get(firmDef.id);
      if (!profile) continue;
      profile.edgarRaise = { amountStr: raise.amountStr, date: raise.date, status: raise.status };
    }

    // Compute derived signals
    for (const profile of firmMap.values()) {
      if (profile.openRoles.length === 0) continue;

      profile.hiringPush = profile.frontOfficeCount >= 3;
      profile.postRaiseHiring = !!profile.edgarRaise && profile.frontOfficeCount >= 1;

      // Detect strategy buildout: roles in strategies not listed as primary for this firm
      const firmStrategies = new Set(profile.strategies);
      const roleStrategies = new Set(
        profile.openRoles.flatMap((j) => j.classification.strategies)
      );
      const newStrategies = [...roleStrategies].filter((s) => !firmStrategies.has(s));
      if (newStrategies.length > 0) {
        profile.strategyBuildout = newStrategies[0];
      }

      // Build signal strings
      if (profile.hiringPush) {
        profile.signals.push(`${profile.frontOfficeCount} front-office roles open`);
      }
      if (profile.edgarRaise) {
        const { amountStr, status } = profile.edgarRaise;
        profile.signals.push(
          status === "open"
            ? `Actively raising${amountStr ? ` (${amountStr} target)` : ""}`
            : `Recently closed raise${amountStr ? ` (${amountStr})` : ""}`
        );
      }
      if (profile.strategyBuildout) {
        const label = profile.strategyBuildout.replace(/_/g, " ");
        profile.signals.push(`Hiring into ${label} — possible strategy expansion`);
      }
    }

    // Build output collections
    const profiles = [...firmMap.values()].filter((p) => p.openRoles.length > 0);

    const hiringPush = profiles
      .filter((p) => p.hiringPush)
      .sort((a, b) => b.frontOfficeCount - a.frontOfficeCount);

    const postRaise = profiles
      .filter((p) => p.postRaiseHiring && !p.hiringPush) // avoid double listing
      .sort((a, b) => b.openRoles.length - a.openRoles.length);

    const strategyBuilds = profiles
      .filter((p) => p.strategyBuildout && !p.hiringPush && !p.postRaiseHiring)
      .sort((a, b) => b.openRoles.length - a.openRoles.length);

    const response: IntelResponse = {
      hiringPush,
      postRaise,
      strategyBuilds,
      allRoles: classifiedJobs,
      totalFirms: profiles.length,
      lastUpdated: new Date().toISOString(),
    };

    return Response.json(response);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
