export const runtime = "edge";

// v3 — tests RapidAPI sources (jobs-api14 + linkedin-job-search-api)
export async function GET() {
  const key = process.env.RAPIDAPI_KEY ?? "";

  const tests = await Promise.allSettled([
    // Test 1: jobs-api14
    fetch(
      "https://jobs-api14.p.rapidapi.com/v2/list?query=private+credit+analyst&location=United+States&autoTranslateLocation=false&remoteOnly=false&employmentTypes=fulltime&datePosted=month",
      { headers: { "Content-Type": "application/json", "x-rapidapi-host": "jobs-api14.p.rapidapi.com", "x-rapidapi-key": key } }
    ),
    // Test 2: linkedin-job-search-api
    fetch(
      "https://linkedin-job-search-api.p.rapidapi.com/active-jb-1h?limit=2&offset=0&description_type=text",
      { headers: { "Content-Type": "application/json", "x-rapidapi-host": "linkedin-job-search-api.p.rapidapi.com", "x-rapidapi-key": key } }
    ),
  ]);

  const results: Record<string, unknown> = { key_set: !!key, key_preview: key ? key.slice(0, 8) + "..." : "missing" };

  for (const [i, label] of [["0", "jobs14"], ["1", "linkedin_job_search"]] as const) {
    const r = tests[Number(i)];
    if (r.status === "rejected") {
      results[label] = { error: String(r.reason) };
    } else {
      const res = r.value;
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); } catch { body = text.slice(0, 300); }
      results[label] = { http: res.status, body };
    }
  }

  results["_v"] = 3;
  results["_ts"] = new Date().toISOString();
  return Response.json(results, { headers: { "Cache-Control": "no-store" } });
}
