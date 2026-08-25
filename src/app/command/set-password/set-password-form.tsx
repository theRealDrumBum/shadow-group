"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOptionalClient } from "@/lib/supabase/client";

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      if (password.length < 8) throw new Error("Password must be at least 8 characters.");
      if (password !== confirm) throw new Error("Passwords do not match.");
      const supabase = createOptionalClient();
      if (!supabase) throw new Error("Command access is not configured.");
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) throw authError;
      router.replace("/command");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="command-login-form command-panel"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <div className="panel-label">
        <span>SET PASSWORD</span>
        <span>COMMAND</span>
      </div>
      {error ? <div className="notice" role="alert">{error}</div> : null}
      <label>
        New password
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </label>
      <label>
        Confirm password
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          minLength={8}
          required
        />
      </label>
      <div className="form-actions">
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save password and open Command"}
        </button>
      </div>
    </form>
  );
}
