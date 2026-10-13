// End-to-end check of the payment automations using demo payments.
// Run against a throwaway database: PGLITE_DIR=./.data/test npx tsx scripts/test/automation.ts
import { eq } from "drizzle-orm";
import { db, schema } from "../../src/lib/db";
import { createBooking, finalizeCharge, runAutomations, chargeExtraFee, getBookingFull } from "../../src/lib/bookings";

const fail = (m: string) => { console.error("FAIL:", m); process.exit(1); };

async function book(email: string, date: string, time: string, pkgId = 7) {
  const r = await createBooking({ packageId: pkgId, date, time, guests: 40, addOnIds: [], name: email.split("@")[0], email, phone: "2095550100", notes: "" });
  const full = (await getBookingFull({ code: r.code }))!;
  await finalizeCharge({ chargeId: full.charges[0].id, paymentIntentId: "demo_pi", paymentMethodId: "demo_pm" });
  return (await getBookingFull({ code: r.code }))!;
}

async function main() {
  // Tour -> credit -> rental uses the credit
  const tour = await createBooking({ packageId: 9, date: "2026-12-01", time: "10:00", guests: 1, addOnIds: [], name: "Ana", email: "ana@example.com", phone: "2095550100", notes: "" });
  const tf = (await getBookingFull({ code: tour.code }))!;
  await finalizeCharge({ chargeId: tf.charges[0].id, paymentIntentId: "demo_pi", paymentMethodId: "demo_pm" });
  const [ana] = await db.select().from(schema.customers).where(eq(schema.customers.email, "ana@example.com"));
  if (ana.creditCents !== 2000) fail("tour credit not added");
  const anaRental = await book("ana@example.com", "2026-12-20", "10:00");
  if (anaRental.booking.creditCents !== 2000 || anaRental.booking.totalCents !== 123000) fail("credit not applied: " + anaRental.booking.totalCents);
  const [ana2] = await db.select().from(schema.customers).where(eq(schema.customers.email, "ana@example.com"));
  if (ana2.creditCents !== 0) fail("credit not consumed");
  console.log("✓ tour fee credited and used on rental ($1,230 after $20 credit)");

  // Balance: one card works, one is declined
  const good = await book("good@example.com", "2026-12-05", "10:00");
  const bad = await book("decline@example.com", "2026-12-06", "10:00");
  if (good.booking.status !== "confirmed" || good.booking.balanceCents !== 62500) fail("deposit split wrong");
  const past = new Date(Date.now() - 60000);
  for (const b of [good, bad]) await db.update(schema.bookings).set({ balanceDueAt: past }).where(eq(schema.bookings.id, b.booking.id));
  console.log("automations:", await runAutomations());
  const g = (await getBookingFull({ id: good.booking.id }))!, x = (await getBookingFull({ id: bad.booking.id }))!;
  if (g.booking.status !== "paid") fail("balance not charged: " + g.booking.status);
  if (x.booking.status !== "balance_failed") fail("decline not flagged: " + x.booking.status);
  console.log("✓ balance charged automatically; declined card flagged and emailed a pay link");

  // Customer pays the failed balance through the link
  const failedCharge = x.charges.find((c) => c.status === "failed")!;
  await finalizeCharge({ chargeId: failedCharge.id, paymentIntentId: "demo_pi2", paymentMethodId: "demo_pm2" });
  if ((await getBookingFull({ id: bad.booking.id }))!.booking.status !== "paid") fail("pay link did not settle balance");
  console.log("✓ failed balance settled through payment link");

  // Event ends -> review reminder -> extra fee
  await db.update(schema.bookings).set({ startAt: new Date(Date.now() - 30 * 3600000), endAt: new Date(Date.now() - 22 * 3600000) }).where(eq(schema.bookings.id, good.booking.id));
  console.log("automations:", await runAutomations());
  const gr = (await getBookingFull({ id: good.booking.id }))!;
  if (gr.booking.status !== "completed" || !gr.booking.postEventNotified) fail("post-event review not triggered: " + gr.booking.status);
  const fee = await chargeExtraFee(good.booking.id, 15000, "Cleaning fee", "https://photos.example.com/1");
  if (!fee.ok) fail("extra fee failed");
  if (!(await getBookingFull({ id: good.booking.id }))!.booking.postEventReviewed) fail("not marked reviewed");
  console.log("✓ post-event review requested; $150 cleaning fee charged to saved card");

  const emails = await db.select().from(schema.emailLog);
  console.log(`✓ ${emails.length} emails logged, latest:`);
  for (const e of emails.slice(-8)) console.log("   -", e.to, "|", e.subject);
  console.log("\nALL CHECKS PASSED");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
