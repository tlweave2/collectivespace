import { getSettings } from "@/lib/settings";
import { HEADING_FONTS, BODY_FONTS } from "@/lib/sections";
import { saveSettingsAction } from "../../actions";
import { ImageInput } from "../../ImagePicker";
import Flash from "../../Flash";

export default async function Design({ searchParams }: { searchParams: Promise<{ msg?: string; tone?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const Color = ({ name, label, value, hint }: { name: string; label: string; value: string; hint: string }) => (
    <div className="field"><label>{label}</label>
      <div className="row" style={{ flexWrap: "nowrap" }}><input type="color" name={name} defaultValue={value} style={{ width: 54, height: 42, padding: 2 }} /><span className="small muted">{hint}</span></div>
    </div>
  );
  return (
    <>
      <div className="page-head"><h1>Look &amp; feel</h1></div>
      <Flash {...sp} />
      <form action={saveSettingsAction} className="stack" style={{ maxWidth: 820 }}>
        <input type="hidden" name="_return" value="/admin/design" />
        <div className="card">
          <h3>Logo</h3>
          <ImageInput name="logoUrl" defaultValue={s.logoUrl} />
          <div className="hint" style={{ marginTop: 6 }}>Leave empty to show your business name in the heading font. A wide PNG with a transparent background works best.</div>
        </div>
        <div className="card">
          <h3>Colors</h3>
          <div className="grid2">
            <Color name="colorInk" label="Text & dark backgrounds" value={s.colorInk} hint="Headings, text, buttons" />
            <Color name="colorPaper" label="Page background" value={s.colorPaper} hint="Behind everything" />
            <Color name="colorAccent" label="Accent" value={s.colorAccent} hint="Small headings, links, Accent sections" />
            <Color name="colorSand" label="Soft background" value={s.colorSand} hint="Warm sections, notes, photo placeholders" />
          </div>
        </div>
        <div className="card">
          <h3>Fonts &amp; buttons</h3>
          <div className="grid3">
            <div className="field"><label>Headings</label><select name="headingFont" defaultValue={s.headingFont}>{HEADING_FONTS.map((f) => <option key={f}>{f}</option>)}</select></div>
            <div className="field"><label>Body text</label><select name="bodyFont" defaultValue={s.bodyFont}>{BODY_FONTS.map((f) => <option key={f}>{f}</option>)}</select></div>
            <div className="field"><label>Button shape</label><select name="buttonShape" defaultValue={s.buttonShape}><option value="pill">Rounded pill</option><option value="rounded">Soft corners</option><option value="square">Square</option></select></div>
          </div>
          <input type="hidden" name="headingUppercase" value="off" />
          <label className="check"><input type="checkbox" name="headingUppercase" defaultChecked={s.headingUppercase} /> ALL-CAPS headings</label>
        </div>
        <div className="card">
          <h3>Top menu</h3>
          <input type="hidden" name="showLocationsInMenu" value="off" />
          <label className="check field"><input type="checkbox" name="showLocationsInMenu" defaultChecked={s.showLocationsInMenu} /> Show each location in the menu</label>
          <p className="small muted">To add pages to the menu, tick &quot;Show in top menu&quot; in a page&apos;s settings.</p>
          <div className="grid2">
            <div className="field"><label>Menu button text</label><input name="bookButtonText" defaultValue={s.bookButtonText} /><div className="hint">Leave blank to hide the button.</div></div>
            <div className="field"><label>Menu button link</label><input name="bookButtonLink" defaultValue={s.bookButtonLink} /></div>
          </div>
        </div>
        <div className="card">
          <h3>Footer</h3>
          <div className="field"><label>Footer text</label><textarea name="footerText" defaultValue={s.footerText} placeholder={s.tagline} /><div className="hint">Under your business name. Leave blank to use the tagline.</div></div>
        </div>
        <div><button className="btn">Save look &amp; feel</button></div>
      </form>
    </>
  );
}
