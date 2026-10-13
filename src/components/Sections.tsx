import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import type { Section } from "@/lib/sections";
import { money, durationLabel } from "@/lib/time";

// ---------- Simple, safe formatting: paragraphs, **bold**, [links](url), "- " bullets ----------
function inline(text: string, keyBase: string) {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${keyBase}-${i++}`}>{m[1]}</strong>);
    else {
      const href = /^(https?:|mailto:|tel:|\/|#)/.test(m[3]) ? m[3] : "#";
      out.push(<a key={`${keyBase}-${i++}`} href={href}>{m[2]}</a>);
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <>
      {String(text).split(/\n\s*\n/).map((block, bi) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return <ul key={bi} className="list" style={{ marginBottom: "1em" }}>{lines.map((l, li) => <li key={li}>{inline(l.replace(/^\s*[-•]\s+/, ""), `${bi}-${li}`)}</li>)}</ul>;
        }
        return <p key={bi}>{lines.flatMap((l, li) => (li ? [<br key={`br${li}`} />, ...inline(l, `${bi}-${li}`)] : inline(l, `${bi}-${li}`)))}</p>;
      })}
    </>
  );
}

function Button({ text, link, light }: { text?: unknown; link?: unknown; light?: boolean }) {
  if (!text) return null;
  const href = String(link || "#");
  const style = light ? { background: "#fff", color: "var(--ink)", borderColor: "#fff" } : undefined;
  return href.startsWith("http") ? <a className="btn" href={href} style={style}>{String(text)}</a> : <Link className="btn" href={href} style={style}>{String(text)}</Link>;
}

const s = (v: unknown) => (v == null ? "" : String(v));

function videoEmbed(url: string) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export default async function Sections({ sections }: { sections: Section[] }) {
  const visible = sections.filter((x) => !x.hidden);
  if (!visible.length) return null;
  const settings = await getSettings();
  const locs = await db.select().from(schema.locations).where(eq(schema.locations.active, true)).orderBy(asc(schema.locations.sort));
  const pkgs = await db.select().from(schema.packages).where(eq(schema.packages.active, true)).orderBy(asc(schema.packages.sort));

  return (
    <>
      {visible.map((sec) => {
        const bg = s(sec.background);
        const cls = `sec sec-${sec.type} ${bg ? `bg-${bg}` : ""}`;
        const anchor = s(sec.anchor) || undefined;
        const center = sec.align === "center";
        switch (sec.type) {
          case "hero": {
            const darken = Math.max(0, Math.min(80, Number(sec.darken ?? 40))) / 100;
            return (
              <div key={sec.id} id={anchor} className={`hero hero-${s(sec.height) || "tall"}`} style={{ textAlign: center ? "center" : undefined }}>
                {sec.image ? <img src={s(sec.image)} alt="" /> : null}
                <div className="hero-shade" style={{ background: `linear-gradient(180deg, rgba(0,0,0,${darken * 0.4}), rgba(0,0,0,${darken}))` }} />
                <div className="wrap" style={center ? { display: "flex", flexDirection: "column", alignItems: "center" } : undefined}>
                  {sec.eyebrow ? <div className="eyebrow">{s(sec.eyebrow)}</div> : null}
                  {sec.heading ? <h1 style={{ maxWidth: 760 }}>{s(sec.heading)}</h1> : null}
                  {sec.text ? <div style={{ maxWidth: 580, fontSize: "1.1rem" }}><RichText text={s(sec.text)} /></div> : null}
                  <Button text={sec.buttonText} link={sec.buttonLink} light />
                </div>
              </div>
            );
          }
          case "text":
            return (
              <section key={sec.id} id={anchor} className={cls}>
                <div className="wrap narrow" style={{ textAlign: center ? "center" : undefined }}>
                  {sec.eyebrow ? <div className="eyebrow">{s(sec.eyebrow)}</div> : null}
                  {sec.heading ? <h2>{s(sec.heading)}</h2> : null}
                  <div className="prose"><RichText text={s(sec.body)} /></div>
                  <Button text={sec.buttonText} link={sec.buttonLink} />
                </div>
              </section>
            );
          case "imageText":
            return (
              <section key={sec.id} id={anchor} className={cls}>
                <div className={`wrap split ${sec.imageSide === "right" ? "img-right" : ""}`}>
                  <div>{sec.image ? <img src={s(sec.image)} alt="" className="split-img" /> : null}</div>
                  <div>
                    {sec.eyebrow ? <div className="eyebrow">{s(sec.eyebrow)}</div> : null}
                    {sec.heading ? <h2>{s(sec.heading)}</h2> : null}
                    <div className="prose"><RichText text={s(sec.body)} /></div>
                    <Button text={sec.buttonText} link={sec.buttonLink} />
                  </div>
                </div>
              </section>
            );
          case "gallery": {
            const imgs = (Array.isArray(sec.images) ? sec.images : []).map(String).filter(Boolean);
            return (
              <section key={sec.id} id={anchor} className={cls}>
                <div className="wrap">
                  {sec.heading ? <h2>{s(sec.heading)}</h2> : null}
                  <div className="gallery" style={{ ["--cols" as string]: s(sec.columns) || "3" }}>
                    {imgs.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" loading="lazy" /></a>)}
                  </div>
                </div>
              </section>
            );
          }
          case "locations":
            return (
              <section key={sec.id} id={anchor ?? "book"} className={cls}>
                <div className="wrap">
                  {sec.eyebrow ? <div className="eyebrow">{s(sec.eyebrow)}</div> : null}
                  {sec.heading ? <h2>{s(sec.heading)}</h2> : null}
                  {sec.text ? <div className="muted" style={{ maxWidth: 640 }}><RichText text={s(sec.text)} /></div> : null}
                  <div className="cards" style={{ marginTop: 24 }}>
                    {locs.map((l) => {
                      const lp = pkgs.filter((p) => p.locationId === l.id && p.kind !== "tour");
                      const from = lp.length ? Math.min(...lp.map((p) => p.priceCents)) : 0;
                      return (
                        <Link key={l.id} href={`/locations/${l.slug}`} className="tile">
                          {l.imageUrl && <img src={l.imageUrl} alt={l.name} />}
                          <div className="body">
                            <h3>{l.name}</h3>
                            <p className="muted small">{l.address}</p>
                            <p className="small">{l.description}</p>
                            <div className="meta">
                              <span className="small muted">{lp.length} option{lp.length === 1 ? "" : "s"}</span>
                              {from > 0 && <span className="small">from <span className="price">{money(from)}</span></span>}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          case "packages": {
            const list = pkgs.filter((p) => (!sec.locationId || String(p.locationId) === s(sec.locationId)) && (!sec.kind || p.kind === sec.kind));
            return (
              <section key={sec.id} id={anchor} className={cls}>
                <div className="wrap">
                  {sec.eyebrow ? <div className="eyebrow">{s(sec.eyebrow)}</div> : null}
                  {sec.heading ? <h2>{s(sec.heading)}</h2> : null}
                  <PackageCards list={list} locs={locs} showLocation={!sec.locationId} />
                </div>
              </section>
            );
          }
          case "tours":
            return (
              <section key={sec.id} id={anchor} className={cls}>
                <div className="wrap">
                  <div className="card" style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
                    <div style={{ maxWidth: 620 }}>
                      <h3>{s(sec.heading)}</h3>
                      <div className="muted" style={{ marginBottom: -16 }}><RichText text={s(sec.text)} /></div>
                    </div>
                    <div className="row">
                      {pkgs.filter((p) => p.kind === "tour").map((p) => {
                        const l = locs.find((x) => x.id === p.locationId);
                        return <Link key={p.id} href={`/book/${p.slug}`} className="btn ghost sm">Tour {l?.name.replace("Collective Space ", "")} · {durationLabel(p.durationMinutes)}</Link>;
                      })}
                    </div>
                  </div>
                </div>
              </section>
            );
          case "faq": {
            const items = (Array.isArray(sec.items) ? sec.items : []) as { q?: string; a?: string }[];
            return (
              <section key={sec.id} id={anchor} className={cls}>
                <div className="wrap narrow">
                  {sec.heading ? <h2>{s(sec.heading)}</h2> : null}
                  <div className="faq">
                    {items.filter((i) => i.q).map((i, n) => (
                      <details key={n}><summary>{i.q}</summary><div className="prose"><RichText text={i.a} /></div></details>
                    ))}
                  </div>
                </div>
              </section>
            );
          }
          case "testimonials": {
            const items = ((Array.isArray(sec.items) ? sec.items : []) as { quote?: string; name?: string }[]).filter((i) => i.quote);
            return (
              <section key={sec.id} id={anchor} className={cls}>
                <div className="wrap">
                  {sec.heading ? <h2 style={{ textAlign: "center" }}>{s(sec.heading)}</h2> : null}
                  <div className="quotes">
                    {items.map((i, n) => <figure key={n}><blockquote>“{i.quote}”</blockquote>{i.name && <figcaption>— {i.name}</figcaption>}</figure>)}
                  </div>
                </div>
              </section>
            );
          }
          case "cta":
            return (
              <section key={sec.id} id={anchor} className={`${cls} cta`}>
                <div className="wrap narrow" style={{ textAlign: "center" }}>
                  {sec.heading ? <h2>{s(sec.heading)}</h2> : null}
                  {sec.text ? <div style={{ opacity: .85 }}><RichText text={s(sec.text)} /></div> : null}
                  <Button text={sec.buttonText} link={sec.buttonLink} light={bg === "dark" || bg === "accent"} />
                </div>
              </section>
            );
          case "map": {
            const l = locs.find((x) => String(x.id) === s(sec.locationId)) ?? locs[0];
            if (!l?.address) return null;
            return (
              <section key={sec.id} id={anchor} className={cls}>
                <div className="wrap">
                  {sec.heading ? <h2>{s(sec.heading)}</h2> : null}
                  <p className="muted">{l.name} · {l.address}</p>
                  <iframe title={`Map of ${l.name}`} className="map" loading="lazy" src={`https://www.google.com/maps?q=${encodeURIComponent(l.address)}&output=embed`} />
                </div>
              </section>
            );
          }
          case "contact":
            return (
              <section key={sec.id} id={anchor} className={cls}>
                <div className="wrap">
                  {sec.heading ? <h2>{s(sec.heading)}</h2> : null}
                  {sec.text ? <div className="muted"><RichText text={s(sec.text)} /></div> : null}
                  <div className="cards" style={{ marginTop: 16 }}>
                    <div className="card">
                      <h3>Contact</h3>
                      <p style={{ margin: 0 }}><a href={`mailto:${settings.adminEmail}`}>{settings.adminEmail}</a>
                        {settings.phone && <><br /><a href={`tel:${settings.phone}`}>{settings.phone}</a></>}
                        {settings.instagram && <><br /><a href={settings.instagram}>Instagram</a></>}</p>
                    </div>
                    {locs.map((l) => <div key={l.id} className="card"><h3>{l.name}</h3><p className="muted" style={{ margin: 0 }}>{l.address}</p></div>)}
                  </div>
                </div>
              </section>
            );
          case "video": {
            const src = videoEmbed(s(sec.url));
            if (!src) return null;
            return (
              <section key={sec.id} id={anchor} className={cls}>
                <div className="wrap narrow">
                  {sec.heading ? <h2>{s(sec.heading)}</h2> : null}
                  <div className="video"><iframe src={src} title={s(sec.heading) || "Video"} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>
                </div>
              </section>
            );
          }
          default:
            return null;
        }
      })}
    </>
  );
}

export function PackageCards({ list, locs, showLocation }: {
  list: (typeof schema.packages.$inferSelect)[]; locs: (typeof schema.locations.$inferSelect)[]; showLocation?: boolean;
}) {
  return (
    <div className="cards" style={{ marginTop: 20 }}>
      {list.map((p) => (
        <div key={p.id} className="tile">
          {p.imageUrl && <img src={p.imageUrl} alt={p.name} />}
          <div className="body">
            <h3>{p.name}</h3>
            <p className="small muted" style={{ margin: 0 }}>
              {showLocation && `${locs.find((l) => l.id === p.locationId)?.name ?? ""} · `}
              {durationLabel(p.durationMinutes)}
              {p.kind === "rental" && ` · up to ${p.baseCapacity} guests${p.maxCapacity > p.baseCapacity ? ` (${p.maxCapacity} with fee)` : ""}`}
            </p>
            <p className="small">{p.description}</p>
            {p.inclusions && (
              <details className="small">
                <summary>What&apos;s included</summary>
                <ul className="list" style={{ marginTop: 8 }}>{p.inclusions.split("\n").filter(Boolean).map((i) => <li key={i}>{i}</li>)}</ul>
              </details>
            )}
            <div className="meta">
              <span className="price">{money(p.priceCents)}</span>
              <Link href={`/book/${p.slug}`} className="btn sm">Book</Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
