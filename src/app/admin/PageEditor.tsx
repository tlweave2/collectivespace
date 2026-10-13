"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { SECTION_TYPES, BACKGROUNDS, newSection, type Section, type Field } from "@/lib/sections";
import { savePage } from "./actions";
import { ImagePicker, ImagesPicker } from "./ImagePicker";

type PageData = { id: number; title: string; slug: string; seoDescription: string; published: boolean; showInMenu: boolean; menuOrder: number; sections: Section[] };

function FieldEditor({ f, value, onChange, locations }: { f: Field; value: unknown; onChange: (v: unknown) => void; locations: { id: number; name: string }[] }) {
  const v = value ?? "";
  switch (f.type) {
    case "textarea": return <textarea value={String(v)} onChange={(e) => onChange(e.target.value)} rows={Math.min(12, Math.max(3, String(v).split("\n").length + 1))} />;
    case "image": return <ImagePicker value={String(v)} onChange={onChange} />;
    case "images": return <ImagesPicker value={Array.isArray(v) ? (v as string[]) : []} onChange={onChange} />;
    case "select": return <select value={String(v)} onChange={(e) => onChange(e.target.value)}>{f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
    case "location": return (
      <select value={String(v)} onChange={(e) => onChange(e.target.value)}>
        <option value="">All locations</option>
        {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
    );
    case "items": {
      const items = (Array.isArray(v) ? v : []) as Record<string, string>[];
      const set = (next: Record<string, string>[]) => onChange(next);
      return (
        <div className="stack" style={{ gap: 0 }}>
          {items.map((it, i) => (
            <div key={i} className="item-box">
              <div className="spread small muted" style={{ marginBottom: 6 }}>
                <span>#{i + 1}</span>
                <span className="row" style={{ gap: 4 }}>
                  <button type="button" className="icon-btn" disabled={i === 0} onClick={() => { const a = [...items]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; set(a); }}>↑</button>
                  <button type="button" className="icon-btn" disabled={i === items.length - 1} onClick={() => { const a = [...items]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; set(a); }}>↓</button>
                  <button type="button" className="icon-btn" onClick={() => set(items.filter((_, k) => k !== i))}>✕</button>
                </span>
              </div>
              {f.itemFields!.map((sf) => (
                <div key={sf.key} className="field" style={{ marginBottom: 8 }}>
                  <label>{sf.label}</label>
                  {sf.type === "textarea"
                    ? <textarea rows={3} value={it[sf.key] ?? ""} onChange={(e) => set(items.map((x, k) => (k === i ? { ...x, [sf.key]: e.target.value } : x)))} />
                    : sf.type === "image"
                      ? <ImagePicker value={it[sf.key] ?? ""} onChange={(val) => set(items.map((x, k) => (k === i ? { ...x, [sf.key]: val } : x)))} />
                      : <input value={it[sf.key] ?? ""} onChange={(e) => set(items.map((x, k) => (k === i ? { ...x, [sf.key]: e.target.value } : x)))} />}
                </div>
              ))}
            </div>
          ))}
          <button type="button" className="btn ghost sm" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={() => set([...items, {}])}>+ Add another</button>
        </div>
      );
    }
    default: return <input value={String(v)} onChange={(e) => onChange(e.target.value)} />;
  }
}

function AddSection({ onAdd, onCancel }: { onAdd: (type: string) => void; onCancel?: () => void }) {
  return (
    <div className="add-grid">
      {Object.entries(SECTION_TYPES).map(([type, t]) => (
        <button key={type} type="button" className="add-card" onClick={() => onAdd(type)}>
          <strong>{t.label}</strong><span>{t.description}</span>
        </button>
      ))}
      {onCancel && <button type="button" className="btn ghost sm" onClick={onCancel}>Cancel</button>}
    </div>
  );
}

export default function PageEditor({ initial, locations }: { initial: PageData; locations: { id: number; name: string }[] }) {
  const [page, setPage] = useState<PageData>(initial);
  const [open, setOpen] = useState<string | null>(initial.sections[0]?.id ?? null);
  const [adding, setAdding] = useState<number | null>(initial.sections.length ? null : 0);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ tone: string; msg: string } | null>(null);
  const [pending, start] = useTransition();
  const [previewKey, setPreviewKey] = useState(0);
  const isHome = initial.slug === "home";
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const update = (p: Partial<PageData>) => { setPage((x) => ({ ...x, ...p })); setDirty(true); setStatus(null); };
  const setSections = (fn: (s: Section[]) => Section[]) => update({ sections: fn(page.sections) });
  const patch = (id: string, key: string, val: unknown) => setSections((ss) => ss.map((s) => (s.id === id ? { ...s, [key]: val } : s)));
  const move = (i: number, d: number) => setSections((ss) => { const a = [...ss]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  function save() {
    start(async () => {
      const r = await savePage(page.id, page);
      if (r.ok) {
        setDirty(false); setStatus({ tone: "ok", msg: "Saved. Your changes are live." });
        if (r.slug && r.slug !== page.slug) setPage((x) => ({ ...x, slug: r.slug! }));
        setPreviewKey((k) => k + 1);
      } else setStatus({ tone: "bad", msg: r.error || "Couldn't save." });
    });
  }

  const url = isHome ? "/" : `/${page.slug}`;
  const summary = (s: Section) => String(s.heading || s.eyebrow || s.text || s.body || s.url || "").slice(0, 60);

  return (
    <div className="editor">
      <div className="editor-main">
        <div className="editor-bar">
          <div className="small muted">{dirty ? "Unsaved changes" : "All changes saved"}</div>
          <div className="row">
            <a className="btn ghost sm" href={url} target="_blank">View page ↗</a>
            <button className="btn sm" onClick={save} disabled={pending || !dirty}>{pending ? "Saving…" : "Save & publish"}</button>
          </div>
        </div>
        {status && <div className={`alert ${status.tone}`}>{status.msg}</div>}

        <details className="card" open={!isHome && initial.sections.length <= 1}>
          <summary><strong>Page settings</strong> <span className="small muted">· title, address, menu, Google description</span></summary>
          <div style={{ marginTop: 14 }}>
            <div className="grid2">
              <div className="field"><label>Page title</label><input value={page.title} onChange={(e) => update({ title: e.target.value })} /></div>
              <div className="field"><label>Page address</label>
                {isHome ? <input value="/ (homepage)" disabled /> : <div className="row" style={{ flexWrap: "nowrap" }}><span className="muted">/</span><input value={page.slug} onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} /></div>}
              </div>
            </div>
            <div className="field"><label>Description for Google</label><textarea rows={2} value={page.seoDescription} onChange={(e) => update({ seoDescription: e.target.value })} placeholder="One or two sentences shown in search results" /></div>
            <div className="row">
              {!isHome && <label className="check" style={{ margin: 0 }}><input type="checkbox" checked={page.published} onChange={(e) => update({ published: e.target.checked })} /> Published (visible to everyone)</label>}
              <label className="check" style={{ margin: 0 }}><input type="checkbox" checked={page.showInMenu} onChange={(e) => update({ showInMenu: e.target.checked })} /> Show in top menu</label>
              {page.showInMenu && <span className="row small">Menu position <input type="number" value={page.menuOrder} onChange={(e) => update({ menuOrder: Number(e.target.value) })} style={{ width: 70 }} /></span>}
            </div>
          </div>
        </details>

        <div className="stack" style={{ marginTop: 18 }}>
          {page.sections.map((s, i) => {
            const t = SECTION_TYPES[s.type];
            if (!t) return null;
            const isOpen = open === s.id;
            return (
              <div key={s.id}>
                {adding === i ? <div className="card"><AddSection onAdd={(type) => { const n = newSection(type); setSections((ss) => [...ss.slice(0, i), n, ...ss.slice(i)]); setOpen(n.id); setAdding(null); }} onCancel={() => setAdding(null)} /></div>
                  : <button type="button" className="insert-btn" onClick={() => setAdding(i)}>+ Insert section here</button>}
                <div className={`sec-card ${s.hidden ? "is-hidden" : ""}`}>
                  <div className="sec-head" onClick={() => setOpen(isOpen ? null : s.id)}>
                    <div style={{ minWidth: 0 }}>
                      <span className="badge">{t.label}</span>{s.hidden && <span className="badge warn" style={{ marginLeft: 6 }}>Hidden</span>}
                      <span className="sec-sum">{summary(s)}</span>
                    </div>
                    <div className="row" style={{ gap: 4, flexWrap: "nowrap" }} onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="icon-btn" title="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                      <button type="button" className="icon-btn" title="Move down" disabled={i === page.sections.length - 1} onClick={() => move(i, 1)}>↓</button>
                      <button type="button" className="icon-btn" title={s.hidden ? "Show" : "Hide"} onClick={() => patch(s.id, "hidden", !s.hidden)}>{s.hidden ? "◌" : "●"}</button>
                      <button type="button" className="icon-btn" title="Duplicate" onClick={() => setSections((ss) => [...ss.slice(0, i + 1), { ...structuredClone(s), id: Math.random().toString(36).slice(2, 10) }, ...ss.slice(i + 1)])}>⧉</button>
                      <button type="button" className="icon-btn" title="Delete" onClick={() => { if (confirm(`Delete this ${t.label} section?`)) setSections((ss) => ss.filter((x) => x.id !== s.id)); }}>✕</button>
                      <span className="icon-btn" style={{ border: 0 }}>{isOpen ? "▾" : "▸"}</span>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="sec-body">
                      {t.fields.map((f) => (
                        <div key={f.key} className="field">
                          <label>{f.label}</label>
                          <FieldEditor f={f} value={s[f.key]} onChange={(v) => patch(s.id, f.key, v)} locations={locations} />
                          {f.hint && <div className="hint">{f.hint}</div>}
                        </div>
                      ))}
                      {s.type !== "hero" && (
                        <div className="field"><label>Background</label>
                          <select value={String(s.background ?? "")} onChange={(e) => patch(s.id, "background", e.target.value)}>{BACKGROUNDS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}</select>
                        </div>
                      )}
                      <div className="field"><label>Link anchor (optional)</label><input value={String(s.anchor ?? "")} onChange={(e) => patch(s.id, "anchor", e.target.value.replace(/[^a-z0-9-]/gi, ""))} placeholder="e.g. book" />
                        <div className="hint">Lets a button jump here with a link like #book.</div></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {adding === page.sections.length ? (
            <div className="card"><h3>Add a section</h3><AddSection onAdd={(type) => { const n = newSection(type); setSections((ss) => [...ss, n]); setOpen(n.id); setAdding(null); }} onCancel={page.sections.length ? () => setAdding(null) : undefined} /></div>
          ) : (
            <button type="button" className="btn ghost" onClick={() => setAdding(page.sections.length)}>+ Add section</button>
          )}
        </div>
      </div>
      <div className="editor-preview">
        <div className="spread small muted" style={{ marginBottom: 6 }}><span>Preview (updates when you save)</span><button className="icon-btn" onClick={() => setPreviewKey((k) => k + 1)}>↻</button></div>
        <iframe ref={frame} key={previewKey} src={url} title="Page preview" />
      </div>
    </div>
  );
}
