import { NextResponse } from "next/server";
import { checkoutForCharge } from "@/lib/bookings";

export async function POST(_req: Request, { params }: { params: Promise<{ chargeId: string }> }) {
  const { chargeId } = await params;
  try {
    return NextResponse.redirect(await checkoutForCharge(Number(chargeId)), 303);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
