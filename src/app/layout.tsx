import "./globals.css";
import type { Metadata } from "next";
import { stripeEnabled } from "@/lib/payments";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: `${s.businessName} | Photography Studio & Event Venue`, description: s.tagline };
}

const hex = (v: string, fallback: string) => (/^#[0-9a-f]{3,8}$/i.test(v) ? v : fallback);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const fonts = Array.from(new Set([s.headingFont, s.bodyFont])).map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600`).join("&");
  const radius = s.buttonShape === "square" ? "2px" : s.buttonShape === "rounded" ? "8px" : "999px";
  const theme = `:root{--ink:${hex(s.colorInk, "#1c1a17")};--paper:${hex(s.colorPaper, "#faf7f2")};--accent:${hex(s.colorAccent, "#8a6a4a")};--sand:${hex(s.colorSand, "#efe7da")};` +
    `--serif:"${s.headingFont.replace(/"/g, "")}",Georgia,serif;--sans:"${s.bodyFont.replace(/"/g, "")}",system-ui,sans-serif;--btn-radius:${radius}}` +
    (s.headingUppercase ? `h1,h2,h3{text-transform:uppercase;letter-spacing:.06em}` : "");
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={`https://fonts.googleapis.com/css2?${fonts}&display=swap`} rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: theme }} />
      </head>
      <body>
        {!stripeEnabled() && (
          <div className="demo-banner">Demo mode: payments are simulated. Add your Stripe key to take real payments.</div>
        )}
        {children}
      </body>
    </html>
  );
}
