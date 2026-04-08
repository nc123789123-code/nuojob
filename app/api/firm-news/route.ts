export const runtime = "nodejs";

export interface NewsItem {
  title: string;
  source: string;
  date: string;
  daysAgo: number;
  url: string;
}

const cache = new Map<string, { items: NewsItem[]; ts: number }>();
const CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

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

    // Only include items from the last 45 days
    if (daysAgo > 45) continue;

    items.push({
      title,
      source,
      date: pub.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      daysAgo,
      url,
    });
  }
  return items.slice(0, 6);
}

// Keywords that suggest a hiring signal
const SIGNAL_KEYWORDS = [
  "fund", "raise", "raises", "raised", "billion", "million", "launch", "launches", "expan",
  "acqui", "hires", "appoints", "partner", "platform", "credit", "invest", "capital",
  "close", "closes", "closed", "series", "growth", "strategy",
];

function isSignalItem(title: string): boolean {
  const lower = title.toLowerCase();
  return SIGNAL_KEYWORDS.some(k => lower.includes(k));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firm = (searchParams.get("firm") || "").trim();
  if (!firm) return Response.json({ error: "Missing firm" }, { status: 400 });

  const key = firm.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json({ items: cached.items });
  }

  try {
    // Search for hiring/funding signals specifically
    const query = encodeURIComponent(`"${firm}" (funding OR raises OR expansion OR hires OR launches OR "new fund" OR "closes fund")`);
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Onlu/1.0)" },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);

    const xml = await res.text();
    const all = parseRss(xml);

    // Prefer signal items, fall back to any news
    const signalItems = all.filter(i => isSignalItem(i.title));
    const items = signalItems.length > 0 ? signalItems.slice(0, 3) : all.slice(0, 3);

    cache.set(key, { items, ts: Date.now() });
    return Response.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message, items: [] }, { status: 200 }); // soft-fail
  }
}
