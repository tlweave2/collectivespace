import { db, schema } from "./db";

// Every business rule lives here with a sensible default; the admin Settings page edits them.
export const DEFAULT_SETTINGS = {
  businessName: "The Collective Space",
  tagline: "Photography studio & event venues in Riverbank and Modesto, California",
  adminEmail: "hello@collectivespaceevents.com",
  phone: "",
  instagram: "https://www.instagram.com/collectivespacestudios/",
  timezone: "America/Los_Angeles",
  balanceDaysBefore: 14,
  balanceReminderDays: 3,
  postEventReminderHours: 12,
  pendingHoldMinutes: 30,
  maxAdvanceDays: 540,
  tourCreditEnabled: true,
  cancellationPolicy:
    "Deposits are non-refundable. Cancellations made more than 14 days before the event receive a refund of any balance paid. Cancellations within 14 days are not refundable. Date changes are subject to availability.",
  damagePolicy:
    "Renters are responsible for leaving the space as they found it. Additional fees may be charged after your event for excess cleaning, damage, missing items, or time over your booking.",
  consentText:
    "I authorize The Collective Space to save my card and charge it for the remaining balance before my event and for any additional fees (cleaning, damage, overtime) after my event, per the policies above.",
  // Website design
  logoUrl: "",
  colorInk: "#1c1a17",
  colorPaper: "#faf7f2",
  colorAccent: "#8a6a4a",
  colorSand: "#efe7da",
  headingFont: "Cormorant Garamond",
  bodyFont: "Jost",
  headingUppercase: false,
  buttonShape: "pill",
  bookButtonText: "Book Now",
  bookButtonLink: "/#book",
  showLocationsInMenu: true,
  footerText: "",
  confirmationIntro:"Thank you for booking with us! We can't wait to host you.",
  reminderIntro: "Just a heads-up about your upcoming payment.",
};
export type Settings = typeof DEFAULT_SETTINGS;

export async function getSettings(): Promise<Settings> {
  const rows = await db.select().from(schema.settings);
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) out[r.key] = r.value;
  return out as Settings;
}

export async function saveSettings(values: Partial<Settings>) {
  for (const [key, value] of Object.entries(values)) {
    await db
      .insert(schema.settings)
      .values({ key, value: value as never })
      .onConflictDoUpdate({ target: schema.settings.key, set: { value: value as never } });
  }
}
