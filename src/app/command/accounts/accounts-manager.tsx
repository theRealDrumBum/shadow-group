"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type AccountRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  account_status: string;
  operator_id: string | null;
  last_sign_in_at: string | null;
};

export type OperatorOption = { id: string; callsign: string };

const ROLES = ["pending", "recruit", "member", "editor", "admin", "alumni"];
const STATUSES = ["pending", "approved", "suspended", "denied"];

async function adminToken() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your admin session expired. Sign in again.");
  return token;
}

function AccountEditor({ account, operators, onSaved }: { account: AccountRow; operators: OperatorOption[]; onSaved: () => void }) {
  const [role, setRole] = useState(account.role);
  const [status, setStatus] = useState(account.account_status);
  const [operatorId, setOperatorId] = useState(account.operator_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const token = await adminToken();
      const response = await fetch(`/api/admin/accounts/${account.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role, account_status: status, operator_id: operatorId || null })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update account.");
      setOk(true);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="account-editor">
      <div className="account-head">
        <div>
          <strong>{account.display_name ?? account.email ?? "Unknown"}</strong>
          <span>{account.email}</span>
        </div>
        <span className={`status-pill status-${status === "approved" ? "approved" : status === "denied" || status === "suspended" ? "rejected" : "pending"}`}>{status}</span>
      </div>
      <div className="field-grid">
        <label>Role
          <select value={role} onChange={(e) => { setRole(e.target.value); setOk(false); }}>
            {ROLES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>Account status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setOk(false); }}>
            {STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label>Linked operator
          <select value={operatorId} onChange={(e) => { setOperatorId(e.target.value); setOk(false); }}>
            <option value="">— none —</option>
            {operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.callsign}</option>)}
          </select>
        </label>
      </div>
      {error ? <div className="notice" role="alert">{error}</div> : null}
      {ok ? <div className="form-success">Saved.</div> : null}
      <div className="form-actions">
        <button type="button" className="button primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

export function AccountsManager({ accounts, operators }: { accounts: AccountRow[]; operators: OperatorOption[] }) {
  const router = useRouter();
  const pending = accounts.filter((account) => account.account_status === "pending");
  const others = accounts.filter((account) => account.account_status !== "pending");
  const onSaved = () => router.refresh();

  return (
    <div className="accounts-manager">
      <div className="command-panel">
        <div className="panel-label"><span>PENDING APPROVAL</span><span>{pending.length}</span></div>
        {pending.length ? (
          <div className="accounts-list">
            {pending.map((account) => <AccountEditor key={account.id} account={account} operators={operators} onSaved={onSaved} />)}
          </div>
        ) : <p className="admin-empty">No accounts are waiting for approval.</p>}
      </div>

      <div className="command-panel">
        <div className="panel-label"><span>ALL ACCOUNTS</span><span>{others.length}</span></div>
        <div className="accounts-list">
          {others.map((account) => <AccountEditor key={account.id} account={account} operators={operators} onSaved={onSaved} />)}
        </div>
      </div>
    </div>
  );
}
