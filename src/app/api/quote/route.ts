import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { quote } from "@/lib/availability";
import { getSettings } from "@/lib/settings";
import { zonedToUtc } from "@/lib/time";

export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const b = await req.json();
  const [pkg] = await db.select().from(schema.packages).where(and(eq(schema.packages.id, Number(b.packageId)), eq(schema.packages.active, true)));
  if (!pkg || !b.date || !b.time) return NextResponse.json({ quote: null });
  const s = await getSettings();
  let credit = 0;
  const email = String(b.email || "").trim().toLowerCase();
  if (email) {
    const [c] = await db.select().from(schema.customers).where(eq(schema.customers.email, email));
    credit = c?.creditCents ?? 0;
  }
  const guests = Math.max(1, Math.min(pkg.maxCapacity, Number(b.guests) || 1));
  const q = await quote(pkg, zonedToUtc(b.date, b.time, s.timezone), guests, (b.addOnIds || []).map(Number), credit);
  return NextResponse.json({ quote: q });
}
