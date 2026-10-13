import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { money, durationLabel } from "@/lib/time";
import Flash from "../../Flash";

export default async function Packages({ searchParams }: { searchParams: Promise<{ msg?: string; tone?: string }> }) {
  const sp = await searchParams;
  const locs = await db.select().from(schema.locations).orderBy(asc(schema.locations.sort));
  const pkgs = await db.select().from(schema.packages).orderBy(asc(schema.packages.sort));
  return (
    <>
      <div className="page-head"><h1>Packages &amp; prices</h1><Link href="/admin/packages/new" className="btn sm">+ New package</Link></div>
      <Flash {...sp} />
      {locs.map((l) => (
        <div key={l.id} className="stack" style={{ marginBottom: 28 }}>
          <h3>{l.name}</h3>
          <div className="table-wrap"><table>
            <thead><tr><th>Package</th><th>Length</th><th>Price</th><th>Guests</th><th>Payment</th><th></th></tr></thead>
            <tbody>
              {pkgs.filter((p) => p.locationId === l.id).map((p) => (
                <tr key={p.id} style={p.active ? undefined : { opacity: .5 }}>
                  <td><Link href={`/admin/packages/${p.id}`}>{p.name}</Link>{!p.active && <span className="badge" style={{ marginLeft: 8 }}>Hidden</span>}<div className="small muted">{p.kind}</div></td>
                  <td>{durationLabel(p.durationMinutes)}</td>
                  <td>{money(p.priceCents)}</td>
                  <td>{p.kind === "tour" ? "—" : `${p.baseCapacity}${p.maxCapacity > p.baseCapacity ? ` (to ${p.maxCapacity} +${money(p.extraGuestFeeCents)})` : ""}`}</td>
                  <td>{p.paymentMode === "full" ? "Pay in full" : `${p.depositType === "percent" ? `${p.depositValue}%` : money(p.depositValue)} deposit`}</td>
                  <td><Link href={`/admin/packages/${p.id}`} className="btn ghost sm">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      ))}
    </>
  );
}
