import { getSettings } from "@/lib/settings";
import { stripeEnabled } from "@/lib/payments";
import { saveSettingsAction } from "../../actions";
import Flash from "../../Flash";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ msg?: string; tone?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  return (
    <>
      <div className="page-head"><h1>Payments &amp; policies</h1></div>
      <Flash {...sp} />
      {!stripeEnabled() && <div className="alert warn">Demo mode: no Stripe key is set, so payments are simulated. See the setup guide to connect Stripe.</div>}
      <form action={saveSettingsAction} className="stack" style={{ maxWidth: 820 }}>
        <div className="card">
          <h3>Payment schedule</h3>
          <div className="grid3">
            <div className="field"><label>Charge balance (days before event)</label><input type="number" name="balanceDaysBefore" defaultValue={s.balanceDaysBefore} min={0} />
              <div className="hint">Bookings made closer than this pay in full.</div></div>
            <div className="field"><label>Balance reminder (days before charge)</label><input type="number" name="balanceReminderDays" defaultValue={s.balanceReminderDays} min={0} /></div>
            <div className="field"><label>Post-event review reminder (hours after)</label><input type="number" name="postEventReminderHours" defaultValue={s.postEventReminderHours} min={0} /></div>
          </div>
          <div className="grid3">
            <div className="field"><label>Hold unpaid checkouts (minutes)</label><input type="number" name="pendingHoldMinutes" defaultValue={s.pendingHoldMinutes} min={30} /></div>
            <div className="field"><label>Book up to (days ahead)</label><input type="number" name="maxAdvanceDays" defaultValue={s.maxAdvanceDays} /></div>
          </div>
          <input type="hidden" name="tourCreditEnabled" value="off" /><label className="check"><input type="checkbox" name="tourCreditEnabled" defaultChecked={s.tourCreditEnabled} /> Credit tour fees toward the customer&apos;s next booking</label>
        </div>
        <div className="card">
          <h3>Policies (shown at checkout and in emails)</h3>
          <div className="field"><label>Cancellation &amp; refund policy</label><textarea name="cancellationPolicy" defaultValue={s.cancellationPolicy} /></div>
          <div className="field"><label>Cleaning, damage &amp; overtime policy</label><textarea name="damagePolicy" defaultValue={s.damagePolicy} /></div>
          <div className="field"><label>Card authorization wording</label><textarea name="consentText" defaultValue={s.consentText} />
            <div className="hint">Customers must tick this box to book. It&apos;s your proof of permission for later charges if one is ever disputed.</div></div>
        </div>
        <div className="card">
          <h3>Business details</h3>
          <div className="grid2">
            <div className="field"><label>Business name</label><input name="businessName" defaultValue={s.businessName} /></div>
            <div className="field"><label>Notification email (gets alerts)</label><input type="email" name="adminEmail" defaultValue={s.adminEmail} /></div>
            <div className="field"><label>Phone</label><input name="phone" defaultValue={s.phone} /></div>
            <div className="field"><label>Instagram URL</label><input name="instagram" defaultValue={s.instagram} /></div>
          </div>
          <div className="field"><label>Tagline</label><input name="tagline" defaultValue={s.tagline} /></div>
          <input type="hidden" name="timezone" value={s.timezone} />
        </div>
        <div className="card">
          <h3>Email wording</h3>
          <div className="field"><label>Booking confirmation opening line</label><textarea name="confirmationIntro" defaultValue={s.confirmationIntro} style={{ minHeight: 60 }} /></div>
          <div className="field"><label>Payment reminder opening line</label><textarea name="reminderIntro" defaultValue={s.reminderIntro} style={{ minHeight: 60 }} /></div>
        </div>
        <div><button className="btn">Save settings</button></div>
      </form>
    </>
  );
}
