export const runtime = "nodejs";
import { cookies } from "next/headers";
import { verify, SESSION_COOKIE } from "@/app/lib/session";

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = verify(token);
  return Response.json({
    email: session?.email ?? null,
    pro: session?.pro ?? false,
  });
}
