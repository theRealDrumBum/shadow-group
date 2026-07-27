"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function GoogleLoginButton() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setCheckingSession(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=/command`;
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (authError) throw authError;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start Google sign-in.");
      setLoading(false);
    }
  }

  async function signOut() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signOut();
      if (authError) throw authError;
      setUser(null);
      window.location.assign("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign out.");
      setLoading(false);
    }
  }

  if (checkingSession) {
    return <button className="button ghost" type="button" disabled>Checking access...</button>;
  }

  if (user) {
    return (
      <span className="auth-control authenticated">
        <Link className="button ghost" href="/command">
          <ShieldCheck size={16} /> Open Command Center
        </Link>
        <button className="auth-signout" type="button" onClick={signOut} disabled={loading} aria-label="Sign out">
          <LogOut size={15} />
        </button>
        {error ? <small role="alert">{error}</small> : null}
      </span>
    );
  }

  return (
    <span className="auth-control">
      <button className="button ghost" type="button" onClick={signIn} disabled={loading}>
        <LogIn size={16} /> {loading ? "Connecting..." : "Command Access"}
      </button>
      {error ? <small role="alert">{error}</small> : null}
    </span>
  );
}
