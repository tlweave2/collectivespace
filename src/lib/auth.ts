import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

export const ADMIN_COOKIE = "cs_admin";

export function adminToken() {
  return crypto.createHmac("sha256", process.env.SESSION_SECRET || "dev-only-secret")
    .update("admin:" + (process.env.ADMIN_PASSWORD || "admin")).digest("hex");
}

export function passwordMatches(input: string) {
  // Never allow the default password on a live site.
  if (!process.env.ADMIN_PASSWORD && process.env.NODE_ENV === "production") return false;
  const a = Buffer.from(input);
  const b = Buffer.from(process.env.ADMIN_PASSWORD || "admin");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function isAdmin() {
  return (await cookies()).get(ADMIN_COOKIE)?.value === adminToken();
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
