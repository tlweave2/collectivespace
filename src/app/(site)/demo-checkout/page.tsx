import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { stripeEnabled, demoAllowed } from "@/lib/payments";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/time";

export const dynamic = "force-dynamic";

// Stand-in for Stripe Checkout while in demo mode.
export default async function DemoCheckout({ searchParams }: { searchParams: Promise<{ charge?: string }> }) {
  if (stripeEnabled() || !demoAllowed()) notFound();
  const { charge: id } = await searchParams;
  const [charge] = await db.select().from(schema.charges).where(eq(schema.charges.id, Number(id)));
  if (!charge) notFound();
  const [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, charge.bookingId));
  const s = await getSettings();
  return (
    <div className="wrap" style={{ maxWidth: 460, paddingTop: 48 }}>
      <div className="card stack">
        <div>
          <div className="eyebrow">Demo checkout · nothing is charged</div>
          <h2 style={{ marginBottom: 4 }}>{money(charge.amountCents)}</h2>
          <p className="muted small" style={{ margin: 0 }}>{charge.description} · {b.code}</p>
        </div>
        <form action="/api/demo-pay" method="post" className="stack">
          <input type="hidden" name="charge" value={charge.id} />
          <div className="field"><label>Card number</label><input defaultValue="4242 4242 4242 4242" readOnly /></div>
          <div className="grid2"><div className="field"><label>Expiry</label><input defaultValue="12 / 30" readOnly /></div><div className="field"><label>CVC</label><input defaultValue="123" readOnly /></div></div>
          <p className="note small">{s.consentText}</p>
          <button className="btn block">Pay {money(charge.amountCents)}</button>
        </form>
        <a href={`/booking/${b.code}?cancelled=1`} className="small muted" style={{ textAlign: "center" }}>Cancel and go back</a>
      </div>
    </div>
  );
}
