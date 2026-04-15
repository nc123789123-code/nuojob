import { NextResponse } from "next/server";
import { verifyGuideToken } from "@/app/lib/guideToken";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("t") || "";

  if (!token) {
    return NextResponse.redirect(new URL("/guide-download?error=missing", req.url));
  }

  const { valid } = verifyGuideToken(token);
  if (!valid) {
    return NextResponse.redirect(new URL("/guide-download?error=invalid", req.url));
  }

  const pdfUrl = process.env.GUIDE_PDF_URL;
  if (!pdfUrl) {
    console.error("[download-guide] GUIDE_PDF_URL not set");
    return NextResponse.json({ error: "Guide unavailable" }, { status: 503 });
  }

  // Fetch the private blob using the read-write token
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const res = await fetch(pdfUrl, {
    headers: blobToken ? { Authorization: `Bearer ${blobToken}` } : {},
  });

  if (!res.ok) {
    console.error("[download-guide] blob fetch failed:", res.status);
    return NextResponse.json({ error: "Could not fetch guide" }, { status: 502 });
  }

  const buffer = await res.arrayBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Onlu-Credit-Interview-Guide.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
