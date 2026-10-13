import { db, schema } from "./db";

// Sends through Resend when RESEND_API_KEY is set. Every email is also logged and visible in Admin → Emails.
export async function sendEmail(to: string, subject: string, text: string) {
  let status = "logged";
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text, html: toHtml(text) }),
      });
      status = res.ok ? "sent" : `failed (${res.status})`;
    } catch (e) {
      status = `failed (${(e as Error).message})`;
    }
  }
  await db.insert(schema.emailLog).values({ to, subject, body: text, status });
}

function toHtml(text: string) {
  const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const linked = esc.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>');
  return `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.6;color:#222;max-width:560px">${linked.replace(/\n/g, "<br>")}</div>`;
}
