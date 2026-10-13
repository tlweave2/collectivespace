import Link from "next/link";
import { asc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { fmtShortDate } from "@/lib/time";
import { createPage, duplicatePage, deletePage } from "../../actions";
import Flash from "../../Flash";

export default async function Pages({ searchParams }: { searchParams: Promise<{ msg?: string; tone?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const rows = await db.select().from(schema.pages).orderBy(asc(schema.pages.menuOrder), asc(schema.pages.title));
  const sorted = [...rows.filter((r) => r.slug === "home"), ...rows.filter((r) => r.slug !== "home")];
  return (
    <>
      <div className="page-head"><h1>Website pages</h1></div>
      <Flash {...sp} />
      <p className="muted" style={{ maxWidth: 700 }}>Build any page from sections: banners, text, photos, galleries, booking options, FAQs, reviews, maps and more. Location and booking pages are created automatically from Locations and Packages.</p>
      <form action={createPage} className="row card" style={{ maxWidth: 700, marginBottom: 22 }}>
        <input name="title" placeholder="New page title, e.g. Weddings" style={{ flex: 1, minWidth: 200 }} required />
        <button className="btn sm">+ Create page</button>
      </form>
      <div className="table-wrap"><table>
        <thead><tr><th>Page</th><th>Address</th><th>Status</th><th>Updated</th><th></th></tr></thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/pages/${p.id}`}>{p.title}</Link>{p.slug === "home" && <span className="badge" style={{ marginLeft: 8 }}>Homepage</span>}</td>
              <td><a href={p.slug === "home" ? "/" : `/${p.slug}`} target="_blank" className="small">{p.slug === "home" ? "/" : `/${p.slug}`}</a></td>
              <td>{p.published ? <span className="badge ok">Published</span> : <span className="badge warn">Draft</span>}{p.showInMenu && <span className="badge" style={{ marginLeft: 6 }}>In menu</span>}</td>
              <td className="small muted">{fmtShortDate(p.updatedAt, s.timezone)}</td>
              <td>
                <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                  <Link href={`/admin/pages/${p.id}`} className="btn sm">Edit</Link>
                  <form action={duplicatePage.bind(null, p.id)}><button className="btn ghost sm">Copy</button></form>
                  {p.slug !== "home" && <form action={deletePage.bind(null, p.id)}><button className="btn ghost sm" style={{ color: "var(--bad)" }}>Delete</button></form>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
