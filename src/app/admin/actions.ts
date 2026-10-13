"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { db, schema } from "@/lib/db";
import { ADMIN_COOKIE, adminToken, passwordMatches, requireAdmin } from "@/lib/auth";
import { getSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { getSlots } from "@/lib/availability";
import { zonedToUtc, fmtDate, fmtTime, money } from "@/lib/time";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/payments";
import {
  runAutomations, chargeBalance, chargeExtraFee, cancelBooking, refundCharge, getBookingFull,
} from "@/lib/bookings";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(str(f, k)) || 0;
const cents = (f: FormData, k: string) => Math.round(parseFloat(str(f, k).replace(/[$,]/g, "")) * 100) || 0;
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
const back = (path: string, msg: string, tone = "ok"): never => redirect(`${path}?msg=${encodeURIComponent(msg)}&tone=${tone}`);

// ---------- Auth ----------
export async function login(form: FormData) {
  if (!passwordMatches(str(form, "password"))) redirect("/admin/login?error=1");
  (await cookies()).set(ADMIN_COOKIE, adminToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect("/admin");
}
export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

// ---------- Automations ----------
export async function runAutomationsNow() {
  await requireAdmin();
  const log = await runAutomations();
  back("/admin", log.length ? log.join(" ") : "Everything is up to date. Nothing needed doing.");
}

// ---------- Booking actions ----------
export async function chargeFeeAction(bookingId: number, form: FormData) {
  await requireAdmin();
  const amount = cents(form, "amount");
  const reason = str(form, "reason");
  if (amount <= 0 || !reason) back(`/admin/bookings/${bookingId}`, "Enter an amount and a reason.", "bad");
  const r = await chargeExtraFee(bookingId, amount, reason, str(form, "photos"));
  revalidatePath(`/admin/bookings/${bookingId}`);
  back(`/admin/bookings/${bookingId}`, r.ok ? `Charged ${money(amount)}. Receipt emailed to the customer.` : `Charge failed: ${r.error}. Customer was emailed a payment link.`, r.ok ? "ok" : "bad");
}

export async function noExtraChargesAction(bookingId: number) {
  await requireAdmin();
  const [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId));
  await db.update(schema.bookings).set({ postEventReviewed: true, status: b.status === "paid" ? "completed" : b.status }).where(eq(schema.bookings.id, bookingId));
  back(`/admin/bookings/${bookingId}`, "Marked as reviewed with no extra charges.");
}

export async function chargeBalanceNowAction(bookingId: number) {
  await requireAdmin();
  const r = await chargeBalance(bookingId);
  back(`/admin/bookings/${bookingId}`, r.ok ? "Balance charged." : `Balance charge failed: ${r.error}`, r.ok ? "ok" : "bad");
}

export async function cancelBookingAction(bookingId: number, form: FormData) {
  await requireAdmin();
  await cancelBooking(bookingId, bool(form, "notify"));
  back(`/admin/bookings/${bookingId}`, "Booking cancelled. Use Refund on a payment below if money should go back.");
}

export async function refundAction(bookingId: number, chargeId: number, form: FormData) {
  await requireAdmin();
  const amount = cents(form, "amount");
  if (amount <= 0) back(`/admin/bookings/${bookingId}`, "Enter a refund amount.", "bad");
  const r = await refundCharge(chargeId, amount, str(form, "reason"));
  back(`/admin/bookings/${bookingId}`, r.ok ? `Refunded ${money(amount)}.` : `Refund failed: ${r.error}`, r.ok ? "ok" : "bad");
}

export async function saveNotesAction(bookingId: number, form: FormData) {
  await requireAdmin();
  await db.update(schema.bookings).set({ adminNotes: str(form, "adminNotes") }).where(eq(schema.bookings.id, bookingId));
  back(`/admin/bookings/${bookingId}`, "Notes saved.");
}

export async function rescheduleAction(bookingId: number, form: FormData) {
  await requireAdmin();
  const full = (await getBookingFull({ id: bookingId }))!;
  const date = str(form, "date"), time = str(form, "time");
  const force = bool(form, "force");
  if (!force) {
    const slots = await getSlots({ ...full.pkg, minNoticeHours: 0 }, date, bookingId);
    if (!slots.some((s) => s.time === time)) back(`/admin/bookings/${bookingId}`, "That date/time isn't open. Check the calendar or tick 'override'.", "bad");
  }
  const s = await getSettings();
  const startAt = zonedToUtc(date, time, s.timezone);
  const endAt = new Date(startAt.getTime() + full.pkg.durationMinutes * 60000);
  const buf = full.pkg.bufferMinutes * 60000;
  const balancePaid = full.charges.some((c) => c.kind === "balance" && c.status === "succeeded");
  await db.update(schema.bookings).set({
    startAt, endAt, blockStart: new Date(startAt.getTime() - buf), blockEnd: new Date(endAt.getTime() + buf),
    ...(full.booking.balanceCents > 0 && !balancePaid ? { balanceDueAt: new Date(startAt.getTime() - s.balanceDaysBefore * 86400000), balanceReminderSent: false } : {}),
  }).where(eq(schema.bookings.id, bookingId));
  if (bool(form, "notify")) {
    await sendEmail(full.customer.email, `Your booking has been moved — ${full.booking.code}`,
      `Hi ${full.customer.name},\n\nYour ${full.pkg.name} booking is now on ${fmtDate(startAt, s.timezone)}, ${fmtTime(startAt, s.timezone)} – ${fmtTime(endAt, s.timezone)}.\n\nDetails: ${appUrl()}/booking/${full.booking.code}\n\n${s.businessName}`);
  }
  back(`/admin/bookings/${bookingId}`, "Booking rescheduled.");
}

/** For phone bookings and moving existing Acuity bookings over. No card is saved, so any balance is collected by payment link. */
export async function createManualBooking(form: FormData) {
  await requireAdmin();
  const s = await getSettings();
  const [pkg] = await db.select().from(schema.packages).where(eq(schema.packages.id, num(form, "packageId")));
  const date = str(form, "date"), time = str(form, "time");
  if (!pkg || !date || !time) back("/admin/bookings/new", "Choose a package, date and time.", "bad");
  if (!bool(form, "force")) {
    const slots = await getSlots({ ...pkg, minNoticeHours: 0 }, date);
    if (!slots.some((x) => x.time === time)) back("/admin/bookings/new", "That time conflicts with another booking or is outside hours. Tick 'override' to save anyway.", "bad");
  }
  const email = str(form, "email").toLowerCase();
  let [customer] = await db.select().from(schema.customers).where(eq(schema.customers.email, email));
  if (!customer) [customer] = await db.insert(schema.customers).values({ email, name: str(form, "name"), phone: str(form, "phone") }).returning();
  const startAt = zonedToUtc(date, time, s.timezone);
  const endAt = new Date(startAt.getTime() + pkg.durationMinutes * 60000);
  const total = str(form, "total") ? cents(form, "total") : pkg.priceCents;
  const paid = Math.min(total, cents(form, "paid"));
  const balance = total - paid;
  const code = "CS-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const [b] = await db.insert(schema.bookings).values({
    code, customerId: customer.id, packageId: pkg.id, locationId: pkg.locationId, startAt, endAt,
    blockStart: new Date(startAt.getTime() - pkg.bufferMinutes * 60000), blockEnd: new Date(endAt.getTime() + pkg.bufferMinutes * 60000),
    guests: num(form, "guests") || 1, addOns: [], subtotalCents: total, creditCents: 0, totalCents: total,
    firstPaymentCents: paid, balanceCents: balance,
    balanceDueAt: balance > 0 ? new Date(Math.max(Date.now(), startAt.getTime() - s.balanceDaysBefore * 86400000)) : null,
    status: balance > 0 ? "confirmed" : "paid", notes: str(form, "notes"), adminNotes: "Added manually by admin",
  }).returning();
  if (paid > 0) await db.insert(schema.charges).values({ bookingId: b.id, kind: balance > 0 ? "deposit" : "full", amountCents: paid, description: "Paid outside the website", status: "succeeded", paymentIntentId: "offline" });
  back(`/admin/bookings/${b.id}`, "Booking added.");
}

// ---------- Packages ----------
export async function savePackage(form: FormData) {
  await requireAdmin();
  const id = num(form, "id");
  const name = str(form, "name");
  const depositType = str(form, "depositType") || "percent";
  const values = {
    locationId: num(form, "locationId"), name, kind: str(form, "kind") || "rental",
    description: str(form, "description"), inclusions: str(form, "inclusions"), imageUrl: str(form, "imageUrl"),
    durationMinutes: Math.round(parseFloat(str(form, "durationHours")) * 60) || 60, priceCents: cents(form, "price"),
    baseCapacity: num(form, "baseCapacity") || 1, maxCapacity: Math.max(num(form, "maxCapacity"), num(form, "baseCapacity")) || 1,
    extraGuestFeeCents: cents(form, "extraGuestFee"), paymentMode: str(form, "paymentMode") || "deposit", depositType,
    depositValue: depositType === "percent" ? Math.min(100, num(form, "depositValue")) : cents(form, "depositValue"),
    bufferMinutes: num(form, "bufferMinutes"), slotIntervalMinutes: num(form, "slotIntervalMinutes") || 60,
    minNoticeHours: num(form, "minNoticeHours"), sort: num(form, "sort"), active: bool(form, "active"),
  };
  if (!name || !values.locationId) back(id ? `/admin/packages/${id}` : "/admin/packages/new", "Name and location are required.", "bad");
  if (id) await db.update(schema.packages).set(values).where(eq(schema.packages.id, id));
  else {
    let slug = slugify(name);
    const clash = await db.select().from(schema.packages).where(eq(schema.packages.slug, slug));
    if (clash.length) slug += "-" + crypto.randomBytes(2).toString("hex");
    await db.insert(schema.packages).values({ ...values, slug });
  }
  revalidatePath("/", "layout");
  back("/admin/packages", `Saved "${name}".`);
}

// ---------- Locations ----------
export async function saveLocation(form: FormData) {
  await requireAdmin();
  const id = num(form, "id");
  const values = { name: str(form, "name"), address: str(form, "address"), description: str(form, "description"),
    imageUrl: str(form, "imageUrl"), galleryUrls: str(form, "galleryUrls"), sort: num(form, "sort"), active: bool(form, "active") };
  let locId = id;
  if (id) await db.update(schema.locations).set(values).where(eq(schema.locations.id, id));
  else {
    let slug = slugify(values.name);
    if ((await db.select().from(schema.locations).where(eq(schema.locations.slug, slug))).length) slug += "-" + crypto.randomBytes(2).toString("hex");
    [{ id: locId }] = await db.insert(schema.locations).values({ ...values, slug }).returning();
  }
  for (let d = 0; d < 7; d++) {
    const h = { openTime: str(form, `open${d}`) || "09:00", closeTime: str(form, `close${d}`) || "22:00", closed: bool(form, `closed${d}`) };
    const [row] = await db.select().from(schema.locationHours).where(and(eq(schema.locationHours.locationId, locId), eq(schema.locationHours.weekday, d)));
    if (row) await db.update(schema.locationHours).set(h).where(eq(schema.locationHours.id, row.id));
    else await db.insert(schema.locationHours).values({ ...h, locationId: locId, weekday: d });
  }
  revalidatePath("/", "layout");
  back("/admin/locations", `Saved "${values.name}".`);
}

// ---------- Add-ons ----------
export async function saveAddOn(form: FormData) {
  await requireAdmin();
  const id = num(form, "id");
  const values = { name: str(form, "name"), description: str(form, "description"), priceCents: cents(form, "price"),
    priceType: str(form, "priceType") || "flat", appliesTo: str(form, "appliesTo") || "rental", sort: num(form, "sort"), active: bool(form, "active") };
  if (!values.name) back("/admin/add-ons", "Name is required.", "bad");
  if (id) await db.update(schema.addOns).set(values).where(eq(schema.addOns.id, id));
  else await db.insert(schema.addOns).values(values);
  back("/admin/add-ons", `Saved "${values.name}".`);
}

// ---------- Blackout dates ----------
export async function addBlackout(form: FormData) {
  await requireAdmin();
  const start = str(form, "startDate"), end = str(form, "endDate") || start;
  if (!start) back("/admin/blackouts", "Pick a start date.", "bad");
  await db.insert(schema.blackouts).values({ locationId: num(form, "locationId") || null, startDate: start, endDate: end < start ? start : end, reason: str(form, "reason") });
  back("/admin/blackouts", "Dates blocked.");
}
export async function deleteBlackout(id: number) {
  await requireAdmin();
  await db.delete(schema.blackouts).where(eq(schema.blackouts.id, id));
  back("/admin/blackouts", "Dates reopened.");
}

// ---------- Settings ----------
export async function saveSettingsAction(form: FormData) {
  await requireAdmin();
  const out: Record<string, unknown> = {};
  for (const [k, def] of Object.entries(DEFAULT_SETTINGS)) {
    // Checkboxes come with a hidden "off" input so unticking is saved; fields not on this form are left alone.
    if (!form.has(k)) continue;
    if (typeof def === "number") out[k] = num(form, k);
    else if (typeof def === "boolean") out[k] = form.getAll(k).includes("on");
    else out[k] = str(form, k);
  }
  await saveSettings(out);
  revalidatePath("/", "layout");
  const to = str(form, "_return") || "/admin/settings";
  back(to, "Saved.");
}

export async function adjustCreditAction(customerId: number, bookingId: number, form: FormData) {
  await requireAdmin();
  await db.update(schema.customers).set({ creditCents: Math.max(0, cents(form, "credit")) }).where(eq(schema.customers.id, customerId));
  back(`/admin/bookings/${bookingId}`, "Customer credit updated.");
}

// ---------- Website pages ----------
const RESERVED = ["admin", "api", "book", "booking", "locations", "media", "demo-checkout", "home"];

export async function savePage(id: number, data: {
  title: string; slug: string; seoDescription: string; published: boolean; showInMenu: boolean; menuOrder: number; sections: unknown[];
}): Promise<{ ok: boolean; error?: string; slug?: string }> {
  await requireAdmin();
  const [current] = await db.select().from(schema.pages).where(eq(schema.pages.id, id));
  if (!current) return { ok: false, error: "Page not found" };
  let slug = current.slug === "home" ? "home" : slugify(data.slug || data.title);
  if (slug !== current.slug) {
    if (RESERVED.includes(slug)) return { ok: false, error: `"${slug}" is reserved. Pick another page address.` };
    const clash = await db.select().from(schema.pages).where(eq(schema.pages.slug, slug));
    if (clash.length) return { ok: false, error: `Another page already uses /${slug}.` };
  }
  if (!data.title.trim()) return { ok: false, error: "Give the page a title." };
  await db.update(schema.pages).set({
    title: data.title.trim(), slug, seoDescription: data.seoDescription.trim(),
    published: current.slug === "home" ? true : data.published, showInMenu: data.showInMenu, menuOrder: Math.round(data.menuOrder) || 0,
    sections: data.sections, updatedAt: new Date(),
  }).where(eq(schema.pages.id, id));
  revalidatePath("/", "layout");
  return { ok: true, slug };
}

export async function createPage(form: FormData) {
  await requireAdmin();
  const title = str(form, "title") || "New page";
  let slug = slugify(title);
  if (RESERVED.includes(slug) || (await db.select().from(schema.pages).where(eq(schema.pages.slug, slug))).length) slug += "-" + crypto.randomBytes(2).toString("hex");
  const [p] = await db.insert(schema.pages).values({
    title, slug, published: false,
    sections: [{ id: crypto.randomBytes(4).toString("hex"), type: "hero", heading: title, text: "", height: "short", darken: "40", align: "left", background: "" }],
  }).returning();
  redirect(`/admin/pages/${p.id}`);
}

export async function duplicatePage(id: number) {
  await requireAdmin();
  const [p] = await db.select().from(schema.pages).where(eq(schema.pages.id, id));
  const slug = `${p.slug === "home" ? "home-copy" : p.slug + "-copy"}-${crypto.randomBytes(2).toString("hex")}`;
  const [n] = await db.insert(schema.pages).values({ title: `${p.title} (copy)`, slug, seoDescription: p.seoDescription, sections: p.sections, published: false }).returning();
  redirect(`/admin/pages/${n.id}`);
}

export async function deletePage(id: number) {
  await requireAdmin();
  const [p] = await db.select().from(schema.pages).where(eq(schema.pages.id, id));
  if (p?.slug === "home") back("/admin/pages", "The homepage can't be deleted, but you can change everything on it.", "bad");
  await db.delete(schema.pages).where(eq(schema.pages.id, id));
  revalidatePath("/", "layout");
  back("/admin/pages", "Page deleted.");
}
