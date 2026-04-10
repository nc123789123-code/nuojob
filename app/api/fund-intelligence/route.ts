export const runtime = "nodejs";
export const maxDuration = 30;

const HEADERS = {
  "User-Agent": "Onlu/1.0 research@onlu.com",
  "Accept": "application/json, text/xml, application/xml",
};

export interface ThirteenFPosition {
  name: string;
  value: number; // in thousands USD
  shares: number;
  pctOfPortfolio: number;
}

export interface ThirteenFData {
  cik: string;
  firmName: string;
  filedDate: string;
  periodOfReport: string;
  totalAumThousands: number;
  topPositions: ThirteenFPosition[];
  positionCount: number;
}

// Hardcoded CIKs for the watchlist firms we know file 13Fs
// (EDGAR registrant names often differ from common names — hardcoding is most reliable)
const KNOWN_CIKS: Record<string, string> = {
  "citadel":        "1423053",
  "millennium":     "1273931",
  "point72":        "1603466",
  "viking global":  "1103804",
  "coatue":         "1336948",
  "tiger global":   "1511699",
  "lone pine":      "1056943",
  "baupost":        "0000862899",
  "sculptor":       "1403708",
  "highbridge":     "1297585",
  "blackrock":      "1364742",
  "pimco":          "1370637",
  "wellington":     "0000101879",
  "t. rowe price":  "0001113169",
  "fidelity":       "0000315066",
  "invesco":        "0000914208",
  "alliancebernstein": "0001485922",
  "franklin templeton": "0000038487",
};

const cache = new Map<string, { data: ThirteenFData | null; ts: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h

function lookupKnownCik(firmName: string): string | null {
  const lower = firmName.toLowerCase();
  for (const [key, cik] of Object.entries(KNOWN_CIKS)) {
    if (lower.includes(key)) return cik;
  }
  return null;
}

// EDGAR company search — more reliable than full-text for name lookup
async function findCikBySearch(firmName: string): Promise<string | null> {
  const url = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(firmName)}%22&forms=13F-HR&dateRange=custom&startdt=2023-01-01`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const data = await res.json();
    const hits = data.hits?.hits ?? [];
    if (!hits.length) return null;
    // entity_id is the CIK without leading zeros
    const entityId = hits[0]?._source?.entity_id;
    return entityId ? String(entityId) : null;
  } catch { return null; }
}

async function getLatest13FAccession(cik: string): Promise<{ accession: string; filed: string; period: string } | null> {
  const paddedCik = cik.replace(/^0+/, "").padStart(10, "0");
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const sub = await res.json();
  const recent = sub.filings?.recent ?? {};
  const forms: string[] = recent.form ?? [];
  const accessions: string[] = recent.accessionNumber ?? [];
  const dates: string[] = recent.filingDate ?? [];
  const periods: string[] = recent.reportDate ?? [];
  for (let i = 0; i < forms.length; i++) {
    if (forms[i] === "13F-HR") {
      return { accession: accessions[i], filed: dates[i], period: periods[i] };
    }
  }
  return null;
}

async function parseInfoTable(cik: string, accession: string): Promise<ThirteenFPosition[]> {
  const bare = accession.replace(/-/g, "");
  const cleanCik = cik.replace(/^0+/, "");

  // Try to get the index page to find the infotable filename
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${bare}/${accession}-index.htm`;
  let infoTableUrl: string | null = null;

  try {
    const indexRes = await fetch(indexUrl, { headers: HEADERS });
    if (indexRes.ok) {
      const html = await indexRes.text();
      const match = html.match(/href="([^"]*infotable[^"]*\.xml)"/i) ??
                    html.match(/href="([^"]*form13fInfoTable[^"]*\.xml)"/i);
      if (match) {
        infoTableUrl = match[1].startsWith("http")
          ? match[1]
          : `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${bare}/${match[1].split("/").pop()}`;
      }
    }
  } catch { /* fall through to default */ }

  if (!infoTableUrl) {
    infoTableUrl = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${bare}/form13fInfoTable.xml`;
  }

  const res = await fetch(infoTableUrl, { headers: HEADERS });
  if (!res.ok) {
    // try alternate common name
    const alt = `https://www.sec.gov/Archives/edgar/data/${cleanCik}/${bare}/infotable.xml`;
    const altRes = await fetch(alt, { headers: HEADERS });
    if (!altRes.ok) return [];
    return parseXml(await altRes.text());
  }
  return parseXml(await res.text());
}

function parseXml(xml: string): ThirteenFPosition[] {
  const entries: ThirteenFPosition[] = [];
  const infoEntries = xml.match(/<infoTable>([\s\S]*?)<\/infoTable>/gi) ?? [];
  for (const entry of infoEntries.slice(0, 300)) {
    const name = entry.match(/<nameOfIssuer>(.*?)<\/nameOfIssuer>/i)?.[1]?.trim() ?? "";
    const valueStr = entry.match(/<value>(.*?)<\/value>/i)?.[1]?.trim() ?? "0";
    const sharesStr = (
      entry.match(/<sshPrnamt>(.*?)<\/sshPrnamt>/i)?.[1] ??
      entry.match(/<shrsOrPrnAmt>([\s\S]*?)<\/shrsOrPrnAmt>/i)?.[1]?.replace(/<[^>]+>/g, "")
    )?.trim() ?? "0";
    const value = parseInt(valueStr.replace(/,/g, ""), 10) || 0;
    const shares = parseInt(sharesStr.replace(/,/g, ""), 10) || 0;
    if (name && value > 0) entries.push({ name, value, shares, pctOfPortfolio: 0 });
  }
  entries.sort((a, b) => b.value - a.value);
  const total = entries.reduce((s, e) => s + e.value, 0);
  if (total > 0) entries.forEach(e => { e.pctOfPortfolio = Math.round((e.value / total) * 1000) / 10; });
  return entries;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firmName = (searchParams.get("firm") || "").trim();
  const cikParam = (searchParams.get("cik") || "").trim();
  if (!firmName && !cikParam) return Response.json({ error: "Missing firm or cik param" }, { status: 400 });

  const cacheKey = cikParam || firmName.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    if (cached.data === null) return Response.json({ error: "No 13F filings found" }, { status: 404 });
    return Response.json(cached.data);
  }

  try {
    let cik = cikParam;
    if (!cik && firmName) {
      cik = lookupKnownCik(firmName) ?? await findCikBySearch(firmName) ?? "";
    }
    if (!cik) {
      cache.set(cacheKey, { data: null, ts: Date.now() });
      return Response.json({ error: "No 13F filings found for this firm" }, { status: 404 });
    }

    const latest = await getLatest13FAccession(cik);
    if (!latest) {
      cache.set(cacheKey, { data: null, ts: Date.now() });
      return Response.json({ error: "No 13F-HR in submission history" }, { status: 404 });
    }

    const positions = await parseInfoTable(cik, latest.accession);
    if (!positions.length) {
      cache.set(cacheKey, { data: null, ts: Date.now() });
      return Response.json({ error: "Could not parse infotable" }, { status: 404 });
    }

    const totalAum = positions.reduce((s, p) => s + p.value, 0);
    const result: ThirteenFData = {
      cik,
      firmName: firmName || cik,
      filedDate: latest.filed,
      periodOfReport: latest.period,
      totalAumThousands: totalAum,
      topPositions: positions.slice(0, 10),
      positionCount: positions.length,
    };

    cache.set(cacheKey, { data: result, ts: Date.now() });
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
