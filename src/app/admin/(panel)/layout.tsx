import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin">
      <aside>
        <Link href="/admin" className="brand">Collective Space</Link>
        <nav>
          <div className="group">Bookings</div>
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/calendar">Calendar</Link>
          <Link href="/admin/bookings">All bookings</Link>
          <Link href="/admin/bookings/new">Add booking</Link>
          <div className="group">Website</div>
          <Link href="/admin/pages">Pages</Link>
          <Link href="/admin/design">Look &amp; feel</Link>
          <Link href="/admin/media">Photos</Link>
          <div className="group">Setup</div>
          <Link href="/admin/packages">Packages &amp; prices</Link>
          <Link href="/admin/add-ons">Add-ons</Link>
          <Link href="/admin/locations">Locations &amp; hours</Link>
          <Link href="/admin/blackouts">Blocked dates</Link>
          <Link href="/admin/settings">Payments &amp; policies</Link>
          <div className="group">Other</div>
          <Link href="/admin/emails">Sent emails</Link>
          <Link href="/" target="_blank">View website ↗</Link>
          <form action={logout}><button style={{ background: "none", border: 0, color: "inherit", font: "inherit", padding: "8px 10px", cursor: "pointer", fontSize: ".92rem" }}>Sign out</button></form>
        </nav>
      </aside>
      <main>{children}</main>
    </div>
  );
}
