import crypto from "crypto";

const SECRET =
  process.env.SESSION_SECRET ||
  process.env.STRIPE_WEBHOOK_SECRET ||
  "onlu-dev-secret-set-SESSION_SECRET-in-env";

export interface Session {
  email: string;
  pro: boolean;
  ts: number;
}

export const SESSION_COOKIE = "onlu_session";

export function sign(payload: Session): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${mac}`;
}

export function verify(token?: string | null): Session | null {
  if (!token) return null;
  const [data, mac] = token.split(".");
  if (!data || !mac) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
  const macBuf = Buffer.from(mac);
  const expBuf = Buffer.from(expected);
  if (macBuf.length !== expBuf.length || !crypto.timingSafeEqual(macBuf, expBuf)) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString()) as Session;
  } catch {
    return null;
  }
}
