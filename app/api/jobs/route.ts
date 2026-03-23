/**
 * Market Hiring API
 *
 * Derives hiring signals from recent SEC Form D fund filings.
 * Each fund that is raising or recently closed maps to 1–3 likely
 * open roles based on its strategy and offering status.
 *
 * This gives a "who is hiring right now and why" view of the market —
 * based on capital flow signals, not scraped job boards.
 */

import { NextRequest } from "next/server";
import { OfferingStatus, EdgarSearchHit, JobSignal, JobCategory, JobFilters } from "@/app/types";
import { detectStrategy, getDaysSince, inferJobRoles, inferJobSignalTag } from "@/app/lib/scoring";

export const runtime = "edge";

const EDGAR_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_ARCHIVE_URL = "https://www.sec.gov/Archives/edgar/data";

const HEADERS = {
  "User-Agent": "Onlu/1.0 research@onlu.com",
  "Accept": "application/json, text/xml",
};

// Pull a broad mix of fund strategies to surface the hiring market
const ALL_QUERIES = [
  "private credit",
  "special situations",
  "hedge fund",
  "direct lending",
  "distressed",
  "long short equity",
  "global macro",
  "multi-strategy",
];

function extractXml(xml: string, tag: string): string | undefined {
  return xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i"))?.[1]?.trim();
}

function getDateRange(days: string) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

async function fetchFormDDetails(cik: string, accessionNo: string): Promise<{
  offeringStatus: OfferingStatus;
  totalOfferingAmount?: number;
  state?: string;
} | null> {
  try {
    const url = `${EDGAR_ARCHIVE_URL}/${cik}/${accessionNo.replace(/-/g, "")}/primary_doc.xml`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return { offeringStatus: "unknown" };

    const xml = await res.text();

    // Only include pooled investment funds
    const isPooledFund = extractXml(xml, "isPooledInvestmentFund")?.toLowerCase() === "true";
    if (!isPooledFund) return null;

    const offering = extractXml(xml, "totalOfferingAmount");
    const sold = extractXml(xml, "totalAmountSold");
    const offeringNum = offering ? parseFloat(offering) : undefined;
    const soldNum = sold ? parseFloat(sold) : undefined;

    let offeringStatus: OfferingStatus = "unknown";
    if (soldNum !== undefined && offeringNum !== undefined) {
      offeringStatus = soldNum >= offeringNum * 0.95 ? "closed" : "open";
    } else if (extractXml(xml, "dateOfFirstSale")) {
      offeringStatus = "open";
    }

    return {
      offeringStatus,
      totalOfferingAmount: offeringNum,
      state: xml.match(/<issuerState>([^<]+)<\/issuerState>/i)?.[1],
    };
  } catch {
    return { offeringStatus: "unknown" };
  }
}

const FUND_NAME_REQUIRED = [
  /\bfund\b/i, /\bL\.?P\.?\b/, /\bpartners\b/i, /\bcapital\b/i,
  /\bcredit\b/i, /\bequity\b/i, /\bopportunities\b/i, /\bmanagement\b/i,
  /\bmaster\b/i, /\bfeeder\b/i, /\bhedge\b/i, /\binvestment\b/i,
  /\boffshore\b/i, /\bonshore\b/i,
];
const FUND_NAME_EXCLUDE = [
  /\blaw (firm|office|group)\b/i, /\battorneys? at law\b/i,
  /\bpension plan\b/i, /\bretirement plan\b/i, /\breal estate\b/i, /\brealty\b/i,
];

function isLikelyFund(name: string): boolean {
  if (!name || name.length < 3) return false;
  if (FUND_NAME_EXCLUDE.some((p) => p.test(name))) return false;
  return FUND_NAME_REQUIRED.some((p) => p.test(name));
}

function formatM(amount?: number): string {
  if (!amount) return "";
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(0)}M`;
  return `$${(amount / 1_000).toFixed(0)}K`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateRange = searchParams.get("dateRange") || "90";
    const category = searchParams.get("category") || "all";
    const signalTag = searchParams.get("signalTag") || "all";

    const { startDate, endDate } = getDateRange(dateRange);

    // Fetch across all strategy queries in parallel
    const searchResults = await Promise.allSettled(
      ALL_QUERIES.map(async (term) => {
        const params = new URLSearchParams({ q: `"${term}"`, forms: "D", dateRange: "custom", startdt: startDate, enddt: endDate });
        const res = await fetch(`${EDGAR_SEARCH_URL}?${params}`, { headers: HEADERS });
        if (!res.ok) return [];
        const data = await res.json();
        return (data?.hits?.hits || []) as EdgarSearchHit[];
      })
    );

    // Deduplicate and name-filter
    const seen = new Map<string, EdgarSearchHit>();
    for (const r of searchResults) {
      if (r.status === "fulfilled") {
        for (const hit of r.value) {
          const key = hit._source?.adsh || hit._id;
          const name = hit._source?.display_names?.[0] || hit._source?.entity_name || "";
          if (!seen.has(key) && isLikelyFund(name.replace(/\s*\(CIK\s+\d+\)\s*$/, ""))) {
            seen.set(key, hit);
          }
        }
      }
    }

    // Build partial filings (sorted newest first by file_date already from EDGAR)
    const partial = Array.from(seen.values()).slice(0, 50).map((hit) => {
      const src = hit._source || {};
      const rawName = src.display_names?.[0] || src.entity_name || "";
      const entityName = rawName.replace(/\s*\(CIK\s+\d+\)\s*$/, "").trim();
      const cik = src.ciks?.[0] ? String(parseInt(src.ciks[0], 10)) : "";
      const accessionNo = src.adsh || hit._id;
      const formType = src.form || src.file_type || "D";
      const { strategy, label: strategyLabel } = detectStrategy(entityName);
      return { entityName, cik, accessionNo, formType, fileDate: src.file_date || "", strategy, strategyLabel };
    });

    // Fetch XML for first 25 to get offer status
    const detailedRaw = await Promise.all(
      partial.slice(0, 25).map(async (f) => {
        const details = await fetchFormDDetails(f.cik, f.accessionNo);
        if (details === null) return null;
        return { ...f, ...details };
      })
    );

    const detailed = detailedRaw.filter(Boolean) as NonNullable<(typeof detailedRaw)[number]>[];

    // Expand each fund into role signals
    const jobSignals: JobSignal[] = [];
    let idx = 0;

    for (const filing of detailed) {
      const days = getDaysSince(filing.fileDate);
      if (days > parseInt(dateRange)) continue; // skip stale

      const roles = inferJobRoles(filing.strategy, filing.offeringStatus);
      const signalTagValue = inferJobSignalTag(filing.offeringStatus, filing.formType);

      const amtStr = formatM(filing.totalOfferingAmount);
      const why = [
        filing.formType === "D/A" ? "Form D amendment" : "New Form D",
        amtStr ? `${amtStr} fund` : null,
        filing.offeringStatus === "open" ? "actively raising" : filing.offeringStatus === "closed" ? "recently closed" : null,
        `${days}d ago`,
      ].filter(Boolean).join(" · ");

      for (const { role, category: roleCategory } of roles) {
        jobSignals.push({
          id: `${filing.accessionNo}-${idx++}`,
          firm: filing.entityName,
          role,
          category: roleCategory,
          location: filing.state || "—",
          daysAgo: days,
          signalTag: signalTagValue,
          why,
          score: 0, // not scored here; sort by recency
          edgarUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${filing.cik}&type=D&dateb=&owner=include&count=40`,
        });
      }
    }

    // Filter
    let filtered = jobSignals;
    if (category !== "all") {
      filtered = filtered.filter((j) => j.category === category);
    }
    if (signalTag !== "all") {
      filtered = filtered.filter((j) => j.signalTag === signalTag);
    }

    // Sort by recency
    filtered.sort((a, b) => a.daysAgo - b.daysAgo);

    return Response.json({ signals: filtered, total: filtered.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg, signals: [], total: 0 }, { status: 500 });
  }
}
