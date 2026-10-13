import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import BookingForm from "./BookingForm";

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [pkg] = await db.select().from(schema.packages).where(and(eq(schema.packages.slug, slug), eq(schema.packages.active, true)));
  if (!pkg) notFound();
  const [loc] = await db.select().from(schema.locations).where(eq(schema.locations.id, pkg.locationId));
  const addOns = await db.select().from(schema.addOns)
    .where(and(eq(schema.addOns.active, true), inArray(schema.addOns.appliesTo, ["all", pkg.kind]))).orderBy(asc(schema.addOns.sort));
  const s = await getSettings();
  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      <div className="eyebrow">{loc.name}</div>
      <h1>{pkg.name}</h1>
      <p className="muted" style={{ maxWidth: 640 }}>{pkg.description}</p>
      <BookingForm
        pkg={{ id: pkg.id, name: pkg.name, kind: pkg.kind, priceCents: pkg.priceCents, durationMinutes: pkg.durationMinutes,
          baseCapacity: pkg.baseCapacity, maxCapacity: pkg.maxCapacity, extraGuestFeeCents: pkg.extraGuestFeeCents,
          paymentMode: pkg.paymentMode, depositType: pkg.depositType, depositValue: pkg.depositValue }}
        addOns={addOns.map((a) => ({ id: a.id, name: a.name, description: a.description, priceCents: a.priceCents, priceType: a.priceType }))}
        policies={{ cancellation: s.cancellationPolicy, damage: s.damagePolicy, consent: s.consentText, balanceDaysBefore: s.balanceDaysBefore }}
        locationName={loc.name}
      />
    </div>
  );
}
