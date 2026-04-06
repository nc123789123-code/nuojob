export const runtime = "edge";

export async function GET() {
  const rapid = process.env.RAPIDAPI_KEY ?? "";
  const adzId  = process.env.ADZUNA_APP_ID  ?? "";
  const adzKey = process.env.ADZUNA_APP_KEY ?? "";

  // Step 1: just return env state + one quick external probe
  const results: Record<string, unknown> = {
    _ts: new Date().toISOString(),
    env: {
      RAPIDAPI_KEY: rapid ? rapid.slice(0, 6) + "..." : "MISSING",
      ADZUNA_APP_ID: adzId ? "set" : "MISSING",
      ADZUNA_APP_KEY: adzKey ? "set" : "MISSING",
    },
  };

  // Probe greenhouse (no auth needed)
  try {
    const r = await fetch("https://boards.greenhouse.io/kkr/jobs.json", { signal: AbortSignal.timeout(6000) });
    const j = await r.json() as { jobs?: unknown[] };
    results["greenhouse_kkr"] = { http: r.status, jobs: j?.jobs?.length ?? 0 };
  } catch (e) { results["greenhouse_kkr"] = { error: String(e) }; }

  // Probe lever (no auth needed)
  try {
    const r = await fetch("https://api.lever.co/v0/postings/thirdpoint?mode=json", { signal: AbortSignal.timeout(6000) });
    const j = await r.json() as unknown[];
    results["lever_thirdpoint"] = { http: r.status, jobs: Array.isArray(j) ? j.length : 0 };
  } catch (e) { results["lever_thirdpoint"] = { error: String(e) }; }

  // Probe The Muse (no auth needed)
  try {
    const r = await fetch("https://www.themuse.com/api/public/jobs?category=Finance+%26+Accounting&page=0", { signal: AbortSignal.timeout(6000) });
    const j = await r.json() as { results?: unknown[] };
    results["muse"] = { http: r.status, jobs: j?.results?.length ?? 0 };
  } catch (e) { results["muse"] = { error: String(e) }; }

  // Probe RapidAPI — JSearch
  if (rapid) {
    try {
      const r = await fetch("https://jsearch.p.rapidapi.com/search?query=credit+analyst&page=1&num_pages=1&date_posted=month", {
        headers: { "X-RapidAPI-Key": rapid, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" },
        signal: AbortSignal.timeout(8000),
      });
      const j = await r.json() as { data?: unknown[]; message?: string };
      results["jsearch"] = { http: r.status, jobs: j?.data?.length ?? 0, msg: j?.message };
    } catch (e) { results["jsearch"] = { error: String(e) }; }
  } else {
    results["jsearch"] = "SKIPPED — no RAPIDAPI_KEY";
  }

  // Probe RapidAPI — Active Jobs DB (7d endpoint)
  if (rapid) {
    try {
      const r = await fetch(
        `https://active-jobs-db.p.rapidapi.com/active-ats-7d?offset=0&title_filter=%22Analyst%22+%22credit%22&location_filter=%22United+States%22&description_type=text`,
        {
          headers: { "X-RapidAPI-Key": rapid, "X-RapidAPI-Host": "active-jobs-db.p.rapidapi.com" },
          signal: AbortSignal.timeout(8000),
        }
      );
      const j = await r.json() as { data?: unknown[]; message?: string };
      results["active_jobs_db_7d"] = { http: r.status, jobs: j?.data?.length ?? 0, msg: j?.message };
    } catch (e) { results["active_jobs_db_7d"] = { error: String(e) }; }
  } else {
    results["active_jobs_db_7d"] = "SKIPPED — no RAPIDAPI_KEY";
  }

  return Response.json(results, { headers: { "Cache-Control": "no-store" } });
}
