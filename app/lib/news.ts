import { Signal } from "@/app/types";

const NEWSAPI_URL = "https://newsapi.org/v2/everything";

// Keywords that indicate fundraising / expansion activity
const EXPANSION_KEYWORDS = [
  "fund",
  "raise",
  "raised",
  "close",
  "closed",
  "launch",
  "launched",
  "capital",
  "invest",
  "acqui",
  "expand",
  "hire",
  "partner",
];

export interface NewsResult {
  signals: Signal[];
  expansionScore: number;
}

export async function fetchNewsSignals(
  entityName: string,
  apiKey: string
): Promise<NewsResult> {
  const signals: Signal[] = [];

  try {
    const params = new URLSearchParams({
      q: `"${entityName}"`,
      sortBy: "publishedAt",
      pageSize: "5",
      language: "en",
      apiKey,
    });

    const res = await fetch(`${NEWSAPI_URL}?${params}`, {
      headers: { "User-Agent": "NolaClaude/1.0 research@nolaclaude.com" },
    });

    if (!res.ok) return { signals: [], expansionScore: 0 };

    const data = await res.json();
    const articles: Array<{
      title: string;
      description: string | null;
      publishedAt: string;
      url: string;
      source: { name: string };
    }> = data.articles || [];

    if (articles.length === 0) return { signals: [], expansionScore: 0 };

    // Score articles by recency and relevance
    let raw = 0;

    for (const article of articles) {
      const text = `${article.title} ${article.description || ""}`.toLowerCase();
      const isRelevant = EXPANSION_KEYWORDS.some((kw) => text.includes(kw));
      const publishedAt = article.publishedAt?.slice(0, 10) ?? "";

      const ageDays = publishedAt
        ? Math.floor(
            (Date.now() - new Date(publishedAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 999;

      // Base points per article, decayed by age
      const articlePoints = ageDays <= 30 ? 20 : ageDays <= 90 ? 12 : 6;
      // Bonus for keyword relevance
      const relevanceBonus = isRelevant ? 10 : 0;

      raw += articlePoints + relevanceBonus;

      signals.push({
        type: "press_release",
        description: article.title.slice(0, 100),
        date: publishedAt,
        source: "News",
        weight: articlePoints + relevanceBonus,
      });
    }

    // Cap at 100
    const expansionScore = Math.min(100, raw);

    return { signals, expansionScore };
  } catch {
    return { signals: [], expansionScore: 0 };
  }
}
