import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import Flash from "../../Flash";

export default async function Locations({ searchParams }: { searchParams: Promise<{ msg?: string; tone?: string }> }) {
  const sp = await searchParams;
  const locs = await db.select().from(schema.locations).orderBy(asc(schema.locations.sort));
  return (
    <>
      <div className="page-head"><h1>Locations &amp; hours</h1><Link href="/admin/locations/new" className="btn sm">+ New location or room</Link></div>
      <Flash {...sp} />
      <p className="muted" style={{ maxWidth: 680 }}>Each location has its own calendar. If a venue has rooms that can be booked separately, add each room as its own location.</p>
      <div className="cards">
        {locs.map((l) => (
          <Link key={l.id} href={`/admin/locations/${l.id}`} className="tile" style={l.active ? undefined : { opacity: .5 }}>
            {l.imageUrl && <img src={l.imageUrl} alt="" />}
            <div className="body"><h3>{l.name}</h3><p className="small muted">{l.address}</p></div>
          </Link>
        ))}
      </div>
    </>
  );
}
