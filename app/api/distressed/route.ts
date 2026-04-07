/**
 * Distressed Watch API
 *
 * Fetches recent Chapter 11 bankruptcy and restructuring filings from:
 *   1. SEC EDGAR full-text search — 8-K filings mentioning "Chapter 11" / "bankruptcy"
 *   2. Google News RSS — restructuring / distressed headlines for context
 *
 * Returns a list of distressed situations enriched with:
 *   - Company name, industry hint, filing date
 *   - Situation type (Chapter 11, out-of-court restructuring, distressed exchange)
 *   - Likely buyside firms involved (based on strategy matching)
 *   - Why it matters framing for the user
 *
 * Cached for 6 hours — restructuring situations don't move that fast.
 */

import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 45;

export interface DistressedSituation {
  id: string;
  company: string;
  filingDate: string;          // YYYY-MM-DD
  daysAgo: number;
  situationType: "chapter11" | "restructuring" | "distressed_exchange" | "bankruptcy";
  liabilities?: string;        // e.g. "$2.3B"
  industry?: string;
  cik?: string;
  edgarUrl?: string;
  headline?: string;           // from news RSS
  whyItMatters: string;
}

interface EdgarHit {
  _id: string;
  _source?: {
    adsh?: string;
    display_names?: string[];
    entity_name?: string;
    file_date?: string;
    form?: string;
    ciks?: string[];
    period_of_report?: string;
  };
}

// Cache — 6 hours
let cache: { data: DistressedSituation[]; ts: number } | null = null;
const CACHE_TTL = 6 * 60 * 60 * 1000;

const EDGAR_HEADERS = {
  "User-Agent": "Onlu/1.0 research@onlu.com",
  "Accept": "application/json",
};

function getDaysAgo(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

function fmtCik(cik: string): string {
  return String(parseInt(cik, 10));
}

const FALLBACK_WHY: Record<DistressedSituation["situationType"], string> = {
  chapter11:          "Filed Chapter 11 — DIP financing, creditor committee, and plan-of-reorganisation mandates typically follow within days.",
  distressed_exchange: "Pursuing a distressed exchange — out-of-court process where debt converts to equity at a discount, avoiding formal bankruptcy.",
  restructuring:      "Actively restructuring — potential for new money financing, creditor advisory mandates, and post-reorg equity opportunities.",
  bankruptcy:         "Bankruptcy filing — creditor waterfall and recovery analysis will drive positioning across distressed funds.",
};

async function buildWhyItMatters(
  company: string,
  situationType: DistressedSituation["situationType"],
  headline?: string,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return `${company}: ${FALLBACK_WHY[situationType]}`;

  try {
    const anthropic = new Anthropic({ apiKey });
    const context = headline ? `Latest headline: "${headline}"` : `Situation type: ${situationType}`;
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 90,
      messages: [{
        role: "user",
        content: `Company: ${company}. ${context}.
Write 1-2 sentences explaining why this matters to a buyside credit investor — what mandates, opportunities, or risks it creates. Be specific to this company and situation. No filler. No "this is significant because". Start with the insight directly.`,
      }],
    });
    const block = msg.content[0];
    if (block.type === "text" && block.text.trim()) return block.text.trim();
  } catch { /* fall through */ }

  return `${company}: ${FALLBACK_WHY[situationType]}`;
}

function classifySituation(text: string): DistressedSituation["situationType"] {
  if (/chapter 11|chapter11|voluntary petition|bankruptcy petition/i.test(text)) return "chapter11";
  if (/distressed exchange|exchange offer.*distressed|debt exchange/i.test(text)) return "distressed_exchange";
  if (/out.of.court|amend.*extend|forbearance agreement|covenant waiver/i.test(text)) return "restructuring";
  return "bankruptcy";
}

async function fetchEdgar8K(query: string, days: number): Promise<EdgarHit[]> {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startdt = start.toISOString().split("T")[0];
  const enddt = end.toISOString().split("T")[0];

  const p = new URLSearchParams({
    q: `"${query}"`,
    forms: "8-K",
    dateRange: "custom",
    startdt,
    enddt,
  });

  const res = await fetch(`https://efts.sec.gov/LATEST/search-index?${p}`, {
    headers: EDGAR_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  const data = await res.json() as { hits?: { hits?: EdgarHit[] } };
  return data?.hits?.hits ?? [];
}

async function fetchNewsHeadline(company: string): Promise<string> {
  try {
    const q = `${company} restructuring bankruptcy`;
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const xml = await res.text();
    const match = xml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
    return match?.[1]?.trim() ?? "";
  } catch { return ""; }
}

// Companies to skip — holding companies, SPACs, financial firms filing routine 8-Ks
const SKIP_RE = /\b(trust|SPAC|acquisition corp|blank check|shell|LLC$|LP$)\b/i;

async function fetchDistressed(maxDays = 60): Promise<DistressedSituation[]> {
  const queries = [
    "Chapter 11",
    "voluntary petition for relief",
    "restructuring support agreement",
    "distressed exchange offer",
    "out-of-court restructuring",
    "forbearance agreement",
  ];

  const results = await Promise.allSettled(
    queries.map((q) => fetchEdgar8K(q, maxDays))
  );

  const seen = new Map<string, EdgarHit>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const hit of r.value) {
      const key = hit._source?.adsh ?? hit._id;
      if (!seen.has(key)) seen.set(key, hit);
    }
  }

  // Deduplicate by company CIK (keep most recent per company)
  const byCik = new Map<string, EdgarHit>();
  for (const hit of seen.values()) {
    const cik = hit._source?.ciks?.[0] ?? hit._id;
    const existing = byCik.get(cik);
    if (!existing || (hit._source?.file_date ?? "") > (existing._source?.file_date ?? "")) {
      byCik.set(cik, hit);
    }
  }

  const hits = Array.from(byCik.values()).slice(0, 30);

  // Enrich with news headlines + AI summaries in parallel (cap at 10)
  const enriched = await Promise.allSettled(
    hits.slice(0, 10).map(async (hit) => {
      const src = hit._source ?? {};
      const company = (src.display_names?.[0] ?? src.entity_name ?? "").replace(/\s*\(CIK\s*\d+\)\s*$/i, "").trim();
      if (!company || company.length < 3) return null;
      if (SKIP_RE.test(company)) return null;

      const fileDate = src.file_date ?? "";
      const daysAgo = fileDate ? getDaysAgo(fileDate) : maxDays;
      if (daysAgo > maxDays) return null;

      const cik = src.ciks?.[0] ? fmtCik(src.ciks[0]) : "";
      const edgarUrl = cik
        ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=8-K&dateb=&owner=include&count=10`
        : undefined;

      const headline = await fetchNewsHeadline(company);
      const situationType = classifySituation(headline || company);
      const whyItMatters = await buildWhyItMatters(company, situationType, headline || undefined);

      const situation: DistressedSituation = {
        id: `distressed-${hit._id}`,
        company,
        filingDate: fileDate,
        daysAgo,
        situationType,
        cik: cik || undefined,
        edgarUrl,
        headline: headline || undefined,
        whyItMatters,
      };
      return situation;
    })
  );

  return enriched
    .filter((r): r is PromiseFulfilledResult<DistressedSituation | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((v): v is DistressedSituation => v !== null)
    .sort((a, b) => a.daysAgo - b.daysAgo);
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      return Response.json(cache.data);
    }
    const data = await fetchDistressed(60);
    cache = { data, ts: Date.now() };
    return Response.json(data);
  } catch (e) {
    return Response.json([], { status: 500 });
  }
}
