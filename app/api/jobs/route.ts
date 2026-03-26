/**
 * Market Hiring API — multi-source job aggregator
 *
 * Sources (run in parallel, results merged and deduplicated):
 *
 *   1. Adzuna      — aggregates Indeed, LinkedIn, Monster, etc.
 *                    Free at developer.adzuna.com → set ADZUNA_APP_ID + ADZUNA_APP_KEY
 *
 *   2. The Muse    — free, no key required. Fetches Finance & Accounting jobs across
 *                    multiple pages and filters to buy-side relevant titles.
 *
 *   3. Greenhouse  — direct career pages for known buy-side firms.
 *
 *   4. Lever       — direct career pages for known buy-side firms.
 *
 *   5. EDGAR       — ALWAYS runs as a fallback signal layer. Infers likely roles
 *                    from SEC Form D fund filings (capital flow → hiring signal).
 */

import { NextRequest } from "next/server";
import { OfferingStatus, EdgarSearchHit, JobSignal, JobCategory } from "@/app/types";
import { detectStrategy, getDaysSince, inferJobRoles, inferJobSignalTag, scoreJobSignal } from "@/app/lib/scoring";

export const runtime = "edge";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(dateStr: string): number {
  return getDaysSince(dateStr.split("T")[0].split(" ")[0]);
}

function formatM(n?: number): string {
  if (!n) return "";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}

function extractXml(xml: string, tag: string): string | undefined {
  return xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i"))?.[1]?.trim();
}

function getDateRange(days: string) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - parseInt(days));
  return { startDate: start.toISOString().split("T")[0], endDate: end.toISOString().split("T")[0] };
}

/** Safely parse JSON — returns null if the response is HTML or malformed. */
async function safeJson<T>(res: Response): Promise<T | null> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("json")) return null;
  try { return await res.json() as T; } catch { return null; }
}

/** fetch with a hard timeout (default 6 s) to prevent edge function hangs. */
function fetchT(url: string, init?: RequestInit, ms = 6000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

/** Titles that are never relevant to buy-side investing regardless of search query context. */
const IRRELEVANT_TITLE_RE = /\b(IT|information technology|software engineer|developer|devops|sysadmin|network engineer|cybersecurity|security engineer|data engineer|machine learning engineer|ML engineer|HR|human resources|recruiter|talent acquisition|office manager|facilities|executive assistant|administrative|admin assistant|receptionist|payroll|benefits|legal counsel|paralegal|attorney|general counsel|marketing manager|content manager|social media|SEO|sales manager|account executive|account manager|business development|customer success|customer support|help desk|product manager|project manager|scrum master|operations manager|supply chain|logistics|procurement|purchasing)\b/i;

/** Finance/investment keywords — at least one must appear for the title to be considered buyside-relevant. */
const FINANCE_KEYWORD_RE = /\b(credit|equity|fund|hedge|portfolio|investment|investor|analyst|quant|quantitative|fixed income|distressed|lending|capital|asset|securities|trading|research|finance|financial|private|debt|yield|arbitrage|macro|strategy|associate|vice president|managing director)\b/i;

/** Classify a job title into a buy-side category. Returns null if unclear or irrelevant. */
function classifyTitle(title: string): JobCategory | null {
  if (IRRELEVANT_TITLE_RE.test(title)) return null;
  if (!FINANCE_KEYWORD_RE.test(title)) return null;
  const t = title.toLowerCase();
  // Investment Banking (sell-side advisory)
  if (/investment bank|m&a\b|mergers.*acquisitions|equity capital market|debt capital market|\becm\b|\bdcm\b|corporate.*advisory|leveraged finance.*(bank|group|analyst|associate)/i.test(t)) return "Investment Banking";
  // Private Credit (illiquid/direct lending)
  if (/private credit|direct lending|distressed|special situations|special sits|mezzanine|\bmezz\b|structured credit|structured finance|unitranche|loan origination|credit.*fund|credit.*partner|leveraged.*credit/i.test(t)) return "Private Credit";
  // Public Credit (liquid markets)
  if (/high yield|fixed income|investment grade|credit research|credit trading|credit analyst|bond.*fund|bond.*analyst|public credit|securit.*credit|\brates\b.*credit/i.test(t)) return "Public Credit";
  // Equity Research (sell-side / fundamental research)
  if (/equity research|research analyst|sell.?side|coverage analyst|securities research|sector research/i.test(t)) return "Equity Research";
  // Quant
  if (/quant|quantitative|systematic|algo|data scientist.*(fund|invest)/i.test(t)) return "Quant";
  // IR / Ops
  if (/investor relation|fund oper|compliance.*fund|finance operation/i.test(t)) return "IR / Ops";
  // Equity Investing (buy-side equity, macro, alternatives)
  if (/equity|portfolio|investment analyst|hedge fund|fund manager|asset manag|buy.?side|macro|global macro|alternative invest|alternatives.*fund|multi.?asset|long.?short|private equity|growth equity/i.test(t)) return "Equity Investing";
  return null;
}

function signalTagFromTitle(title: string): JobSignal["signalTag"] {
  if (/head|chief|cio|coo|cfo|managing director|\bmd\b|partner/i.test(title)) return "Fund scaling";
  if (/senior|director|vp |vice president/i.test(title)) return "Post-raise build-out";
  return "New fund";
}

// ─── Source 1: Adzuna ─────────────────────────────────────────────────────────

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs/us/search/1";

// 18 queries × 50 results = up to 900 raw. Balanced across buy-side categories.
const ADZUNA_QUERIES: Array<{ what: string; fallbackCat: JobCategory }> = [
  // Credit
  { what: "private credit analyst fund",              fallbackCat: "Credit"          },
  { what: "distressed debt hedge fund analyst",       fallbackCat: "Credit"          },
  { what: "direct lending associate credit",          fallbackCat: "Credit"          },
  { what: "leveraged finance analyst investment bank", fallbackCat: "Credit"         },
  // Equity
  { what: "equity analyst buy side hedge fund",       fallbackCat: "Equity"          },
  { what: "portfolio manager long short equity",      fallbackCat: "Equity"          },
  { what: "investment analyst private equity fund",   fallbackCat: "Equity"          },
  { what: "hedge fund analyst investment",            fallbackCat: "Equity"          },
  // Equity Research
  { what: "equity research analyst sell side",        fallbackCat: "Equity Research" },
  { what: "sector research analyst fund",             fallbackCat: "Equity Research" },
  { what: "research analyst coverage securities",     fallbackCat: "Equity Research" },
  // Quant
  { what: "quantitative researcher systematic fund",  fallbackCat: "Quant"           },
  { what: "quantitative analyst trading strategies",  fallbackCat: "Quant"           },
  // Macro / PE
  { what: "global macro analyst fund",                fallbackCat: "Equity"          },
  { what: "private equity associate vice president",  fallbackCat: "Equity"          },
  { what: "growth equity associate investment",       fallbackCat: "Equity"          },
  // IR / Ops
  { what: "investor relations alternative asset fund", fallbackCat: "IR / Ops"      },
  { what: "fund operations analyst asset management", fallbackCat: "IR / Ops"       },
];

async function fromAdzuna(appId: string, appKey: string, maxDays: number): Promise<JobSignal[]> {
  const results = await Promise.allSettled(
    ADZUNA_QUERIES.map(async ({ what, fallbackCat }) => {
      const p = new URLSearchParams({ app_id: appId, app_key: appKey, what, results_per_page: "50", sort_by: "date", max_days_old: String(maxDays), "content-type": "application/json" });
      const res = await fetchT(`${ADZUNA_BASE}?${p}`);
      if (!res.ok) return [] as Array<{ hit: AdzunaJob; fallbackCat: JobCategory }>;
      const data = await safeJson<AdzunaResp>(res);
      return (data?.results || []).map((hit) => ({ hit, fallbackCat }));
    })
  );

  const seen = new Set<string>();
  const out: JobSignal[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const { hit, fallbackCat } of r.value) {
      if (seen.has(hit.id)) continue;
      seen.add(hit.id);
      const days = daysAgo(hit.created);
      if (days > maxDays) continue;
      // Only include jobs with a clear buy-side category
      const classified = classifyTitle(hit.title);
      if (!classified) continue;
      // Prefer fallbackCat when title gives a generic result that the query context overrides
      // e.g. "Equity Analyst" from an Equity Research query → classify as Equity Research
      const cat = (classified === "Equity" && fallbackCat === "Equity Research") ? fallbackCat : classified;
      const desc = (hit.description || "").replace(/<[^>]+>/g, "").slice(0, 130).trim();
      out.push({
        id: `adzuna-${hit.id}`,
        firm: hit.company?.display_name || "Unknown",
        role: hit.title,
        category: cat,
        location: hit.location?.display_name?.split(",")?.[0]?.trim() || "—",
        daysAgo: days,
        signalTag: signalTagFromTitle(hit.title),
        why: desc ? `${desc}…` : "See listing",
        score: 0,
        edgarUrl: hit.redirect_url,
      });
    }
  }
  return out;
}

interface AdzunaJob { id: string; title: string; company?: { display_name: string }; location?: { display_name: string }; description?: string; created: string; redirect_url: string; }
interface AdzunaResp { results: AdzunaJob[]; count: number; }

// ─── Source 2: The Muse ───────────────────────────────────────────────────────
// Fetches pages 0-4 of Finance & Accounting jobs (20 per page = up to 100 raw).
// The Muse public API does not support title/keyword filtering, so we fetch
// broadly and let classifyTitle filter to buy-side relevant roles.

async function fromMuse(maxDays: number): Promise<JobSignal[]> {
  const results = await Promise.allSettled(
    [0, 1, 2, 3, 4].map(async (page) => {
      const p = new URLSearchParams({ "category": "Finance & Accounting", "descending": "true", "page": String(page) });
      const res = await fetchT(`https://www.themuse.com/api/public/jobs?${p}`);
      if (!res.ok) return [] as MuseJob[];
      const data = await safeJson<MuseResp>(res);
      return data?.results || [];
    })
  );

  const seen = new Set<number>();
  const out: JobSignal[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const job of r.value) {
      if (seen.has(job.id)) continue;
      seen.add(job.id);
      const pubDate = job.publication_date || "";
      if (!pubDate) continue; // skip jobs with no date — would falsely show as "Today"
      const days = daysAgo(pubDate);
      if (days > maxDays) continue;
      const cat = classifyTitle(job.name) ?? ("Other" as JobCategory);
      if (cat === "Other") continue; // skip unclassifiable
      const loc = job.locations?.[0]?.name?.split(",")?.[0]?.trim() || "—";
      out.push({
        id: `muse-${job.id}`,
        firm: job.company?.name || "Unknown",
        role: job.name,
        category: cat,
        location: loc,
        daysAgo: days,
        signalTag: signalTagFromTitle(job.name),
        why: job.refs?.landing_page ? "See listing on The Muse" : "Finance role",
        score: 0,
        edgarUrl: job.refs?.landing_page,
      });
    }
  }
  return out;
}

interface MuseJob { id: number; name: string; company?: { name: string }; locations?: Array<{ name: string }>; publication_date?: string; refs?: { landing_page?: string }; }
interface MuseResp { results: MuseJob[]; }

// ─── Source 3: EDGAR fallback ─────────────────────────────────────────────────

const EDGAR_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_ARCHIVE_URL = "https://www.sec.gov/Archives/edgar/data";
const EDGAR_HEADERS = { "User-Agent": "Onlu/1.0 research@onlu.com", "Accept": "application/json, text/xml" };
const EDGAR_QUERIES = ["private credit", "special situations", "hedge fund", "direct lending", "distressed", "long short equity"];
const FUND_REQUIRED = [/\bfund\b/i, /\bL\.?P\.?\b/, /\bpartners\b/i, /\bcapital\b/i, /\bcredit\b/i, /\bequity\b/i, /\bopportunities\b/i, /\bmanagement\b/i, /\bhedge\b/i, /\binvestment\b/i];
const FUND_EXCLUDE = [/\blaw (firm|office)\b/i, /\battorneys? at law\b/i, /\bpension plan\b/i, /\breal estate\b/i, /\brealty\b/i];

async function fromEdgar(maxDays: number): Promise<JobSignal[]> {
  const { startDate, endDate } = getDateRange(String(maxDays));

  const searchResults = await Promise.allSettled(
    EDGAR_QUERIES.map(async (term) => {
      const p = new URLSearchParams({ q: `"${term}"`, forms: "D", dateRange: "custom", startdt: startDate, enddt: endDate });
      const res = await fetchT(`${EDGAR_SEARCH_URL}?${p}`, { headers: EDGAR_HEADERS });
      if (!res.ok) return [] as EdgarSearchHit[];
      const data = await safeJson<{ hits: { hits: EdgarSearchHit[] } }>(res);
      return (data?.hits?.hits || []) as EdgarSearchHit[];
    })
  );

  const seen = new Map<string, EdgarSearchHit>();
  for (const r of searchResults) {
    if (r.status !== "fulfilled") continue;
    for (const hit of r.value) {
      const key = hit._source?.adsh || hit._id;
      const name = (hit._source?.display_names?.[0] || "").replace(/\s*\(CIK\s+\d+\)\s*$/, "");
      const isOk = name.length > 2 && !FUND_EXCLUDE.some((p) => p.test(name)) && FUND_REQUIRED.some((p) => p.test(name));
      if (!seen.has(key) && isOk) seen.set(key, hit);
    }
  }

  const partial = Array.from(seen.values()).slice(0, 50).map((hit) => {
    const src = hit._source || {};
    const entityName = (src.display_names?.[0] || src.entity_name || "").replace(/\s*\(CIK\s+\d+\)\s*$/, "").trim();
    const cik = src.ciks?.[0] ? String(parseInt(src.ciks[0], 10)) : "";
    const { strategy } = detectStrategy(entityName);
    return { entityName, cik, accessionNo: src.adsh || hit._id, formType: src.form || "D", fileDate: src.file_date || "", strategy };
  });

  const xmlResults = await Promise.all(
    partial.slice(0, 25).map(async (f) => {
      try {
        const url = `${EDGAR_ARCHIVE_URL}/${f.cik}/${f.accessionNo.replace(/-/g, "")}/primary_doc.xml`;
        const res = await fetchT(url, { headers: EDGAR_HEADERS });
        if (!res.ok) return null;
        const xml = await res.text();
        if (extractXml(xml, "isPooledInvestmentFund")?.toLowerCase() !== "true") return null;
        const offeringNum = extractXml(xml, "totalOfferingAmount") ? parseFloat(extractXml(xml, "totalOfferingAmount")!) : undefined;
        const soldNum = extractXml(xml, "totalAmountSold") ? parseFloat(extractXml(xml, "totalAmountSold")!) : undefined;
        let offeringStatus: OfferingStatus = "unknown";
        if (soldNum !== undefined && offeringNum !== undefined) offeringStatus = soldNum >= offeringNum * 0.95 ? "closed" : "open";
        else if (extractXml(xml, "dateOfFirstSale")) offeringStatus = "open";
        return { ...f, offeringStatus, totalOfferingAmount: offeringNum, state: xml.match(/<issuerState>([^<]+)<\/issuerState>/i)?.[1] };
      } catch { return null; }
    })
  );

  const detailed = xmlResults.filter(Boolean) as NonNullable<(typeof xmlResults)[number]>[];
  const out: JobSignal[] = [];
  let idx = 0;

  for (const filing of detailed) {
    const days = getDaysSince(filing.fileDate);
    if (days > maxDays) continue;
    const roles = inferJobRoles(filing.strategy, filing.offeringStatus);
    const tag = inferJobSignalTag(filing.offeringStatus, filing.formType);
    const amtStr = formatM(filing.totalOfferingAmount);
    const why = [`New Form D`, amtStr ? `${amtStr} fund` : null, filing.offeringStatus === "open" ? "actively raising" : filing.offeringStatus === "closed" ? "recently closed" : null, `${days}d ago`].filter(Boolean).join(" · ");

    for (const { role, category } of roles) {
      out.push({
        id: `edgar-${filing.accessionNo}-${idx++}`,
        firm: filing.entityName,
        role,
        category,
        location: filing.state || "—",
        daysAgo: days,
        signalTag: tag,
        why,
        score: 0,
        edgarUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filing.cik}&type=D&dateb=&owner=include&count=40`,
      });
    }
  }
  out.sort((a, b) => a.daysAgo - b.daysAgo);
  return out;
}

// ─── Source 5: Greenhouse + Lever (direct firm career pages) ──────────────────

type FirmType = "pe" | "hedge" | "credit" | "growth";

// Only confirmed slugs — firms that actually use boards.greenhouse.io/<slug>/jobs.json
// Blackstone, Apollo, Carlyle, Citadel, Two Sigma use their own ATS portals (not Greenhouse)
const GREENHOUSE_FIRMS: Array<{ slug: string; firm: string; type: FirmType }> = [
  // Confirmed ✓
  { slug: "kkr",                 firm: "KKR",                        type: "pe"     },
  { slug: "point72",             firm: "Point72",                    type: "hedge"  },
  { slug: "millenniummanagement",firm: "Millennium Management",      type: "hedge"  },
  { slug: "aqr",                 firm: "AQR Capital Management",     type: "hedge"  },
  { slug: "bridgewater89",       firm: "Bridgewater Associates",     type: "hedge"  },
  { slug: "aresmgmt",            firm: "Ares Management",            type: "credit" },
  { slug: "golubcapital",        firm: "Golub Capital",              type: "credit" },
  { slug: "hpsinvestmentpartners", firm: "HPS Investment Partners",  type: "credit" },
  { slug: "generalatlantic",     firm: "General Atlantic",           type: "growth" },
  { slug: "insightpartners",     firm: "Insight Partners",           type: "growth" },
  { slug: "warburgpincusllc",    firm: "Warburg Pincus",             type: "pe"     },
];

const LEVER_FIRMS: Array<{ slug: string; firm: string; type: FirmType }> = [
  { slug: "coatue",            firm: "Coatue Management",          type: "hedge"  },
  { slug: "tigerglobal",       firm: "Tiger Global",               type: "growth" },
  { slug: "iconiqcapital",     firm: "ICONIQ Capital",             type: "pe"     },
  { slug: "dragoneer",         firm: "Dragoneer Investment Group", type: "growth" },
  { slug: "d1capitalpartners", firm: "D1 Capital Partners",        type: "hedge"  },
  { slug: "lightspeedvp",      firm: "Lightspeed Venture Partners",type: "growth" },
];

/** Fallback category when classifyTitle returns null for a role at a known buyside firm. */
function firmFallbackCat(type: FirmType): JobCategory {
  if (type === "credit") return "Private Credit";
  return "Equity Investing";
}

interface GreenhouseJob { id: number; title: string; updated_at: string; absolute_url: string; location?: { name?: string }; }
interface GreenhouseResp { jobs: GreenhouseJob[]; }
interface LeverPosting { id: string; text: string; createdAt: number; applyUrl?: string; hostedUrl?: string; categories?: { location?: string; department?: string }; }

async function fromGreenhouse(maxDays: number): Promise<JobSignal[]> {
  const results = await Promise.allSettled(
    GREENHOUSE_FIRMS.map(async ({ slug, firm, type }) => {
      const res = await fetchT(`https://boards.greenhouse.io/${slug}/jobs.json`);
      if (!res.ok) return [] as JobSignal[];
      const data = await safeJson<GreenhouseResp>(res);
      const jobs = data?.jobs || [];
      const out: JobSignal[] = [];
      for (const job of jobs) {
        const days = daysAgo(job.updated_at);
        if (days > maxDays) continue;
        const cat = classifyTitle(job.title) ?? (FINANCE_KEYWORD_RE.test(job.title) ? firmFallbackCat(type) : null);
        if (!cat) continue;
        out.push({
          id: `gh-${slug}-${job.id}`,
          firm,
          role: job.title,
          category: cat,
          location: job.location?.name?.split(",")?.[0]?.trim() || "—",
          daysAgo: days,
          signalTag: signalTagFromTitle(job.title),
          why: "Direct from firm careers page",
          score: 0,
          edgarUrl: job.absolute_url,
        });
      }
      return out;
    })
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

async function fromLever(maxDays: number): Promise<JobSignal[]> {
  const results = await Promise.allSettled(
    LEVER_FIRMS.map(async ({ slug, firm, type }) => {
      const res = await fetchT(`https://api.lever.co/v0/postings/${slug}?mode=json`);
      if (!res.ok) return [] as JobSignal[];
      const jobs = await safeJson<LeverPosting[]>(res);
      if (!Array.isArray(jobs)) return [] as JobSignal[];
      const out: JobSignal[] = [];
      for (const job of jobs) {
        const days = Math.floor((Date.now() - job.createdAt) / 86400000);
        if (days > maxDays) continue;
        const cat = classifyTitle(job.text) ?? (FINANCE_KEYWORD_RE.test(job.text) ? firmFallbackCat(type) : null);
        if (!cat) continue;
        out.push({
          id: `lever-${slug}-${job.id}`,
          firm,
          role: job.text,
          category: cat,
          location: job.categories?.location?.split(",")?.[0]?.trim() || "—",
          daysAgo: days,
          signalTag: signalTagFromTitle(job.text),
          why: "Direct from firm careers page",
          score: 0,
          edgarUrl: job.applyUrl || job.hostedUrl,
        });
      }
      return out;
    })
  );
  return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}

// ─── Source 6: Jobs API (Pat92 / jobs-api14) via RapidAPI ─────────────────────
// Endpoint: GET https://jobs-api14.p.rapidapi.com/v2/list
// Scrapes LinkedIn, Indeed, Glassdoor, ZipRecruiter + more in a single call.
// datePosted values: today | 3days | week | month
// Set RAPIDAPI_KEY in env to enable (subscribe at rapidapi.com/Pat92/api/jobs-api14)

const JOBS14_QUERIES = [
  "private credit analyst",
  "hedge fund analyst",
  "distressed debt analyst",
  "quantitative researcher fund",
  "equity research analyst",
  "private equity associate",
  "direct lending associate",
  "investment analyst buy side",
];

function jobs14DatePosted(maxDays: number): string {
  if (maxDays <= 1)  return "today";
  if (maxDays <= 3)  return "3days";
  if (maxDays <= 7)  return "week";
  return "month";
}

interface Jobs14Job {
  id?: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  datePosted?: string;   // ISO string or relative text
  applyLink?: string;
  description?: string;
  employmentType?: string;
}
interface Jobs14Resp { jobs?: Jobs14Job[]; }

async function fromJobs14(apiKey: string, maxDays: number): Promise<JobSignal[]> {
  const datePosted = jobs14DatePosted(maxDays);

  const results = await Promise.allSettled(
    JOBS14_QUERIES.map(async (query) => {
      const p = new URLSearchParams({
        query,
        location: "United States",
        autoTranslateLocation: "false",
        remoteOnly: "false",
        employmentTypes: "fulltime",
        datePosted,
      });
      const res = await fetchT(`https://jobs-api14.p.rapidapi.com/v2/list?${p}`, {
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "jobs-api14.p.rapidapi.com",
        },
      }, 8000);
      if (!res.ok) return [] as Jobs14Job[];
      const data = await safeJson<Jobs14Resp>(res);
      return data?.jobs || [];
    })
  );

  const seen = new Set<string>();
  const out: JobSignal[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const job of r.value) {
      const key = job.id || `${job.jobTitle}-${job.company}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const days = job.datePosted ? daysAgo(job.datePosted) : maxDays;
      if (days > maxDays) continue;
      const cat = classifyTitle(job.jobTitle ?? "");
      if (!cat) continue;
      const desc = (job.description ?? "").replace(/<[^>]+>/g, "").slice(0, 130).trim();
      out.push({
        id: `jobs14-${key}`,
        firm: job.company || "Unknown",
        role: job.jobTitle || "Unknown",
        category: cat ?? "Equity Investing",
        location: job.location?.split(",")?.[0]?.trim() || "—",
        daysAgo: days,
        signalTag: signalTagFromTitle(job.jobTitle ?? ""),
        why: desc ? `${desc}…` : "See listing",
        score: 0,
        edgarUrl: job.applyLink,
      });
    }
  }
  return out;
}

// ─── Source 7: LinkedIn Job Search API (fantastic-jobs) via RapidAPI ──────────
// Endpoint: GET https://linkedin-job-search-api.p.rapidapi.com/active-jb-1h
// Real-time feed of LinkedIn jobs posted in the last hour — no keyword filter.
// We filter by title/description on our side after fetching.
// Other time-window variants: active-jb-7d (7 days), active-jb-24h (24h).
// Params: limit (max 100), offset (pagination), description_type=text
// Set RAPIDAPI_KEY in env (same key, subscribe to linkedin-job-search-api plan)

// Defensive field extractor — fantastic-jobs field names not fully confirmed;
// handles both camelCase and snake_case variants seen across similar APIs.
interface FJJob {
  id?: string;
  // title variants
  title?: string; job_title?: string; jobTitle?: string;
  // company variants
  company?: string | { name?: string }; company_name?: string; employer?: string;
  // location
  location?: string; job_location?: string;
  // date variants
  date?: string; date_posted?: string; datePosted?: string; posted_at?: string; listedAt?: string; listed_at?: string;
  // URL variants
  url?: string; job_url?: string; apply_url?: string; linkedin_url?: string; applyLink?: string;
  // description
  description?: string; job_description?: string;
}

function fjTitle(j: FJJob): string {
  return j.title || j.job_title || j.jobTitle || "";
}
function fjCompany(j: FJJob): string {
  if (typeof j.company === "object" && j.company?.name) return j.company.name;
  if (typeof j.company === "string") return j.company;
  return j.company_name || j.employer || "Unknown";
}
function fjLocation(j: FJJob): string {
  return j.location || j.job_location || "—";
}
function fjDate(j: FJJob): string {
  return j.date || j.date_posted || j.datePosted || j.posted_at || j.listedAt || j.listed_at || "";
}
function fjUrl(j: FJJob): string | undefined {
  return j.url || j.job_url || j.apply_url || j.linkedin_url || j.applyLink;
}
function fjDesc(j: FJJob): string {
  return j.description || j.job_description || "";
}

// Choose feed endpoint based on maxDays
function fjEndpoint(maxDays: number): string {
  if (maxDays <= 1)  return "active-jb-1h";
  if (maxDays <= 7)  return "active-jb-7d";
  return "active-jb-7d"; // longest available feed
}

async function fromFantasticJobs(apiKey: string, maxDays: number): Promise<JobSignal[]> {
  const endpoint = fjEndpoint(maxDays);
  // Fetch up to 100 jobs; the feed has no keyword param so we filter locally
  const p = new URLSearchParams({ limit: "100", offset: "0", description_type: "text" });
  const res = await fetchT(
    `https://linkedin-job-search-api.p.rapidapi.com/${endpoint}?${p}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "linkedin-job-search-api.p.rapidapi.com",
      },
    },
    10000,
  );
  if (!res.ok) return [];

  // API may return array directly or wrapped in { data: [...] } / { jobs: [...] }
  const raw = await safeJson<FJJob[] | { data?: FJJob[]; jobs?: FJJob[] }>(res);
  const jobs: FJJob[] = Array.isArray(raw)
    ? raw
    : (raw as { data?: FJJob[]; jobs?: FJJob[] })?.data
      ?? (raw as { data?: FJJob[]; jobs?: FJJob[] })?.jobs
      ?? [];

  const seen = new Set<string>();
  const out: JobSignal[] = [];

  for (const job of jobs) {
    const title = fjTitle(job);
    if (!title) continue;
    const cat = classifyTitle(title);
    if (!cat) continue; // skip non-buy-side roles

    const key = job.id || `${title}-${fjCompany(job)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const days = fjDate(job) ? daysAgo(fjDate(job)) : maxDays;
    if (days > maxDays) continue;

    const desc = fjDesc(job).replace(/<[^>]+>/g, "").slice(0, 130).trim();
    out.push({
      id: `fj-${key}`,
      firm: fjCompany(job),
      role: title,
      category: cat ?? "Equity Investing",
      location: fjLocation(job).split(",")[0].trim() || "—",
      daysAgo: days,
      signalTag: signalTagFromTitle(title),
      why: desc ? `${desc}…` : "Live LinkedIn listing",
      score: 0,
      edgarUrl: fjUrl(job),
    });
  }
  return out;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get("dateRange") || "90";
    const category = searchParams.get("category") || "all";
    const signalTag = searchParams.get("signalTag") || "all";
    const maxDays = parseInt(dateRange);

    const adzunaId    = process.env.ADZUNA_APP_ID  ?? "";
    const adzunaKey   = process.env.ADZUNA_APP_KEY ?? "";
    const rapidApiKey = process.env.RAPIDAPI_KEY   ?? "";

    // Run all sources in parallel
    const [adzunaResult, museResult, edgarResult, ghResult, leverResult, jobs14Result, fjResult] = await Promise.allSettled([
      adzunaId && adzunaKey ? fromAdzuna(adzunaId, adzunaKey, maxDays) : Promise.resolve([] as JobSignal[]),
      fromMuse(maxDays),
      fromEdgar(maxDays),
      fromGreenhouse(maxDays),
      fromLever(maxDays),
      rapidApiKey ? fromJobs14(rapidApiKey, maxDays) : Promise.resolve([] as JobSignal[]),
      rapidApiKey ? fromFantasticJobs(rapidApiKey, maxDays) : Promise.resolve([] as JobSignal[]),
    ]);

    const sources: string[] = [];
    const allSignals: JobSignal[] = [];

    const add = (r: PromiseSettledResult<JobSignal[]>, name: string) => {
      if (r.status === "fulfilled" && r.value.length > 0) {
        r.value.forEach((s) => { s.source = name; });
        allSignals.push(...r.value);
        sources.push(name);
      }
    };
    add(adzunaResult,    "adzuna");
    add(museResult,      "muse");
    add(edgarResult,     "edgar");
    add(ghResult,        "greenhouse");
    add(leverResult,     "lever");
    add(jobs14Result,    "jobs14");
    add(fjResult,        "linkedin");

    // Deduplicate by firm+role (fuzzy: lowercase+trim)
    const dedupSeen = new Set<string>();
    const deduped = allSignals.filter((s) => {
      const key = `${s.firm.toLowerCase().trim()}|${s.role.toLowerCase().trim()}`;
      if (dedupSeen.has(key)) return false;
      dedupSeen.add(key);
      return true;
    });

    // Score every signal now that we have the full set
    deduped.forEach((s) => { s.score = scoreJobSignal(s); });

    // Apply filters
    let filtered = deduped;
    if (category !== "all") filtered = filtered.filter((s) => s.category === category);
    if (signalTag !== "all") filtered = filtered.filter((s) => s.signalTag === signalTag);

    // Sort by score descending (score already encodes source quality + recency + seniority)
    filtered.sort((a, b) => b.score - a.score);

    return Response.json({ signals: filtered, total: filtered.length, sources });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg, signals: [], total: 0, sources: [] }, { status: 500 });
  }
}
