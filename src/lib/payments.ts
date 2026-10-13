import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import type { Customer } from "./schema";

// When STRIPE_SECRET_KEY is missing the app runs in DEMO MODE: checkout is a fake card page,
// saved-card charges succeed unless the customer's email contains "decline" (to test failures).
export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;
/** Demo payments are allowed locally, or on a live site only if ALLOW_DEMO_PAYMENTS=true (for a test preview). */
export const demoAllowed = () => process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_PAYMENTS === "true";
export const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

let _stripe: Stripe | null = null;
function stripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  return _stripe;
}

async function ensureStripeCustomer(c: Customer) {
  if (c.stripeCustomerId) return c.stripeCustomerId;
  const sc = await stripe().customers.create({ email: c.email, name: c.name, phone: c.phone || undefined });
  await db.update(schema.customers).set({ stripeCustomerId: sc.id }).where(eq(schema.customers.id, c.id));
  return sc.id;
}

export async function createCheckout(opts: {
  customer: Customer; bookingCode: string; chargeId: number; amountCents: number; description: string;
  consentText: string; returnPath: string;
}): Promise<{ url: string; sessionId: string }> {
  if (!stripeEnabled()) {
    if (!demoAllowed()) throw new Error("Online booking is temporarily unavailable. Please contact us to book.");
    const sessionId = `demo_${opts.chargeId}_${Date.now()}`;
    return { url: `${appUrl()}/demo-checkout?charge=${opts.chargeId}&session=${sessionId}`, sessionId };
  }
  const customerId = await ensureStripeCustomer(opts.customer);
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: opts.amountCents, product_data: { name: opts.description } } }],
    payment_intent_data: {
      setup_future_usage: "off_session",
      description: `${opts.description} (${opts.bookingCode})`,
      metadata: { chargeId: String(opts.chargeId), bookingCode: opts.bookingCode },
    },
    metadata: { chargeId: String(opts.chargeId), bookingCode: opts.bookingCode },
    custom_text: { submit: { message: opts.consentText.slice(0, 1200) } },
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
    success_url: `${appUrl()}${opts.returnPath}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}${opts.returnPath}?cancelled=1`,
  });
  return { url: session.url!, sessionId: session.id };
}

/** Look up a finished Checkout session. Returns null if it is not paid. */
export async function readCheckout(sessionId: string): Promise<{ chargeId: number; paymentIntentId: string; paymentMethodId: string | null } | null> {
  if (!stripeEnabled()) return null; // demo checkout finalizes directly
  const s = await stripe().checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
  if (s.payment_status !== "paid") return null;
  const pi = s.payment_intent as Stripe.PaymentIntent;
  return {
    chargeId: Number(s.metadata?.chargeId),
    paymentIntentId: pi.id,
    paymentMethodId: typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id ?? null,
  };
}

/** Charge the card on file without the customer present (balance, cleaning, damage...). */
export async function chargeSavedCard(opts: {
  customer: Customer; paymentMethodId: string | null; amountCents: number; description: string; bookingCode: string; chargeId: number;
}): Promise<{ ok: true; paymentIntentId: string } | { ok: false; error: string }> {
  if (!opts.paymentMethodId) return { ok: false, error: "No card on file" };
  if (!stripeEnabled()) {
    if (!demoAllowed()) return { ok: false, error: "Payments are not set up" };
    if (opts.customer.email.toLowerCase().includes("decline")) return { ok: false, error: "Your card was declined. (demo)" };
    return { ok: true, paymentIntentId: `demo_pi_${opts.chargeId}_${Date.now()}` };
  }
  try {
    const pi = await stripe().paymentIntents.create({
      amount: opts.amountCents, currency: "usd",
      customer: await ensureStripeCustomer(opts.customer),
      payment_method: opts.paymentMethodId,
      off_session: true, confirm: true,
      description: `${opts.description} (${opts.bookingCode})`,
      metadata: { chargeId: String(opts.chargeId), bookingCode: opts.bookingCode },
    });
    if (pi.status === "succeeded") return { ok: true, paymentIntentId: pi.id };
    return { ok: false, error: `Payment status: ${pi.status}` };
  } catch (e) {
    const err = e as Stripe.errors.StripeError;
    return { ok: false, error: err.message || "Charge failed" };
  }
}

export async function refundPayment(paymentIntentId: string, amountCents: number): Promise<{ ok: boolean; error?: string }> {
  if (!stripeEnabled() || paymentIntentId.startsWith("demo_")) return { ok: true };
  try {
    await stripe().refunds.create({ payment_intent: paymentIntentId, amount: amountCents });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function verifyWebhook(body: string, signature: string) {
  return stripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
}
