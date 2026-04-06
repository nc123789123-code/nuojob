export const runtime = "edge";

async function probe(label: string, url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, { ...init, signal: ctrl.signal, next: { revalidate: 0 } });
    clearTimeout(timer);
    const text = await r.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 300); }
    const count = Array.isArray(body) ? body.length
      : (body as Record<string,unknown>)?.data ? ((body as Record<string,unknown>).data as unknown[])?.length
      : (body as Record<string,unknown>)?.jobs ? ((body as Record<string,unknown>).jobs as unknown[])?.length
      : (body as Record<string,unknown>)?.results ? ((body as Record<string,unknown>).results as unknown[])?.length
      : null;
    return { label, http: r.status, count, sample: JSON.stringify(body).slice(0, 400) };
  } catch (e) {
    return { label, error: String(e) };
  }
}

export async function GET() {
  const rapid = process.env.RAPIDAPI_KEY ?? "";
  const adzId  = process.env.ADZUNA_APP_ID  ?? "";
  const adzKey = process.env.ADZUNA_APP_KEY ?? "";

  const rapidH = { "X-RapidAPI-Key": rapid, "X-RapidAPI-Host": "" };

  const [
    greenhouse, lever, workday,
    jsearch, activejobs, jobs14li,
    muse, adzuna,
  ] = await Promise.all([
    // Greenhouse — KKR
    probe("greenhouse/kkr", "https://boards.greenhouse.io/kkr/jobs.json"),
    // Lever — Third Point
    probe("lever/thirdpoint", "https://api.lever.co/v0/postings/thirdpoint?mode=json"),
    // Workday — PIMCO
    probe("workday/pimco", "https://pimco.wd1.myworkdayjobs.com/wday/cxs/pimco/PIMCO/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: 0, searchText: "" }),
    }),
    // JSearch
    rapid ? probe("jsearch", `https://jsearch.p.rapidapi.com/search?query=private+credit+analyst&page=1&num_pages=1&date_posted=month&country=us`, {
      headers: { ...rapidH, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" },
    }) : Promise.resolve({ label: "jsearch", skipped: "no RAPIDAPI_KEY" }),
    // Active Jobs DB — 7d endpoint
    rapid ? probe("active-jobs-db/7d", `https://active-jobs-db.p.rapidapi.com/active-ats-7d?offset=0&title_filter=%22Analyst%22+%22credit%22&location_filter=%22United+States%22&description_type=text`, {
      headers: { ...rapidH, "X-RapidAPI-Host": "active-jobs-db.p.rapidapi.com" },
    }) : Promise.resolve({ label: "active-jobs-db", skipped: "no RAPIDAPI_KEY" }),
    // Jobs API14 LinkedIn
    rapid ? probe("jobs14/linkedin", `https://jobs-api14.p.rapidapi.com/v2/linkedin/search?query=private+credit+analyst&location=United+States&datePosted=month`, {
      headers: { ...rapidH, "X-RapidAPI-Host": "jobs-api14.p.rapidapi.com" },
    }) : Promise.resolve({ label: "jobs14", skipped: "no RAPIDAPI_KEY" }),
    // The Muse
    probe("muse", "https://www.themuse.com/api/public/jobs?category=Finance+%26+Accounting&descending=true&page=0"),
    // Adzuna
    adzId && adzKey ? probe("adzuna", `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${adzId}&app_key=${adzKey}&what=private+credit+analyst&results_per_page=10&sort_by=date&content-type=application/json`) : Promise.resolve({ label: "adzuna", skipped: "no keys" }),
  ]);

  return Response.json({
    _ts: new Date().toISOString(),
    env: {
      RAPIDAPI_KEY: rapid ? rapid.slice(0, 8) + "..." : "MISSING",
      ADZUNA_APP_ID: adzId ? "set" : "MISSING",
      ADZUNA_APP_KEY: adzKey ? "set" : "MISSING",
    },
    sources: { greenhouse, lever, workday, jsearch, activejobs, jobs14li, muse, adzuna },
  }, { headers: { "Cache-Control": "no-store" } });
}
