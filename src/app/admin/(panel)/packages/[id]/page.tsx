import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Package } from "@/lib/schema";
import { savePackage } from "../../../actions";
import Flash from "../../../Flash";
import { ImageInput } from "../../../ImagePicker";

const d = (c: number) => (c / 100).toFixed(2);

export default async function EditPackage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; tone?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const locs = await db.select().from(schema.locations).orderBy(asc(schema.locations.sort));
  let p: Partial<Package> = { kind: "rental", durationMinutes: 480, priceCents: 0, baseCapacity: 50, maxCapacity: 100, extraGuestFeeCents: 0,
    paymentMode: "deposit", depositType: "percent", depositValue: 50, bufferMinutes: 60, slotIntervalMinutes: 60, minNoticeHours: 48, sort: 10, active: true, locationId: locs[0]?.id };
  if (id !== "new") {
    const [row] = await db.select().from(schema.packages).where(eq(schema.packages.id, Number(id)));
    if (!row) notFound();
    p = row;
  }
  return (
    <>
      <div className="page-head"><h1>{id === "new" ? "New package" : p.name}</h1></div>
      <Flash {...sp} />
      <form action={savePackage} className="card" style={{ maxWidth: 820 }}>
        {p.id && <input type="hidden" name="id" value={p.id} />}
        <div className="grid3">
          <div className="field" style={{ gridColumn: "span 2" }}><label>Name</label><input name="name" defaultValue={p.name} required /></div>
          <div className="field"><label>Type</label>
            <select name="kind" defaultValue={p.kind}><option value="rental">Event rental</option><option value="studio">Studio session</option><option value="tour">Tour / consultation</option></select></div>
        </div>
        <div className="field"><label>Location</label><select name="locationId" defaultValue={p.locationId}>{locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        <div className="field"><label>Photo</label><ImageInput name="imageUrl" defaultValue={p.imageUrl} /></div>
        <div className="field"><label>Description</label><textarea name="description" defaultValue={p.description} /></div>
        <div className="field"><label>What&apos;s included</label><textarea name="inclusions" defaultValue={p.inclusions} style={{ minHeight: 140 }} /><div className="hint">One item per line.</div></div>

        <h3 style={{ marginTop: 10 }}>Price &amp; length</h3>
        <div className="grid3">
          <div className="field"><label>Price ($)</label><input name="price" defaultValue={d(p.priceCents!)} inputMode="decimal" /></div>
          <div className="field"><label>Length (hours)</label><input name="durationHours" defaultValue={p.durationMinutes! / 60} inputMode="decimal" /></div>
          <div className="field"><label>Start times every (minutes)</label><input name="slotIntervalMinutes" type="number" defaultValue={p.slotIntervalMinutes} /></div>
        </div>
        <h3>Guests</h3>
        <div className="grid3">
          <div className="field"><label>Included guests</label><input name="baseCapacity" type="number" defaultValue={p.baseCapacity} /></div>
          <div className="field"><label>Maximum guests</label><input name="maxCapacity" type="number" defaultValue={p.maxCapacity} /></div>
          <div className="field"><label>Fee above included ($)</label><input name="extraGuestFee" defaultValue={d(p.extraGuestFeeCents!)} inputMode="decimal" /><div className="hint">One flat fee when guests exceed the included number.</div></div>
        </div>
        <h3>Payment</h3>
        <div className="grid3">
          <div className="field"><label>At booking</label><select name="paymentMode" defaultValue={p.paymentMode}><option value="deposit">Deposit now, balance later</option><option value="full">Pay in full</option></select></div>
          <div className="field"><label>Deposit type</label><select name="depositType" defaultValue={p.depositType}><option value="percent">Percent of total</option><option value="flat">Flat amount ($)</option></select></div>
          <div className="field"><label>Deposit amount</label><input name="depositValue" defaultValue={p.depositType === "flat" ? d(p.depositValue!) : p.depositValue} inputMode="decimal" /><div className="hint">e.g. 50 for 50%, or 500.00 for $500</div></div>
        </div>
        <h3>Scheduling rules</h3>
        <div className="grid3">
          <div className="field"><label>Cleanup buffer (minutes)</label><input name="bufferMinutes" type="number" defaultValue={p.bufferMinutes} /><div className="hint">Kept free before and after each booking.</div></div>
          <div className="field"><label>Minimum notice (hours)</label><input name="minNoticeHours" type="number" defaultValue={p.minNoticeHours} /></div>
          <div className="field"><label>Display order</label><input name="sort" type="number" defaultValue={p.sort} /></div>
        </div>
        <label className="check field"><input type="checkbox" name="active" defaultChecked={p.active} /> Show on website and allow booking</label>
        <button className="btn">Save package</button>
      </form>
    </>
  );
}
