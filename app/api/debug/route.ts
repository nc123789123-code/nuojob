export const runtime = "edge";

// v5 — probe jobs-api14 PRO LinkedIn search endpoint variants
export async function GET() {
  const key = process.env.RAPIDAPI_KEY ?? "";
  const headers = { "Content-Type": "application/json", "x-rapidapi-host": "jobs-api14.p.rapidapi.com", "x-rapidapi-key": key };

  const probes = await Promise.allSettled([
    fetch("https://jobs-api14.p.rapidapi.com/v2/linkedin/search?keywords=private+credit+analyst&locationId=92000000&datePosted=anyTime&start=0", { headers }),
    fetch("https://jobs-api14.p.rapidapi.com/v2/indeed/search?countryCode=us&query=private+credit+analyst&location=New+York&sortType=relevance", { headers }),
    fetch("https://jobs-api14.p.rapidapi.com/v2/bing/search?query=private+credit+analyst&location=United+States&datePosted=week&remoteOnly=false&employmentTypes=fulltime", { headers }),
    fetch("https://jobs-api14.p.rapidapi.com/v2/xing/search?query=analyst&location=United+States", { headers }),
  ]);

  const labels = ["/v2/linkedin/search", "/v2/indeed/search", "/v2/bing/search", "/v2/xing/search"];
  const results: Record<string, unknown> = { key_set: !!key, key_preview: key ? key.slice(0, 8) + "..." : "missing" };

  for (let i = 0; i < probes.length; i++) {
    const r = probes[i];
    if (r.status === "rejected") { results[labels[i]] = { error: String(r.reason) }; continue; }
    const text = await r.value.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
    results[labels[i]] = { http: r.value.status, body };
  }

  results["_v"] = 5;
  results["_ts"] = new Date().toISOString();
  return Response.json(results, { headers: { "Cache-Control": "no-store" } });
}
