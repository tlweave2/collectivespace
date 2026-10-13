import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSlots } from "@/lib/availability";
import { getSettings } from "@/lib/settings";
import { localDate, addDays } from "@/lib/time";

export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const u = new URL(req.url);
  const id = Number(u.searchParams.get("pkg"));
  const month = u.searchParams.get("month") || "";
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ days: {} });
  const [pkg] = await db.select().from(schema.packages).where(and(eq(schema.packages.id, id), eq(schema.packages.active, true)));
  if (!pkg) return NextResponse.json({ days: {} });
  const s = await getSettings();
  const today = localDate(new Date(), s.timezone);
  const last = addDays(today, s.maxAdvanceDays);
  const [y, m] = month.split("-").map(Number);
  const n = new Date(y, m, 0).getDate();
  const days: Record<string, boolean> = {};
  for (let d = 1; d <= n; d++) {
    const ds = `${month}-${String(d).padStart(2, "0")}`;
    if (ds < today || ds > last) continue;
    if ((await getSlots(pkg, ds)).length) days[ds] = true;
  }
  return NextResponse.json({ days });
}
