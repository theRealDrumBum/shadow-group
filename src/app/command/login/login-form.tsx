"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Mail, ShieldCheck } from "lucide-react";
import { createOptionalClient } from "@/lib/supabase/client";
import { hasPublicSupabaseConfig } from "@/lib/supabase/config";

type LoginFormProps = {
  nextPath: string;
  initialError?: string | null;
  configured: boolean;
};

function safeNext(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/command";
}

export function LoginForm({ nextPath, initialError, configured }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"signin" | "register" | "google" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [notice, setNotice] = useState<string | null>(null);

  const destination = safeNext(nextPath);

  async function signInWithPassword() {
    setBusy("signin");
    setError(null);
    setNotice(null);
    try {
      const supabase = createOptionalClient();
      if (!supabase) throw new Error("Command access is not configured.");
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (authError) throw authError;
      router.replace(destination);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setBusy(null);
    }
  }

  async function createAllowlistedAccount() {
    setBusy("register");
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/auth/command-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to create a command account.");

      const supabase = createOptionalClient();
      if (!supabase) throw new Error("Command access is not configured.");
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (authError) throw authError;
      router.replace(destination);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create a command account.");
    } finally {
      setBusy(null);
    }
  }

  async function signInWithGoogle() {
    setBusy("google");
    setError(null);
    setNotice(null);
    try {
      const supabase = createOptionalClient();
      if (!supabase) throw new Error("Command access is not configured.");
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`;
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: { access_type: "offline", prompt: "select_account" }
        }
      });
      if (authError) throw authError;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start Google sign-in.");
      setBusy(null);
    }
  }

  async function sendReset() {
    setBusy("reset");
    setError(null);
    setNotice(null);
    try {
      if (!email.trim()) throw new Error("Enter your allowlisted email first.");
      const supabase = createOptionalClient();
      if (!supabase) throw new Error("Command access is not configured.");
      const redirectTo = `${window.location.origin}/auth/callback?next=/command/set-password`;
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (authError) throw authError;
      setNotice("If that email has an account, a reset link is on the way. Check spam if it does not arrive.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send a reset email.");
    } finally {
      setBusy(null);
    }
  }

  if (!configured && !hasPublicSupabaseConfig()) {
    return (
      <div className="notice" role="alert">
        Command is not configured on this deployment. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and
        {" "}<code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel, then reload.
      </div>
    );
  }

  const disabled = Boolean(busy);

  return (
    <form
      className="command-login-form command-panel"
      onSubmit={(event) => {
        event.preventDefault();
        void signInWithPassword();
      }}
    >
      <div className="panel-label">
        <span>ALLOWLISTED SIGN-IN</span>
        <span>EMAIL OR GOOGLE</span>
      </div>
      <p className="form-hint">
        Use the email on the command allowlist (admin accounts can manage cards). First time here?
        Create an allowlisted account with the same password you want to use, then you are signed in.
      </p>
      {error ? <div className="notice" role="alert">{error}</div> : null}
      {notice ? <p className="form-success">{notice}</p> : null}

      <label>
        Email
        <input
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </label>

      <div className="form-actions">
        <button className="button primary" type="submit" disabled={disabled}>
          <LogIn size={16} /> {busy === "signin" ? "Signing in…" : "Sign in"}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={disabled}
          onClick={() => void createAllowlistedAccount()}
        >
          <Mail size={16} /> {busy === "register" ? "Creating…" : "Create allowlisted account"}
        </button>
      </div>

      <div className="command-login-alt">
        <button className="button ghost" type="button" disabled={disabled} onClick={() => void signInWithGoogle()}>
          <ShieldCheck size={16} /> {busy === "google" ? "Connecting…" : "Continue with Google"}
        </button>
        <button className="text-link" type="button" disabled={disabled} onClick={() => void sendReset()}>
          {busy === "reset" ? "Sending…" : "Forgot password?"}
        </button>
      </div>
    </form>
  );
}
