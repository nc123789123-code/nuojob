/**
 * Market Hiring API — multi-source job aggregator
 *
 * Sources (run in parallel, results merged and deduplicated):
 *
 *   1. Adzuna     — aggregates Indeed, LinkedIn, Monster, etc.
 *                   Free at developer.adzuna.com → set ADZUNA_APP_ID + ADZUNA_APP_KEY
 *
 *   2. The Muse   — free, no key required. Finance & Accounting category.
 *
 *   3. JSearch    — near-LinkedIn data via RapidAPI (100 free req/day).
 *                   Free at rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
 *                   → set RAPIDAPI_KEY
 *
 *   4. EDGAR      — ALWAYS runs as a fallback signal layer. Infers likely roles
 *                   from SEC Form D fund filings (capital flow → hiring signal).
 */

import { NextRequest } from "next/server";
import { OfferingStatus, EdgarSearchHit, JobSignal, JobCategory } from "@/app/types";
import { detectStrategy, getDaysSince, inferJobRoles, inferJobSignalTag } from "@/app/lib/scoring";

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

/** Titles that are never relevant to buy-side investing regardless of search query context. */
const IRRELEVANT_TITLE_RE = /\b(IT|information technology|software engineer|developer|devops|sysadmin|network engineer|cybersecurity|security engineer|data engineer|machine learning engineer|ML engineer|HR|human resources|recruiter|talent acquisition|office manager|facilities|executive assistant|administrative|admin assistant|receptionist|payroll|benefits|legal counsel|paralegal|attorney|general counsel|marketing manager|content manager|social media|SEO|sales manager|account executive|account manager|business development|customer success|customer support|help desk|product manager|project manager|scrum master|operations manager|supply chain|logistics|procurement|purchasing)\b/i;

/** Finance/investment keywords — at least one must appear for the title to be considered buyside-relevant. */
const FINANCE_KEYWORD_RE = /\b(credit|equity|fund|hedge|portfolio|investment|investor|analyst|quant|quantitative|fixed income|distressed|lending|capital|asset|securities|trading|research|finance|financial|private|debt|yield|arbitrage|macro|strategy|associate|vice president|managing director)\b/i;

/** Classify a job title into a buy-side category. Returns null if unclear or irrelevant. */
function classifyTitle(title: string): JobCategory | null {
  if (IRRELEVANT_TITLE_RE.test(title)) return null;
  if (!FINANCE_KEYWORD_RE.test(title)) return null;
  const t = title.toLowerCase();
  if (/credit|lending|fixed income|high yield|leveraged|distressed|mezz|underwrite|loan/i.test(t)) return "Credit";
  if (/equity research|research analyst|sell.?side|coverage analyst|securities research|sector research/i.test(t)) return "Equity Research";
  if (/quant|quantitative|systematic|algo|data scientist.*(fund|invest)/i.test(t)) return "Quant";
  if (/investor relation|fund oper|compliance.*fund|finance operation/i.test(t)) return "IR / Ops";
  if (/equity|portfolio|investment analyst|hedge fund|fund manager|asset manag|buy.?side/i.test(t)) return "Equity";
  return null;
}

function signalTagFromTitle(title: string): JobSignal["signalTag"] {
  if (/head|chief|cio|coo|cfo|managing director|\bmd\b|partner/i.test(title)) return "Fund scaling";
  if (/senior|director|vp |vice president/i.test(title)) return "Post-raise build-out";
  return "New fund";
}

// ─── Source 1: Adzuna ─────────────────────────────────────────────────────────

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs/us/search/1";

const ADZUNA_QUERIES: Array<{ what: string; fallbackCat: JobCategory }> = [
  { what: "private credit analyst fund",          fallbackCat: "Credit" },
  { what: "distressed debt hedge fund analyst",   fallbackCat: "Credit" },
  { what: "direct lending associate",             fallbackCat: "Credit" },
  { what: "equity analyst buy side hedge fund",   fallbackCat: "Equity" },
  { what: "portfolio manager investment fund",    fallbackCat: "Equity" },
  { what: "equity research analyst sell side",    fallbackCat: "Equity Research" },
  { what: "quantitative researcher quant fund",   fallbackCat: "Quant" },
  { what: "investor relations fund alternative",  fallbackCat: "IR / Ops" },
];

async function fromAdzuna(appId: string, appKey: string, maxDays: number): Promise<JobSignal[]> {
  const results = await Promise.allSettled(
    ADZUNA_QUERIES.map(async ({ what, fallbackCat }) => {
      const p = new URLSearchParams({ app_id: appId, app_key: appKey, what, results_per_page: "15", sort_by: "date", max_days_old: String(maxDays), "content-type": "application/json" });
      const res = await fetch(`${ADZUNA_BASE}?${p}`);
      if (!res.ok) return [] as Array<{ hit: AdzunaJob; fallbackCat: JobCategory }>;
      const data: AdzunaResp = await res.json();
      return (data.results || []).map((hit) => ({ hit, fallbackCat }));
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
      // Drop titles that aren't finance-relevant even if returned by a finance query
      const classified = classifyTitle(hit.title);
      if (!classified && !FINANCE_KEYWORD_RE.test(hit.title)) continue;
      // Prefer fallbackCat when title gives a generic result that the query context overrides
      // e.g. "Equity Analyst" from an Equity Research query → classify as Equity Research
      const cat = !classified || (classified === "Equity" && fallbackCat === "Equity Research") ? fallbackCat : classified;
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

const MUSE_QUERIES = [
  "Credit Analyst", "Equity Analyst", "Portfolio Manager",
  "Equity Research", "Quantitative Analyst", "Investment Analyst",
  "Hedge Fund", "Private Credit",
];

async function fromMuse(maxDays: number): Promise<JobSignal[]> {
  const results = await Promise.allSettled(
    MUSE_QUERIES.map(async (q) => {
      const p = new URLSearchParams({ "category": "Finance & Accounting", "descending": "true", "page": "0" });
      const res = await fetch(`https://www.themuse.com/api/public/jobs?${p}&job_name=${encodeURIComponent(q)}`);
      if (!res.ok) return [] as MuseJob[];
      const data: MuseResp = await res.json();
      return data.results || [];
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

// ─── Source 3: JSearch (RapidAPI) ─────────────────────────────────────────────

const JSEARCH_QUERIES = [
  "credit analyst hedge fund",
  "equity analyst buy side",
  "private credit associate",
  "quantitative researcher fund",
  "equity research associate",
];

async function fromJSearch(apiKey: string, maxDays: number): Promise<JobSignal[]> {
  const results = await Promise.allSettled(
    JSEARCH_QUERIES.slice(0, 3).map(async (q) => { // limit to 3 to save quota
      const p = new URLSearchParams({ query: q, num_pages: "1", date_posted: maxDays <= 7 ? "today" : maxDays <= 30 ? "month" : "all" });
      const res = await fetch(`https://jsearch.p.rapidapi.com/search?${p}`, {
        headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" },
      });
      if (!res.ok) return [] as JSearchJob[];
      const data: JSearchResp = await res.json();
      return data.data || [];
    })
  );

  const seen = new Set<string>();
  const out: JobSignal[] = [];

  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const job of r.value) {
      if (seen.has(job.job_id)) continue;
      seen.add(job.job_id);
      if (!job.job_posted_at_datetime_utc) continue; // skip jobs with no date — would falsely show as "Today"
      const days = daysAgo(job.job_posted_at_datetime_utc);
      if (days > maxDays) continue;
      const cat = classifyTitle(job.job_title) ?? ("Other" as JobCategory);
      if (cat === "Other") continue;
      out.push({
        id: `jsearch-${job.job_id}`,
        firm: job.employer_name || "Unknown",
        role: job.job_title,
        category: cat,
        location: job.job_city || job.job_state || "—",
        daysAgo: days,
        signalTag: signalTagFromTitle(job.job_title),
        why: (job.job_description || "").slice(0, 130).trim() + "…",
        score: 0,
        edgarUrl: job.job_apply_link,
      });
    }
  }
  return out;
}

interface JSearchJob { job_id: string; job_title: string; employer_name?: string; job_city?: string; job_state?: string; job_posted_at_datetime_utc?: string; job_description?: string; job_apply_link?: string; }
interface JSearchResp { data: JSearchJob[]; }

// ─── Source 4: EDGAR fallback ─────────────────────────────────────────────────

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
      const res = await fetch(`${EDGAR_SEARCH_URL}?${p}`, { headers: EDGAR_HEADERS });
      if (!res.ok) return [] as EdgarSearchHit[];
      const data = await res.json();
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
        const res = await fetch(url, { headers: EDGAR_HEADERS });
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

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get("dateRange") || "90";
    const category = searchParams.get("category") || "all";
    const signalTag = searchParams.get("signalTag") || "all";
    const maxDays = parseInt(dateRange);

    const adzunaId  = process.env.ADZUNA_APP_ID   ?? "";
    const adzunaKey = process.env.ADZUNA_APP_KEY   ?? "";
    const rapidKey  = process.env.RAPIDAPI_KEY     ?? "";

    // Run all live sources + EDGAR in parallel
    const [adzunaResult, museResult, jsearchResult, edgarResult] = await Promise.allSettled([
      adzunaId && adzunaKey ? fromAdzuna(adzunaId, adzunaKey, maxDays) : Promise.resolve([] as JobSignal[]),
      fromMuse(maxDays),
      rapidKey ? fromJSearch(rapidKey, maxDays) : Promise.resolve([] as JobSignal[]),
      fromEdgar(maxDays),
    ]);

    const sources: string[] = [];
    const allSignals: JobSignal[] = [];

    const add = (r: typeof adzunaResult, name: string) => {
      if (r.status === "fulfilled" && r.value.length > 0) { allSignals.push(...r.value); sources.push(name); }
    };
    add(adzunaResult, "adzuna");
    add(museResult,   "muse");
    add(jsearchResult,"jsearch");
    add(edgarResult,  "edgar");

    // Deduplicate by firm+role (fuzzy: lowercase+trim)
    const dedupSeen = new Set<string>();
    const deduped = allSignals.filter((s) => {
      const key = `${s.firm.toLowerCase().trim()}|${s.role.toLowerCase().trim()}`;
      if (dedupSeen.has(key)) return false;
      dedupSeen.add(key);
      return true;
    });

    // Apply filters
    let filtered = deduped;
    if (category !== "all") filtered = filtered.filter((s) => s.category === category);
    if (signalTag !== "all") filtered = filtered.filter((s) => s.signalTag === signalTag);

    // Sort: real job board results first (non-edgar), then by recency
    filtered.sort((a, b) => {
      const aEdgar = a.id.startsWith("edgar-") ? 1 : 0;
      const bEdgar = b.id.startsWith("edgar-") ? 1 : 0;
      if (aEdgar !== bEdgar) return aEdgar - bEdgar;
      return a.daysAgo - b.daysAgo;
    });

    return Response.json({ signals: filtered, total: filtered.length, sources });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg, signals: [], total: 0, sources: [] }, { status: 500 });
  }
}
