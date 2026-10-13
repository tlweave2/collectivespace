import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Location } from "@/lib/schema";
import { saveLocation } from "../../../actions";
import { ImageInput, ImagesInput } from "../../../ImagePicker";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function EditLocation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let l: Partial<Location> = { active: true, sort: 10 };
  let hours: { weekday: number; openTime: string; closeTime: string; closed: boolean }[] = [];
  if (id !== "new") {
    const [row] = await db.select().from(schema.locations).where(eq(schema.locations.id, Number(id)));
    if (!row) notFound();
    l = row;
    hours = await db.select().from(schema.locationHours).where(eq(schema.locationHours.locationId, row.id)).orderBy(asc(schema.locationHours.weekday));
  }
  return (
    <>
      <div className="page-head"><h1>{id === "new" ? "New location" : l.name}</h1></div>
      <form action={saveLocation} className="card" style={{ maxWidth: 760 }}>
        {l.id && <input type="hidden" name="id" value={l.id} />}
        <div className="grid2">
          <div className="field"><label>Name</label><input name="name" defaultValue={l.name} required /></div>
          <div className="field"><label>Address</label><input name="address" defaultValue={l.address} /></div>
        </div>
        <div className="field"><label>Description</label><textarea name="description" defaultValue={l.description} /></div>
        <div className="field"><label>Main photo</label><ImageInput name="imageUrl" defaultValue={l.imageUrl} /></div>
        <div className="field"><label>Gallery</label><ImagesInput name="galleryUrls" defaultValue={l.galleryUrls} /><div className="hint">Shown on this location&apos;s page. Use ‹ › to reorder.</div></div>
        <div className="field" style={{ maxWidth: 200 }}><label>Display order</label><input name="sort" type="number" defaultValue={l.sort} /></div>
        <h3>Bookable hours</h3>
        <p className="small muted">Bookings must start and end inside these hours.</p>
        {DAYS.map((name, d) => {
          const h = hours.find((x) => x.weekday === d) ?? { openTime: "09:00", closeTime: "22:00", closed: false };
          return (
            <div key={d} className="row" style={{ marginBottom: 8 }}>
              <span style={{ width: 100 }}>{name}</span>
              <input type="time" name={`open${d}`} defaultValue={h.openTime} style={{ width: 130 }} />
              <span>to</span>
              <input type="time" name={`close${d}`} defaultValue={h.closeTime} style={{ width: 130 }} />
              <label className="check" style={{ margin: 0 }}><input type="checkbox" name={`closed${d}`} defaultChecked={h.closed} /> Closed</label>
            </div>
          );
        })}
        <label className="check field" style={{ marginTop: 16 }}><input type="checkbox" name="active" defaultChecked={l.active} /> Show on website</label>
        <button className="btn">Save location</button>
      </form>
    </>
  );
}
