import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select({ id: schema.media.id, filename: schema.media.filename, width: schema.media.width, height: schema.media.height, size: schema.media.size, createdAt: schema.media.createdAt })
    .from(schema.media).orderBy(desc(schema.media.createdAt));
  return NextResponse.json({ items: rows.map((r) => ({ ...r, url: `/media/${r.id}` })) });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "Please upload a JPG, PNG, WebP or GIF." }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "That photo is too large (max 4 MB after resizing)." }, { status: 400 });
  const data = Buffer.from(await file.arrayBuffer());
  const [row] = await db.insert(schema.media).values({
    filename: String(form.get("name") || file.name).slice(0, 200), contentType: file.type,
    width: Number(form.get("width")) || 0, height: Number(form.get("height")) || 0, size: data.length, data,
  }).returning({ id: schema.media.id });
  return NextResponse.json({ id: row.id, url: `/media/${row.id}` });
}
