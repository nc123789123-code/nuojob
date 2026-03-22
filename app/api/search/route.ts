import { NextRequest, NextResponse } from "next/server";
import { FundFiling, OfferingStatus } from "@/app/types";
import { detectStrategy, scoreFiling, getDaysSince } from "@/app/lib/scoring";

const EDGAR_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_ARCHIVE_URL = "https://www.sec.gov/Archives/edgar/data";

// Strategy → EDGAR search terms
const STRATEGY_QUERIES: Record<string, string[]> = {
  all: [
    "hedge fund",
    "master fund",
    "feeder fund",
    "private credit",
    "direct lending",
    "credit opportunities",
    "special situations",
    "distressed",
    "mezzanine",
    "multi-strategy",
    "opportunistic credit",
  ],
  private_credit: [
    "private credit",
    "credit opportunities",
    "credit fund",
    "opportunistic credit",
  ],
  special_sits: [
    "special situations",
    "special sits",
    "opportunistic credit",
  ],
  direct_lending: ["direct lending", "direct lend"],
  distressed: ["distressed"],
  mezzanine: ["mezzanine", "mezz fund"],
  hedge_fund: ["hedge fund", "master fund", "feeder fund"],
  long_short: ["long/short", "long short equity"],
  macro: ["macro fund", "global macro"],
  quant: ["quantitative fund", "quant fund", "systematic"],
  multi_strategy: ["multi-strategy", "multistrategy", "multi strat"],
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

async function fetchFormDDetails(
  cik: string,
  accessionNo: string
): Promise<{
  totalOfferingAmount?: number;
  totalAmountSold?: number;
  offeringStatus: OfferingStatus;
  minimumInvestment?: number;
  dateOfFirstSale?: string;
  revenueRange?: string;
  state?: string;
  relatedPersons?: Array<{
    firstName?: string;
    lastName?: string;
    title?: string;
    city?: string;
    state?: string;
  }>;
}> {
  try {
    const cleanAccession = accessionNo.replace(/-/g, "");
    const url = `${EDGAR_ARCHIVE_URL}/${cik}/${cleanAccession}/primary_doc.xml`;

    const res = await fetch(url, {
      headers: { "User-Agent": "NolaClaude research@nolaclaude.com" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return { offeringStatus: "unknown" };

    const xml = await res.text();
    const extract = (tag: string) => extractXmlField(xml, tag);

    const totalOfferingRaw = extract("totalOfferingAmount");
    const totalSoldRaw = extract("totalAmountSold");
    const minimumRaw = extract("minimumInvestmentAccepted");
    const firstSaleDate = extract("dateOfFirstSale");
    const revenueRange = extract("revenueRange");

    // Determine offering status from XML
    const yetToOccur = extract("yet-to-occur") || extract("yetToOccur");
    const closedMatch = xml.match(/<isMoreThanOneYear[^>]*>([^<]*)<\/isMoreThanOneYear>/i);
    const durationMatch = extract("duration");

    // If totalAmountSold >= totalOfferingAmount and both exist, likely closed
    let offeringStatus: OfferingStatus = "unknown";
    const offering = totalOfferingRaw ? parseFloat(totalOfferingRaw) : undefined;
    const sold = totalSoldRaw ? parseFloat(totalSoldRaw) : undefined;

    if (yetToOccur?.toLowerCase() === "true") {
      offeringStatus = "open";
    } else if (sold && offering && sold >= offering * 0.95) {
      offeringStatus = "closed";
    } else if (sold !== undefined && offering !== undefined) {
      offeringStatus = "open";
    } else if (firstSaleDate) {
      // If we have a first sale date, it's at least started
      offeringStatus = "open";
    }

    // Parse related persons
    const relatedPersons: Array<{
      firstName?: string;
      lastName?: string;
      title?: string;
      city?: string;
      state?: string;
    }> = [];

    const personMatches = [
      ...xml.matchAll(/<relatedPersonInfo>([\s\S]*?)<\/relatedPersonInfo>/gi),
    ];

    for (const match of personMatches.slice(0, 5)) {
      const block = match[1];
      const extractBlock = (tag: string) => extractXmlField(block, tag);
      const firstName = extractBlock("firstName");
      const lastName = extractBlock("lastName");
      const title = extractBlock("relatedPersonTitle");
      const city = extractBlock("city");
      const state = extractBlock("stateOrCountry");

      if (firstName || lastName) {
        relatedPersons.push({ firstName, lastName, title, city, state });
      }
    }

    const stateMatch = xml.match(/<issuerState>([^<]+)<\/issuerState>/i);

    return {
      totalOfferingAmount: offering,
      totalAmountSold: sold,
      offeringStatus,
      minimumInvestment: minimumRaw ? parseFloat(minimumRaw) : undefined,
      dateOfFirstSale: firstSaleDate,
      revenueRange,
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

  // Build search terms
  const terms = query
    ? [query]
    : STRATEGY_QUERIES[strategy] || STRATEGY_QUERIES.all;

  // Run parallel EDGAR searches for each term
  const searchPromises = terms.slice(0, 4).map(async (term) => {
    const params = new URLSearchParams({
      q: `"${term}"`,
      forms: "D",
      dateRange: "custom",
      startdt: startDate,
      enddt: endDate,
    });

    try {
      const res = await fetch(`${EDGAR_SEARCH_URL}?${params}`, {
        headers: { "User-Agent": "NolaClaude research@nolaclaude.com" },
        next: { revalidate: 900 },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data?.hits?.hits || [];
    } catch {
      return [];
    }
  });

  const searchResults = await Promise.all(searchPromises);

  // Deduplicate by filing ID
  const seen = new Map<string, { _id: string; _source: { entity_name: string; file_date: string; form_type: string } }>();
  for (const results of searchResults) {
    for (const hit of results) {
      if (!seen.has(hit._id)) seen.set(hit._id, hit);
    }
  }

  const hits = Array.from(seen.values());

  // Build partial filings
  const partialFilings = hits
    .slice(0, 60)
    .map((hit) => {
      const cikMatch = hit._id.match(/^(\d+)-/);
      const cik = cikMatch?.[1] || "";
      const { strategy: detectedStrategy, label } = detectStrategy(
        hit._source.entity_name
      );

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

  // Fetch Form D details for first 25 (balance freshness vs rate limiting)
  const detailed = await Promise.all(
    partialFilings.slice(0, 25).map(async (f) => {
      const details = await fetchFormDDetails(f.cik, f.accessionNo);
      return { ...f, ...details };
    })
  );

  // Remaining without details
  const rest = partialFilings.slice(25).map((f) => ({
    ...f,
    offeringStatus: "unknown" as OfferingStatus,
  }));

  const allFilings = [...detailed, ...rest];

  // Score each filing
  const scored: FundFiling[] = allFilings.map((f) => {
    const score = scoreFiling(f);
    const days = getDaysSince(f.fileDate);
    return { ...f, score, daysSinceFiling: days };
  });

  // Filter by bucket
  let filtered = scored;
  if (bucket !== "all") {
    filtered = scored.filter((f) => f.score.bucket === bucket);
  }

  // Filter by min amount
  if (minAmount) {
    const min = parseFloat(minAmount) * 1_000_000;
    filtered = filtered.filter(
      (f) =>
        !f.totalOfferingAmount ||
        f.totalOfferingAmount >= min
    );
  }

  // Sort by overall score descending
  filtered.sort((a, b) => b.score.overallScore - a.score.overallScore);

  return NextResponse.json({
    total: filtered.length,
    filings: filtered,
    dateRange: { startDate, endDate },
  });
}
