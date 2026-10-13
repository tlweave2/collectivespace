import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { money, durationLabel } from "@/lib/time";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function t12(t: string) { const [h, m] = t.split(":").map(Number); return `${((h + 11) % 12) + 1}${m ? ":" + String(m).padStart(2, "0") : ""}${h < 12 ? "am" : "pm"}`; }

export default async function LocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [loc] = await db.select().from(schema.locations).where(and(eq(schema.locations.slug, slug), eq(schema.locations.active, true)));
  if (!loc) notFound();
  const pkgs = await db.select().from(schema.packages).where(and(eq(schema.packages.locationId, loc.id), eq(schema.packages.active, true))).orderBy(asc(schema.packages.sort));
  const hours = await db.select().from(schema.locationHours).where(eq(schema.locationHours.locationId, loc.id)).orderBy(asc(schema.locationHours.weekday));
  return (
    <>
      <div className="hero" style={{ minHeight: "48vh" }}>
        {loc.imageUrl && <img src={loc.imageUrl} alt="" />}
        <div className="wrap">
          <div className="eyebrow">{loc.address}</div>
          <h1>{loc.name}</h1>
          <p style={{ maxWidth: 620 }}>{loc.description}</p>
        </div>
      </div>
      <section>
        <div className="wrap">
          <h2>Booking options</h2>
          <div className="cards" style={{ marginTop: 20 }}>
            {pkgs.map((p) => (
              <div key={p.id} className="tile">
                {p.imageUrl && <img src={p.imageUrl} alt={p.name} />}
                <div className="body">
                  <h3>{p.name}</h3>
                  <p className="small muted" style={{ margin: 0 }}>
                    {durationLabel(p.durationMinutes)}
                    {p.kind === "rental" && ` · up to ${p.baseCapacity} guests${p.maxCapacity > p.baseCapacity ? ` (${p.maxCapacity} with fee)` : ""}`}
                  </p>
                  <p className="small">{p.description}</p>
                  {p.inclusions && (
                    <details className="small">
                      <summary>What&apos;s included</summary>
                      <ul className="list" style={{ marginTop: 8 }}>{p.inclusions.split("\n").filter(Boolean).map((i) => <li key={i}>{i}</li>)}</ul>
                    </details>
                  )}
                  <div className="meta">
                    <span className="price">{money(p.priceCents)}</span>
                    <Link href={`/book/${p.slug}`} className="btn sm">Book</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {loc.galleryUrls.trim() && (
            <div style={{ marginTop: 48 }}>
              <h2>Gallery</h2>
              <div className="gallery">
                {loc.galleryUrls.split(/\s+/).filter(Boolean).map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" loading="lazy" /></a>)}
              </div>
            </div>
          )}
          <div className="card" style={{ marginTop: 32, maxWidth: 420 }}>
            <h3>Hours</h3>
            {hours.map((h) => (
              <div key={h.weekday} className="summary-row"><span>{DAYS[h.weekday]}</span><span className="muted">{h.closed ? "Closed" : `${t12(h.openTime)} – ${t12(h.closeTime)}`}</span></div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
