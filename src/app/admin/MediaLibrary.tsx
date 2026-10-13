"use client";
import { useEffect, useRef, useState } from "react";
import { uploadImage } from "./ImagePicker";

type Item = { id: number; url: string; filename: string; width: number; height: number; size: number };

export default function MediaLibrary() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(0);
  const [copied, setCopied] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const load = () => fetch("/api/admin/media").then((r) => r.json()).then((d) => setItems(d.items));
  useEffect(() => { load(); }, []);
  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(files.length);
    for (const f of Array.from(files)) { try { await uploadImage(f); } catch (e) { alert(`${f.name}: ${(e as Error).message}`); } setBusy((n) => n - 1); }
    load();
  }
  return (
    <>
      <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}>
        <p style={{ margin: 0 }}>Drag photos here, or</p>
        <button className="btn sm" onClick={() => input.current?.click()} disabled={busy > 0}>{busy ? `Uploading ${busy}…` : "Choose photos"}</button>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </div>
      {!items ? <p className="muted">Loading…</p> : (
        <div className="lib-grid" style={{ marginTop: 20 }}>
          {items.map((m) => (
            <div key={m.id} className="lib-item static">
              <img src={m.url} alt={m.filename} loading="lazy" />
              <div className="lib-meta">
                <span className="small" title={m.filename}>{m.filename}</span>
                <div className="row" style={{ gap: 4 }}>
                  <button className="icon-btn" title="Copy link" onClick={() => { navigator.clipboard.writeText(location.origin + m.url); setCopied(m.id); setTimeout(() => setCopied(null), 1500); }}>{copied === m.id ? "✓" : "⧉"}</button>
                  <button className="icon-btn" title="Delete" onClick={async () => { if (confirm("Delete this photo? Pages using it will show a blank space.")) { await fetch(`/api/admin/media/${m.id}`, { method: "DELETE" }); load(); } }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
