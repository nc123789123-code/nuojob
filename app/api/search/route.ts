import { NextRequest } from "next/server";
import { FundFiling, OfferingStatus, EdgarSearchHit } from "@/app/types";
import { detectStrategy, scoreFiling, getDaysSince } from "@/app/lib/scoring";
import { fetchNewsSignals } from "@/app/lib/news";

export const runtime = "edge";

const EDGAR_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_ARCHIVE_URL = "https://www.sec.gov/Archives/edgar/data";

const HEADERS = {
  "User-Agent": "Onlu/1.0 research@onlu.com",
  "Accept": "application/json, text/xml",
};

const STRATEGY_QUERIES: Record<string, string[]> = {
  all: ["credit fund", "credit partners", "hedge fund", "direct lending", "special situations", "credit opportunities"],
  private_credit: ["private credit", "credit opportunities", "credit fund", "credit partners"],
  special_sits: ["special situations", "opportunistic credit", "special opportunities"],
  direct_lending: ["direct lending", "lending fund", "lending partners"],
  distressed: ["distressed", "distressed debt", "distressed credit"],
  mezzanine: ["mezzanine", "mezz fund"],
  hedge_fund: ["hedge fund", "master fund", "long short", "equity fund"],
  long_short: ["long short equity", "long short fund", "equity long"],
  macro: ["global macro", "macro fund", "macro strategies"],
  quant: ["quantitative fund", "quantitative strategies", "systematic fund"],
  multi_strategy: ["multi-strategy", "multi strategy", "multistrategy"],
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

    // Only include actual pooled investment funds (hedge funds, PE, credit funds, etc.)
    const isPooledFund = extractXml(xml, "isPooledInvestmentFund")?.toLowerCase() === "true";
    if (!isPooledFund) return null; // skip non-fund Form D filings (e.g. real estate, startups)

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

// Require at least one positive indicator in the entity name to avoid garbage.
// EDGAR full-text search returns any Form D that mentions the search term anywhere in the text,
// including completely unrelated entities — positive matching is essential.
const FUND_NAME_REQUIRED = [
  /\bfund\b/i,
  /\bL\.?P\.?\b/,
  /\bpartners\b/i,
  /\bcapital\b/i,
  /\bcredit\b/i,
  /\bequity\b/i,
  /\bopportunities\b/i,
  /\bmanagement\b/i,
  /\bmaster\b/i,
  /\bfeeder\b/i,
  /\bhedge\b/i,
  /\binvestment\b/i,
  /\bincome\b/i,
  /\boffshore\b/i,
  /\bonshore\b/i,
];

const NON_FUND_PATTERNS = [
  /\blaw (firm|office|group|offices)\b/i,
  /\battorneys? at law\b/i,
  /\bcounselors? at law\b/i,
  /\blegal services\b/i,
  /\bpension plan\b/i,
  /\bretirement plan\b/i,
  /\breal estate\b/i,
  /\brealty\b/i,
];

function isLikelyFund(name: string | undefined): boolean {
  if (!name || name.trim().length < 3) return false;
  if (NON_FUND_PATTERNS.some((p) => p.test(name))) return false;
  return FUND_NAME_REQUIRED.some((p) => p.test(name));
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
    const terms = query ? [query] : (STRATEGY_QUERIES[strategy] || STRATEGY_QUERIES.all);

    // Search EDGAR — fetch page 0 and page 1 for each term to get up to 20 hits per term
    const searchResults = await Promise.allSettled(
      terms.flatMap((term) =>
        [0, 10].map(async (from) => {
          const params = new URLSearchParams({ q: `"${term}"`, forms: "D", dateRange: "custom", startdt: startDate, enddt: endDate, from: String(from) });
          const res = await fetch(`${EDGAR_SEARCH_URL}?${params}`, { headers: HEADERS });
          if (!res.ok) return [];
          const data = await res.json();
          return data?.hits?.hits || [];
        })
      )
    );

    // Deduplicate
    const seen = new Map<string, EdgarSearchHit>();
    for (const r of searchResults) {
      if (r.status === "fulfilled") {
        for (const hit of r.value) {
          const key = hit._source?.adsh || hit._id;
          if (!seen.has(key)) seen.set(key, hit);
        }
      }
    }

    const hits = Array.from(seen.values())
      .filter((hit) => {
        const raw = hit._source?.display_names?.[0] || hit._source?.entity_name || "";
        return isLikelyFund(raw);
      })
      // Sort newest first so we process the most recent filings
      .sort((a, b) => {
        const da = a._source?.file_date || "";
        const db = b._source?.file_date || "";
        return db.localeCompare(da);
      });

    // Build partial filings — field names from actual EDGAR EFTS response
    const partial = hits.map((hit) => {
      const src = hit._source || {};
      // display_names: ["BlackRock Strategic Equity Hedge Fund Ltd  (CIK 0001566474)"]
      const rawName: string = (src.display_names?.[0] || src.entity_name || "");
      const entityName = rawName.replace(/\s*\(CIK\s+\d+\)\s*$/, "").trim();
      // ciks: ["0001566474"] — strip leading zeros
      const cik = src.ciks?.[0] ? String(parseInt(src.ciks[0], 10)) : "";
      const accessionNo: string = src.adsh || hit._id;
      const formType: string = src.form || src.file_type || "D";
      const { strategy: s, label } = detectStrategy(entityName);
      return { id: accessionNo, entityName, cik, fileDate: src.file_date || "", formType, accessionNo, strategy: s, strategyLabel: label, offeringStatus: "unknown" as OfferingStatus };
    });

    // Fetch XML details for up to 80 entries (parallel) — returns null for non-pooled-fund filings
    const XML_BATCH = 80;
    const detailedRaw = await Promise.all(
      partial.slice(0, XML_BATCH).map(async (f) => {
        const details = await fetchFormDDetails(f.cik, f.accessionNo);
        if (details === null) return null; // not a pooled investment fund — skip
        return { ...f, ...details };
      })
    );
    const detailed = detailedRaw.filter(Boolean) as NonNullable<(typeof detailedRaw)[number]>[];
    // Keep remaining hits (scored by name/date only — no XML)
    const rest = partial.slice(XML_BATCH);
    const all = [...detailed, ...rest];

    // Fetch news signals for detailed funds (if API key is available)
    const newsApiKey = process.env.NEWSAPI_KEY ?? "";
    const newsMap = new Map<string, Awaited<ReturnType<typeof fetchNewsSignals>>>();
    if (newsApiKey) {
      await Promise.all(
        detailed.map(async (f) => {
          const result = await fetchNewsSignals(f.entityName, newsApiKey);
          newsMap.set(f.id, result);
        })
      );
    }

    // Score
    let scored: FundFiling[] = all.map((f) => {
      const news = newsMap.get(f.id);
      return {
        ...f,
        score: scoreFiling(f, news ? { expansionSignals: news.signals, expansionScore: news.expansionScore } : undefined),
        daysSinceFiling: getDaysSince(f.fileDate),
      };
    });

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
