/**
 * Daily Intel API — powers the homepage "New Today" feed.
 *
 * Returns without any user input:
 *   - todayCount:  Form D fund filings from the last 1 day
 *   - weekCount:   Form D fund filings from the last 7 days
 *   - topFunds:    Top 5 highest-scoring funds from the last 7 days
 *   - topJobs:     Top 6 job signals from direct firm career pages (Greenhouse / Lever)
 *   - lastUpdated: ISO timestamp
 */

import { FundFiling, OfferingStatus, EdgarSearchHit, JobSignal, JobCategory } from "@/app/types";
import { detectStrategy, scoreFiling, getDaysSince, scoreJobSignal } from "@/app/lib/scoring";

export const runtime = "edge";
export const revalidate = 3600; // cache for 1 hour at the CDN layer

const EDGAR_SEARCH = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_ARCHIVE = "https://www.sec.gov/Archives/edgar/data";
const HEADERS = { "User-Agent": "Onlu/1.0 research@onlu.com", "Accept": "application/json, text/xml" };

// Broad terms that catch the full fund universe
const DAILY_TERMS = [
  "credit fund",
  "hedge fund",
  "direct lending",
  "special situations",
  "credit partners",
  "private equity fund",
  "investment fund",
  "capital partners",
];

function dateStr(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().split("T")[0];
}

function extractXml(xml: string, tag: string): string | undefined {
  return xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, "i"))?.[1]?.trim();
}

const FUND_REQUIRED = [/\bfund\b/i, /\bL\.?P\.?\b/, /\bpartners\b/i, /\bcapital\b/i, /\bcredit\b/i, /\bequity\b/i, /\bopportunities\b/i, /\bmanagement\b/i, /\bhedge\b/i, /\binvestment\b/i, /\boffshore\b/i];
const FUND_EXCLUDE  = [/\blaw (firm|office)\b/i, /\battorneys? at law\b/i, /\bpension plan\b/i, /\breal estate\b/i, /\brealty\b/i];

function isLikelyFund(name: string | undefined): boolean {
  if (!name || name.trim().length < 3) return false;
  if (FUND_EXCLUDE.some((p) => p.test(name))) return false;
  return FUND_REQUIRED.some((p) => p.test(name));
}

async function fetchXmlDetails(cik: string, accessionNo: string): Promise<{
  totalOfferingAmount?: number;
  totalAmountSold?: number;
  offeringStatus: OfferingStatus;
  dateOfFirstSale?: string;
  state?: string;
} | null> {
  try {
    const url = `${EDGAR_ARCHIVE}/${cik}/${accessionNo.replace(/-/g, "")}/primary_doc.xml`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const xml = await res.text();
    if (extractXml(xml, "isPooledInvestmentFund")?.toLowerCase() !== "true") return null;
    const offeringNum = extractXml(xml, "totalOfferingAmount") ? parseFloat(extractXml(xml, "totalOfferingAmount")!) : undefined;
    const soldNum     = extractXml(xml, "totalAmountSold")     ? parseFloat(extractXml(xml, "totalAmountSold")!)     : undefined;
    let offeringStatus: OfferingStatus = "unknown";
    if (soldNum !== undefined && offeringNum !== undefined) offeringStatus = soldNum >= offeringNum * 0.95 ? "closed" : "open";
    else if (extractXml(xml, "dateOfFirstSale")) offeringStatus = "open";
    return { totalOfferingAmount: offeringNum, totalAmountSold: soldNum, offeringStatus, dateOfFirstSale: extractXml(xml, "dateOfFirstSale"), state: xml.match(/<issuerState>([^<]+)<\/issuerState>/i)?.[1] };
  } catch { return null; }
}

// ─── EDGAR daily pull ─────────────────────────────────────────────────────────

async function fetchRecentFunds(days: number): Promise<{ filings: FundFiling[]; rawCount: number }> {
  const start = dateStr(days);
  const end   = dateStr(0);

  const results = await Promise.allSettled(
    DAILY_TERMS.map(async (term) => {
      const p = new URLSearchParams({ q: `"${term}"`, forms: "D", dateRange: "custom", startdt: start, enddt: end });
      const res = await fetch(`${EDGAR_SEARCH}?${p}`, { headers: HEADERS });
      if (!res.ok) return [] as EdgarSearchHit[];
      const data = await res.json() as { hits?: { hits?: EdgarSearchHit[] } };
      return data?.hits?.hits || [];
    })
  );

  const seen = new Map<string, EdgarSearchHit>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const hit of r.value) {
      const name = (hit._source?.display_names?.[0] || "").replace(/\s*\(CIK\s+\d+\)\s*$/, "");
      if (!isLikelyFund(name)) continue;
      const key = hit._source?.adsh || hit._id;
      if (!seen.has(key)) seen.set(key, hit);
    }
  }

  const rawCount = seen.size;
  const partial = Array.from(seen.values()).slice(0, 40).map((hit) => {
    const src = hit._source || {};
    const entityName = (src.display_names?.[0] || src.entity_name || "").replace(/\s*\(CIK\s+\d+\)\s*$/, "").trim();
    const cik = src.ciks?.[0] ? String(parseInt(src.ciks[0], 10)) : "";
    const accessionNo = src.adsh || hit._id;
    const { strategy, label } = detectStrategy(entityName);
    return { id: accessionNo, entityName, cik, fileDate: src.file_date || "", formType: src.form || "D", accessionNo, strategy, strategyLabel: label, offeringStatus: "unknown" as OfferingStatus };
  });

  const xmlResults = await Promise.all(
    partial.slice(0, 20).map(async (f) => {
      const details = await fetchXmlDetails(f.cik, f.accessionNo);
      if (!details) return null;
      return { ...f, ...details };
    })
  );

  const detailed = xmlResults.filter(Boolean) as NonNullable<(typeof xmlResults)[number]>[];

  const filings: FundFiling[] = detailed.map((f) => ({
    ...f,
    score: scoreFiling(f),
    daysSinceFiling: getDaysSince(f.fileDate),
  }));

  filings.sort((a, b) => b.score.overallScore - a.score.overallScore);
  return { filings, rawCount };
}

// ─── Greenhouse top jobs (direct firm pages) ──────────────────────────────────

type FirmType = "pe" | "hedge" | "credit" | "growth";

const TOP_FIRMS: Array<{ slug: string; firm: string; type: FirmType }> = [
  { slug: "blackstone",           firm: "Blackstone",                  type: "pe"     },
  { slug: "kkr",                  firm: "KKR",                         type: "pe"     },
  { slug: "apolloglobal",         firm: "Apollo Global Management",    type: "pe"     },
  { slug: "carlyle",              firm: "The Carlyle Group",           type: "pe"     },
  { slug: "citadel",              firm: "Citadel",                     type: "hedge"  },
  { slug: "point72",              firm: "Point72",                     type: "hedge"  },
  { slug: "balyasny",             firm: "Balyasny Asset Management",   type: "hedge"  },
  { slug: "millenniummanagement", firm: "Millennium Management",       type: "hedge"  },
  { slug: "aresmgmt",             firm: "Ares Management",             type: "credit" },
  { slug: "blueowl",              firm: "Blue Owl Capital",            type: "credit" },
  { slug: "golubcapital",         firm: "Golub Capital",               type: "credit" },
  { slug: "hps",                  firm: "HPS Investment Partners",     type: "credit" },
];

const FINANCE_RE = /\b(credit|equity|fund|hedge|portfolio|investment|analyst|quant|fixed income|distressed|lending|capital|asset|trading|research|finance|financial|private|debt)\b/i;
const IRRELEVANT_RE = /\b(IT|software engineer|developer|devops|HR|recruiter|office manager|executive assistant|admin|payroll|legal counsel|paralegal|marketing|social media|customer|product manager|project manager)\b/i;

const CAT_RULES: Array<[RegExp, JobCategory]> = [
  [/investment bank|m&a\b|mergers.*acquisitions|equity capital market|debt capital market|\becm\b|\bdcm\b|leveraged finance.*(bank|group|analyst|associate)/i, "Investment Banking"],
  [/private credit|direct lending|distressed|special situations|mezzanine|\bmezz\b|structured credit|unitranche|loan origination|credit.*fund|credit.*partner|leveraged.*credit/i, "Private Credit"],
  [/high yield|fixed income|investment grade|credit research|credit trading|credit analyst|bond.*fund|public credit/i, "Public Credit"],
  [/equity research|research analyst|sell.?side|coverage analyst/i,                      "Equity Research"],
  [/quant|quantitative|systematic|algo/i,                                                 "Quant"],
  [/investor relation|fund oper|compliance.*fund/i,                                       "IR / Ops"],
  [/equity|portfolio|investment analyst|hedge fund|asset manag|buy.?side|macro|long.?short|private equity|growth equity/i, "Equity Investing"],
];

function classify(title: string): JobCategory | null {
  if (IRRELEVANT_RE.test(title)) return null;
  if (!FINANCE_RE.test(title)) return null;
  for (const [re, cat] of CAT_RULES) if (re.test(title)) return cat;
  return null;
}

function firmFallback(type: FirmType): JobCategory {
  return type === "credit" ? "Private Credit" : "Equity Investing";
}

interface GHJob { id: number; title: string; updated_at: string; absolute_url: string; location?: { name?: string }; }
interface GHResp { jobs: GHJob[]; }

async function fetchTopJobs(): Promise<JobSignal[]> {
  const results = await Promise.allSettled(
    TOP_FIRMS.map(async ({ slug, firm, type }) => {
      const res = await fetch(`https://boards.greenhouse.io/${slug}/jobs.json`);
      if (!res.ok) return [] as JobSignal[];
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("json")) return [] as JobSignal[];
      let data: GHResp | null = null;
      try { data = await res.json() as GHResp; } catch { return [] as JobSignal[]; }
      const jobs = data?.jobs || [];
      const out: JobSignal[] = [];
      for (const job of jobs) {
        const daysAgo = Math.floor((Date.now() - new Date(job.updated_at).getTime()) / 86400000);
        if (daysAgo > 30) continue;
        const cat = classify(job.title) ?? (FINANCE_RE.test(job.title) ? firmFallback(type) : null);
        if (!cat) continue;
        const signalTag = /\b(managing director|md|partner|cio|head of)\b/i.test(job.title) ? "Fund scaling" as const
          : /\b(director|vp|vice president|senior)\b/i.test(job.title) ? "Post-raise build-out" as const
          : "New fund" as const;
        const id = `gh-${slug}-${job.id}`;
        out.push({ id, firm, role: job.title, category: cat, location: job.location?.name?.split(",")?.[0]?.trim() || "—", daysAgo, signalTag, why: "Direct from firm careers page", score: scoreJobSignal({ id, daysAgo, signalTag, role: job.title }), edgarUrl: job.absolute_url });
      }
      return out;
    })
  );
  return results.flatMap((r) => r.status === "fulfilled" ? r.value : []).sort((a, b) => b.score - a.score);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const [weekData, topJobs] = await Promise.all([
      fetchRecentFunds(7),
      fetchTopJobs(),
    ]);

    const todayCount = weekData.filings.filter((f) => f.daysSinceFiling <= 1).length;
    const weekCount  = weekData.rawCount;
    const topFunds   = weekData.filings.slice(0, 5);

    return Response.json({
      todayCount,
      weekCount,
      topFunds,
      topJobs: topJobs.slice(0, 6),
      lastUpdated: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg, todayCount: 0, weekCount: 0, topFunds: [], topJobs: [], lastUpdated: new Date().toISOString() }, { status: 500 });
  }
}
