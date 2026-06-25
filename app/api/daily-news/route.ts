export const runtime = "nodejs";

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  pubDate: string;
  category: "markets" | "economy" | "banking" | "companies" | "policy" | "global";
}

export interface NewsResponse {
  items: NewsItem[];
  generatedAt: string;
}

const SITE_FILTER =
  "(site:bloomberg.com OR site:wsj.com OR site:reuters.com OR site:ft.com OR site:cnbc.com OR site:barrons.com OR site:marketwatch.com OR site:economist.com OR site:fortune.com)";

const TRUSTED = [
  "bloomberg", "wall street journal", "wsj", "reuters", "financial times",
  "cnbc", "barron", "marketwatch", "the economist", "fortune", "ft",
];

function isTrusted(source: string): boolean {
  const s = source.toLowerCase();
  return TRUSTED.some(t => s.includes(t));
}

function looksLikeSentence(title: string): boolean {
  // At least 5 words, at least 30 chars, not ending mid-word with ellipsis fragment
  const words = title.trim().split(/\s+/);
  if (words.length < 5) return false;
  if (title.length < 30) return false;
  if (title.endsWith("...") && words.length < 7) return false;
  return true;
}

interface RawItem {
  title: string;
  source: string;
  pubDate: string;
  category: NewsItem["category"];
}

async function fetchRss(query: string, category: NewsItem["category"], count = 5): Promise<RawItem[]> {
  const q = `${query} ${SITE_FILTER}`;
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    const xml = await res.text();
    const out: RawItem[] = [];
    for (const block of [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, count + 4)) {
      const body = block[1];
      const titleRaw =
        body.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
        body.match(/<title>(.*?)<\/title>/)?.[1] || "";
      const sourceRaw =
        body.match(/<source[^>]*>([^<]+)<\/source>/)?.[1] || "";
      const pubDate = body.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";

      // Strip " - Source Name" Google suffix
      const title = titleRaw.replace(/\s[-–]\s[^-–]+$/, "").trim();
      const source = sourceRaw.trim();

      if (!isTrusted(source)) continue;
      if (!looksLikeSentence(title)) continue;
      if (out.length >= count) break;

      out.push({ title, source, pubDate, category });
    }
    return out;
  } catch {
    return [];
  }
}

export async function GET() {
  const feeds = await Promise.all([
    fetchRss("US stock market S&P 500 Nasdaq", "markets", 5),
    fetchRss("US economy inflation jobs Federal Reserve", "economy", 4),
    fetchRss("bank financial lending credit", "banking", 3),
    fetchRss("merger acquisition IPO earnings corporate", "companies", 5),
    fetchRss("Treasury SEC regulation finance policy", "policy", 3),
    fetchRss("global finance China Europe emerging markets", "global", 3),
  ]);

  const all = feeds.flat();

  // Deduplicate by normalised title prefix
  const seen = new Set<string>();
  const deduped = all.filter(item => {
    const key = item.title.toLowerCase().slice(0, 55);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by recency
  const sorted = deduped.sort((a, b) => {
    const ta = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const tb = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return tb - ta;
  });

  const items: NewsItem[] = sorted.slice(0, 10).map((item, i) => ({
    id: `news-${i}`,
    headline: item.title,
    source: item.source,
    pubDate: item.pubDate,
    category: item.category,
  }));

  return Response.json(
    { items, generatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
