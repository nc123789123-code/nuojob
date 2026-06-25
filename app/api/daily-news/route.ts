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

interface RawItem { title: string; source: string; pubDate: string; }

async function fetchRss(
  query: string,
  category: NewsItem["category"],
  count = 4
): Promise<(RawItem & { category: NewsItem["category"] })[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const xml = await res.text();
    const out: (RawItem & { category: NewsItem["category"] })[] = [];
    for (const block of [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, count)) {
      const body = block[1];
      const titleRaw =
        body.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
        body.match(/<title>(.*?)<\/title>/)?.[1] || "";
      const sourceRaw =
        body.match(/<source[^>]*>([^<]+)<\/source>/)?.[1] ||
        body.match(/<title><!\[CDATA\[.*? - ([^-\]]+)\]\]><\/title>/)?.[1] || "";
      const pubDate = body.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";

      // Strip " - Source Name" suffix Google appends to titles
      const title = titleRaw.replace(/\s-\s[^-]+$/, "").trim();
      const source = sourceRaw.trim();

      if (title.length > 10) out.push({ title, source, pubDate, category });
    }
    return out;
  } catch {
    return [];
  }
}

export async function GET() {
  const feeds = await Promise.all([
    fetchRss("US stock market S&P 500 Nasdaq today", "markets", 5),
    fetchRss("US economy inflation jobs Federal Reserve today", "economy", 4),
    fetchRss("bank financial lending credit today", "banking", 3),
    fetchRss("merger acquisition IPO earnings corporate today", "companies", 5),
    fetchRss("Treasury SEC regulation finance policy today", "policy", 3),
    fetchRss("global finance China Europe emerging markets today", "global", 3),
  ]);

  const all = feeds.flat();

  // Deduplicate by normalised title prefix
  const seen = new Set<string>();
  const deduped = all.filter(item => {
    const key = item.title.toLowerCase().slice(0, 50);
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
