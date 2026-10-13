import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { money } from "@/lib/time";
import { createManualBooking } from "../../../actions";
import Flash from "../../../Flash";

export default async function NewBooking({ searchParams }: { searchParams: Promise<{ msg?: string; tone?: string }> }) {
  const sp = await searchParams;
  const locs = await db.select().from(schema.locations).orderBy(asc(schema.locations.sort));
  const pkgs = await db.select().from(schema.packages).where(eq(schema.packages.active, true)).orderBy(asc(schema.packages.sort));
  return (
    <>
      <div className="page-head"><h1>Add a booking</h1></div>
      <Flash {...sp} />
      <p className="muted" style={{ maxWidth: 680 }}>For phone or in-person bookings, and for moving existing Acuity bookings over. No card is saved, so if there&apos;s a balance the customer gets a payment link when it&apos;s due.</p>
      <form action={createManualBooking} className="card" style={{ maxWidth: 720 }}>
        <div className="field"><label>Package</label>
          <select name="packageId" required>
            {locs.map((l) => (
              <optgroup key={l.id} label={l.name}>
                {pkgs.filter((p) => p.locationId === l.id).map((p) => <option key={p.id} value={p.id}>{p.name} — {money(p.priceCents)}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="grid3">
          <div className="field"><label>Date</label><input type="date" name="date" required /></div>
          <div className="field"><label>Start time</label><input type="time" name="time" step={900} required /></div>
          <div className="field"><label>Guests</label><input type="number" name="guests" defaultValue={1} min={1} /></div>
        </div>
        <div className="grid3">
          <div className="field"><label>Customer name</label><input name="name" required /></div>
          <div className="field"><label>Email</label><input type="email" name="email" required /></div>
          <div className="field"><label>Phone</label><input name="phone" /></div>
        </div>
        <div className="grid2">
          <div className="field"><label>Total price ($)</label><input name="total" placeholder="Leave blank for package price" inputMode="decimal" /></div>
          <div className="field"><label>Already paid ($)</label><input name="paid" defaultValue="0" inputMode="decimal" /><div className="hint">Deposit or full amount collected elsewhere (Acuity, cash, Venmo…)</div></div>
        </div>
        <div className="field"><label>Notes</label><textarea name="notes" /></div>
        <label className="check field"><input type="checkbox" name="force" /> Override availability check (e.g. importing an existing booking)</label>
        <button className="btn">Add booking</button>
      </form>
    </>
  );
}
