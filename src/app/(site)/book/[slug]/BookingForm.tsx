"use client";
import { useEffect, useMemo, useState } from "react";

type Pkg = { id: number; name: string; kind: string; priceCents: number; durationMinutes: number; baseCapacity: number; maxCapacity: number;
  extraGuestFeeCents: number; paymentMode: string; depositType: string; depositValue: number };
type AddOn = { id: number; name: string; description: string; priceCents: number; priceType: string };
type Slot = { time: string; label: string };
type Quote = { basePriceCents: number; extraGuestFeeCents: number; addOns: { id: number; name: string; qty: number; totalCents: number }[];
  subtotalCents: number; creditCents: number; totalCents: number; firstPaymentCents: number; balanceCents: number;
  balanceDueAt: string | null; payInFullReason: string | null };

const money = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function BookingForm({ pkg, addOns, policies, locationName }: {
  pkg: Pkg; addOns: AddOn[]; locationName: string;
  policies: { cancellation: string; damage: string; consent: string; balanceDaysBefore: number };
}) {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [openDays, setOpenDays] = useState<Record<string, boolean> | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [guests, setGuests] = useState(pkg.kind === "tour" ? 1 : Math.min(pkg.baseCapacity, 25));
  const [picked, setPicked] = useState<number[]>([]);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", notes: "" });
  const [agree, setAgree] = useState(false);
  const [q, setQ] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOpenDays(null);
    fetch(`/api/month?pkg=${pkg.id}&month=${view.y}-${pad(view.m + 1)}`).then((r) => r.json()).then((d) => setOpenDays(d.days));
  }, [view, pkg.id]);

  useEffect(() => {
    if (!date) return;
    setSlots(null); setTime(null);
    fetch(`/api/slots?pkg=${pkg.id}&date=${date}`).then((r) => r.json()).then((d) => setSlots(d.slots));
  }, [date, pkg.id]);

  useEffect(() => {
    if (!date || !time) { setQ(null); return; }
    const t = setTimeout(() => {
      fetch("/api/quote", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id, date, time, guests, addOnIds: picked, email: contact.email }) })
        .then((r) => r.json()).then((d) => setQ(d.quote ?? null));
    }, 250);
    return () => clearTimeout(t);
  }, [date, time, guests, picked, contact.email, pkg.id]);

  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1).getDay();
    const days = new Date(view.y, view.m + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [view]);

  const canPrev = view.y > today.getFullYear() || view.m > today.getMonth();
  const shift = (n: number) => setView((v) => { const d = new Date(v.y, v.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const ready = date && time && contact.name.trim() && /\S+@\S+\.\S+/.test(contact.email) && contact.phone.trim() && agree && q;

  async function submit() {
    setBusy(true); setError(null);
    const r = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId: pkg.id, date, time, guests, addOnIds: picked, ...contact }) });
    const d = await r.json();
    if (!r.ok) { setError(d.error || "Something went wrong."); setBusy(false); if (r.status === 409 && date) { setDate(null); setTimeout(() => setDate(date), 0); } return; }
    window.location.href = d.checkoutUrl;
  }

  const selectedSlot = slots?.find((s) => s.time === time);
  const niceDate = date ? new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "";

  return (
    <div className="book-layout" style={{ marginTop: 24 }}>
      <div>
        <div className="step">
          <h3><span>01</span> Pick a date</h3>
          <div className="cal card" style={{ maxWidth: 440 }}>
            <div className="cal-head">
              <button className="btn ghost sm" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous month">‹</button>
              <strong>{MONTHS[view.m]} {view.y}</strong>
              <button className="btn ghost sm" onClick={() => shift(1)} aria-label="Next month">›</button>
            </div>
            <div className="cal-grid">
              {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="dow">{d}</div>)}
              {cells.map((d, i) => {
                if (d === null) return <div key={i} className="day empty" />;
                const key = ymd(view.y, view.m, d);
                const open = openDays?.[key];
                return (
                  <button key={i} className={`day ${!open ? "off" : ""} ${date === key ? "sel" : ""}`} disabled={!open}
                    onClick={() => setDate(key)}>{d}</button>
                );
              })}
            </div>
            {!openDays && <p className="small muted" style={{ margin: "10px 0 0" }}>Checking availability…</p>}
          </div>
        </div>

        {date && (
          <div className="step">
            <h3><span>02</span> Pick a time</h3>
            <p className="small muted">{niceDate}</p>
            {!slots ? <p className="muted small">Loading times…</p> : slots.length === 0 ? <p className="muted">No times left on this day.</p> : (
              <div className="slots">
                {slots.map((s) => <button key={s.time} className={`slot ${time === s.time ? "sel" : ""}`} onClick={() => setTime(s.time)}>{s.label}</button>)}
              </div>
            )}
          </div>
        )}

        {time && (
          <>
            {pkg.kind !== "tour" && (
              <div className="step">
                <h3><span>03</span> Guests{addOns.length > 0 && " & add-ons"}</h3>
                <div className="field" style={{ maxWidth: 220 }}>
                  <label htmlFor="guests">Number of guests</label>
                  <input id="guests" type="number" min={1} max={pkg.maxCapacity} value={guests}
                    onChange={(e) => setGuests(Math.max(1, Math.min(pkg.maxCapacity, Number(e.target.value) || 1)))} />
                  <div className="hint">Up to {pkg.baseCapacity} included{pkg.maxCapacity > pkg.baseCapacity && pkg.extraGuestFeeCents > 0 ? `; ${pkg.baseCapacity + 1}–${pkg.maxCapacity} adds ${money(pkg.extraGuestFeeCents)}` : ""}.</div>
                </div>
                {addOns.map((a) => (
                  <label key={a.id} className="check field">
                    <input type="checkbox" checked={picked.includes(a.id)}
                      onChange={(e) => setPicked((p) => e.target.checked ? [...p, a.id] : p.filter((x) => x !== a.id))} />
                    <span><strong>{a.name}</strong> — {money(a.priceCents)}{a.priceType === "per_guest" ? " per guest" : ""}
                      {a.description && <><br /><span className="muted small">{a.description}</span></>}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="step">
              <h3><span>{pkg.kind === "tour" ? "03" : "04"}</span> Your details</h3>
              <div className="grid2">
                <div className="field"><label htmlFor="n">Full name</label><input id="n" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} autoComplete="name" /></div>
                <div className="field"><label htmlFor="p">Phone</label><input id="p" type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} autoComplete="tel" /></div>
              </div>
              <div className="field"><label htmlFor="e">Email</label><input id="e" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} autoComplete="email" />
                <div className="hint">Booked a tour with us? Use the same email and your tour fee is credited automatically.</div></div>
              <div className="field"><label htmlFor="notes">{pkg.kind === "tour" ? "Anything we should know?" : "Tell us about your event"}</label>
                <textarea id="notes" value={contact.notes} onChange={(e) => setContact({ ...contact, notes: e.target.value })} placeholder={pkg.kind === "tour" ? "" : "Type of event, theme, vendors…"} /></div>
              {pkg.kind !== "tour" && (
                <details className="note field">
                  <summary><strong>Cancellation & post-event policies</strong></summary>
                  <p style={{ marginTop: 10 }}>{policies.cancellation}</p>
                  <p style={{ margin: 0 }}>{policies.damage}</p>
                </details>
              )}
              <label className="check">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>{pkg.kind === "tour" ? "I agree to the booking terms." : policies.consent}</span>
              </label>
            </div>
          </>
        )}
      </div>

      <aside className="sticky">
        <div className="card">
          <div className="eyebrow">Your booking</div>
          <h3 style={{ marginBottom: 4 }}>{pkg.name}</h3>
          <p className="small muted">{locationName}</p>
          {date && <p className="small" style={{ margin: "0 0 4px" }}>{niceDate}</p>}
          {selectedSlot && <p className="small">{selectedSlot.label}</p>}
          {!q ? (
            <p className="small muted">{money(pkg.priceCents)} · pick a date and time to see your total.</p>
          ) : (
            <>
              <div className="summary-row"><span>{pkg.name}</span><span>{money(q.basePriceCents)}</span></div>
              {q.extraGuestFeeCents > 0 && <div className="summary-row"><span>Extra guests ({guests})</span><span>{money(q.extraGuestFeeCents)}</span></div>}
              {q.addOns.map((a) => <div key={a.id} className="summary-row"><span>{a.name}{a.qty > 1 ? ` × ${a.qty}` : ""}</span><span>{money(a.totalCents)}</span></div>)}
              {q.creditCents > 0 && <div className="summary-row" style={{ color: "var(--ok)" }}><span>Tour credit</span><span>−{money(q.creditCents)}</span></div>}
              <div className="summary-row total"><span>Total</span><span>{money(q.totalCents)}</span></div>
              {q.balanceCents > 0 ? (
                <div className="note" style={{ marginTop: 12 }}>
                  <div className="summary-row" style={{ padding: 0 }}><strong>Deposit due today</strong><strong>{money(q.firstPaymentCents)}</strong></div>
                  <div className="small" style={{ marginTop: 6 }}>Remaining {money(q.balanceCents)} charges automatically to your saved card on{" "}
                    {new Date(q.balanceDueAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ({policies.balanceDaysBefore} days before).</div>
                </div>
              ) : (
                <div className="note" style={{ marginTop: 12 }}>
                  <div className="summary-row" style={{ padding: 0 }}><strong>Due today</strong><strong>{money(q.firstPaymentCents)}</strong></div>
                  {q.payInFullReason === "soon" && <div className="small" style={{ marginTop: 6 }}>Events within {policies.balanceDaysBefore} days are paid in full at booking.</div>}
                </div>
              )}
            </>
          )}
          {error && <div className="alert bad" style={{ marginTop: 14 }}>{error}</div>}
          <button className="btn block" style={{ marginTop: 16 }} disabled={!ready || busy} onClick={submit}>
            {busy ? "Starting secure checkout…" : q ? `Continue to payment · ${money(q.firstPaymentCents)}` : "Continue to payment"}
          </button>
          <p className="small muted" style={{ margin: "10px 0 0", textAlign: "center" }}>Secure checkout. Your card is saved for your balance and any post-event fees.</p>
        </div>
      </aside>
    </div>
  );
}
