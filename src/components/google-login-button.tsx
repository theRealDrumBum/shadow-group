"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type GoogleLoginButtonProps = {
  initiallyAuthenticated?: boolean;
};

export function GoogleLoginButton({ initiallyAuthenticated = false }: GoogleLoginButtonProps) {
  const [authenticated, setAuthenticated] = useState(initiallyAuthenticated);
  const [checkingSession, setCheckingSession] = useState(!initiallyAuthenticated);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    if (!initiallyAuthenticated) {
      supabase.auth.getUser().then(({ data }) => {
        setAuthenticated(Boolean(data.user));
        setCheckingSession(false);
      });
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session?.user));
      setCheckingSession(false);
    });

    return () => listener.subscription.unsubscribe();
  }, [initiallyAuthenticated]);

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
      const { error: authError } = await supabase.auth.signOut({ scope: "local" });
      if (authError) throw authError;
      setAuthenticated(false);
      window.location.replace("/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign out.");
      setLoading(false);
    }
  }

  if (checkingSession) {
    return <button className="button ghost" type="button" disabled>Checking access...</button>;
  }

  if (authenticated) {
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
