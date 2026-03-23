export const runtime = "edge";

export async function GET() {
  const HEADERS = {
    "User-Agent": "NolaClaude/1.0 research@nolaclaude.com",
    "Accept": "application/json",
  };

  const url =
    "https://efts.sec.gov/LATEST/search-index?q=%22hedge+fund%22&forms=D&dateRange=custom&startdt=2026-01-01&enddt=2026-03-23";

  try {
    const res = await fetch(url, { headers: HEADERS });
    const text = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 500); }
    return Response.json({ status: res.status, body: parsed });
  } catch (e: unknown) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) });
  }
}
