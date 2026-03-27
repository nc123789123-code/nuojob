export const runtime = "edge";

export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  tag: "fundraising" | "hiring";
}

function parseRssItems(xml: string, tag: NewsArticle["tag"]): NewsArticle[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 4);
  return items
    .map((m) => {
      const block = m[1];
      // Title: try CDATA first, then plain
      const title =
        block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
        block.match(/<title>(.*?)<\/title>/)?.[1] ||
        "";
      // Link: Google News puts <link> AFTER </title> — grab the text node
      const link =
        block.match(/<link>(https?[^<]+)<\/link>/)?.[1] ||
        block.match(/<guid[^>]*>(https?[^<]+)<\/guid>/)?.[1] ||
        "";
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
      const source =
        block.match(/<source[^>]*>([^<]*)<\/source>/)?.[1] ||
        "";
      return { title: title.trim(), link: link.trim(), pubDate: pubDate.trim(), source: source.trim(), tag };
    })
    .filter((a) => a.title.length > 5);
}

function relDays(pubDate: string): number {
  try {
    return Math.floor((Date.now() - new Date(pubDate).getTime()) / 86400000);
  } catch { return 999; }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firm = (searchParams.get("firm") || "").trim();
  if (!firm) return Response.json({ articles: [] });

  // Trim legal suffixes that hurt search precision
  const shortName = firm
    .replace(/\b(LP|LLC|Ltd|Inc|Corp|Fund|Partners|Capital|Management|Advisors?|Group)\b.*/i, "")
    .trim()
    .slice(0, 40);

  const searches: Array<{ q: string; tag: NewsArticle["tag"] }> = [
    {
      q: `"${shortName}" (fundraising OR "fund raise" OR "new fund" OR "closed fund" OR billion)`,
      tag: "fundraising",
    },
    {
      q: `"${shortName}" (hiring OR "new hire" OR "head of" OR joins OR appointed OR promoted)`,
      tag: "hiring",
    },
  ];

  const results = await Promise.allSettled(
    searches.map(async ({ q, tag }) => {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" },
        next: { revalidate: 14400 }, // 4-hour cache
      });
      if (!res.ok) return [] as NewsArticle[];
      const xml = await res.text();
      return parseRssItems(xml, tag);
    })
  );

  const raw = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  // Dedupe by title, sort by recency, cap at 6
  const seen = new Set<string>();
  const articles = raw
    .filter((a) => { const k = a.title.toLowerCase().slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => relDays(a.pubDate) - relDays(b.pubDate))
    .slice(0, 6);

  return Response.json({ articles });
}
