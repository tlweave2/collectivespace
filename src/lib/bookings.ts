import { and, eq, lt, lte, inArray, desc } from "drizzle-orm";
import crypto from "crypto";
import { db, schema } from "./db";
import type { Booking, Charge, Customer, Package, Location } from "./schema";
import { getSettings } from "./settings";
import { getSlots, quote } from "./availability";
import { createCheckout, chargeSavedCard, refundPayment, appUrl } from "./payments";
import { sendEmail } from "./email";
import { zonedToUtc, fmtDate, fmtTime, fmtShortDate, money } from "./time";

export const PAYABLE_KINDS = ["deposit", "full", "balance", "extra_fee"];

function newCode() {
  return "CS-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function getBookingFull(where: { id?: number; code?: string }) {
  const [b] = await db.select().from(schema.bookings)
    .where(where.id ? eq(schema.bookings.id, where.id) : eq(schema.bookings.code, where.code!));
  if (!b) return null;
  const [customer] = await db.select().from(schema.customers).where(eq(schema.customers.id, b.customerId));
  const [pkg] = await db.select().from(schema.packages).where(eq(schema.packages.id, b.packageId));
  const [location] = await db.select().from(schema.locations).where(eq(schema.locations.id, b.locationId));
  const charges = await db.select().from(schema.charges).where(eq(schema.charges.bookingId, b.id)).orderBy(schema.charges.createdAt);
  return { booking: b, customer, pkg, location, charges };
}
export type BookingFull = NonNullable<Awaited<ReturnType<typeof getBookingFull>>>;

export function paidCents(charges: Charge[]) {
  return charges.reduce((n, c) => {
    if (c.status !== "succeeded") return n;
    return c.kind === "refund" ? n - c.amountCents : n + c.amountCents;
  }, 0);
}

// ---------- Create a booking from the public form ----------
export async function createBooking(input: {
  packageId: number; date: string; time: string; guests: number; addOnIds: number[];
  name: string; email: string; phone: string; notes: string;
}): Promise<{ checkoutUrl: string; code: string }> {
  const s = await getSettings();
  const [pkg] = await db.select().from(schema.packages).where(and(eq(schema.packages.id, input.packageId), eq(schema.packages.active, true)));
  if (!pkg) throw new Error("That package is no longer available.");
  if (input.guests < 1 || input.guests > pkg.maxCapacity) throw new Error(`Guest count must be between 1 and ${pkg.maxCapacity}.`);

  const slots = await getSlots(pkg, input.date);
  if (!slots.some((sl) => sl.time === input.time)) throw new Error("Sorry, that time was just taken. Please pick another.");

  const email = input.email.trim().toLowerCase();
  let [customer] = await db.select().from(schema.customers).where(eq(schema.customers.email, email));
  if (!customer) {
    [customer] = await db.insert(schema.customers).values({ email, name: input.name.trim(), phone: input.phone.trim() }).returning();
  } else {
    [customer] = await db.update(schema.customers).set({ name: input.name.trim() || customer.name, phone: input.phone.trim() || customer.phone })
      .where(eq(schema.customers.id, customer.id)).returning();
  }

  const startAt = zonedToUtc(input.date, input.time, s.timezone);
  const endAt = new Date(startAt.getTime() + pkg.durationMinutes * 60000);
  const q = await quote(pkg, startAt, input.guests, input.addOnIds, customer.creditCents);

  const code = newCode();
  const [booking] = await db.insert(schema.bookings).values({
    code, customerId: customer.id, packageId: pkg.id, locationId: pkg.locationId,
    startAt, endAt,
    blockStart: new Date(startAt.getTime() - pkg.bufferMinutes * 60000),
    blockEnd: new Date(endAt.getTime() + pkg.bufferMinutes * 60000),
    guests: input.guests, addOns: q.addOns, subtotalCents: q.subtotalCents, creditCents: q.creditCents,
    totalCents: q.totalCents, firstPaymentCents: q.firstPaymentCents, balanceCents: q.balanceCents,
    balanceDueAt: q.balanceDueAt, notes: input.notes.trim(), status: "pending_payment",
  }).returning();

  const kind = q.balanceCents > 0 ? "deposit" : "full";
  // Fully covered by tour credit: confirm immediately.
  if (q.firstPaymentCents === 0) {
    await finalizeCharge({ chargeId: (await db.insert(schema.charges).values({ bookingId: booking.id, kind: "full", amountCents: 0, description: "Covered by credit", status: "pending" }).returning())[0].id, paymentIntentId: "credit", paymentMethodId: null });
    return { checkoutUrl: `${appUrl()}/booking/${code}`, code };
  }

  const [charge] = await db.insert(schema.charges).values({
    bookingId: booking.id, kind, amountCents: q.firstPaymentCents,
    description: kind === "deposit" ? `Deposit — ${pkg.name}` : `${pkg.name}`, status: "pending",
  }).returning();

  const checkout = await createCheckout({
    customer, bookingCode: code, chargeId: charge.id, amountCents: q.firstPaymentCents,
    description: `${charge.description} — ${fmtShortDate(startAt, s.timezone)}`,
    consentText: s.consentText, returnPath: `/booking/${code}`,
  });
  await db.update(schema.bookings).set({ checkoutSessionId: checkout.sessionId }).where(eq(schema.bookings.id, booking.id));
  return { checkoutUrl: checkout.url, code };
}

// ---------- A charge was paid (checkout success, webhook, or demo) ----------
export async function finalizeCharge(opts: { chargeId: number; paymentIntentId: string; paymentMethodId: string | null }) {
  const [charge] = await db.select().from(schema.charges).where(eq(schema.charges.id, opts.chargeId));
  if (!charge || charge.status === "succeeded") return; // idempotent
  await db.update(schema.charges).set({ status: "succeeded", paymentIntentId: opts.paymentIntentId, failureReason: null })
    .where(eq(schema.charges.id, charge.id));

  const full = (await getBookingFull({ id: charge.bookingId }))!;
  const { booking, customer, pkg } = full;
  const s = await getSettings();

  if (charge.kind === "deposit" || charge.kind === "full") {
    const status = booking.balanceCents > 0 ? "confirmed" : "paid";
    await db.update(schema.bookings).set({ status, paymentMethodId: opts.paymentMethodId ?? booking.paymentMethodId })
      .where(eq(schema.bookings.id, booking.id));
    // Use up tour credit applied to this booking; earn credit from a paid tour.
    let credit = customer.creditCents - booking.creditCents;
    if (pkg.kind === "tour" && s.tourCreditEnabled) credit += charge.amountCents;
    await db.update(schema.customers).set({ creditCents: Math.max(0, credit) }).where(eq(schema.customers.id, customer.id));
    await sendConfirmation((await getBookingFull({ id: booking.id }))!);
  } else {
    if (opts.paymentMethodId) await db.update(schema.bookings).set({ paymentMethodId: opts.paymentMethodId }).where(eq(schema.bookings.id, booking.id));
    if (charge.kind === "balance") {
      await db.update(schema.bookings).set({ status: "paid" }).where(eq(schema.bookings.id, booking.id));
    }
    await sendReceipt(full, { ...charge, status: "succeeded" });
  }
}

// ---------- Customer pays an outstanding (failed) charge via a fresh checkout ----------
export async function checkoutForCharge(chargeId: number) {
  const [charge] = await db.select().from(schema.charges).where(eq(schema.charges.id, chargeId));
  if (!charge || charge.status === "succeeded" || charge.kind === "refund") throw new Error("Nothing to pay.");
  const full = (await getBookingFull({ id: charge.bookingId }))!;
  const s = await getSettings();
  const co = await createCheckout({
    customer: full.customer, bookingCode: full.booking.code, chargeId: charge.id, amountCents: charge.amountCents,
    description: charge.description, consentText: s.consentText, returnPath: `/booking/${full.booking.code}`,
  });
  return co.url;
}

// ---------- Off-session charges ----------
export async function chargeBalance(bookingId: number) {
  const full = (await getBookingFull({ id: bookingId }))!;
  const { booking, customer, pkg } = full;
  if (booking.balanceCents <= 0 || !["confirmed", "balance_failed"].includes(booking.status)) return { ok: false, error: "No balance due" };
  let charge = full.charges.find((c) => c.kind === "balance" && c.status !== "succeeded");
  if (!charge) {
    [charge] = await db.insert(schema.charges).values({
      bookingId, kind: "balance", amountCents: booking.balanceCents, description: `Remaining balance — ${pkg.name}`, status: "pending",
    }).returning();
  }
  return runSavedCardCharge(full, charge, customer);
}

export async function chargeExtraFee(bookingId: number, amountCents: number, description: string, photoUrls: string) {
  const full = (await getBookingFull({ id: bookingId }))!;
  const [charge] = await db.insert(schema.charges).values({
    bookingId, kind: "extra_fee", amountCents, description, photoUrls, status: "pending",
  }).returning();
  await db.update(schema.bookings).set({ postEventReviewed: true }).where(eq(schema.bookings.id, bookingId));
  return runSavedCardCharge(full, charge, full.customer);
}

async function runSavedCardCharge(full: BookingFull, charge: Charge, customer: Customer) {
  const s = await getSettings();
  const res = await chargeSavedCard({
    customer, paymentMethodId: full.booking.paymentMethodId, amountCents: charge.amountCents,
    description: charge.description, bookingCode: full.booking.code, chargeId: charge.id,
  });
  if (res.ok) {
    await finalizeCharge({ chargeId: charge.id, paymentIntentId: res.paymentIntentId, paymentMethodId: null });
    return { ok: true as const };
  }
  await db.update(schema.charges).set({ status: "failed", failureReason: res.error }).where(eq(schema.charges.id, charge.id));
  if (charge.kind === "balance") await db.update(schema.bookings).set({ status: "balance_failed" }).where(eq(schema.bookings.id, full.booking.id));
  const link = `${appUrl()}/booking/${full.booking.code}`;
  await sendEmail(customer.email, `Action needed: payment for your booking ${full.booking.code}`,
    `Hi ${customer.name},\n\nWe tried to charge your card on file ${money(charge.amountCents)} for "${charge.description}", but it didn't go through (${res.error}).\n\nPlease complete the payment here:\n${link}\n\nEvent: ${full.pkg.name} at ${full.location.name}\n${fmtDate(full.booking.startAt, s.timezone)}, ${fmtTime(full.booking.startAt, s.timezone)}\n\nThank you,\n${s.businessName}`);
  await sendEmail(s.adminEmail, `Payment FAILED: ${full.booking.code} (${customer.name})`,
    `A ${money(charge.amountCents)} charge for "${charge.description}" failed: ${res.error}\n\nThe customer was emailed a payment link.\n${appUrl()}/admin/bookings/${full.booking.id}`);
  return { ok: false as const, error: res.error };
}

export async function refundCharge(chargeId: number, amountCents: number, reason: string) {
  const [charge] = await db.select().from(schema.charges).where(eq(schema.charges.id, chargeId));
  if (!charge || charge.status !== "succeeded" || !charge.paymentIntentId) return { ok: false, error: "Charge not refundable" };
  const res = await refundPayment(charge.paymentIntentId, amountCents);
  if (!res.ok) return res;
  await db.insert(schema.charges).values({
    bookingId: charge.bookingId, kind: "refund", amountCents, description: reason || `Refund of ${charge.description}`,
    status: "succeeded", paymentIntentId: charge.paymentIntentId,
  });
  const full = (await getBookingFull({ id: charge.bookingId }))!;
  const s = await getSettings();
  await sendEmail(full.customer.email, `Refund issued — ${full.booking.code}`,
    `Hi ${full.customer.name},\n\nWe've refunded ${money(amountCents)} to your card${reason ? ` (${reason})` : ""}. It can take 5–10 business days to appear.\n\n${s.businessName}`);
  return { ok: true };
}

export async function cancelBooking(bookingId: number, notify: boolean) {
  const full = (await getBookingFull({ id: bookingId }))!;
  await db.update(schema.bookings).set({ status: "cancelled" }).where(eq(schema.bookings.id, bookingId));
  if (notify) {
    const s = await getSettings();
    await sendEmail(full.customer.email, `Booking cancelled — ${full.booking.code}`,
      `Hi ${full.customer.name},\n\nYour booking for ${full.pkg.name} on ${fmtDate(full.booking.startAt, s.timezone)} has been cancelled.\n\nIf you have questions, just reply to this email.\n\n${s.businessName}`);
  }
}

// ---------- Emails ----------
function summary(full: BookingFull, tz: string) {
  const b = full.booking;
  const lines = [
    `${full.pkg.name} — ${full.location.name}`,
    `${full.location.address}`,
    `${fmtDate(b.startAt, tz)}, ${fmtTime(b.startAt, tz)} – ${fmtTime(b.endAt, tz)}`,
    full.pkg.kind === "tour" ? "" : `Guests: ${b.guests}`,
    ...(b.addOns as { name: string; totalCents: number }[]).map((a) => `Add-on: ${a.name} (${money(a.totalCents)})`),
    `Total: ${money(b.totalCents)}${b.creditCents ? ` (after ${money(b.creditCents)} credit)` : ""}`,
  ];
  return lines.filter(Boolean).join("\n");
}

async function sendConfirmation(full: BookingFull) {
  const s = await getSettings();
  const b = full.booking;
  const pay = b.balanceCents > 0
    ? `Paid today: ${money(b.firstPaymentCents)}\nRemaining balance: ${money(b.balanceCents)}, charged automatically to your card on file on ${fmtShortDate(b.balanceDueAt!, s.timezone)}. We'll remind you ${s.balanceReminderDays} days before.`
    : `Paid in full: ${money(b.totalCents)}`;
  const policies = full.pkg.kind === "tour" ? "" : `\n\nCancellation policy:\n${s.cancellationPolicy}\n\nAfter your event:\n${s.damagePolicy}`;
  const credit = full.pkg.kind === "tour" && s.tourCreditEnabled ? `\n\nYour ${money(b.totalCents)} tour fee will be credited toward your rental when you book with this email address.` : "";
  await sendEmail(full.customer.email, `You're booked! ${full.pkg.name} — ${fmtShortDate(b.startAt, s.timezone)}`,
    `Hi ${full.customer.name},\n\n${s.confirmationIntro}\n\n${summary(full, s.timezone)}\n\n${pay}${credit}${policies}\n\nView your booking anytime:\n${appUrl()}/booking/${b.code}\n\n${s.businessName}`);
  await sendEmail(s.adminEmail, `New booking: ${full.pkg.name} — ${fmtShortDate(b.startAt, s.timezone)} (${full.customer.name})`,
    `${summary(full, s.timezone)}\n\nCustomer: ${full.customer.name} · ${full.customer.email} · ${full.customer.phone}\nNotes: ${b.notes || "—"}\n\n${appUrl()}/admin/bookings/${b.id}`);
}

async function sendReceipt(full: BookingFull, charge: Charge) {
  const s = await getSettings();
  const photos = charge.photoUrls ? `\n\nPhotos:\n${charge.photoUrls}` : "";
  await sendEmail(full.customer.email, `Receipt: ${money(charge.amountCents)} — ${full.booking.code}`,
    `Hi ${full.customer.name},\n\nWe charged ${money(charge.amountCents)} to your card on file.\n\nItem: ${charge.description}\nBooking: ${full.pkg.name}, ${fmtDate(full.booking.startAt, s.timezone)}${photos}\n\nView your booking:\n${appUrl()}/booking/${full.booking.code}\n\n${s.businessName}`);
}

// ---------- Automations (run hourly by the scheduler, or from Admin → "Run now") ----------
export async function runAutomations() {
  const s = await getSettings();
  const now = new Date();
  const log: string[] = [];

  // 1. Release calendar holds for checkouts that were never completed.
  const holdCutoff = new Date(now.getTime() - (s.pendingHoldMinutes + 5) * 60000);
  const expired = await db.update(schema.bookings).set({ status: "expired" })
    .where(and(eq(schema.bookings.status, "pending_payment"), lt(schema.bookings.createdAt, holdCutoff))).returning();
  if (expired.length) log.push(`Released ${expired.length} unpaid hold(s).`);

  // 2. Balance reminders.
  const remindBefore = new Date(now.getTime() + s.balanceReminderDays * 86400000);
  const toRemind = await db.select().from(schema.bookings).where(and(
    eq(schema.bookings.status, "confirmed"), eq(schema.bookings.balanceReminderSent, false), lte(schema.bookings.balanceDueAt, remindBefore),
  ));
  for (const b of toRemind) {
    const full = (await getBookingFull({ id: b.id }))!;
    if (b.balanceDueAt! > now) {
      await sendEmail(full.customer.email, `Upcoming payment: ${money(b.balanceCents)} on ${fmtShortDate(b.balanceDueAt!, s.timezone)}`,
        `Hi ${full.customer.name},\n\n${s.reminderIntro}\n\nYour remaining balance of ${money(b.balanceCents)} for ${full.pkg.name} on ${fmtDate(b.startAt, s.timezone)} will be charged to your card on file on ${fmtShortDate(b.balanceDueAt!, s.timezone)}.\n\nIf your card has changed, you can pay now with a different card here:\n${appUrl()}/booking/${b.code}\n\n${s.businessName}`);
      log.push(`Sent balance reminder for ${b.code}.`);
    }
    await db.update(schema.bookings).set({ balanceReminderSent: true }).where(eq(schema.bookings.id, b.id));
  }

  // 3. Charge balances that are due.
  const due = await db.select().from(schema.bookings).where(and(eq(schema.bookings.status, "confirmed"), lte(schema.bookings.balanceDueAt, now)));
  for (const b of due) {
    const r = await chargeBalance(b.id);
    log.push(r.ok ? `Charged balance for ${b.code}.` : `Balance FAILED for ${b.code}: ${r.error}`);
  }

  // 4. Events that have ended: mark completed and ask the owner to review for extra fees.
  const reviewAt = new Date(now.getTime() - s.postEventReminderHours * 3600000);
  const ended = await db.select().from(schema.bookings).where(and(
    inArray(schema.bookings.status, ["paid", "confirmed", "balance_failed"]), lte(schema.bookings.endAt, now),
  ));
  for (const b of ended) {
    if (b.status === "paid") await db.update(schema.bookings).set({ status: "completed" }).where(eq(schema.bookings.id, b.id));
  }
  const needReview = await db.select().from(schema.bookings).where(and(
    inArray(schema.bookings.status, ["completed", "paid", "balance_failed"]), lte(schema.bookings.endAt, reviewAt),
    eq(schema.bookings.postEventNotified, false), eq(schema.bookings.postEventReviewed, false),
  ));
  for (const b of needReview) {
    const full = (await getBookingFull({ id: b.id }))!;
    if (full.pkg.kind !== "tour") {
      await sendEmail(s.adminEmail, `Review needed: ${full.pkg.name} — ${full.customer.name}`,
        `The event on ${fmtDate(b.startAt, s.timezone)} has ended. Charge any cleaning, damage or overtime fees, or mark it "No extra charges":\n${appUrl()}/admin/bookings/${b.id}`);
      log.push(`Asked for post-event review of ${b.code}.`);
    } else {
      await db.update(schema.bookings).set({ postEventReviewed: true }).where(eq(schema.bookings.id, b.id));
    }
    await db.update(schema.bookings).set({ postEventNotified: true }).where(eq(schema.bookings.id, b.id));
  }
  return log;
}

export async function recentBookings(limit = 50) {
  return db.select().from(schema.bookings).orderBy(desc(schema.bookings.createdAt)).limit(limit);
}

export type { Booking, Package, Location };
