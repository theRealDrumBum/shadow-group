"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type BrandRow = {
  id: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  description: string | null;
  partnership_level: string | null;
  is_sponsor: boolean;
  is_active: boolean;
  featured: boolean;
  display_order: number | null;
};

export type GearRow = {
  id: string;
  name: string;
  category: string;
  model: string | null;
  brand_id: string | null;
  image_url: string | null;
  product_url: string | null;
  affiliate_url: string | null;
  affiliate_network: string | null;
  affiliate_campaign: string | null;
  affiliate_code: string | null;
  sponsor_note: string | null;
  disclosure_text: string | null;
  is_active: boolean;
  brand?: { name: string } | null;
};

export type LoadoutRow = {
  id: string;
  operator_id: string;
  gear_id: string | null;
  custom_name: string | null;
  category: string;
  loadout_group: string | null;
  sponsor_label: string | null;
  is_sponsored: boolean;
  is_public: boolean;
  is_featured: boolean;
  display_order: number | null;
  gear?: { name: string } | null;
};

export type OperatorOption = { id: string; callsign: string };

async function adminToken() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your admin session expired. Sign in again.");
  return token;
}

async function send(url: string, method: string, body?: unknown) {
  const token = await adminToken();
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error ?? "Request failed.");
  return payload;
}

function useSaver(onDone: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setSaving(true);
    setError(null);
    try {
      await fn();
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  };
  return { saving, error, run };
}

/* ---------------- Brands ---------------- */
function BrandForm({ brand, onDone }: { brand?: BrandRow; onDone: () => void }) {
  const [f, setF] = useState({
    name: brand?.name ?? "",
    website_url: brand?.website_url ?? "",
    logo_url: brand?.logo_url ?? "",
    description: brand?.description ?? "",
    partnership_level: brand?.partnership_level ?? "",
    display_order: brand?.display_order != null ? String(brand.display_order) : "0",
    is_sponsor: brand?.is_sponsor ?? false,
    is_active: brand?.is_active ?? true,
    featured: brand?.featured ?? false
  });
  const { saving, error, run } = useSaver(onDone);
  const save = () => run(async () => {
    const payload = { ...f, display_order: Number.parseInt(f.display_order, 10) || 0 };
    await send(brand ? `/api/admin/brands/${brand.id}` : "/api/admin/brands", "POST", payload);
  });
  return (
    <form className="operator-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div className="field-grid">
        <label>Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
        <label>Website<input value={f.website_url} onChange={(e) => setF({ ...f, website_url: e.target.value })} placeholder="https://…" /></label>
        <label>Logo URL<input value={f.logo_url} onChange={(e) => setF({ ...f, logo_url: e.target.value })} /></label>
        <label>Partnership level<input value={f.partnership_level} onChange={(e) => setF({ ...f, partnership_level: e.target.value })} placeholder="Sponsor, Affiliate…" /></label>
        <label>Display order<input type="number" value={f.display_order} onChange={(e) => setF({ ...f, display_order: e.target.value })} /></label>
      </div>
      <label>Description<textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
      <div className="checkbox-row">
        <label className="checkbox"><input type="checkbox" checked={f.is_sponsor} onChange={(e) => setF({ ...f, is_sponsor: e.target.checked })} /> Sponsor</label>
        <label className="checkbox"><input type="checkbox" checked={f.featured} onChange={(e) => setF({ ...f, featured: e.target.checked })} /> Featured</label>
        <label className="checkbox"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Active</label>
      </div>
      {error ? <div className="notice" role="alert">{error}</div> : null}
      <div className="form-actions"><button className="button primary" disabled={saving}>{saving ? "Saving…" : brand ? "Save brand" : "Add brand"}</button></div>
    </form>
  );
}

/* ---------------- Gear ---------------- */
function GearForm({ item, brands, onDone }: { item?: GearRow; brands: BrandRow[]; onDone: () => void }) {
  const [f, setF] = useState({
    name: item?.name ?? "",
    category: item?.category ?? "",
    brand_id: item?.brand_id ?? "",
    model: item?.model ?? "",
    image_url: item?.image_url ?? "",
    product_url: item?.product_url ?? "",
    affiliate_url: item?.affiliate_url ?? "",
    affiliate_network: item?.affiliate_network ?? "",
    affiliate_campaign: item?.affiliate_campaign ?? "",
    affiliate_code: item?.affiliate_code ?? "",
    sponsor_note: item?.sponsor_note ?? "",
    disclosure_text: item?.disclosure_text ?? "",
    is_active: item?.is_active ?? true
  });
  const { saving, error, run } = useSaver(onDone);
  const save = () => run(async () => {
    await send(item ? `/api/admin/gear/${item.id}` : "/api/admin/gear", "POST", { ...f, brand_id: f.brand_id || null });
  });
  return (
    <form className="operator-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <div className="field-grid">
        <label>Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
        <label>Category<input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Rifle, Optic, Plate Carrier…" required /></label>
        <label>Brand
          <select value={f.brand_id} onChange={(e) => setF({ ...f, brand_id: e.target.value })}>
            <option value="">— none —</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label>Model<input value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })} /></label>
        <label>Image URL<input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} /></label>
        <label>Product URL<input value={f.product_url} onChange={(e) => setF({ ...f, product_url: e.target.value })} placeholder="https://…" /></label>
        <label>Affiliate URL<input value={f.affiliate_url} onChange={(e) => setF({ ...f, affiliate_url: e.target.value })} placeholder="https://… (attribution link)" /></label>
        <label>Affiliate network<input value={f.affiliate_network} onChange={(e) => setF({ ...f, affiliate_network: e.target.value })} /></label>
        <label>Affiliate campaign<input value={f.affiliate_campaign} onChange={(e) => setF({ ...f, affiliate_campaign: e.target.value })} /></label>
        <label>Affiliate code<input value={f.affiliate_code} onChange={(e) => setF({ ...f, affiliate_code: e.target.value })} /></label>
      </div>
      <label>Sponsor note<input value={f.sponsor_note} onChange={(e) => setF({ ...f, sponsor_note: e.target.value })} /></label>
      <label>Disclosure text<input value={f.disclosure_text} onChange={(e) => setF({ ...f, disclosure_text: e.target.value })} placeholder="e.g. Affiliate link — we may earn a commission." /></label>
      <div className="checkbox-row">
        <label className="checkbox"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Active (public)</label>
      </div>
      {error ? <div className="notice" role="alert">{error}</div> : null}
      <div className="form-actions"><button className="button primary" disabled={saving}>{saving ? "Saving…" : item ? "Save gear" : "Add gear"}</button></div>
    </form>
  );
}

/* ---------------- Loadouts ---------------- */
function LoadoutSection({ operators, gear, loadout }: { operators: OperatorOption[]; gear: GearRow[]; loadout: LoadoutRow[] }) {
  const router = useRouter();
  const [operatorId, setOperatorId] = useState(operators[0]?.id ?? "");
  const items = useMemo(() => loadout.filter((item) => item.operator_id === operatorId), [loadout, operatorId]);
  const { saving, error, run } = useSaver(() => router.refresh());
  const [add, setAdd] = useState({ gear_id: "", custom_name: "", category: "", loadout_group: "", sponsor_label: "", is_sponsored: false, is_public: true, is_featured: false });

  const addItem = () => run(async () => {
    await send("/api/admin/loadout", "POST", { ...add, operator_id: operatorId });
    setAdd({ gear_id: "", custom_name: "", category: "", loadout_group: "", sponsor_label: "", is_sponsored: false, is_public: true, is_featured: false });
  });
  const removeItem = (id: string) => run(async () => { await send(`/api/admin/loadout/${id}`, "DELETE"); });
  const togglePublic = (item: LoadoutRow) => run(async () => { await send(`/api/admin/loadout/${item.id}`, "POST", { is_public: !item.is_public }); });

  return (
    <div className="command-panel gear-panel">
      <div className="panel-label"><span>OPERATOR LOADOUTS</span></div>
      <label className="loadout-operator-select">Operator
        <select value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
          {operators.map((op) => <option key={op.id} value={op.id}>{op.callsign}</option>)}
        </select>
      </label>

      <div className="loadout-items">
        {items.length === 0 ? <p className="admin-empty">No loadout items for this operator yet.</p> : items.map((item) => (
          <div className="loadout-row" key={item.id}>
            <span className="loadout-name">{item.gear?.name ?? item.custom_name}</span>
            <span className="loadout-cat">{item.category}{item.loadout_group ? ` · ${item.loadout_group}` : ""}</span>
            {item.sponsor_label ? <span className="status-pill status-approved">{item.sponsor_label}</span> : null}
            <div className="loadout-row-actions">
              <button type="button" className="chip" onClick={() => togglePublic(item)} disabled={saving}>{item.is_public ? "Public" : "Hidden"}</button>
              <button type="button" className="chip chip-off" onClick={() => removeItem(item.id)} disabled={saving} aria-label="Remove"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      <form className="operator-form" onSubmit={(e) => { e.preventDefault(); addItem(); }}>
        <div className="field-grid">
          <label>From catalog
            <select value={add.gear_id} onChange={(e) => setAdd({ ...add, gear_id: e.target.value })}>
              <option value="">— custom item —</option>
              {gear.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.category})</option>)}
            </select>
          </label>
          <label>Custom name<input value={add.custom_name} onChange={(e) => setAdd({ ...add, custom_name: e.target.value })} disabled={Boolean(add.gear_id)} /></label>
          <label>Category<input value={add.category} onChange={(e) => setAdd({ ...add, category: e.target.value })} placeholder="Rifle, Optic…" required /></label>
          <label>Group<input value={add.loadout_group} onChange={(e) => setAdd({ ...add, loadout_group: e.target.value })} placeholder="Primary, Sidearm…" /></label>
          <label>Sponsor label<input value={add.sponsor_label} onChange={(e) => setAdd({ ...add, sponsor_label: e.target.value })} /></label>
        </div>
        <div className="checkbox-row">
          <label className="checkbox"><input type="checkbox" checked={add.is_sponsored} onChange={(e) => setAdd({ ...add, is_sponsored: e.target.checked })} /> Sponsored</label>
          <label className="checkbox"><input type="checkbox" checked={add.is_public} onChange={(e) => setAdd({ ...add, is_public: e.target.checked })} /> Public</label>
          <label className="checkbox"><input type="checkbox" checked={add.is_featured} onChange={(e) => setAdd({ ...add, is_featured: e.target.checked })} /> Featured</label>
        </div>
        {error ? <div className="notice" role="alert">{error}</div> : null}
        <div className="form-actions"><button className="button primary" disabled={saving || !operatorId}><Plus size={14} /> Add to loadout</button></div>
      </form>
    </div>
  );
}

export function GearConsole({ brands, gear, operators, loadout }: { brands: BrandRow[]; gear: GearRow[]; operators: OperatorOption[]; loadout: LoadoutRow[] }) {
  const router = useRouter();
  const onDone = () => router.refresh();
  const [addingBrand, setAddingBrand] = useState(false);
  const [addingGear, setAddingGear] = useState(false);

  return (
    <div className="gear-console">
      <section>
        <div className="gear-section-head"><h2>Brands &amp; sponsors</h2><button className="button ghost" type="button" onClick={() => setAddingBrand((v) => !v)}><Plus size={14} /> {addingBrand ? "Cancel" : "Add brand"}</button></div>
        {addingBrand ? <div className="command-panel gear-panel"><BrandForm onDone={() => { onDone(); setAddingBrand(false); }} /></div> : null}
        <div className="roster-list">
          {brands.map((brand) => (
            <details className="command-panel gear-panel" key={brand.id}>
              <summary><span className="operator-summary-name">{brand.name}</span><span className="operator-summary-stats"><span className={`status-pill ${brand.is_active ? "status-approved" : "status-pending"}`}>{brand.is_active ? "active" : "off"}</span>{brand.is_sponsor ? <span className="status-pill status-approved">sponsor</span> : null}</span></summary>
              <BrandForm brand={brand} onDone={onDone} />
            </details>
          ))}
        </div>
      </section>

      <section>
        <div className="gear-section-head"><h2>Gear catalog</h2><button className="button ghost" type="button" onClick={() => setAddingGear((v) => !v)}><Plus size={14} /> {addingGear ? "Cancel" : "Add gear"}</button></div>
        {addingGear ? <div className="command-panel gear-panel"><GearForm brands={brands} onDone={() => { onDone(); setAddingGear(false); }} /></div> : null}
        <div className="roster-list">
          {gear.map((item) => (
            <details className="command-panel gear-panel" key={item.id}>
              <summary><span className="operator-summary-name">{item.name}</span><span className="operator-summary-meta">{item.category}{item.brand?.name ? ` · ${item.brand.name}` : ""}</span><span className="operator-summary-stats">{item.affiliate_url ? <span className="status-pill status-approved">affiliate</span> : null}<span className={`status-pill ${item.is_active ? "status-approved" : "status-pending"}`}>{item.is_active ? "active" : "off"}</span></span></summary>
              <GearForm item={item} brands={brands} onDone={onDone} />
            </details>
          ))}
        </div>
      </section>

      <section>
        <div className="gear-section-head"><h2>Loadouts</h2></div>
        <LoadoutSection operators={operators} gear={gear} loadout={loadout} />
      </section>
    </div>
  );
}
