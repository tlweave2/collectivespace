import {
  pgTable, serial, text, integer, boolean, timestamp, jsonb, date, customType,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

// A bookable place: the studio, the Riverbank venue, the Modesto venue, or any room you add later.
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  galleryUrls: text("gallery_urls").notNull().default(""), // one image URL per line
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

// Opening hours per weekday (0 = Sunday). One row per location per weekday.
export const locationHours = pgTable("location_hours", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  weekday: integer("weekday").notNull(),
  openTime: text("open_time").notNull().default("09:00"),
  closeTime: text("close_time").notNull().default("22:00"),
  closed: boolean("closed").notNull().default(false),
});

// Something a customer can book: a rental package, a studio session, or a tour.
export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("rental"), // rental | studio | tour
  description: text("description").notNull().default(""),
  inclusions: text("inclusions").notNull().default(""), // one per line
  imageUrl: text("image_url").notNull().default(""),
  durationMinutes: integer("duration_minutes").notNull().default(480),
  priceCents: integer("price_cents").notNull().default(0),
  baseCapacity: integer("base_capacity").notNull().default(50),
  maxCapacity: integer("max_capacity").notNull().default(100),
  extraGuestFeeCents: integer("extra_guest_fee_cents").notNull().default(0), // flat fee when guests > base
  paymentMode: text("payment_mode").notNull().default("deposit"), // deposit | full
  depositType: text("deposit_type").notNull().default("percent"), // percent | flat
  depositValue: integer("deposit_value").notNull().default(50), // percent or cents
  bufferMinutes: integer("buffer_minutes").notNull().default(60),
  slotIntervalMinutes: integer("slot_interval_minutes").notNull().default(60),
  minNoticeHours: integer("min_notice_hours").notNull().default(48),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const addOns = pgTable("add_ons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  priceCents: integer("price_cents").notNull().default(0),
  priceType: text("price_type").notNull().default("flat"), // flat | per_guest
  appliesTo: text("applies_to").notNull().default("rental"), // rental | studio | all
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const blackouts = pgTable("blackouts", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id"), // null = every location
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason").notNull().default(""),
});

// Single-row-per-key business settings, all editable from the admin.
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  stripeCustomerId: text("stripe_customer_id"),
  creditCents: integer("credit_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  packageId: integer("package_id").notNull().references(() => packages.id),
  locationId: integer("location_id").notNull().references(() => locations.id),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  blockStart: timestamp("block_start", { withTimezone: true }).notNull(),
  blockEnd: timestamp("block_end", { withTimezone: true }).notNull(),
  guests: integer("guests").notNull().default(1),
  addOns: jsonb("add_ons").notNull().default([]), // [{id,name,qty,priceCents,totalCents}]
  subtotalCents: integer("subtotal_cents").notNull(),
  creditCents: integer("credit_cents").notNull().default(0),
  totalCents: integer("total_cents").notNull(),
  firstPaymentCents: integer("first_payment_cents").notNull(),
  balanceCents: integer("balance_cents").notNull().default(0),
  balanceDueAt: timestamp("balance_due_at", { withTimezone: true }),
  // pending_payment | confirmed | balance_failed | paid | completed | cancelled | expired
  status: text("status").notNull().default("pending_payment"),
  paymentMethodId: text("payment_method_id"),
  checkoutSessionId: text("checkout_session_id"),
  notes: text("notes").notNull().default(""),
  adminNotes: text("admin_notes").notNull().default(""),
  balanceReminderSent: boolean("balance_reminder_sent").notNull().default(false),
  postEventReviewed: boolean("post_event_reviewed").notNull().default(false),
  postEventNotified: boolean("post_event_notified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const charges = pgTable("charges", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // deposit | full | balance | extra_fee | refund
  amountCents: integer("amount_cents").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | succeeded | failed
  failureReason: text("failure_reason"),
  paymentIntentId: text("payment_intent_id"),
  photoUrls: text("photo_urls").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailLog = pgTable("email_log", {
  id: serial("id").primaryKey(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("logged"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Website pages built from stacked sections. The page with slug "home" is the homepage.
export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  seoDescription: text("seo_description").notNull().default(""),
  sections: jsonb("sections").notNull().default([]),
  published: boolean("published").notNull().default(true),
  showInMenu: boolean("show_in_menu").notNull().default(false),
  menuOrder: integer("menu_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Photos uploaded through the admin, stored in the database and served from /media/<id>.
export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  width: integer("width").notNull().default(0),
  height: integer("height").notNull().default(0),
  size: integer("size").notNull().default(0),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Page = typeof pages.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type Package = typeof packages.$inferSelect;
export type AddOn = typeof addOns.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Charge = typeof charges.$inferSelect;
