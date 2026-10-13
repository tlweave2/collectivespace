import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { listBookings } from "@/lib/adminQueries";
import { getSettings } from "@/lib/settings";
import { fmtShortDate, fmtTime, money } from "@/lib/time";
import StatusBadge from "../../StatusBadge";

export default async function Bookings({ searchParams }: { searchParams: Promise<{ when?: string; loc?: string; status?: string; q?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const when = sp.when || "upcoming";
  const now = new Date();
  const locs = await db.select().from(schema.locations).orderBy(asc(schema.locations.sort));
  let rows = await listBookings({
    from: when === "upcoming" ? now : undefined, to: when === "past" ? now : undefined,
    locationId: Number(sp.loc) || undefined,
    statuses: sp.status ? [sp.status] : ["confirmed", "paid", "balance_failed", "completed", "pending_payment"],
    order: when === "past" ? "desc" : "asc", limit: 500,
  });
  if (sp.q) {
    const q = sp.q.toLowerCase();
    rows = rows.filter((r) => [r.customerName, r.customerEmail, r.b.code].some((x) => x.toLowerCase().includes(q)));
  }
  return (
    <>
      <div className="page-head"><h1>Bookings</h1><Link href="/admin/bookings/new" className="btn sm">+ Add booking</Link></div>
      <form className="row" style={{ marginBottom: 18 }}>
        <select name="when" defaultValue={when} style={{ width: "auto" }}><option value="upcoming">Upcoming</option><option value="past">Past</option><option value="all">All dates</option></select>
        <select name="loc" defaultValue={sp.loc || ""} style={{ width: "auto" }}><option value="">All locations</option>{locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <select name="status" defaultValue={sp.status || ""} style={{ width: "auto" }}>
          <option value="">Active</option><option value="confirmed">Deposit paid</option><option value="paid">Paid in full</option><option value="balance_failed">Payment failed</option>
          <option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="expired">Expired (never paid)</option>
        </select>
        <input name="q" defaultValue={sp.q || ""} placeholder="Name, email or code" style={{ width: 220 }} />
        <button className="btn ghost sm">Filter</button>
      </form>
      <div className="table-wrap"><table>
        <thead><tr><th>Date</th><th>Customer</th><th>Package</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="muted">No bookings match.</td></tr>}
          {rows.map((r) => (
            <tr key={r.b.id}>
              <td>{fmtShortDate(r.b.startAt, s.timezone)}<div className="small muted">{fmtTime(r.b.startAt, s.timezone)}</div></td>
              <td><Link href={`/admin/bookings/${r.b.id}`}>{r.customerName}</Link><div className="small muted">{r.b.code}</div></td>
              <td>{r.packageName}<div className="small muted">{r.locationName}</div></td>
              <td>{money(r.b.totalCents)}</td>
              <td><StatusBadge status={r.b.status} /></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
