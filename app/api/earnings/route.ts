export const runtime = "nodejs";

import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";

export interface EarningsEntry {
  symbol: string;
  name: string;
  reportDate: string;
  reportDay: string;
  time: "pre-market" | "post-market" | "unknown";
  epsForecast?: string;
  lastYearEPS?: string;
  fiscalQuarterEnding?: string;
  marketCap?: string;
  blurb?: string;
}

export interface EarningsCalendar {
  entries: EarningsEntry[];
  generatedAt: string;
}

async function fetchForDate(dateISO: string): Promise<EarningsEntry[]> {
  const url = `https://api.nasdaq.com/api/calendar/earnings?date=${dateISO}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rows: Record<string, string>[] = json?.data?.rows ?? [];
    return rows
      .filter(r => r.symbol && r.name)
      .map(r => ({
        symbol: r.symbol.trim(),
        name: r.name.trim(),
        reportDate: dateISO,
        reportDay: new Date(dateISO + "T12:00:00Z").toLocaleDateString("en-US", {
          weekday: "long", month: "long", day: "numeric",
        }),
        time: (r.time ?? "").toLowerCase().includes("pre") ? "pre-market"
            : (r.time ?? "").toLowerCase().includes("after") ? "post-market"
            : "unknown",
        epsForecast: r.epsForecast && r.epsForecast !== "N/A" ? r.epsForecast : undefined,
        lastYearEPS: r.lastYearEPS && r.lastYearEPS !== "N/A" ? r.lastYearEPS : undefined,
        fiscalQuarterEnding: r.fiscalQuarterEnding && r.fiscalQuarterEnding !== "N/A" ? r.fiscalQuarterEnding : undefined,
        marketCap: r.marketCap && r.marketCap !== "N/A" ? r.marketCap : undefined,
      }));
  } catch {
    return [];
  }
}

function getBusinessDates(count = 5): string[] {
  const dates: string[] = [];
  const etToday = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  });
  const [m, d, y] = etToday.split("/");
  let cur = new Date(`${y}-${m}-${d}T12:00:00Z`);

  while (dates.length < count) {
    const dow = cur.getUTCDay();
    if (dow >= 1 && dow <= 5) {
      dates.push(cur.toISOString().split("T")[0]);
    }
    cur = new Date(cur.getTime() + 86400000);
  }
  return dates;
}

async function addBlurbs(entries: EarningsEntry[], apiKey: string): Promise<void> {
  if (!entries.length) return;
  const list = entries.map(e => `${e.symbol}: ${e.name}`).join("\n");
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      messages: [{
        role: "user",
        content: `Return ONLY valid JSON — no markdown. For each company write a 4-6 word description of what the business does (what it sells/makes, not the brand name). Format: {"SYMBOL":"description",...}\n\n${list}`,
      }],
    });
    const raw = (msg.content[0] as { type: string; text: string }).text
      .replace(/```json\n?|\n?```/g, "").trim();
    const map: Record<string, string> = JSON.parse(raw);
    for (const e of entries) {
      if (map[e.symbol]) e.blurb = map[e.symbol];
    }
  } catch {
    // blurbs are optional — gracefully skip on error
  }
}

async function buildEarnings(): Promise<EarningsCalendar> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const dates = getBusinessDates(5);
  const results = await Promise.all(dates.map(fetchForDate));
  const all = results.flat();

  // Group by date, prioritise entries with EPS forecasts
  const byDate: Record<string, EarningsEntry[]> = {};
  for (const e of all) {
    if (!byDate[e.reportDate]) byDate[e.reportDate] = [];
    byDate[e.reportDate].push(e);
  }

  const entries: EarningsEntry[] = [];
  for (const [, dayEntries] of Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))) {
    const withForecast = dayEntries.filter(e => e.epsForecast);
    const rest = dayEntries.filter(e => !e.epsForecast);
    entries.push(...withForecast.slice(0, 8), ...rest.slice(0, 2));
  }

  const trimmed = entries.slice(0, 40);
  if (apiKey) await addBlurbs(trimmed, apiKey);

  return { entries: trimmed, generatedAt: new Date().toISOString() };
}

const getCachedEarnings = unstable_cache(buildEarnings, ["earnings-v2"], { revalidate: 21600 }); // 6h

export async function GET() {
  try {
    const result = await getCachedEarnings();
    return Response.json(result, {
      headers: { "Cache-Control": "s-maxage=21600, stale-while-revalidate=3600" },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
