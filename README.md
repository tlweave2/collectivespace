# The Collective Space — Website & Booking System

Your own website, booking calendar, payments and admin dashboard. It replaces Squarespace and Acuity.

**What it does**

- A public site with all three locations: Studios, Events Riverbank and Events Modesto. Each location has its own calendar.
- Customers pick a date and time, guests and add-ons, then pay through Stripe.
  - Event rentals take a deposit, and the card is saved.
  - The balance is charged automatically **14 days before** the event, with a reminder **3 days** before that.
  - Bookings made within 14 days of the event are paid in full.
  - Studio sessions and tours are paid in full.
- Tour fees are credited automatically when the same email books a rental.
- If a card is declined, the customer gets a payment link by email, you get an alert, and the booking turns red in your dashboard.
- The day after each event, you're reminded to **charge cleaning, damage or overtime fees** to the saved card (with photo links on the receipt), or to mark the booking "No extra charges."
- Admin lets you change **every price, deposit, hour, buffer, add-on, policy and email line** with no code. You can also refund, reschedule, cancel, block dates, and add phone or Acuity bookings by hand.
- **Edit the whole website yourself:** build any page from sections, upload photos, and change colors, fonts, logo and menu (see "Editing your website" below).

---

## Going live: one-time setup (about 1–2 hours)

You'll create four free accounts. Each one gives you a key or two, and you paste them all into Vercel in step 5.

### 1. GitHub: stores the code
1. Create an account at **github.com**.
2. Click **New repository**, name it `collective-space`, set it to **Private**, and create it.
3. Click **uploading an existing file**. Drag in everything from this folder, then click **Commit**.

### 2. Supabase: your database
1. Create an account at **supabase.com**, then **New project**. Pick a strong database password and save it. Choose the region **West US**.
2. When the project is ready, click **Connect** (top of the page), then **Transaction pooler**, and copy the connection string.
3. Replace `[YOUR-PASSWORD]` in it with your database password. This whole line is your **`DATABASE_URL`**.

### 3. Stripe: payments
1. Sign in to **stripe.com**, or create an account. Leave **Test mode** on for now.
2. Go to **Developers → API keys** and copy the **Secret key** (starts with `sk_test_`). This is your **`STRIPE_SECRET_KEY`**.
3. The webhook is done after step 5 (see step 6).

### 4. Resend: sends your emails
1. Create an account at **resend.com**, go to **Domains → Add domain**, and enter `collectivespaceevents.com`.
2. Resend shows a few DNS records. Add them where your domain is managed (Squarespace → Domains → DNS settings), then wait until Resend says **Verified**.
3. Go to **API Keys → Create** and copy the key. This is your **`RESEND_API_KEY`**.

### 5. Vercel: puts the site online
1. Create an account at **vercel.com** and sign in with GitHub.
2. Click **Add New → Project**, pick `collective-space`, and open **Environment Variables**. Add these:

| Name | Value |
|---|---|
| `DATABASE_URL` | from Supabase |
| `APP_URL` | `https://www.collectivespaceevents.com` (use the `…vercel.app` address until your domain is moved) |
| `ADMIN_PASSWORD` | a long password you'll use to sign in to admin |
| `SESSION_SECRET` | any long random text (mash the keyboard, 40+ characters) |
| `CRON_SECRET` | another long random text |
| `STRIPE_SECRET_KEY` | from Stripe |
| `STRIPE_WEBHOOK_SECRET` | leave blank for now (step 6) |
| `RESEND_API_KEY` | from Resend |
| `EMAIL_FROM` | `The Collective Space <bookings@collectivespaceevents.com>` |

3. Click **Deploy**. The first deploy sets up the database and loads your current packages and prices automatically.

### 6. Connect the Stripe webhook
1. In Stripe go to **Developers → Webhooks → Add endpoint**.
2. URL: `https://YOUR-SITE/api/stripe/webhook`. Event: **checkout.session.completed**.
3. Copy the **Signing secret** (`whsec_…`). In Vercel, go to **Settings → Environment Variables**, set `STRIPE_WEBHOOK_SECRET` to it, then **Deployments → Redeploy**.

### 7. Test everything (still in Stripe test mode)
Go to `YOUR-SITE/admin`, sign in, and check **Packages & prices** and **Payments & policies**. Then book a rental on the site using these Stripe test cards (any future expiry, any CVC):

- `4242 4242 4242 4242`: always works.
- `4000 0000 0000 0341`: the deposit goes through, but later charges are **declined**. Use it to see the failed-balance flow.

In admin, open the booking. Try **Charge balance now**, **Charge card on file** (extra fee), and **Refund**. Check **Sent emails** to see what customers receive.

### 8. Go live
1. In Stripe, turn off Test mode and copy the **live** secret key (`sk_live_…`). Create the webhook again in live mode.
2. In Vercel, replace `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` with the live values, then redeploy.
3. **Move your upcoming Acuity bookings:** in admin, go to **Add booking**. Enter each one with what they've already paid, and tick **Override availability check**. These customers have no card saved, so when their balance is due they'll be emailed a payment link instead of being charged automatically.
4. **Point your domain:** in Vercel, go to **Settings → Domains** and add `collectivespaceevents.com` and `www.collectivespaceevents.com`. Vercel shows two DNS records; add them in Squarespace → Domains → DNS. Then set `APP_URL` to your real domain and redeploy.
5. Turn off Acuity once you've confirmed everything works.

---

## Day to day

- **Dashboard:** what needs attention (failed payments, events to close out) and what's coming up.
- **Calendar:** month view of all locations, color-coded, with a filter for each location.
- **After an event:** open the booking from the dashboard, then either charge a fee with a reason and photo links, or click **No extra charges**.
- **Change prices or packages:** Packages & prices. To hide a package, untick "Show on website."
- **Change website wording or photos:** Pages, Look & feel, and Photos.
- **Holidays or private holds:** Blocked dates.
- **Deposit timing, reminders and policies:** Payments & policies.
- **Photos:** they currently point at your Squarespace images, so **re-upload them in Admin → Photos before you cancel Squarespace**, then pick them in each page, package and location.

## Editing your website

**Admin → Pages** lists every page. The homepage, About and FAQ are already set up. Click **Edit** on any page:

- **Sections** stack top to bottom: Hero banner, Text, Photo + text, Photo gallery, Location cards, Booking options, Tour invite, FAQ, Reviews, Call to action, Map, Contact info and Video.
  - **+ Add section** puts one at the bottom. Hover between sections for **+ Insert section here**.
  - Each section has ↑ ↓ to reorder, ● to hide it without deleting, ⧉ to duplicate, and ✕ to delete.
  - Each section can use a different background: page color, white, warm, dark or accent.
- **Text formatting:** a blank line starts a new paragraph. `**bold**` makes bold, `[Book now](/book/riverbank-full-day)` makes a link, and lines starting with `- ` become a bullet list.
- **Photos:** click **Upload** in any photo field. Phone photos are resized automatically. **Library** reuses a photo you've already uploaded.
- **Page settings** (top of the editor): title, web address, Google description, Published or Draft, and whether it appears in the top menu. Drafts are only visible to you while signed in.
- Click **Save & publish**. The preview on the right updates, and the page is live right away.
- **Create page** makes a new page, like Weddings, Corporate Events, Gallery or Vendors. **Copy** duplicates an existing page to start from.

**Admin → Look & feel** controls the logo, the four site colors, heading and body fonts, button shape, ALL-CAPS headings, the top menu, the menu button, and the footer text.

Location pages and booking pages build themselves from **Locations** and **Packages**. Each location also has a **Gallery** of photos you can upload and reorder.

**Automations** run once a day at about 8am Pacific: reminders, balance charges, post-event review emails, and cleanup. Click **Run reminders & charges now** on the dashboard anytime. On Vercel's Pro plan, you can change `vercel.json` to `0 * * * *` to run hourly.

## Costs
Vercel, Supabase and Resend have free tiers that should cover a venue your size. Stripe charges its standard per-transaction card fee, with no monthly fee.

---

## For a developer

- Next.js 15 (App Router), Drizzle ORM, and Postgres (Supabase). Locally it uses embedded PGlite in `./.data`, so there's nothing to install.
- `npm install && npm run setup && npm run dev`, then open http://localhost:3000. Admin is at /admin with password `admin`. With no Stripe key, payments are simulated: any customer email containing "decline" simulates a declined saved card.
- `npm test` runs the end-to-end payment automation test.
- Page builder: section types are defined in `src/lib/sections.ts` (fields drive the admin editor automatically) and rendered in `src/components/Sections.tsx`. Uploaded photos are stored in the `media` table and served from `/media/<id>`.
- Schema: `src/lib/schema.ts`. Run `npx drizzle-kit generate` after changing it; migrations apply on deploy.
- Key logic: `src/lib/availability.ts` (slots, pricing), `src/lib/bookings.ts` (booking lifecycle, charges, automations), `src/lib/payments.ts` (Stripe: Checkout with `setup_future_usage: off_session`, then off-session PaymentIntents).
