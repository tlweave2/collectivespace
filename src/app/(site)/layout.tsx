import Link from "next/link";
import { asc, eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { RichText } from "@/components/Sections";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const locs = await db.select().from(schema.locations).where(eq(schema.locations.active, true)).orderBy(asc(schema.locations.sort));
  const menuPages = await db.select({ slug: schema.pages.slug, title: schema.pages.title }).from(schema.pages)
    .where(and(eq(schema.pages.published, true), eq(schema.pages.showInMenu, true))).orderBy(asc(schema.pages.menuOrder));
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <Link href="/" className="brand">{s.logoUrl ? <img src={s.logoUrl} alt={s.businessName} className="site-logo" /> : s.businessName}</Link>
          <nav className="nav">
            {s.showLocationsInMenu && locs.map((l) => (
              <Link key={l.id} href={`/locations/${l.slug}`} className="hide-sm">{l.name.replace("Collective Space ", "").replace("— ", "")}</Link>
            ))}
            {menuPages.map((p) => <Link key={p.slug} href={p.slug === "home" ? "/" : `/${p.slug}`} className="hide-sm">{p.title}</Link>)}
            {s.bookButtonText && <Link href={s.bookButtonLink || "/#book"} className="btn sm">{s.bookButtonText}</Link>}
          </nav>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="wrap cols">
          <div><strong>{s.businessName}</strong>{s.footerText ? <RichText text={s.footerText} /> : s.tagline}</div>
          {locs.map((l) => (<div key={l.id}><strong>{l.name}</strong>{l.address}</div>))}
          <div>
            <strong>Contact</strong>
            <a href={`mailto:${s.adminEmail}`}>{s.adminEmail}</a>{s.phone && <><br />{s.phone}</>}<br />
            {s.instagram && <a href={s.instagram}>Instagram</a>}
            {menuPages.length > 0 && <><br />{menuPages.map((p) => <span key={p.slug}><Link href={`/${p.slug}`}>{p.title}</Link>{" "}</span>)}</>}
          </div>
        </div>
      </footer>
    </>
  );
}
