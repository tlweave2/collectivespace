import { db } from "../src/lib/db";

async function main() {
  if (process.env.DATABASE_URL) {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db as never, { migrationsFolder: "./drizzle" });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder: "./drizzle" });
  }
  console.log("Database is up to date.");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
