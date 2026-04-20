import { put, head, del } from "@vercel/blob";

export interface TableSession {
  id: string;
  dateISO: string;
  date: string;
  time: string;
  location: string;
  theme: string;
  capacity: number;
  spotsLeft: number;
  description: string;
}

const BLOB_PATH = "data/onlu-table-sessions.json";

export async function readSessions(): Promise<TableSession[]> {
  try {
    const info = await head(BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN });
    const res  = await fetch(info.url);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function writeSessions(sessions: TableSession[]): Promise<void> {
  await put(BLOB_PATH, JSON.stringify(sessions, null, 2), {
    access: "public",
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });
}

export async function deleteBlobFile(): Promise<void> {
  try {
    const info = await head(BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN });
    await del(info.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch { /* file may not exist */ }
}
