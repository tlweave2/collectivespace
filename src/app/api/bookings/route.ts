import { NextResponse } from "next/server";
import { z } from "zod";
import { createBooking } from "@/lib/bookings";

const Body = z.object({
  packageId: z.coerce.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  guests: z.coerce.number().int().min(1),
  addOnIds: z.array(z.coerce.number().int()).default([]),
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().min(7, "Please enter a phone number").max(40),
  notes: z.string().max(4000).default(""),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try {
    return NextResponse.json(await createBooking(parsed.data));
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json({ error: msg }, { status: msg.includes("taken") ? 409 : 400 });
  }
}
