// Section types for the page builder. Shared by the public renderer and the admin editor.

export type FieldType = "text" | "textarea" | "image" | "images" | "select" | "location" | "items" | "checkbox";
export type Field = {
  key: string; label: string; type: FieldType; hint?: string;
  options?: { value: string; label: string }[];
  itemFields?: { key: string; label: string; type: "text" | "textarea" | "image" }[];
};
export type Section = { id: string; type: string; hidden?: boolean; background?: string; [key: string]: unknown };

const BUTTON: Field[] = [
  { key: "buttonText", label: "Button text", type: "text", hint: "Leave blank for no button" },
  { key: "buttonLink", label: "Button link", type: "text", hint: "e.g. /book/riverbank-full-day, /about, #book, or a full https:// link" },
];
const ALIGN: Field = { key: "align", label: "Text alignment", type: "select", options: [{ value: "left", label: "Left" }, { value: "center", label: "Center" }] };

export const SECTION_TYPES: Record<string, { label: string; description: string; fields: Field[]; defaults: Record<string, unknown> }> = {
  hero: {
    label: "Hero banner", description: "Big photo with a headline on top",
    fields: [
      { key: "image", label: "Background photo", type: "image" },
      { key: "eyebrow", label: "Small text above headline", type: "text" },
      { key: "heading", label: "Headline", type: "text" },
      { key: "text", label: "Intro text", type: "textarea" },
      ...BUTTON,
      { key: "height", label: "Height", type: "select", options: [{ value: "tall", label: "Tall" }, { value: "medium", label: "Medium" }, { value: "short", label: "Short" }] },
      { key: "darken", label: "Darken photo (%)", type: "text", hint: "0–80. Higher makes white text easier to read." },
      ALIGN,
    ],
    defaults: { heading: "Your headline", text: "", height: "tall", darken: "40", align: "left", buttonText: "", buttonLink: "" },
  },
  text: {
    label: "Text", description: "A heading and paragraphs",
    fields: [
      { key: "eyebrow", label: "Small text above heading", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Text", type: "textarea", hint: "Blank line = new paragraph. **bold**, [link text](/page), and lines starting with - make a bullet list." },
      ...BUTTON, ALIGN,
    ],
    defaults: { heading: "Heading", body: "Write something here.", align: "left" },
  },
  imageText: {
    label: "Photo + text", description: "A photo beside a block of text",
    fields: [
      { key: "image", label: "Photo", type: "image" },
      { key: "imageSide", label: "Photo side", type: "select", options: [{ value: "left", label: "Left" }, { value: "right", label: "Right" }] },
      { key: "eyebrow", label: "Small text above heading", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Text", type: "textarea", hint: "Blank line = new paragraph. **bold**, [link text](/page), - bullet." },
      ...BUTTON,
    ],
    defaults: { heading: "Heading", body: "", imageSide: "left" },
  },
  gallery: {
    label: "Photo gallery", description: "A grid of photos",
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "images", label: "Photos", type: "images" },
      { key: "columns", label: "Columns", type: "select", options: [{ value: "2", label: "2" }, { value: "3", label: "3" }, { value: "4", label: "4" }] },
    ],
    defaults: { heading: "", images: [], columns: "3" },
  },
  locations: {
    label: "Location cards", description: "Cards linking to each location, with starting prices",
    fields: [{ key: "eyebrow", label: "Small text above heading", type: "text" }, { key: "heading", label: "Heading", type: "text" }, { key: "text", label: "Intro text", type: "textarea" }],
    defaults: { eyebrow: "Choose a space", heading: "Where would you like to book?", text: "" },
  },
  packages: {
    label: "Booking options", description: "Package cards with prices and Book buttons",
    fields: [
      { key: "eyebrow", label: "Small text above heading", type: "text" },
      { key: "heading", label: "Heading", type: "text" },
      { key: "locationId", label: "Location", type: "location" },
      { key: "kind", label: "Show", type: "select", options: [{ value: "", label: "All types" }, { value: "rental", label: "Event rentals" }, { value: "studio", label: "Studio sessions" }, { value: "tour", label: "Tours" }] },
    ],
    defaults: { heading: "Booking options", locationId: "", kind: "" },
  },
  tours: {
    label: "Tour invite", description: "A box inviting people to book a tour",
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "text", label: "Text", type: "textarea" }],
    defaults: { heading: "Want to see it in person first?", text: "Book a 20-minute tour of any location. Your tour fee is credited toward your booking." },
  },
  faq: {
    label: "FAQ", description: "Questions that open to show answers",
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "items", label: "Questions", type: "items", itemFields: [{ key: "q", label: "Question", type: "text" }, { key: "a", label: "Answer", type: "textarea" }] }],
    defaults: { heading: "Frequently asked questions", items: [{ q: "Question?", a: "Answer." }] },
  },
  testimonials: {
    label: "Reviews", description: "Quotes from happy customers",
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "items", label: "Reviews", type: "items", itemFields: [{ key: "quote", label: "Quote", type: "textarea" }, { key: "name", label: "Name / event", type: "text" }] }],
    defaults: { heading: "Kind words", items: [{ quote: "", name: "" }] },
  },
  cta: {
    label: "Call to action", description: "A bold banner with a button",
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "text", label: "Text", type: "textarea" }, ...BUTTON],
    defaults: { heading: "Ready to celebrate?", text: "", buttonText: "Check availability", buttonLink: "/#book", background: "dark" },
  },
  map: {
    label: "Map", description: "A Google map of a location",
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "locationId", label: "Location", type: "location" }],
    defaults: { heading: "Find us", locationId: "" },
  },
  contact: {
    label: "Contact info", description: "Email, phone, Instagram and addresses",
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "text", label: "Text", type: "textarea" }],
    defaults: { heading: "Get in touch", text: "" },
  },
  video: {
    label: "Video", description: "A YouTube or Vimeo video",
    fields: [{ key: "heading", label: "Heading", type: "text" }, { key: "url", label: "YouTube or Vimeo link", type: "text" }],
    defaults: { heading: "", url: "" },
  },
};

export const BACKGROUNDS = [
  { value: "", label: "Page background" }, { value: "light", label: "White" },
  { value: "sand", label: "Warm" }, { value: "dark", label: "Dark" }, { value: "accent", label: "Accent color" },
];

export function newSection(type: string): Section {
  return { id: Math.random().toString(36).slice(2, 10), type, background: "", hidden: false, ...structuredClone(SECTION_TYPES[type].defaults) };
}

export const HEADING_FONTS = ["Cormorant Garamond", "Playfair Display", "Libre Baskerville", "DM Serif Display", "Lora", "Bodoni Moda", "Italiana", "Montserrat", "Josefin Sans", "Jost"];
export const BODY_FONTS = ["Jost", "Inter", "Montserrat", "Poppins", "Raleway", "Lato", "Nunito Sans", "Work Sans", "Lora"];
