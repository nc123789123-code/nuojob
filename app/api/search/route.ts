import { NextRequest } from "next/server";
import { FundFiling, OfferingStatus } from "@/app/types";
import { detectStrategy, scoreFiling, getDaysSince } from "@/app/lib/scoring";

export const runtime = "edge";

const EDGAR_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_ARCHIVE_URL = "https://www.sec.gov/Archives/edgar/data";

const HEADERS = {
  "User-Agent": "NolaClaude/1.0 research@nolaclaude.com",
  "Accept": "application/json, text/xml",
};

const STRATEGY_QUERIES: Record<string, string[]> = {
  all: ["hedge fund", "private credit", "direct lending", "special situations"],
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

function getDateRange(days: string) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

function extractXml(xml: string, tag: string): string | undefined {
  return xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, "i"))?.[1]?.trim();
}

async function fetchFormDDetails(cik: string, accessionNo: string) {
  try {
    const url = `${EDGAR_ARCHIVE_URL}/${cik}/${accessionNo.replace(/-/g, "")}/primary_doc.xml`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return { offeringStatus: "unknown" as OfferingStatus };

    const xml = await res.text();
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

    const relatedPersons: Array<{ firstName?: string; lastName?: string; title?: string; city?: string; state?: string }> = [];
    for (const m of [...xml.matchAll(/<relatedPersonInfo>([\s\S]*?)<\/relatedPersonInfo>/gi)].slice(0, 4)) {
      const b = m[1];
      const fn = extractXml(b, "firstName");
      const ln = extractXml(b, "lastName");
      if (fn || ln) {
        relatedPersons.push({ firstName: fn, lastName: ln, title: extractXml(b, "relatedPersonTitle"), city: extractXml(b, "city"), state: extractXml(b, "stateOrCountry") });
      }
    }

    return {
      totalOfferingAmount: offeringNum,
      totalAmountSold: soldNum,
      offeringStatus,
      minimumInvestment: extractXml(xml, "minimumInvestmentAccepted") ? parseFloat(extractXml(xml, "minimumInvestmentAccepted")!) : undefined,
      dateOfFirstSale: extractXml(xml, "dateOfFirstSale"),
      state: xml.match(/<issuerState>([^<]+)<\/issuerState>/i)?.[1],
      relatedPersons: relatedPersons.length > 0 ? relatedPersons : undefined,
    };
  } catch {
    return { offeringStatus: "unknown" as OfferingStatus };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const strategy = searchParams.get("strategy") || "all";
    const dateRange = searchParams.get("dateRange") || "90";
    const bucket = searchParams.get("bucket") || "all";
    const minAmount = searchParams.get("minAmount") || "";

    const { startDate, endDate } = getDateRange(dateRange);
    const terms = query ? [query] : (STRATEGY_QUERIES[strategy] || STRATEGY_QUERIES.all).slice(0, 2);

    // Search EDGAR
    const searchResults = await Promise.allSettled(
      terms.map(async (term) => {
        const params = new URLSearchParams({ q: `"${term}"`, forms: "D", dateRange: "custom", startdt: startDate, enddt: endDate });
        const res = await fetch(`${EDGAR_SEARCH_URL}?${params}`, { headers: HEADERS });
        if (!res.ok) return [];
        const data = await res.json();
        return data?.hits?.hits || [];
      })
    );

    // Deduplicate
    const seen = new Map<string, { _id: string; _source: { entity_name: string; file_date: string; form_type: string } }>();
    for (const r of searchResults) {
      if (r.status === "fulfilled") {
        for (const hit of r.value) {
          if (!seen.has(hit._id)) seen.set(hit._id, hit);
        }
      }
    }

    const hits = Array.from(seen.values());

    // Build partial filings
    const partial = hits.slice(0, 40).map((hit) => {
      const cik = hit._id.match(/^(\d+)-/)?.[1] || "";
      const { strategy: s, label } = detectStrategy(hit._source.entity_name);
      return { id: hit._id, entityName: hit._source.entity_name, cik, fileDate: hit._source.file_date, formType: hit._source.form_type, accessionNo: hit._id, strategy: s, strategyLabel: label, offeringStatus: "unknown" as OfferingStatus };
    });

    // Fetch XML details for first 8
    const detailed = await Promise.all(
      partial.slice(0, 8).map(async (f) => ({ ...f, ...(await fetchFormDDetails(f.cik, f.accessionNo)) }))
    );
    const rest = partial.slice(8);
    const all = [...detailed, ...rest];

    // Score
    let scored: FundFiling[] = all.map((f) => ({ ...f, score: scoreFiling(f), daysSinceFiling: getDaysSince(f.fileDate) }));

    if (bucket !== "all") scored = scored.filter((f) => f.score.bucket === bucket);
    if (minAmount) {
      const min = parseFloat(minAmount) * 1_000_000;
      scored = scored.filter((f) => !f.totalOfferingAmount || f.totalOfferingAmount >= min);
    }
    scored.sort((a, b) => b.score.overallScore - a.score.overallScore);

    return Response.json({ total: scored.length, filings: scored, dateRange: { startDate, endDate } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg, total: 0, filings: [] }, { status: 500 });
  }
}
