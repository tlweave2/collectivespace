import { asc, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { addBlackout, deleteBlackout } from "../../actions";
import Flash from "../../Flash";

export default async function Blackouts({ searchParams }: { searchParams: Promise<{ msg?: string; tone?: string }> }) {
  const sp = await searchParams;
  const locs = await db.select().from(schema.locations).orderBy(asc(schema.locations.sort));
  const rows = await db.select().from(schema.blackouts).orderBy(desc(schema.blackouts.startDate));
  return (
    <>
      <div className="page-head"><h1>Blocked dates</h1></div>
      <Flash {...sp} />
      <p className="muted">Holidays, maintenance, private events, or holds. Customers can&apos;t book these dates.</p>
      <form action={addBlackout} className="card" style={{ maxWidth: 820, marginBottom: 24 }}>
        <div className="grid3">
          <div className="field"><label>From</label><input type="date" name="startDate" required /></div>
          <div className="field"><label>To (optional)</label><input type="date" name="endDate" /></div>
          <div className="field"><label>Location</label><select name="locationId"><option value="">All locations</option>{locs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        </div>
        <div className="row"><input name="reason" placeholder="Reason (only you see this)" style={{ flex: 1 }} /><button className="btn sm">Block dates</button></div>
      </form>
      <div className="table-wrap" style={{ maxWidth: 820 }}><table>
        <thead><tr><th>Dates</th><th>Location</th><th>Reason</th><th></th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={4} className="muted">No blocked dates.</td></tr>}
          {rows.map((b) => (
            <tr key={b.id}>
              <td>{b.startDate}{b.endDate !== b.startDate && ` → ${b.endDate}`}</td>
              <td>{locs.find((l) => l.id === b.locationId)?.name ?? "All locations"}</td>
              <td>{b.reason}</td>
              <td><form action={deleteBlackout.bind(null, b.id)}><button className="btn ghost sm">Remove</button></form></td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
