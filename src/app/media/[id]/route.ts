import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

// Serves photos uploaded in Admin → Media. Cached hard because an upload never changes.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [m] = await db.select().from(schema.media).where(eq(schema.media.id, parseInt(id, 10)));
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(m.data), {
    headers: { "Content-Type": m.contentType, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
