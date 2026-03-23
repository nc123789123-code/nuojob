export const runtime = "edge";

export async function GET() {
  const results: Record<string, string> = {};

  const urls = [
    "https://efts.sec.gov/LATEST/search-index?q=%22hedge+fund%22&forms=D&dateRange=custom&startdt=2026-01-01&enddt=2026-03-23",
    "https://data.sec.gov/submissions/CIK0001166559.json",
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "NolaClaude/1.0 research@nolaclaude.com" },
      });
      results[url] = `HTTP ${res.status} ${res.statusText}`;
    } catch (e: unknown) {
      results[url] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return Response.json({ results });
}
