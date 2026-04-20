import { NextRequest, NextResponse } from "next/server";
import { readSessions, writeSessions, TableSession } from "@/app/lib/sessionsStore";

export const runtime = "nodejs";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return req.headers.get("x-admin-secret") === secret;
}

// GET — list all sessions (public, used by the main site)
export async function GET() {
  const sessions = await readSessions();
  const upcoming = sessions.filter(
    (s) => new Date(s.dateISO) >= new Date(new Date().toDateString())
  );
  return NextResponse.json(upcoming, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
  });
}

// POST — add a new session
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: Omit<TableSession, "id"> = await req.json();
  if (!body.dateISO || !body.theme) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const sessions = await readSessions();
  const id = `${body.dateISO}-${body.theme.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
  if (sessions.find((s) => s.id === id)) {
    return NextResponse.json({ error: "Session with this date/theme already exists" }, { status: 409 });
  }
  const newSession: TableSession = { ...body, id, capacity: body.capacity ?? 8, spotsLeft: body.spotsLeft ?? body.capacity ?? 8 };
  await writeSessions([...sessions, newSession].sort((a, b) => a.dateISO.localeCompare(b.dateISO)));
  return NextResponse.json(newSession, { status: 201 });
}

// PATCH — update spotsLeft (or any field) by id
export async function PATCH(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sessions = await readSessions();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  sessions[idx] = { ...sessions[idx], ...updates };
  await writeSessions(sessions);
  return NextResponse.json(sessions[idx]);
}

// DELETE — remove session by id
export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sessions = await readSessions();
  const filtered = sessions.filter((s) => s.id !== id);
  if (filtered.length === sessions.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await writeSessions(filtered);
  return NextResponse.json({ ok: true });
}
