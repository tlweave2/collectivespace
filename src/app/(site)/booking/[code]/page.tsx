import { notFound } from "next/navigation";
import Link from "next/link";
import { getBookingFull, finalizeCharge, paidCents } from "@/lib/bookings";
import { readCheckout } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { fmtDate, fmtTime, fmtShortDate, money } from "@/lib/time";

export const dynamic = "force-dynamic";

const STATUS: Record<string, [string, string]> = {
  pending_payment: ["Awaiting payment", "warn"], confirmed: ["Confirmed", "ok"], paid: ["Paid in full", "ok"],
  balance_failed: ["Payment needed", "bad"], completed: ["Completed", "ok"], cancelled: ["Cancelled", "bad"], expired: ["Expired", "bad"],
};

export default async function BookingStatus({ params, searchParams }: {
  params: Promise<{ code: string }>; searchParams: Promise<{ session_id?: string; cancelled?: string; paid?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  if (sp.session_id) {
    const paid = await readCheckout(sp.session_id).catch(() => null);
    if (paid) await finalizeCharge(paid);
  }
  const full = await getBookingFull({ code });
  if (!full) notFound();
  const s = await getSettings();
  const { booking: b, pkg, location, customer, charges } = full;
  const tz = s.timezone;
  const outstanding = charges.filter((c) => c.kind !== "refund" && c.status !== "succeeded" && (c.status === "failed" || b.status === "pending_payment"));
  const [label, tone] = STATUS[b.status] ?? [b.status, ""];
  const justPaid = sp.paid || sp.session_id;

  return (
    <div className="wrap narrow" style={{ paddingTop: 40 }}>
      {justPaid && b.status !== "pending_payment" && <div className="alert ok">Payment received. A confirmation email is on its way to {customer.email}.</div>}
      {sp.cancelled && b.status === "pending_payment" && <div className="alert warn">Checkout was cancelled. Your time is held for a few more minutes; complete payment below to lock it in.</div>}
      {b.status === "expired" && <div className="alert bad">This booking expired because payment wasn&apos;t completed. <Link href={`/book/${pkg.slug}`}>Start a new booking</Link>.</div>}
      <div className="spread"><div className="eyebrow">Booking {b.code}</div><span className={`badge ${tone}`}>{label}</span></div>
      <h1>{pkg.name}</h1>
      <p className="muted">{location.name} · {location.address}</p>
      <div className="card stack">
        <div>
          <h3>{fmtDate(b.startAt, tz)}</h3>
          <p className="muted" style={{ margin: 0 }}>{fmtTime(b.startAt, tz)} – {fmtTime(b.endAt, tz)}{pkg.kind !== "tour" && ` · ${b.guests} guests`}</p>
        </div>
        {outstanding.length > 0 && b.status !== "expired" && b.status !== "cancelled" && (
          <div className="alert bad" style={{ margin: 0 }}>
            {outstanding.map((c) => (
              <form key={c.id} action={`/api/pay/${c.id}`} method="post" className="spread" style={{ marginBottom: 6 }}>
                <span><strong>{money(c.amountCents)}</strong> due — {c.description}{c.failureReason ? ` (${c.failureReason})` : ""}</span>
                <button className="btn sm danger">Pay now</button>
              </form>
            ))}
          </div>
        )}
        <div>
          <div className="summary-row"><span>{pkg.name}</span><span>{money(pkg.priceCents)}</span></div>
          {b.subtotalCents - pkg.priceCents - (b.addOns as { totalCents: number }[]).reduce((n, a) => n + a.totalCents, 0) > 0 && (
            <div className="summary-row"><span>Extra guests</span><span>{money(b.subtotalCents - pkg.priceCents - (b.addOns as { totalCents: number }[]).reduce((n, a) => n + a.totalCents, 0))}</span></div>
          )}
          {(b.addOns as { id: number; name: string; qty: number; totalCents: number }[]).map((a) => (
            <div key={a.id} className="summary-row"><span>{a.name}{a.qty > 1 ? ` × ${a.qty}` : ""}</span><span>{money(a.totalCents)}</span></div>
          ))}
          {b.creditCents > 0 && <div className="summary-row"><span>Tour credit</span><span>−{money(b.creditCents)}</span></div>}
          <div className="summary-row total"><span>Booking total</span><span>{money(b.totalCents)}</span></div>
        </div>
        <div>
          <h3 style={{ fontSize: "1.2rem" }}>Payments</h3>
          {charges.filter((c) => c.status === "succeeded").map((c) => (
            <div key={c.id} className="summary-row"><span>{fmtShortDate(c.createdAt, tz)} · {c.description}</span><span>{c.kind === "refund" ? "−" : ""}{money(c.amountCents)}</span></div>
          ))}
          <div className="summary-row total"><span>Paid so far</span><span>{money(paidCents(charges))}</span></div>
          {b.status === "confirmed" && b.balanceCents > 0 && b.balanceDueAt && (
            <p className="note small" style={{ marginTop: 12 }}>Your remaining balance of {money(b.balanceCents)} will be charged automatically to your saved card on {fmtShortDate(b.balanceDueAt, tz)}.</p>
          )}
        </div>
        {pkg.kind !== "tour" && (
          <details className="small"><summary>Policies</summary><p style={{ marginTop: 8 }}>{s.cancellationPolicy}</p><p>{s.damagePolicy}</p></details>
        )}
      </div>
      <p className="small muted" style={{ marginTop: 16 }}>Questions? Email <a href={`mailto:${s.adminEmail}`}>{s.adminEmail}</a> and include your booking code {b.code}.</p>
    </div>
  );
}
