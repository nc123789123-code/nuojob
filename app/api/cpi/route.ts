export const runtime = "nodejs";

export interface CpiDataPoint {
  date: string;   // "2024-12"
  value: number;  // index level
  yoy?: number;   // year-over-year % change
  mom?: number;   // month-over-month % change
}

export interface CpiResponse {
  latest: CpiDataPoint;
  history: CpiDataPoint[];   // last 13 months
  seriesId: string;
  fetchedAt: string;
}

let cache: { data: CpiResponse; ts: number } | null = null;
const CACHE_TTL = 12 * 60 * 60 * 1000; // 12 hours — CPI only updates monthly

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) {
    return Response.json(cache.data, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200" },
    });
  }

  try {
    // BLS public API — CPI-U, not seasonally adjusted, all items
    const seriesId = "CUSR0000SA0";
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 1;

    const res = await fetch(
      `https://api.bls.gov/publicAPI/v1/timeseries/data/${seriesId}?startyear=${startYear}&endyear=${currentYear}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error(`BLS API error ${res.status}`);

    const json = await res.json();
    const rawData: { year: string; period: string; value: string }[] =
      json?.Results?.series?.[0]?.data ?? [];

    if (!rawData.length) throw new Error("No CPI data returned");

    // Convert and sort ascending
    const points: CpiDataPoint[] = rawData
      .filter((d) => d.period.startsWith("M")) // exclude annual averages
      .map((d) => ({
        date: `${d.year}-${d.period.slice(1).padStart(2, "0")}`,
        value: parseFloat(d.value),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Compute YoY and MoM
    for (let i = 0; i < points.length; i++) {
      const cur = points[i];
      if (i >= 12) {
        cur.yoy = +((cur.value / points[i - 12].value - 1) * 100).toFixed(2);
      }
      if (i > 0) {
        cur.mom = +((cur.value / points[i - 1].value - 1) * 100).toFixed(2);
      }
    }

    const history = points.slice(-13);
    const latest = history[history.length - 1];

    const data: CpiResponse = {
      latest,
      history,
      seriesId,
      fetchedAt: new Date().toISOString(),
    };

    cache = { data, ts: now };
    return Response.json(data, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (err) {
    console.error("[cpi]", err);
    return Response.json({ error: "CPI data unavailable" }, { status: 503 });
  }
}
