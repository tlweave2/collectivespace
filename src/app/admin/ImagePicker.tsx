"use client";
import { useEffect, useRef, useState } from "react";

type MediaItem = { id: number; url: string; filename: string; width: number; height: number };

/** Shrink big phone photos before upload so pages stay fast (max 2000px, JPEG 85%). */
async function prepare(file: File): Promise<{ blob: Blob; width: number; height: number; type: string }> {
  if (file.type === "image/gif") return { blob: file, width: 0, height: 0, type: file.type };
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  const type = file.type === "image/png" && file.size < 1_500_000 ? "image/png" : "image/jpeg";
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), type, 0.85));
  return { blob, width: w, height: h, type };
}

export async function uploadImage(file: File): Promise<string> {
  const { blob, width, height, type } = await prepare(file);
  const fd = new FormData();
  fd.append("file", new File([blob], file.name.replace(/\.\w+$/, type === "image/png" ? ".png" : type === "image/gif" ? ".gif" : ".jpg"), { type }));
  fd.append("name", file.name); fd.append("width", String(width)); fd.append("height", String(height));
  const r = await fetch("/api/admin/media", { method: "POST", body: fd });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Upload failed");
  return d.url;
}

function Library({ onPick, onClose, multiple }: { onPick: (urls: string[]) => void; onClose: () => void; multiple?: boolean }) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  useEffect(() => { fetch("/api/admin/media").then((r) => r.json()).then((d) => setItems(d.items)); }, []);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="spread" style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>Photo library</h3>
          <div className="row">
            {multiple && <button type="button" className="btn sm" disabled={!sel.length} onClick={() => onPick(sel)}>Add {sel.length || ""} photo{sel.length === 1 ? "" : "s"}</button>}
            <button type="button" className="btn ghost sm" onClick={onClose}>Close</button>
          </div>
        </div>
        {!items ? <p className="muted">Loading…</p> : items.length === 0 ? <p className="muted">No photos uploaded yet. Use Upload instead.</p> : (
          <div className="lib-grid">
            {items.map((m) => (
              <button type="button" key={m.id} className={`lib-item ${sel.includes(m.url) ? "sel" : ""}`}
                onClick={() => multiple ? setSel((s) => s.includes(m.url) ? s.filter((x) => x !== m.url) : [...s, m.url]) : onPick([m.url])}>
                <img src={m.url} alt={m.filename} loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** One photo: preview, upload, choose from library, or paste a link. */
export function ImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [lib, setLib] = useState(false);
  const [err, setErr] = useState("");
  async function onFile(f?: File) {
    if (!f) return;
    setBusy(true); setErr("");
    try { onChange(await uploadImage(f)); } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  }
  return (
    <div className="picker">
      <div className="picker-thumb">{value ? <img src={value} alt="" /> : <span className="small muted">No photo</span>}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row">
          <button type="button" className="btn sm" onClick={() => input.current?.click()} disabled={busy}>{busy ? "Uploading…" : "Upload"}</button>
          <button type="button" className="btn ghost sm" onClick={() => setLib(true)}>Library</button>
          {value && <button type="button" className="btn ghost sm" onClick={() => onChange("")}>Remove</button>}
        </div>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="…or paste an image link" style={{ marginTop: 8, fontSize: ".85rem" }} />
        {err && <div className="small" style={{ color: "var(--bad)", marginTop: 4 }}>{err}</div>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      {lib && <Library onClose={() => setLib(false)} onPick={(u) => { onChange(u[0]); setLib(false); }} />}
    </div>
  );
}

/** Several photos, reorderable. */
export function ImagesPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [lib, setLib] = useState(false);
  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setBusy(list.length);
    const urls: string[] = [];
    for (const f of list) { try { urls.push(await uploadImage(f)); } catch { /* skip bad file */ } setBusy((n) => n - 1); }
    onChange([...value, ...urls]);
  }
  const move = (i: number, d: number) => { const a = [...value]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div>
      <div className="thumbs">
        {value.map((u, i) => (
          <div key={u + i} className="thumb">
            <img src={u} alt="" />
            <div className="thumb-actions">
              <button type="button" onClick={() => move(i, -1)} title="Move left">‹</button>
              <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} title="Remove">✕</button>
              <button type="button" onClick={() => move(i, 1)} title="Move right">›</button>
            </div>
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button type="button" className="btn sm" onClick={() => input.current?.click()} disabled={busy > 0}>{busy ? `Uploading ${busy}…` : "Upload photos"}</button>
        <button type="button" className="btn ghost sm" onClick={() => setLib(true)}>Add from library</button>
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      {lib && <Library multiple onClose={() => setLib(false)} onPick={(u) => { onChange([...value, ...u]); setLib(false); }} />}
    </div>
  );
}

/** Drop-in for regular admin forms: keeps a hidden input in sync. */
export function ImageInput({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [v, setV] = useState(defaultValue ?? "");
  return <><input type="hidden" name={name} value={v} /><ImagePicker value={v} onChange={setV} /></>;
}
export function ImagesInput({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [v, setV] = useState((defaultValue ?? "").split(/\s+/).filter(Boolean));
  return <><input type="hidden" name={name} value={v.join("\n")} /><ImagesPicker value={v} onChange={setV} /></>;
}
