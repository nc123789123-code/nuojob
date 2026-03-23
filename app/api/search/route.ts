import { NextRequest, NextResponse } from "next/server";
import { FundFiling, OfferingStatus } from "@/app/types";
import { detectStrategy, scoreFiling, getDaysSince } from "@/app/lib/scoring";

export const maxDuration = 30; // Vercel pro allows 30s; free tier gets 10s

const EDGAR_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_ARCHIVE_URL = "https://www.sec.gov/Archives/edgar/data";

const STRATEGY_QUERIES: Record<string, string[]> = {
  all: [
    "hedge fund",
    "private credit",
    "direct lending",
    "special situations",
    "distressed",
  ],
  private_credit: ["private credit", "credit opportunities"],
  special_sits: ["special situations", "opportunistic credit"],
  direct_lending: ["direct lending"],
  distressed: ["distressed"],
  mezzanine: ["mezzanine"],
  hedge_fund: ["hedge fund", "master fund"],
  long_short: ["long short equity"],
  macro: ["global macro"],
  quant: ["quantitative fund"],
  multi_strategy: ["multi-strategy"],
};

function getDateRange(days: string): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

function extractXmlField(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
  return match?.[1]?.trim() || undefined;
}

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "NolaClaude/1.0 research@nolaclaude.com",
        "Accept": "application/json, text/xml",
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFormDDetails(cik: string, accessionNo: string): Promise<{
  totalOfferingAmount?: number;
  totalAmountSold?: number;
  offeringStatus: OfferingStatus;
  minimumInvestment?: number;
  dateOfFirstSale?: string;
  state?: string;
  relatedPersons?: Array<{ firstName?: string; lastName?: string; title?: string; city?: string; state?: string }>;
}> {
  try {
    const cleanAccession = accessionNo.replace(/-/g, "");
    const url = `${EDGAR_ARCHIVE_URL}/${cik}/${cleanAccession}/primary_doc.xml`;
    const res = await fetchWithTimeout(url, 4000);
    if (!res.ok) return { offeringStatus: "unknown" };

    const xml = await res.text();
    const extract = (tag: string) => extractXmlField(xml, tag);

    const offering = extract("totalOfferingAmount") ? parseFloat(extract("totalOfferingAmount")!) : undefined;
    const sold = extract("totalAmountSold") ? parseFloat(extract("totalAmountSold")!) : undefined;
    const firstSaleDate = extract("dateOfFirstSale");

    let offeringStatus: OfferingStatus = "unknown";
    if (sold !== undefined && offering !== undefined) {
      offeringStatus = sold >= offering * 0.95 ? "closed" : "open";
    } else if (firstSaleDate) {
      offeringStatus = "open";
    }

    const relatedPersons: Array<{ firstName?: string; lastName?: string; title?: string; city?: string; state?: string }> = [];
    const personMatches = [...xml.matchAll(/<relatedPersonInfo>([\s\S]*?)<\/relatedPersonInfo>/gi)];
    for (const match of personMatches.slice(0, 4)) {
      const block = match[1];
      const eb = (tag: string) => extractXmlField(block, tag);
      if (eb("firstName") || eb("lastName")) {
        relatedPersons.push({
          firstName: eb("firstName"),
          lastName: eb("lastName"),
          title: eb("relatedPersonTitle"),
          city: eb("city"),
          state: eb("stateOrCountry"),
        });
      }
    }

    const stateMatch = xml.match(/<issuerState>([^<]+)<\/issuerState>/i);

    return {
      totalOfferingAmount: offering,
      totalAmountSold: sold,
      offeringStatus,
      minimumInvestment: extract("minimumInvestmentAccepted") ? parseFloat(extract("minimumInvestmentAccepted")!) : undefined,
      dateOfFirstSale: firstSaleDate,
      state: stateMatch?.[1],
      relatedPersons: relatedPersons.length > 0 ? relatedPersons : undefined,
    };
  } catch {
    return { offeringStatus: "unknown" };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "";
  const strategy = searchParams.get("strategy") || "all";
  const dateRange = searchParams.get("dateRange") || "90";
  const bucket = searchParams.get("bucket") || "all";
  const minAmount = searchParams.get("minAmount") || "";

  const { startDate, endDate } = getDateRange(dateRange);
  const terms = query ? [query] : (STRATEGY_QUERIES[strategy] || STRATEGY_QUERIES.all).slice(0, 2);

  // Run EDGAR searches (limit to 2 terms to stay within timeout)
  const searchResults = await Promise.allSettled(
    terms.map(async (term) => {
      const params = new URLSearchParams({
        q: `"${term}"`,
        forms: "D",
        dateRange: "custom",
        startdt: startDate,
        enddt: endDate,
      });
      try {
        const res = await fetchWithTimeout(`${EDGAR_SEARCH_URL}?${params}`, 6000);
        if (!res.ok) return [];
        const data = await res.json();
        return data?.hits?.hits || [];
      } catch {
        return [];
      }
    })
  );

  // Deduplicate hits
  const seen = new Map<string, { _id: string; _source: { entity_name: string; file_date: string; form_type: string } }>();
  for (const result of searchResults) {
    if (result.status === "fulfilled") {
      for (const hit of result.value) {
        if (!seen.has(hit._id)) seen.set(hit._id, hit);
      }
    }
  }

  if (seen.size === 0) {
    return NextResponse.json({ total: 0, filings: [], dateRange: { startDate, endDate } });
  }

  const hits = Array.from(seen.values());

  // Build partial filings
  const partialFilings = hits.slice(0, 40).map((hit) => {
    const cikMatch = hit._id.match(/^(\d+)-/);
    const cik = cikMatch?.[1] || "";
    const { strategy: detectedStrategy, label } = detectStrategy(hit._source.entity_name);
    return {
      id: hit._id,
      entityName: hit._source.entity_name,
      cik,
      fileDate: hit._source.file_date,
      formType: hit._source.form_type,
      accessionNo: hit._id,
      strategy: detectedStrategy,
      strategyLabel: label,
      offeringStatus: "unknown" as OfferingStatus,
    };
  });

  // Fetch Form D XML for first 8 only (keep well within timeout)
  const detailed = await Promise.all(
    partialFilings.slice(0, 8).map(async (f) => {
      const details = await fetchFormDDetails(f.cik, f.accessionNo);
      return { ...f, ...details };
    })
  );

  const rest = partialFilings.slice(8).map((f) => ({ ...f, offeringStatus: "unknown" as OfferingStatus }));
  const allFilings = [...detailed, ...rest];

  // Score and filter
  let scored: FundFiling[] = allFilings.map((f) => ({
    ...f,
    score: scoreFiling(f),
    daysSinceFiling: getDaysSince(f.fileDate),
  }));

  if (bucket !== "all") scored = scored.filter((f) => f.score.bucket === bucket);
  if (minAmount) {
    const min = parseFloat(minAmount) * 1_000_000;
    scored = scored.filter((f) => !f.totalOfferingAmount || f.totalOfferingAmount >= min);
  }

  scored.sort((a, b) => b.score.overallScore - a.score.overallScore);

  return NextResponse.json({ total: scored.length, filings: scored, dateRange: { startDate, endDate } });
}
