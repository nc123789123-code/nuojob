export const runtime = "edge";

import { unstable_cache } from "next/cache";

export interface NewsItem {
  title: string;
  source: string;
  date: string;
  daysAgo: number;
  url: string;
}

function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "";
    const title = rawTitle.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
    const url = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";
    const pubDateStr = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? "";
    const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    const source = sourceMatch?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim() ?? "";
    if (!title || title.length < 5) continue;
    const pub = pubDateStr ? new Date(pubDateStr) : new Date();
    const daysAgo = Math.floor((Date.now() - pub.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo > 45) continue;
    items.push({ title, source, date: pub.toLocaleDateString("en-US", { month: "short", day: "numeric" }), daysAgo, url });
  }
  return items.slice(0, 6);
}

const SIGNAL_KEYWORDS = ["fund","raise","raises","raised","billion","million","launch","launches","expan","acqui","hires","appoints","partner","platform","credit","invest","capital","close","closes","closed","series","growth","strategy"];

function isSignalItem(title: string): boolean {
  const lower = title.toLowerCase();
  return SIGNAL_KEYWORDS.some(k => lower.includes(k));
}

async function fetchFirmNews(firm: string): Promise<NewsItem[]> {
  const query = encodeURIComponent(`"${firm}" (funding OR raises OR expansion OR hires OR launches OR "new fund" OR "closes fund")`);
  const res = await fetch(`https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Onlu/1.0)" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const xml = await res.text();
  const all = parseRss(xml);
  const signalItems = all.filter(i => isSignalItem(i.title));
  return signalItems.length > 0 ? signalItems.slice(0, 3) : all.slice(0, 3);
}

const getCachedFirmNews = unstable_cache(fetchFirmNews, ["firm-news"], { revalidate: 14400 }); // 4h

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firm = (searchParams.get("firm") || "").trim();
  if (!firm) return Response.json({ error: "Missing firm" }, { status: 400 });

  try {
    const items = await getCachedFirmNews(firm.toLowerCase());
    return Response.json({ items }, {
      headers: { "Cache-Control": "s-maxage=14400, stale-while-revalidate=1800" },
    });
  } catch (err) {
    return Response.json({ error: String(err), items: [] }, { status: 200 });
  }
}
