import Link from "next/link";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { listBookings, type BookingRow } from "@/lib/adminQueries";
import { getSettings } from "@/lib/settings";
import { fmtShortDate, fmtTime, money, localDate, zonedToUtc } from "@/lib/time";
import { runAutomationsNow } from "../actions";
import Flash from "../Flash";
import StatusBadge from "../StatusBadge";

const LIVE = ["confirmed", "paid", "balance_failed", "completed"];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ msg?: string; tone?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const tz = s.timezone;
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);

  const upcoming = await listBookings({ from: now, to: in30, statuses: ["confirmed", "paid", "balance_failed"] });
  const failed = await listBookings({ statuses: ["balance_failed"] });
  const failedExtra = await db.select().from(schema.charges).where(and(eq(schema.charges.status, "failed"), eq(schema.charges.kind, "extra_fee")));
  const failedExtraRows = failedExtra.length ? (await listBookings({})).filter((r) => failedExtra.some((c) => c.bookingId === r.b.id)) : [];
  const ended = await listBookings({ to: now, statuses: LIVE, order: "desc", limit: 200 });
  const toReview = ended.filter((r) => r.b.endAt <= now && !r.b.postEventReviewed && r.packageKind !== "tour");

  const monthStart = zonedToUtc(localDate(now, tz).slice(0, 8) + "01", "00:00", tz);
  const monthCharges = await db.select().from(schema.charges).where(and(gte(schema.charges.createdAt, monthStart), eq(schema.charges.status, "succeeded")));
  const collected = monthCharges.reduce((n, c) => n + (c.kind === "refund" ? -c.amountCents : c.amountCents), 0);
  const scheduled = await db.select().from(schema.bookings).where(inArray(schema.bookings.status, ["confirmed"]));
  const scheduledSoon = scheduled.filter((b) => b.balanceDueAt && b.balanceDueAt <= in30).reduce((n, b) => n + b.balanceCents, 0);

  const Row = ({ r, extra }: { r: BookingRow; extra?: React.ReactNode }) => (
    <tr>
      <td><Link href={`/admin/bookings/${r.b.id}`}>{r.customerName}</Link><div className="small muted">{r.b.code}</div></td>
      <td>{r.packageName}<div className="small muted">{r.locationName}</div></td>
      <td>{fmtShortDate(r.b.startAt, tz)}<div className="small muted">{fmtTime(r.b.startAt, tz)} – {fmtTime(r.b.endAt, tz)}</div></td>
      <td>{extra ?? <StatusBadge status={r.b.status} />}</td>
    </tr>
  );

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
        <form action={runAutomationsNow}><button className="btn ghost sm" title="These run automatically every hour">Run reminders &amp; charges now</button></form>
      </div>
      <Flash {...sp} />
      <div className="stats">
        <div className="stat"><div className="small muted">Next 30 days</div><div className="n">{upcoming.length}</div><div className="small muted">bookings</div></div>
        <div className="stat"><div className="small muted">Collected this month</div><div className="n">{money(collected)}</div></div>
        <div className="stat"><div className="small muted">Balances charging in 30 days</div><div className="n">{money(scheduledSoon)}</div></div>
        <div className="stat"><div className="small muted">Needs attention</div><div className="n" style={{ color: failed.length + toReview.length + failedExtraRows.length ? "var(--bad)" : undefined }}>{failed.length + toReview.length + failedExtraRows.length}</div></div>
      </div>

      {(failed.length > 0 || failedExtraRows.length > 0) && (
        <div className="stack" style={{ marginBottom: 28 }}>
          <h3>Payments that failed</h3>
          <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Package</th><th>Date</th><th>Status</th></tr></thead><tbody>
            {failed.map((r) => <Row key={r.b.id} r={r} extra={<span className="badge bad">Balance {money(r.b.balanceCents)} failed</span>} />)}
            {failedExtraRows.map((r) => <Row key={"x" + r.b.id} r={r} extra={<span className="badge bad">Extra fee failed</span>} />)}
          </tbody></table></div>
          <p className="small muted">Customers were emailed a payment link automatically. Open a booking to retry or follow up.</p>
        </div>
      )}

      {toReview.length > 0 && (
        <div className="stack" style={{ marginBottom: 28 }}>
          <h3>After the event: charge fees or close out</h3>
          <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Package</th><th>Event</th><th></th></tr></thead><tbody>
            {toReview.map((r) => <Row key={r.b.id} r={r} extra={<Link className="btn sm" href={`/admin/bookings/${r.b.id}#after`}>Review</Link>} />)}
          </tbody></table></div>
        </div>
      )}

      <div className="stack">
        <h3>Coming up (30 days)</h3>
        {upcoming.length === 0 ? <p className="muted">No bookings in the next 30 days.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Package</th><th>Date</th><th>Status</th></tr></thead><tbody>
            {upcoming.map((r) => <Row key={r.b.id} r={r} />)}
          </tbody></table></div>
        )}
      </div>
    </>
  );
}
