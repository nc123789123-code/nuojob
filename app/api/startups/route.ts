import { NextRequest } from "next/server";
import { StartupFiling, OfferingStatus, EdgarSearchHit } from "@/app/types";
import { inferStage, scoreStartup, getDaysSince } from "@/app/lib/scoring";
import { fetchNewsSignals } from "@/app/lib/news";

export const runtime = "edge";

const EDGAR_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_ARCHIVE_URL = "https://www.sec.gov/Archives/edgar/data";

const HEADERS = {
  "User-Agent": "Onlu/1.0 research@onlu.com",
  "Accept": "application/json, text/xml",
};

// Search terms that appear in startup equity Form D filings
const STAGE_QUERIES: Record<string, string[]> = {
  all: ["Series A", "Series B", "seed round", "venture capital", "growth equity", "Series C"],
  pre_seed: ["pre-seed", "preseed", "angel round", "angel investment"],
  seed: ["seed round", "seed funding", "seed capital", "seed stage"],
  series_a: ["Series A", "Series A round"],
  series_b: ["Series B", "Series B round"],
  series_c: ["Series C", "Series C round"],
  growth: ["Series D", "Series E", "growth equity", "late stage", "growth stage"],
  unknown: ["venture capital", "startup equity", "equity offering"],
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

    // Skip pooled investment funds — those are for the Funds tab
    const securityType = extractXml(xml, "securityType") || "";
    const isPooledFund = extractXml(xml, "isPooledInvestmentFund")?.toLowerCase() === "true";
    if (/pooled investment fund/i.test(securityType) || isPooledFund) {
      return null; // skip — this is a fund, not a startup equity raise
    }

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
      dateOfFirstSale: extractXml(xml, "dateOfFirstSale"),
      state: xml.match(/<issuerState>([^<]+)<\/issuerState>/i)?.[1],
      relatedPersons: relatedPersons.length > 0 ? relatedPersons : undefined,
    };
  } catch {
    return { offeringStatus: "unknown" as OfferingStatus };
  }
}

// Patterns that indicate a fund (not a startup)
const FUND_PATTERNS = [
  /\b(fund|lp|l\.p\.|feeder|master|offshore|onshore)\b/i,
  /\b(capital management|asset management|investment management)\b/i,
  /\b(hedge fund|private equity|credit partners|credit opportunities)\b/i,
  /\b(attorneys? at law|law (firm|office|group))\b/i,
  /\b(pension plan|retirement plan)\b/i,
];

function isLikelyStartup(name: string | undefined): boolean {
  if (!name || name.trim().length < 3) return false;
  return !FUND_PATTERNS.some((p) => p.test(name));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const stage = searchParams.get("stage") || "all";
    const dateRange = searchParams.get("dateRange") || "90";
    const bucket = searchParams.get("bucket") || "all";
    const minAmount = searchParams.get("minAmount") || "";

    const { startDate, endDate } = getDateRange(dateRange);
    const terms = query ? [query] : (STAGE_QUERIES[stage] || STAGE_QUERIES.all).slice(0, 4);

    // Search EDGAR — hits=40 returns 4x the default 10 results per query
    const searchResults = await Promise.allSettled(
      terms.map(async (term) => {
        const params = new URLSearchParams({ q: `"${term}"`, forms: "D", dateRange: "custom", startdt: startDate, enddt: endDate, hits: "40" });
        const res = await fetch(`${EDGAR_SEARCH_URL}?${params}`, { headers: HEADERS });
        if (!res.ok) return [];
        const data = await res.json();
        return data?.hits?.hits || [];
      })
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

    const hits = Array.from(seen.values()).filter((hit) => {
      const raw = hit._source?.display_names?.[0] || hit._source?.entity_name || "";
      return isLikelyStartup(raw);
    });

    // Build partial filings
    const partial = hits.slice(0, 80).map((hit) => {
      const src = hit._source || {};
      const rawName: string = src.display_names?.[0] || src.entity_name || "";
      const entityName = rawName.replace(/\s*\(CIK\s+\d+\)\s*$/, "").trim();
      const cik = src.ciks?.[0] ? String(parseInt(src.ciks[0], 10)) : "";
      const accessionNo: string = src.adsh || hit._id;
      const formType: string = src.form || src.file_type || "D";
      const { stage: s, label } = inferStage(undefined); // placeholder until XML fetched
      return {
        id: accessionNo, entityName, cik,
        fileDate: src.file_date || "", formType, accessionNo,
        stage: s, stageLabel: label,
        offeringStatus: "unknown" as OfferingStatus,
      };
    });

    type PartialFiling = (typeof partial)[number] & {
      totalOfferingAmount?: number;
      totalAmountSold?: number;
      offeringStatus: OfferingStatus;
      dateOfFirstSale?: string;
      state?: string;
      relatedPersons?: Array<{ firstName?: string; lastName?: string; title?: string; city?: string; state?: string }>;
    };

    // Fetch XML details for up to 40 entries (parallel) and filter out funds
    const XML_BATCH = 40;
    const detailedRaw = await Promise.all(
      partial.slice(0, XML_BATCH).map(async (f) => {
        const details = await fetchFormDDetails(f.cik, f.accessionNo);
        if (details === null) return null; // pooled investment fund — skip
        return { ...f, ...details } as PartialFiling;
      })
    );
    const detailed = detailedRaw.filter(Boolean) as PartialFiling[];

    // Re-infer stage now that we have amounts
    const detailedWithStage = detailed.map((f) => {
      const { stage: s, label } = inferStage(f.totalAmountSold ?? f.totalOfferingAmount);
      return { ...f, stage: s, stageLabel: label };
    });

    const rest = partial.slice(XML_BATCH);
    const all = [...detailedWithStage, ...rest];

    // Fetch news signals
    const newsApiKey = process.env.NEWSAPI_KEY ?? "";
    const newsMap = new Map<string, Awaited<ReturnType<typeof fetchNewsSignals>>>();
    if (newsApiKey) {
      await Promise.all(
        detailedWithStage.map(async (f) => {
          const result = await fetchNewsSignals(f.entityName, newsApiKey);
          newsMap.set(f.id, result);
        })
      );
    }

    // Score
    let scored: StartupFiling[] = all.map((f) => {
      const news = newsMap.get(f.id);
      return {
        ...f,
        score: scoreStartup(f, news ? { expansionSignals: news.signals, expansionScore: news.expansionScore } : undefined),
        daysSinceFiling: getDaysSince(f.fileDate),
      };
    });

    if (bucket !== "all") scored = scored.filter((f) => f.score.bucket === bucket);
    if (stage !== "all") scored = scored.filter((f) => f.stage === stage);
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
