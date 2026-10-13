import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { verifyWebhook, readCheckout } from "@/lib/payments";
import { finalizeCharge } from "@/lib/bookings";

// Stripe → Developers → Webhooks: point to /api/stripe/webhook, event "checkout.session.completed".
export async function POST(req: Request) {
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = verifyWebhook(body, req.headers.get("stripe-signature") || "");
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const paid = await readCheckout(s.id);
    if (paid) await finalizeCharge(paid);
  }
  return NextResponse.json({ received: true });
}
