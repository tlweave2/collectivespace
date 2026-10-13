import { and, asc, desc, eq, gte, lte, inArray, SQL } from "drizzle-orm";
import { db, schema } from "./db";

export async function listBookings(opts: { from?: Date; to?: Date; statuses?: string[]; locationId?: number; order?: "asc" | "desc"; limit?: number } = {}) {
  const conds: SQL[] = [];
  if (opts.from) conds.push(gte(schema.bookings.startAt, opts.from));
  if (opts.to) conds.push(lte(schema.bookings.startAt, opts.to));
  if (opts.statuses?.length) conds.push(inArray(schema.bookings.status, opts.statuses));
  if (opts.locationId) conds.push(eq(schema.bookings.locationId, opts.locationId));
  const q = db.select({
    b: schema.bookings, customerName: schema.customers.name, customerEmail: schema.customers.email,
    packageName: schema.packages.name, packageKind: schema.packages.kind, locationName: schema.locations.name, locationSort: schema.locations.sort,
  }).from(schema.bookings)
    .innerJoin(schema.customers, eq(schema.customers.id, schema.bookings.customerId))
    .innerJoin(schema.packages, eq(schema.packages.id, schema.bookings.packageId))
    .innerJoin(schema.locations, eq(schema.locations.id, schema.bookings.locationId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(opts.order === "desc" ? desc(schema.bookings.startAt) : asc(schema.bookings.startAt));
  return opts.limit ? q.limit(opts.limit) : q;
}
export type BookingRow = Awaited<ReturnType<typeof listBookings>>[number];
