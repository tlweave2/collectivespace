import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { listBookings } from "@/lib/adminQueries";
import { getSettings } from "@/lib/settings";
import { fmtTime, localDate, zonedToUtc } from "@/lib/time";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default async function Calendar({ searchParams }: { searchParams: Promise<{ m?: string; loc?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const tz = s.timezone;
  const [y, m] = (sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : localDate(new Date(), tz).slice(0, 7)).split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const first = new Date(Date.UTC(y, m - 1, 1));
  const startOffset = first.getUTCDay();
  const gridStart = new Date(Date.UTC(y, m - 1, 1 - startOffset));
  const cells = Array.from({ length: 42 }, (_, i) => new Date(gridStart.getTime() + i * 86400000).toISOString().slice(0, 10));
  const locs = await db.select().from(schema.locations).orderBy(asc(schema.locations.sort));
  const rows = await listBookings({
    from: zonedToUtc(cells[0], "00:00", tz), to: zonedToUtc(cells[41], "23:59", tz),
    statuses: ["confirmed", "paid", "balance_failed", "completed", "pending_payment"], locationId: Number(sp.loc) || undefined,
  });
  const blackouts = await db.select().from(schema.blackouts);
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}`;
  const locClass = (sort: number) => `l${((sort - 1) % 3) + 1}`;
  const today = localDate(new Date(), tz);
  return (
    <>
      <div className="page-head">
        <h1>{MONTHS[m - 1]} {y}</h1>
        <div className="row">
          <Link className="btn ghost sm" href={`?m=${prev}&loc=${sp.loc || ""}`}>‹ Prev</Link>
          <Link className="btn ghost sm" href={`?loc=${sp.loc || ""}`}>Today</Link>
          <Link className="btn ghost sm" href={`?m=${next}&loc=${sp.loc || ""}`}>Next ›</Link>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <Link href={`?m=${y}-${pad(m)}`} className={`badge ${!sp.loc ? "ok" : ""}`}>All locations</Link>
        {locs.map((l) => <Link key={l.id} href={`?m=${y}-${pad(m)}&loc=${l.id}`} className={`badge ${String(l.id) === sp.loc ? "ok" : ""}`}>{l.name}</Link>)}
      </div>
      <div className="adm-cal">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="dow">{d}</div>)}
        {cells.map((d) => {
          const inMonth = d.slice(0, 7) === `${y}-${pad(m)}`;
          const day = rows.filter((r) => localDate(r.b.startAt, tz) === d);
          const blocked = blackouts.filter((b) => b.startDate <= d && b.endDate >= d && (!sp.loc || !b.locationId || String(b.locationId) === sp.loc));
          return (
            <div key={d} className={`cell ${inMonth ? "" : "out"}`} style={d === today ? { background: "#fffaf0" } : undefined}>
              <div className="d">{Number(d.slice(8))}</div>
              {blocked.map((b) => <span key={b.id} className="ev" style={{ background: "#eee", color: "#777" }}>Blocked{b.reason ? `: ${b.reason}` : ""}</span>)}
              {day.map((r) => (
                <Link key={r.b.id} href={`/admin/bookings/${r.b.id}`} className={`ev ${locClass(r.locationSort)} ${r.b.status === "balance_failed" ? "bad" : ""}`} title={`${r.customerName} · ${r.packageName} · ${r.locationName}`}>
                  {fmtTime(r.b.startAt, tz)} {r.customerName.split(" ")[0]} · {r.packageName.replace(" Rental", "").replace(" Studio Booking", "")}
                </Link>
              ))}
            </div>
          );
        })}
      </div>
      <div className="row small muted" style={{ marginTop: 12 }}>
        {locs.map((l) => <span key={l.id} className="row" style={{ gap: 6 }}><span className={`ev ${locClass(l.sort)}`} style={{ width: 14, height: 14, display: "inline-block", borderRadius: 3, background: ["#e3ecf6", "#f6e6e3", "#e7f1e4"][(l.sort - 1) % 3] }} />{l.name}</span>)}
      </div>
    </>
  );
}
