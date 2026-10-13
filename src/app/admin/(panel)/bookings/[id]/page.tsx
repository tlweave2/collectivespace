import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookingFull, paidCents } from "@/lib/bookings";
import { getSettings } from "@/lib/settings";
import { fmtDate, fmtTime, fmtDateTime, fmtShortDate, money, localDate } from "@/lib/time";
import {
  chargeFeeAction, noExtraChargesAction, chargeBalanceNowAction, cancelBookingAction, refundAction,
  saveNotesAction, rescheduleAction, adjustCreditAction,
} from "../../../actions";
import Flash from "../../../Flash";
import StatusBadge from "../../../StatusBadge";

const KIND: Record<string, string> = { deposit: "Deposit", full: "Payment", balance: "Balance", extra_fee: "Extra fee", refund: "Refund" };

export default async function BookingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; tone?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const full = await getBookingFull({ id: Number(id) });
  if (!full) notFound();
  const s = await getSettings();
  const tz = s.timezone;
  const { booking: b, customer, pkg, location, charges } = full;
  const bid = b.id;
  const ended = b.endAt <= new Date();
  const live = !["cancelled", "expired"].includes(b.status);
  const paid = paidCents(charges);
  const extras = charges.filter((c) => c.kind === "extra_fee");
  const owed = b.totalCents + extras.reduce((n, c) => n + c.amountCents, 0) - paid;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="small muted"><Link href="/admin/bookings">← Bookings</Link> · {b.code}</div>
          <h1>{customer.name}</h1>
        </div>
        <StatusBadge status={b.status} />
      </div>
      <Flash {...sp} />

      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="stack">
          <div className="card">
            <h3>{pkg.name}</h3>
            <p className="muted" style={{ marginBottom: 12 }}>{location.name}</p>
            <div className="summary-row"><span>Date</span><strong>{fmtDate(b.startAt, tz)}</strong></div>
            <div className="summary-row"><span>Time</span><span>{fmtTime(b.startAt, tz)} – {fmtTime(b.endAt, tz)}</span></div>
            {pkg.kind !== "tour" && <div className="summary-row"><span>Guests</span><span>{b.guests}</span></div>}
            {(b.addOns as { id: number; name: string; qty: number; totalCents: number }[]).map((a) => (
              <div key={a.id} className="summary-row"><span>{a.name}{a.qty > 1 ? ` × ${a.qty}` : ""}</span><span>{money(a.totalCents)}</span></div>
            ))}
            {b.creditCents > 0 && <div className="summary-row"><span>Tour credit used</span><span>−{money(b.creditCents)}</span></div>}
            <div className="summary-row total"><span>Booking total</span><span>{money(b.totalCents)}</span></div>
            {b.notes && <div className="note" style={{ marginTop: 12 }}><strong className="small">Customer notes</strong><p className="small" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{b.notes}</p></div>}
          </div>

          <div className="card">
            <h3>Customer</h3>
            <div className="summary-row"><span>Email</span><a href={`mailto:${customer.email}`}>{customer.email}</a></div>
            <div className="summary-row"><span>Phone</span><a href={`tel:${customer.phone}`}>{customer.phone || "—"}</a></div>
            <div className="summary-row"><span>Card on file</span><span>{b.paymentMethodId ? "Yes" : <span className="badge warn">No card saved</span>}</span></div>
            <form action={adjustCreditAction.bind(null, customer.id, bid)} className="row" style={{ marginTop: 10 }}>
              <span className="small">Tour credit available:</span>
              <input name="credit" defaultValue={(customer.creditCents / 100).toFixed(2)} style={{ width: 100 }} />
              <button className="btn ghost sm">Update</button>
            </form>
            <p className="small muted" style={{ margin: "10px 0 0" }}>Customer page: <a href={`/booking/${b.code}`} target="_blank">/booking/{b.code}</a></p>
          </div>

          <form action={saveNotesAction.bind(null, bid)} className="card">
            <h3>Private notes</h3>
            <textarea name="adminNotes" defaultValue={b.adminNotes} placeholder="Only visible to you" />
            <button className="btn ghost sm" style={{ marginTop: 10 }}>Save notes</button>
          </form>
        </div>

        <div className="stack">
          <div className="card">
            <h3>Payments</h3>
            {charges.length === 0 && <p className="muted small">No payments yet.</p>}
            {charges.map((c) => (
              <div key={c.id} style={{ borderBottom: "1px solid var(--line)", padding: "10px 0" }}>
                <div className="spread">
                  <div>
                    <strong>{KIND[c.kind] ?? c.kind}</strong> · {c.description}
                    <div className="small muted">{fmtDateTime(c.createdAt, tz)}{c.failureReason ? ` · ${c.failureReason}` : ""}</div>
                    {c.photoUrls && <div className="small">{c.photoUrls.split(/\s+/).filter(Boolean).map((u, i) => <a key={i} href={u} target="_blank" style={{ marginRight: 8 }}>Photo {i + 1}</a>)}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div>{c.kind === "refund" ? "−" : ""}{money(c.amountCents)}</div>
                    <span className={`badge ${c.status === "succeeded" ? "ok" : c.status === "failed" ? "bad" : "warn"}`}>{c.status === "succeeded" ? "Paid" : c.status === "failed" ? "Failed" : "Pending"}</span>
                  </div>
                </div>
                {c.status === "succeeded" && c.kind !== "refund" && c.amountCents > 0 && c.paymentIntentId !== "offline" && c.paymentIntentId !== "credit" && (
                  <details className="small" style={{ marginTop: 6 }}>
                    <summary>Refund</summary>
                    <form action={refundAction.bind(null, bid, c.id)} className="row" style={{ marginTop: 8 }}>
                      <input name="amount" defaultValue={(c.amountCents / 100).toFixed(2)} style={{ width: 100 }} />
                      <input name="reason" placeholder="Reason (emailed to customer)" style={{ flex: 1, minWidth: 160 }} />
                      <button className="btn danger sm">Refund</button>
                    </form>
                  </details>
                )}
              </div>
            ))}
            <div className="summary-row total"><span>Collected</span><span>{money(paid)}</span></div>
            {owed > 0 && live && <div className="summary-row"><span>Still owed</span><strong>{money(owed)}</strong></div>}
            {b.status === "confirmed" && b.balanceDueAt && (
              <p className="note small" style={{ marginTop: 10 }}>
                Balance of {money(b.balanceCents)} {b.paymentMethodId ? "charges automatically" : "will be requested by payment link"} on {fmtShortDate(b.balanceDueAt, tz)}.
                {b.balanceReminderSent ? " Reminder sent." : ` Reminder goes out ${s.balanceReminderDays} days before.`}
              </p>
            )}
            {(b.status === "confirmed" || b.status === "balance_failed") && b.balanceCents > 0 && (
              <form action={chargeBalanceNowAction.bind(null, bid)} style={{ marginTop: 10 }}>
                <button className="btn sm">{b.status === "balance_failed" ? "Retry balance charge" : `Charge balance now (${money(b.balanceCents)})`}</button>
              </form>
            )}
          </div>

          {live && pkg.kind !== "tour" && (
            <div className="card" id="after">
              <h3>After the event</h3>
              {b.postEventReviewed && !ended ? null : b.postEventReviewed ? (
                <p className="small muted">Reviewed. You can still add a fee below if something comes up.</p>
              ) : ended ? (
                <div className="alert warn">This event has ended. Charge any fees, or close it out with no extra charges.</div>
              ) : (
                <p className="small muted">Available any time; most useful the day after the event ({fmtShortDate(b.endAt, tz)}).</p>
              )}
              <form action={chargeFeeAction.bind(null, bid)}>
                <div className="grid2">
                  <div className="field"><label>Amount ($)</label><input name="amount" placeholder="150.00" inputMode="decimal" required /></div>
                  <div className="field"><label>Reason</label>
                    <input name="reason" list="fee-reasons" placeholder="Cleaning fee" required />
                    <datalist id="fee-reasons"><option value="Cleaning fee" /><option value="Damage" /><option value="Overtime" /><option value="Missing items" /><option value="Additional guests" /></datalist>
                  </div>
                </div>
                <div className="field"><label>Photo links (optional)</label><textarea name="photos" style={{ minHeight: 60 }} placeholder="Paste Google Photos / Dropbox links, one per line. They're included on the customer's receipt." /></div>
                <div className="row">
                  <button className="btn sm">Charge card on file</button>
                </div>
              </form>
              {!b.postEventReviewed && (
                <form action={noExtraChargesAction.bind(null, bid)} style={{ marginTop: 10 }}>
                  <button className="btn ghost sm" style={{ color: "var(--ok)", borderColor: "var(--ok)" }}>✓ No extra charges</button>
                </form>
              )}
            </div>
          )}

          {live && (
            <details className="card">
              <summary><strong>Reschedule</strong></summary>
              <form action={rescheduleAction.bind(null, bid)} style={{ marginTop: 12 }}>
                <div className="grid2">
                  <div className="field"><label>New date</label><input type="date" name="date" defaultValue={localDate(b.startAt, tz)} required /></div>
                  <div className="field"><label>Start time</label><input type="time" name="time" step={900} defaultValue={new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(b.startAt)} required /></div>
                </div>
                <label className="check field"><input type="checkbox" name="notify" defaultChecked /> Email the customer the new time</label>
                <label className="check field"><input type="checkbox" name="force" /> Override availability check</label>
                <button className="btn sm">Move booking</button>
              </form>
            </details>
          )}

          {live && (
            <details className="card">
              <summary><strong style={{ color: "var(--bad)" }}>Cancel booking</strong></summary>
              <form action={cancelBookingAction.bind(null, bid)} style={{ marginTop: 12 }}>
                <p className="small muted">Frees up the date. Refunds are separate. Use Refund on a payment above per your policy.</p>
                <label className="check field"><input type="checkbox" name="notify" defaultChecked /> Email the customer</label>
                <button className="btn danger sm">Cancel booking</button>
              </form>
            </details>
          )}
        </div>
      </div>
    </>
  );
}
