import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";

export default async function Emails() {
  const s = await getSettings();
  const rows = await db.select().from(schema.emailLog).orderBy(desc(schema.emailLog.createdAt)).limit(200);
  return (
    <>
      <div className="page-head"><h1>Sent emails</h1></div>
      {!process.env.RESEND_API_KEY && <div className="alert warn">Email sending isn&apos;t connected yet, so these are logged here only. Add a Resend key to send them for real.</div>}
      <div className="stack">
        {rows.length === 0 && <p className="muted">No emails yet.</p>}
        {rows.map((e) => (
          <details key={e.id} className="card">
            <summary className="spread"><span><strong>{e.subject}</strong><br /><span className="small muted">To {e.to} · {fmtDateTime(e.createdAt, s.timezone)}</span></span><span className={`badge ${e.status === "sent" ? "ok" : e.status.startsWith("failed") ? "bad" : ""}`}>{e.status}</span></summary>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: ".9rem", marginTop: 12 }}>{e.body}</pre>
          </details>
        ))}
      </div>
    </>
  );
}
