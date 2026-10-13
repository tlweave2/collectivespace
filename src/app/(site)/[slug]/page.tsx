import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { isAdmin } from "@/lib/auth";
import Sections from "@/components/Sections";
import type { Section } from "@/lib/sections";

async function load(slug: string) {
  const [p] = await db.select().from(schema.pages).where(eq(schema.pages.slug, slug));
  if (!p || slug === "home") return null;
  if (!p.published && !(await isAdmin())) return null; // drafts are visible only to you
  return p;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  const s = await getSettings();
  return p ? { title: `${p.title} | ${s.businessName}`, description: p.seoDescription || undefined } : {};
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await load((await params).slug);
  if (!p) notFound();
  return (
    <>
      {!p.published && <div className="alert warn" style={{ borderRadius: 0, margin: 0, textAlign: "center" }}>Draft: only you can see this page. Publish it in the admin.</div>}
      <Sections sections={p.sections as Section[]} />
    </>
  );
}
