"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type ManagedOperator = {
  id: string;
  callsign: string;
  display_name: string | null;
  rank: string | null;
  primary_role: string | null;
  secondary_role: string | null;
  team_role: string | null;
  joined_at: string | null;
  display_order: number | null;
  is_public: boolean;
  is_featured: boolean;
  active: boolean;
  short_bio: string | null;
  long_bio: string | null;
  portrait_url: string | null;
  roster_notes: string | null;
  invited: number;
  saidYes: number;
  games: number;
  noShows: number;
  memberEmail: string | null;
};

type FormState = {
  callsign: string;
  display_name: string;
  rank: string;
  primary_role: string;
  secondary_role: string;
  team_role: string;
  joined_at: string;
  display_order: string;
  is_public: boolean;
  is_featured: boolean;
  active: boolean;
  short_bio: string;
  long_bio: string;
  portrait_url: string;
  roster_notes: string;
};

function toForm(operator?: ManagedOperator): FormState {
  return {
    callsign: operator?.callsign ?? "",
    display_name: operator?.display_name ?? "",
    rank: operator?.rank ?? "",
    primary_role: operator?.primary_role ?? "",
    secondary_role: operator?.secondary_role ?? "",
    team_role: operator?.team_role ?? "",
    joined_at: operator?.joined_at ?? "",
    display_order: operator?.display_order != null ? String(operator.display_order) : "0",
    is_public: operator?.is_public ?? false,
    is_featured: operator?.is_featured ?? false,
    active: operator?.active ?? true,
    short_bio: operator?.short_bio ?? "",
    long_bio: operator?.long_bio ?? "",
    portrait_url: operator?.portrait_url ?? "",
    roster_notes: operator?.roster_notes ?? ""
  };
}

async function adminToken() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your admin session expired. Sign in again.");
  return token;
}

function OperatorEditor({ operator, onSaved }: { operator?: ManagedOperator; onSaved: () => void }) {
  const [form, setForm] = useState<FormState>(toForm(operator));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const isCreate = !operator;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setOk(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const token = await adminToken();
      const endpoint = isCreate ? "/api/admin/operators" : `/api/admin/operators/${operator!.id}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, display_order: Number.parseInt(form.display_order, 10) || 0 })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save operator.");
      setOk(true);
      if (isCreate) setForm(toForm());
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save operator.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="operator-form" onSubmit={(event) => { event.preventDefault(); save(); }}>
      <div className="field-grid">
        <label>Callsign<input value={form.callsign} onChange={(e) => update("callsign", e.target.value)} required /></label>
        <label>Name<input value={form.display_name} onChange={(e) => update("display_name", e.target.value)} /></label>
        <label>Rank / status<input value={form.rank} onChange={(e) => update("rank", e.target.value)} placeholder="Recruit, Squad Member, Command…" /></label>
        <label>Joined (patched) date<input type="date" value={form.joined_at} onChange={(e) => update("joined_at", e.target.value)} /></label>
        <label>Primary role<input value={form.primary_role} onChange={(e) => update("primary_role", e.target.value)} /></label>
        <label>Secondary role<input value={form.secondary_role} onChange={(e) => update("secondary_role", e.target.value)} /></label>
        <label>Field role (public)<input value={form.team_role} onChange={(e) => update("team_role", e.target.value)} /></label>
        <label>Display order<input type="number" value={form.display_order} onChange={(e) => update("display_order", e.target.value)} /></label>
      </div>
      <label>Short bio<input value={form.short_bio} onChange={(e) => update("short_bio", e.target.value)} maxLength={160} /></label>
      <label>Full bio<textarea rows={4} value={form.long_bio} onChange={(e) => update("long_bio", e.target.value)} /></label>
      <label>Portrait URL<input value={form.portrait_url} onChange={(e) => update("portrait_url", e.target.value)} placeholder="https://…" /></label>
      <label>Roster notes (private)<input value={form.roster_notes} onChange={(e) => update("roster_notes", e.target.value)} /></label>
      <div className="checkbox-row">
        <label className="checkbox"><input type="checkbox" checked={form.is_public} onChange={(e) => update("is_public", e.target.checked)} /> Public on site</label>
        <label className="checkbox"><input type="checkbox" checked={form.is_featured} onChange={(e) => update("is_featured", e.target.checked)} /> Featured</label>
        <label className="checkbox"><input type="checkbox" checked={form.active} onChange={(e) => update("active", e.target.checked)} /> Active</label>
      </div>
      {error ? <div className="notice" role="alert">{error}</div> : null}
      {ok ? <div className="form-success">Saved.</div> : null}
      <div className="form-actions">
        <button className="button primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : isCreate ? "Create operator" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function RosterManager({ operators }: { operators: ManagedOperator[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const onSaved = () => router.refresh();

  return (
    <div className="roster-manager">
      <div className="roster-toolbar">
        <button type="button" className="button ghost" onClick={() => setCreating((value) => !value)}>
          <Plus size={15} /> {creating ? "Cancel new operator" : "Add operator"}
        </button>
      </div>

      {creating ? (
        <div className="command-panel operator-card-editor">
          <div className="panel-label"><span>NEW OPERATOR</span></div>
          <OperatorEditor onSaved={() => { onSaved(); setCreating(false); }} />
        </div>
      ) : null}

      <div className="roster-list">
        {operators.map((operator) => (
          <details className="command-panel operator-card-editor" key={operator.id}>
            <summary>
              <span className="operator-summary-name">{operator.callsign}</span>
              <span className="operator-summary-meta">{operator.display_name ?? "—"} · {operator.rank ?? "—"}</span>
              <span className="operator-summary-stats">
                <span className={`status-pill ${operator.is_public ? "status-approved" : "status-pending"}`}>{operator.is_public ? "public" : "hidden"}</span>
                <span className="operator-games">{operator.invited} invited · {operator.saidYes} yes · {operator.games} games{operator.noShows ? ` · ${operator.noShows} no-show` : ""}</span>
              </span>
            </summary>
            <OperatorEditor operator={operator} onSaved={onSaved} />
          </details>
        ))}
      </div>
    </div>
  );
}
