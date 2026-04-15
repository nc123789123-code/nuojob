import { createHmac } from "crypto";

const SECRET = process.env.GUIDE_TOKEN_SECRET || "onlu-guide-secret-fallback";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateGuideToken(email: string): string {
  const expiry = Date.now() + TTL_MS;
  const payload = `${email}:${expiry}`;
  const hmac = createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64url");
}

export function verifyGuideToken(token: string): { valid: boolean; email?: string } {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length < 3) return { valid: false };
    const hmac = parts.pop()!;
    const expiry = parseInt(parts.pop()!, 10);
    const email = parts.join(":");
    if (Date.now() > expiry) return { valid: false };
    const expected = createHmac("sha256", SECRET).update(`${email}:${expiry}`).digest("hex");
    if (hmac !== expected) return { valid: false };
    return { valid: true, email };
  } catch {
    return { valid: false };
  }
}
