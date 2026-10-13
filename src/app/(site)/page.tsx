import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import Sections from "@/components/Sections";
import { newSection, type Section } from "@/lib/sections";

async function home() {
  const [p] = await db.select().from(schema.pages).where(eq(schema.pages.slug, "home"));
  return p;
}

export async function generateMetadata(): Promise<Metadata> {
  const p = await home();
  return p?.seoDescription ? { description: p.seoDescription } : {};
}

export default async function Home() {
  const p = await home();
  // Fallback if the homepage was deleted: show location cards so customers can still book.
  const sections = (p?.sections as Section[] | undefined) ?? [newSection("locations")];
  return <Sections sections={sections} />;
}
