import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { AddOn } from "@/lib/schema";
import { saveAddOn } from "../../actions";
import Flash from "../../Flash";

function AddOnForm({ a }: { a?: AddOn }) {
  return (
    <form action={saveAddOn} className="card">
      {a && <input type="hidden" name="id" value={a.id} />}
      <div className="grid3">
        <div className="field"><label>Name</label><input name="name" defaultValue={a?.name} required /></div>
        <div className="field"><label>Price ($)</label><input name="price" defaultValue={a ? (a.priceCents / 100).toFixed(2) : ""} inputMode="decimal" /></div>
        <div className="field"><label>Charged</label><select name="priceType" defaultValue={a?.priceType ?? "flat"}><option value="flat">Once</option><option value="per_guest">Per guest</option></select></div>
      </div>
      <div className="grid3">
        <div className="field" style={{ gridColumn: "span 2" }}><label>Description</label><input name="description" defaultValue={a?.description} /></div>
        <div className="field"><label>Offered on</label><select name="appliesTo" defaultValue={a?.appliesTo ?? "rental"}><option value="rental">Event rentals</option><option value="studio">Studio sessions</option><option value="all">Everything except tours</option></select></div>
      </div>
      <div className="spread">
        <div className="row">
          <label className="check" style={{ margin: 0 }}><input type="checkbox" name="active" defaultChecked={a?.active ?? true} /> Offered</label>
          <span className="small muted">Order</span><input name="sort" type="number" defaultValue={a?.sort ?? 10} style={{ width: 70 }} />
        </div>
        <button className="btn sm">{a ? "Save" : "Add"}</button>
      </div>
    </form>
  );
}

export default async function AddOns({ searchParams }: { searchParams: Promise<{ msg?: string; tone?: string }> }) {
  const sp = await searchParams;
  const rows = await db.select().from(schema.addOns).orderBy(asc(schema.addOns.sort));
  return (
    <>
      <div className="page-head"><h1>Add-ons</h1></div>
      <Flash {...sp} />
      <div className="stack" style={{ maxWidth: 820 }}>
        {rows.map((a) => <AddOnForm key={a.id} a={a} />)}
        <h3 style={{ marginTop: 28 }}>New add-on</h3>
        <AddOnForm />
      </div>
    </>
  );
}
