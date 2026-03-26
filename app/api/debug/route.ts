export const runtime = "edge";

// v6 — probe jobs-api14 PRO with correct params (fixed LinkedIn, Indeed confirmed working)
export async function GET() {
  const key = process.env.RAPIDAPI_KEY ?? "";
  const headers = { "Content-Type": "application/json", "X-RapidAPI-Host": "jobs-api14.p.rapidapi.com", "X-RapidAPI-Key": key };

  const probes = await Promise.allSettled([
    fetch("https://jobs-api14.p.rapidapi.com/v2/linkedin/search?query=private+credit+analyst&location=United+States&datePosted=month", { headers }),
    fetch("https://jobs-api14.p.rapidapi.com/v2/indeed/search?countryCode=us&query=private+credit+analyst&location=New+York&sortType=date&datePosted=month", { headers }),
    fetch("https://jobs-api14.p.rapidapi.com/v2/bing/search?query=private+credit+analyst&location=United+States&datePosted=week&remoteOnly=false&employmentTypes=fulltime", { headers }),
    fetch("https://jobs-api14.p.rapidapi.com/v2/salary/range?query=credit+analyst&countryCode=us", { headers }),
  ]);

  const labels = ["/v2/linkedin/search", "/v2/indeed/search", "/v2/bing/search", "/v2/salary/range"];
  const results: Record<string, unknown> = { key_set: !!key, key_preview: key ? key.slice(0, 8) + "..." : "missing" };

  for (let i = 0; i < probes.length; i++) {
    const r = probes[i];
    if (r.status === "rejected") { results[labels[i]] = { error: String(r.reason) }; continue; }
    const text = await r.value.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
    results[labels[i]] = { http: r.value.status, body };
  }

  results["_v"] = 6;
  results["_ts"] = new Date().toISOString();
  return Response.json(results, { headers: { "Cache-Control": "no-store" } });
}
