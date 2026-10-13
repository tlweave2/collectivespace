import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSlots } from "@/lib/availability";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const u = new URL(req.url);
  const id = Number(u.searchParams.get("pkg"));
  const date = u.searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ slots: [] });
  const [pkg] = await db.select().from(schema.packages).where(and(eq(schema.packages.id, id), eq(schema.packages.active, true)));
  if (!pkg) return NextResponse.json({ slots: [] });
  return NextResponse.json({ slots: await getSlots(pkg, date) });
}
