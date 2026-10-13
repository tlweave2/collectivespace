import { and, eq, gt, lt, inArray, or, isNull, lte, gte } from "drizzle-orm";
import { db, schema } from "./db";
import type { Package } from "./schema";
import { getSettings } from "./settings";
import { zonedToUtc, weekdayOf, fmtTime } from "./time";

// Statuses that hold the calendar. pending_payment holds only for a short window (see expirePendingHolds).
export const BLOCKING_STATUSES = ["pending_payment", "confirmed", "balance_failed", "paid", "completed"];

export type Slot = { time: string; label: string; startIso: string };

export async function isBlackedOut(locationId: number, dateStr: string) {
  const rows = await db.select().from(schema.blackouts).where(
    and(
      or(isNull(schema.blackouts.locationId), eq(schema.blackouts.locationId, locationId)),
      lte(schema.blackouts.startDate, dateStr),
      gte(schema.blackouts.endDate, dateStr),
    ),
  );
  return rows.length > 0;
}

/** Open start times for a package on a date, honoring hours, blackouts, notice, buffers and existing bookings. */
export async function getSlots(pkg: Package, dateStr: string, excludeBookingId?: number): Promise<Slot[]> {
  const s = await getSettings();
  const tz = s.timezone;
  const weekday = weekdayOf(dateStr);
  const [hours] = await db.select().from(schema.locationHours).where(
    and(eq(schema.locationHours.locationId, pkg.locationId), eq(schema.locationHours.weekday, weekday)),
  );
  if (!hours || hours.closed) return [];
  if (await isBlackedOut(pkg.locationId, dateStr)) return [];

  const open = zonedToUtc(dateStr, hours.openTime, tz).getTime();
  let close = zonedToUtc(dateStr, hours.closeTime, tz).getTime();
  if (close <= open) close += 24 * 3600 * 1000; // closes after midnight

  const dur = pkg.durationMinutes * 60000;
  const buf = pkg.bufferMinutes * 60000;
  const earliest = Date.now() + pkg.minNoticeHours * 3600 * 1000;

  const existing = await db.select().from(schema.bookings).where(
    and(
      eq(schema.bookings.locationId, pkg.locationId),
      inArray(schema.bookings.status, BLOCKING_STATUSES),
      lt(schema.bookings.blockStart, new Date(close + buf)),
      gt(schema.bookings.blockEnd, new Date(open - buf)),
    ),
  );
  // Unpaid checkouts only hold the time for a short window, even before the daily cleanup runs.
  const holdCutoff = Date.now() - s.pendingHoldMinutes * 60000;
  const busy = existing.filter((b) => b.id !== excludeBookingId && !(b.status === "pending_payment" && b.createdAt.getTime() < holdCutoff));

  const slots: Slot[] = [];
  const step = Math.max(5, pkg.slotIntervalMinutes) * 60000;
  for (let t = open; t + dur <= close; t += step) {
    if (t < earliest) continue;
    const bs = t - buf, be = t + dur + buf;
    const clash = busy.some((b) => b.blockStart.getTime() < be && b.blockEnd.getTime() > bs);
    if (clash) continue;
    const at = new Date(t);
    const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
    slots.push({ time: hhmm, label: `${fmtTime(at, tz)} – ${fmtTime(new Date(t + dur), tz)}`, startIso: at.toISOString() });
  }
  return slots;
}

export type Quote = {
  basePriceCents: number;
  extraGuestFeeCents: number;
  addOns: { id: number; name: string; qty: number; priceCents: number; totalCents: number }[];
  subtotalCents: number;
  creditCents: number;
  totalCents: number;
  firstPaymentCents: number;
  balanceCents: number;
  balanceDueAt: Date | null;
  payInFullReason: string | null;
};

/** Price a booking. Deposit + balance, or pay-in-full when the package requires it or the event is too close. */
export async function quote(pkg: Package, startAt: Date, guests: number, addOnIds: number[], availableCreditCents = 0): Promise<Quote> {
  const s = await getSettings();
  const extra = guests > pkg.baseCapacity ? pkg.extraGuestFeeCents : 0;
  const allAddOns = addOnIds.length
    ? await db.select().from(schema.addOns).where(and(inArray(schema.addOns.id, addOnIds), eq(schema.addOns.active, true)))
    : [];
  const addOns = allAddOns
    .filter((a) => a.appliesTo === "all" || a.appliesTo === pkg.kind)
    .map((a) => {
      const qty = a.priceType === "per_guest" ? guests : 1;
      return { id: a.id, name: a.name, qty, priceCents: a.priceCents, totalCents: a.priceCents * qty };
    });
  const subtotal = pkg.priceCents + extra + addOns.reduce((n, a) => n + a.totalCents, 0);
  const credit = pkg.kind === "tour" || !s.tourCreditEnabled ? 0 : Math.min(availableCreditCents, subtotal);
  const total = subtotal - credit;

  const balanceDueAt = new Date(startAt.getTime() - s.balanceDaysBefore * 86400000);
  let payInFullReason: string | null = null;
  let first = total;
  if (pkg.paymentMode === "full") payInFullReason = "package";
  else if (balanceDueAt.getTime() <= Date.now()) payInFullReason = "soon";
  else {
    first = pkg.depositType === "percent" ? Math.round((total * pkg.depositValue) / 100) : Math.min(pkg.depositValue, total);
  }
  const balance = total - first;
  return {
    basePriceCents: pkg.priceCents, extraGuestFeeCents: extra, addOns, subtotalCents: subtotal, creditCents: credit,
    totalCents: total, firstPaymentCents: first, balanceCents: balance,
    balanceDueAt: balance > 0 ? balanceDueAt : null, payInFullReason,
  };
}
