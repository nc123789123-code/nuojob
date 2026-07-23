export const runtime = "nodejs";
import { Resend } from "resend";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { type, firm, roleType, background, contact, message } = body as {
    type: "seeking" | "offering";
    firm: string; roleType: string;
    background: string; contact: string; message: string;
  };

  if (!firm?.trim() || !background?.trim()) {
    return Response.json({ error: "firm and background are required" }, { status: 400 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return Response.json({ ok: true });

  const typeLabel = type === "offering" ? "Offering intro" : "Seeking intro";
  const color = type === "offering" ? "#0f6e56" : "#1A2B4A";

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: "Onlu <noreply@onluintel.com>",
      to: adminEmail,
      subject: `[Onlu] Referral — ${typeLabel}: ${firm}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;color:#1a1a2e">
          <div style="display:inline-block;padding:4px 12px;background:${color};color:white;border-radius:20px;font-size:11px;font-weight:700;margin-bottom:16px;text-transform:uppercase;letter-spacing:.05em">${typeLabel}</div>
          <h2 style="font-size:16px;margin-bottom:16px">Referral Request — ${firm}</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr><td style="padding:6px 12px 6px 0;color:#888;width:140px">Firm</td><td style="padding:6px 0"><strong>${firm}</strong></td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#888">Role type</td><td style="padding:6px 0">${roleType || "—"}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#888">Contact</td><td style="padding:6px 0">${contact || "Anonymous"}</td></tr>
          </table>
          <div style="margin-top:16px">
            <p style="color:#888;font-size:12px;margin-bottom:4px">BACKGROUND</p>
            <p style="background:#f7f9fb;border-radius:8px;padding:12px;font-size:13px;line-height:1.6">${background.replace(/\n/g, "<br/>")}</p>
          </div>
          ${message ? `
          <div style="margin-top:12px">
            <p style="color:#888;font-size:12px;margin-bottom:4px">ADDITIONAL NOTES</p>
            <p style="background:#f7f9fb;border-radius:8px;padding:12px;font-size:13px;line-height:1.6">${message.replace(/\n/g, "<br/>")}</p>
          </div>` : ""}
        </div>`,
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[referral-request]", err);
    return Response.json({ ok: true });
  }
}
