import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { finalizeCharge } from "@/lib/bookings";
import { stripeEnabled, appUrl, demoAllowed } from "@/lib/payments";

// Only active in demo mode (no Stripe key). Simulates a successful card payment.
export async function POST(req: Request) {
  if (stripeEnabled() || !demoAllowed()) return NextResponse.json({ error: "Demo checkout is disabled" }, { status: 404 });
  const form = await req.formData();
  const chargeId = Number(form.get("charge"));
  const [charge] = await db.select().from(schema.charges).where(eq(schema.charges.id, chargeId));
  if (!charge) return NextResponse.json({ error: "Unknown charge" }, { status: 404 });
  await finalizeCharge({ chargeId, paymentIntentId: `demo_pi_${chargeId}_${Date.now()}`, paymentMethodId: `demo_pm_${charge.bookingId}` });
  const [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, charge.bookingId));
  return NextResponse.redirect(`${appUrl()}/booking/${b.code}?paid=1`, 303);
}
