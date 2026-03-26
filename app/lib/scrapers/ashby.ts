/**
 * Ashby job board scraper.
 *
 * Ashby is an ATS used by a growing number of finance firms.
 * Public API endpoint: GET https://api.ashbyhq.com/posting-api/job-board/{slug}
 *
 * Response shape (relevant fields):
 * {
 *   organization: { name: string },
 *   jobPostings: Array<{
 *     id: string,
 *     title: string,
 *     department: string,
 *     locationName: string,
 *     publishedDate: string,   // ISO 8601
 *     applyUrl: string,
 *     employmentType: string,  // "FullTime" | "PartTime" | "Contract" | "Intern"
 *   }>
 * }
 */

export interface AshbyPosting {
  id: string;
  title: string;
  department?: string;
  team?: string;
  locationName?: string;
  publishedDate?: string;
  applyUrl?: string;
  externalLink?: string;
  employmentType?: string;
}

interface AshbyResponse {
  organization?: { name?: string };
  jobPostings?: AshbyPosting[];
}

/**
 * Fetch all job postings for a given Ashby organization slug.
 * Returns null if the org is not on Ashby or the request fails.
 */
export async function fetchAshbyPostings(
  slug: string,
  fetchFn: typeof fetch = fetch
): Promise<AshbyPosting[] | null> {
  try {
    const res = await fetchFn(
      `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
      {
        headers: { "Accept": "application/json" },
        // 30-min cache aligns with other job sources
        // @ts-ignore next fetch extension
        next: { revalidate: 1800 },
      }
    );
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("json")) return null;
    const data = (await res.json()) as AshbyResponse;
    return data?.jobPostings ?? null;
  } catch {
    return null;
  }
}
