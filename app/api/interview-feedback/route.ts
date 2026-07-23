export const runtime = "nodejs";
import { Resend } from "resend";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { firm, roleType, round, difficulty, questions, tips, outcome } = body as {
    firm: string; roleType: string; round: string;
    difficulty: string; questions: string; tips: string; outcome: string;
  };

  if (!firm?.trim() || !questions?.trim()) {
    return Response.json({ error: "firm and questions are required" }, { status: 400 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return Response.json({ ok: true }); // silently succeed if no admin email

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: "Onlu <noreply@onluintel.com>",
      to: adminEmail,
      subject: `[Onlu] Interview feedback: ${firm}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;color:#1a1a2e">
          <h2 style="font-size:16px;margin-bottom:16px">Anonymous Interview Feedback</h2>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <tr><td style="padding:6px 12px 6px 0;color:#888;width:140px">Firm</td><td style="padding:6px 0"><strong>${firm}</strong></td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#888">Role type</td><td style="padding:6px 0">${roleType || "—"}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#888">Round</td><td style="padding:6px 0">${round || "—"}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#888">Difficulty</td><td style="padding:6px 0">${difficulty || "—"}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#888">Outcome</td><td style="padding:6px 0">${outcome || "—"}</td></tr>
          </table>
          <div style="margin-top:16px">
            <p style="color:#888;font-size:12px;margin-bottom:4px">QUESTIONS ASKED</p>
            <p style="background:#f7f9fb;border-radius:8px;padding:12px;font-size:13px;line-height:1.6">${questions.replace(/\n/g, "<br/>")}</p>
          </div>
          ${tips ? `
          <div style="margin-top:12px">
            <p style="color:#888;font-size:12px;margin-bottom:4px">TIPS FOR CANDIDATES</p>
            <p style="background:#f0fdf4;border-radius:8px;padding:12px;font-size:13px;line-height:1.6">${tips.replace(/\n/g, "<br/>")}</p>
          </div>` : ""}
        </div>`,
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[interview-feedback]", err);
    return Response.json({ ok: true }); // soft-fail — don't surface errors to user
  }
}
