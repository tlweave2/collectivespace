import { NextResponse } from "next/server";
import { runAutomations } from "@/lib/bookings";

// Runs hourly (see vercel.json): releases unpaid holds, sends reminders, charges balances, asks for post-event reviews.
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, log: await runAutomations() });
}
