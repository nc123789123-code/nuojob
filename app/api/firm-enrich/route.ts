/**
 * /api/firm-enrich?firm=Ares+Management
 *
 * Searches Apollo (apollo-api3 on RapidAPI) for an organization by name,
 * returns headcount, HQ location, founded year, industry, and website.
 * Cached 24h per firm — org facts don't change often.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ApolloOrg {
  id: string;
  name: string;
  website_url?: string;
  linkedin_url?: string;
  estimated_num_employees?: number;
  city?: string;
  state?: string;
  country?: string;
  short_description?: string;
  industry?: string;
  founded_year?: number;
  logo_url?: string;
}

export interface FirmEnrichResult {
  name: string;
  headcount: number | null;
  location: string | null;
  founded: number | null;
  industry: string | null;
  website: string | null;
  linkedin: string | null;
  description: string | null;
}

// In-memory cache keyed by lowercase firm name
const cache = new Map<string, { data: FirmEnrichResult; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function searchApollo(firmName: string, apiKey: string): Promise<ApolloOrg | null> {
  const host = "apollo-api3.p.rapidapi.com";

  // Try search endpoint first
  try {
    const searchUrl = `https://${host}/organizations/search?q=${encodeURIComponent(firmName)}&per_page=1`;
    const res = await fetch(searchUrl, {
      headers: {
        "x-rapidapi-host": host,
        "x-rapidapi-key": apiKey,
        "Content-Type": "application/json",
      },
    });
    if (res.ok) {
      const json = await res.json();
      // Apollo returns { organizations: [...] } or { data: [...] }
      const orgs: ApolloOrg[] = json?.organizations ?? json?.data ?? [];
      if (orgs.length > 0) return orgs[0];
    }
  } catch { /* fall through */ }

  // Fallback: try POST search
  try {
    const res = await fetch(`https://${host}/organizations/search`, {
      method: "POST",
      headers: {
        "x-rapidapi-host": host,
        "x-rapidapi-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: firmName, per_page: 1 }),
    });
    if (res.ok) {
      const json = await res.json();
      const orgs: ApolloOrg[] = json?.organizations ?? json?.data ?? [];
      if (orgs.length > 0) return orgs[0];
    }
  } catch { /* fall through */ }

  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firm = searchParams.get("firm")?.trim();
  if (!firm) return Response.json({ error: "firm required" }, { status: 400 });

  const key = firm.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return Response.json(cached.data);
  }

  const apiKey = process.env.RAPIDAPI_KEY ?? "";
  if (!apiKey) return Response.json({ error: "No API key" }, { status: 500 });

  const org = await searchApollo(firm, apiKey);

  if (!org) {
    // Return empty result — don't error, just show nothing
    return Response.json({ name: firm, headcount: null, location: null, founded: null, industry: null, website: null, linkedin: null, description: null });
  }

  const location = [org.city, org.state, org.country].filter(Boolean).join(", ") || null;

  const result: FirmEnrichResult = {
    name: org.name ?? firm,
    headcount: org.estimated_num_employees ?? null,
    location,
    founded: org.founded_year ?? null,
    industry: org.industry ?? null,
    website: org.website_url ?? null,
    linkedin: org.linkedin_url ?? null,
    description: org.short_description ?? null,
  };

  cache.set(key, { data: result, ts: Date.now() });
  return Response.json(result);
}
