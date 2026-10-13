import * as schema from "./schema";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";

// Production: set DATABASE_URL (Supabase Postgres). Local/demo: embedded Postgres in ./.data
function create() {
  if (process.env.DATABASE_URL) {
    const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 5 });
    return drizzlePg(client, { schema });
  }
  const dir = process.env.PGLITE_DIR || "./.data/pglite";
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("fs").mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  return drizzlePglite(client, { schema }) as unknown as ReturnType<typeof drizzlePg<typeof schema>>;
}

const g = globalThis as unknown as { __db?: ReturnType<typeof create> };
export const db = g.__db ?? (g.__db = create());
export { schema };
