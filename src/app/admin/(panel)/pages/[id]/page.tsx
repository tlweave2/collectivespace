import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Section } from "@/lib/sections";
import PageEditor from "../../../PageEditor";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p] = await db.select().from(schema.pages).where(eq(schema.pages.id, Number(id)));
  if (!p) notFound();
  const locs = await db.select({ id: schema.locations.id, name: schema.locations.name }).from(schema.locations).orderBy(asc(schema.locations.sort));
  return (
    <>
      <div className="page-head">
        <div><div className="small muted"><Link href="/admin/pages">← Website pages</Link></div><h1>{p.title}</h1></div>
      </div>
      <PageEditor
        locations={locs}
        initial={{ id: p.id, title: p.title, slug: p.slug, seoDescription: p.seoDescription, published: p.published, showInMenu: p.showInMenu, menuOrder: p.menuOrder,
          sections: (p.sections as Section[]).map((s) => ({ ...s, id: s.id || Math.random().toString(36).slice(2, 10) })) }}
      />
    </>
  );
}
