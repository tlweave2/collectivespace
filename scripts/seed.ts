import { db, schema } from "../src/lib/db";

const IMG = "https://images.squarespace-cdn.com/content/v1/64f1639b2cfec42625ce0491";

const id = () => Math.random().toString(36).slice(2, 10);

async function seedPages() {
  if ((await db.select().from(schema.pages)).length) return;
  await db.insert(schema.pages).values([
    { slug: "home", title: "Home", seoDescription: "Photography studio and event venues in Riverbank and Modesto, California. Check availability and book online.",
      sections: [
        { id: id(), type: "hero", image: `${IMG}/c6dfc63b-f2f0-435b-b661-038ae4ec5cd9/CSE+-+1.jpeg`, eyebrow: "Riverbank & Modesto, California",
          heading: "Spaces made for celebrating and creating.", text: "A photography studio and two event venues. See open dates and book online in minutes.",
          buttonText: "Check availability", buttonLink: "#book", height: "tall", darken: "40", align: "left" },
        { id: id(), type: "locations", eyebrow: "Choose a space", heading: "Where would you like to book?", text: "", anchor: "book" },
        { id: id(), type: "imageText", image: `${IMG}/31649ad5-6812-4eee-bef7-10f531c17fbe/SUMMA.jpeg`, imageSide: "right", eyebrow: "Let's celebrate",
          heading: "Weddings, birthdays, communions, launch parties and work events",
          body: "Bright, versatile rooms with modern amenities and customizable layouts, plus a team ready to help every step of the way.\n\nChoose a **Full Day Rental** to set up and style it yourself, or a **Full Service Rental** and simply show up and enjoy.",
          buttonText: "See event venues", buttonLink: "/locations/events-riverbank" },
        { id: id(), type: "tours", heading: "Want to see it in person first?", text: "Book a 20-minute tour of any location. Your tour fee is credited toward your booking." },
      ] },
    { slug: "about", title: "About", showInMenu: true, menuOrder: 1, seoDescription: "Meet Sara Jane, founder of The Collective Space.",
      sections: [
        { id: id(), type: "hero", image: `${IMG}/ecce2a95-656e-4c62-a6de-27f5102325b2/CSS+-+Gallery+1.jpeg`, heading: "About The Collective Space", text: "", height: "short", darken: "35", align: "left" },
        { id: id(), type: "imageText", image: `${IMG}/b202d893-9231-4bb5-91d2-b8751f0e23ee/jane2026-1622.jpg`, imageSide: "left", eyebrow: "Meet the founder", heading: "Sara Jane",
          body: "Photographer, creative entrepreneur, and the owner of Collective Space Studios and Collective Space Events.\n\nEdit this text in Admin → Website pages → About." },
        { id: id(), type: "cta", heading: "Come see the space", text: "Tours take 20 minutes, and the fee is credited toward your booking.", buttonText: "Book a tour", buttonLink: "/#book", background: "dark" },
      ] },
    { slug: "faq", title: "FAQ", showInMenu: true, menuOrder: 2, seoDescription: "Answers to common questions about booking The Collective Space.",
      sections: [
        { id: id(), type: "faq", heading: "Frequently asked questions", items: [
          { q: "How does payment work?", a: "Event rentals take a deposit at booking. The remaining balance is charged automatically to your saved card 14 days before your event. Studio sessions and tours are paid in full when you book." },
          { q: "Can I bring my own vendors and decorations?", a: "Edit this answer in Admin → Website pages → FAQ." },
          { q: "Is there a cleaning fee?", a: "Please leave the space as you found it. Fees may apply for excess cleaning, damage or overtime." },
          { q: "Can I tour the space first?", a: "Yes! Book a 20-minute tour. The fee is credited toward your booking." },
        ] },
        { id: id(), type: "contact", heading: "Still have questions?", text: "We're happy to help." },
      ] },
  ]);
  console.log("Seeded website pages.");
}

async function main() {
  const existing = await db.select().from(schema.locations);
  if (existing.length) { await seedPages(); console.log("Locations already seeded."); process.exit(0); }

  const [studio, riverbank, modesto] = await db.insert(schema.locations).values([
    { slug: "studios-riverbank", name: "Collective Space Studios", address: "3337 Atchison Street, Riverbank, CA 95367", sort: 1,
      description: "A rentable creative photography studio for branding, editorial, boudoir and family sessions, plus intimate events and meetings.",
      imageUrl: `${IMG}/9a96c7bb-9990-42b7-9945-db046b1bf312/CSS.jpeg`, galleryUrls: `${IMG}/ecce2a95-656e-4c62-a6de-27f5102325b2/CSS+-+Gallery+1.jpeg` + "\n" + `${IMG}/bd7f4b6f-8080-4dc7-a5cc-1d068bbcac22/CSS+-+Gallery+2.jpeg` + "\n" + `${IMG}/7709b8b2-36ce-4a18-9290-679686cd32c6/CSS+-+Gallery+3.jpeg` + "\n" + `${IMG}/fbbbbc55-ecfe-4db2-9bcc-03605debff5f/CSS+-+Gallery+4.jpeg` + "\n" + `${IMG}/1a6ee039-5fa1-4d20-97d2-6bb1efa963fd/CSS+-+Gallery+5.jpeg` + "\n" + `${IMG}/684cf2ea-dee5-447a-9f5b-77aa7168c25b/CSS+-+Gallery+12.jpeg` },
    { slug: "events-riverbank", name: "Collective Space Events — Riverbank", address: "3342 Santa Fe Street, Riverbank, CA 95367", sort: 2,
      description: "A bright, versatile event venue for weddings, birthdays, communions, launch parties and work events.",
      imageUrl: `${IMG}/c6dfc63b-f2f0-435b-b661-038ae4ec5cd9/CSE+-+1.jpeg`, galleryUrls: `${IMG}/c6dfc63b-f2f0-435b-b661-038ae4ec5cd9/CSE+-+1.jpeg` + "\n" + `${IMG}/d5ddbab5-55a7-4c42-8691-56c3bfb82fd5/CSE.jpg` + "\n" + `${IMG}/cfde215f-8b3a-462b-9b7f-b022fbd0cd20/CSE+-+3.jpeg` + "\n" + `${IMG}/31649ad5-6812-4eee-bef7-10f531c17fbe/SUMMA.jpeg` },
    { slug: "events-modesto", name: "Collective Space Events — Modesto", address: "133 Burney Street, Modesto, CA 95354", sort: 3,
      description: "Our newest venue, with the same welcoming environment and thoughtful design, now in Modesto.",
      imageUrl: `${IMG}/ecd6c797-72b1-4b04-8d4b-94f6d1b1906a/SNYLIA.jpg`, galleryUrls: `${IMG}/c6dfc63b-f2f0-435b-b661-038ae4ec5cd9/CSE+-+1.jpeg` + "\n" + `${IMG}/d5ddbab5-55a7-4c42-8691-56c3bfb82fd5/CSE.jpg` + "\n" + `${IMG}/cfde215f-8b3a-462b-9b7f-b022fbd0cd20/CSE+-+3.jpeg` + "\n" + `${IMG}/31649ad5-6812-4eee-bef7-10f531c17fbe/SUMMA.jpeg` },
  ]).returning();

  const hours = [];
  for (const loc of [studio, riverbank, modesto]) {
    for (let d = 0; d < 7; d++) {
      hours.push({ locationId: loc.id, weekday: d,
        openTime: loc.id === studio.id ? "07:00" : "08:00",
        closeTime: loc.id === studio.id ? "21:00" : "23:00", closed: false });
    }
  }
  await db.insert(schema.locationHours).values(hours);

  const fullDayInc = ['60" round tables (up to 10)', "White resin chairs (up to 50)", '24" high top tables (up to 8)', "Wifi & restrooms on-premise"].join("\n");
  const fullServiceInc = ["Up to 80 guests", '60" round tables & white resin chairs', "Two 6ft tables & pub tables", "Glam space", "Restrooms, Wifi & free street parking", "Alexa Echo speaker & welcome sign easel",
    "Themed backdrop", "Table linens & 2 gift/food table linens", "Chargers & paper themed napkins", "Balloon or small floral centerpieces", "Guest/gift table setup", "The Posh Booth photo booth", "Setup & breakdown"].join("\n");

  const venuePackages = (loc: typeof riverbank, key: string) => [
    { locationId: loc.id, slug: `${key}-full-day`, name: "Full Day Rental", kind: "rental", sort: 1,
      description: "Eight hours in the space to set up, celebrate and tear down at your own pace.",
      inclusions: fullDayInc, imageUrl: `${IMG}/d5ddbab5-55a7-4c42-8691-56c3bfb82fd5/CSE.jpg`,
      durationMinutes: 480, priceCents: 125000, baseCapacity: 50, maxCapacity: 100, extraGuestFeeCents: 25000,
      paymentMode: "deposit", depositType: "percent", depositValue: 50, bufferMinutes: 60, slotIntervalMinutes: 60, minNoticeHours: 72 },
    { locationId: loc.id, slug: `${key}-full-service`, name: "Full Service Rental", kind: "rental", sort: 2,
      description: "Just show up and enjoy. Our team handles setup, décor and breakdown for you.",
      inclusions: fullServiceInc, imageUrl: `${IMG}/c6dfc63b-f2f0-435b-b661-038ae4ec5cd9/CSE+-+1.jpeg`,
      durationMinutes: 480, priceCents: 290000, baseCapacity: 80, maxCapacity: 100, extraGuestFeeCents: 30000,
      paymentMode: "deposit", depositType: "percent", depositValue: 50, bufferMinutes: 60, slotIntervalMinutes: 60, minNoticeHours: 168 },
    { locationId: loc.id, slug: `${key}-tour`, name: "Venue Tour", kind: "tour", sort: 3,
      description: "A 20-minute walkthrough of the venue. The $20 fee is credited toward your rental.",
      inclusions: "", imageUrl: `${IMG}/cfde215f-8b3a-462b-9b7f-b022fbd0cd20/CSE+-+3.jpeg`,
      durationMinutes: 20, priceCents: 2000, baseCapacity: 4, maxCapacity: 4, extraGuestFeeCents: 0,
      paymentMode: "full", depositType: "percent", depositValue: 100, bufferMinutes: 10, slotIntervalMinutes: 30, minNoticeHours: 24 },
  ];

  await db.insert(schema.packages).values([
    { locationId: studio.id, slug: "studio-2-hour", name: "Two Hour Studio Booking", kind: "studio", sort: 1,
      description: "A dedicated, fully equipped studio for photography, content and creative projects.",
      inclusions: "Natural-light studio\nBackdrops & furniture sets\nSeasonal setups", imageUrl: `${IMG}/eef9bee6-43ab-46c1-ab54-7380dfc9973b/CSSS.jpeg`,
      durationMinutes: 120, priceCents: 12000, baseCapacity: 10, maxCapacity: 10, paymentMode: "full", depositType: "percent", depositValue: 100,
      bufferMinutes: 15, slotIntervalMinutes: 30, minNoticeHours: 12 },
    { locationId: studio.id, slug: "studio-4-hour", name: "Four Hour Studio Booking", kind: "studio", sort: 2,
      description: "Room to stretch out: back-to-back sessions, branding days and bigger shoots.",
      inclusions: "Natural-light studio\nBackdrops & furniture sets\nSeasonal setups", imageUrl: `${IMG}/58322ddd-bb51-426e-aa16-ea4983148290/CSS+2.jpeg`,
      durationMinutes: 240, priceCents: 24000, baseCapacity: 10, maxCapacity: 10, paymentMode: "full", depositType: "percent", depositValue: 100,
      bufferMinutes: 15, slotIntervalMinutes: 30, minNoticeHours: 12 },
    { locationId: studio.id, slug: "studio-tour", name: "Studio Tour", kind: "tour", sort: 3,
      description: "A 20-minute tour of the studio. The $20 fee is credited toward a future booking.",
      imageUrl: `${IMG}/ecce2a95-656e-4c62-a6de-27f5102325b2/CSS+-+Gallery+1.jpeg`,
      durationMinutes: 20, priceCents: 2000, baseCapacity: 4, maxCapacity: 4, paymentMode: "full", depositType: "percent", depositValue: 100,
      bufferMinutes: 10, slotIntervalMinutes: 30, minNoticeHours: 24 },
    ...venuePackages(riverbank, "riverbank"),
    ...venuePackages(modesto, "modesto"),
  ]);

  await db.insert(schema.addOns).values([
    { name: "Linen napkin upgrade", description: "Swap paper napkins for linen.", priceCents: 200, priceType: "per_guest", appliesTo: "rental", sort: 1 },
    { name: "Floral centerpiece upgrade", description: "Upgraded floral centerpieces for every table.", priceCents: 15000, priceType: "flat", appliesTo: "rental", sort: 2 },
    { name: "Extra setup hour", description: "Arrive an hour early to set up.", priceCents: 15000, priceType: "flat", appliesTo: "rental", sort: 3 },
  ]);

  await seedPages();
  console.log("Seeded locations, packages, hours and add-ons.");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
