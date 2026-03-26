export const runtime = "edge";

// v4 — probe jobs-api14 PRO endpoint variants
export async function GET() {
  const key = process.env.RAPIDAPI_KEY ?? "";
  const headers = { "Content-Type": "application/json", "x-rapidapi-host": "jobs-api14.p.rapidapi.com", "x-rapidapi-key": key };

  const probes = await Promise.allSettled([
    fetch("https://jobs-api14.p.rapidapi.com/list?query=analyst&location=United+States&employmentType=fulltime", { headers }),
    fetch("https://jobs-api14.p.rapidapi.com/v2/list?query=analyst&location=United+States", { headers }),
    fetch("https://jobs-api14.p.rapidapi.com/linkedin/search-jobs?keywords=analyst&location=United+States", { headers }),
    fetch("https://jobs-api14.p.rapidapi.com/search?query=analyst&location=United+States", { headers }),
  ]);

  const labels = ["GET /list", "GET /v2/list", "GET /linkedin/search-jobs", "GET /search"];
  const results: Record<string, unknown> = { key_set: !!key, key_preview: key ? key.slice(0, 8) + "..." : "missing" };

  for (let i = 0; i < probes.length; i++) {
    const r = probes[i];
    if (r.status === "rejected") { results[labels[i]] = { error: String(r.reason) }; continue; }
    const text = await r.value.text();
    let body: unknown;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
    results[labels[i]] = { http: r.value.status, body };
  }

  results["_v"] = 4;
  results["_ts"] = new Date().toISOString();
  return Response.json(results, { headers: { "Cache-Control": "no-store" } });
}
