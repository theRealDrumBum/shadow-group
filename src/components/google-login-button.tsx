"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { createOptionalClient } from "@/lib/supabase/client";

type CommandAccessButtonProps = {
  initiallyAuthenticated?: boolean;
};

export function CommandAccessButton({ initiallyAuthenticated = false }: CommandAccessButtonProps) {
  const [authenticated, setAuthenticated] = useState(initiallyAuthenticated);
  const [checkingSession, setCheckingSession] = useState(!initiallyAuthenticated);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createOptionalClient();
    if (!supabase) {
      setCheckingSession(false);
      return;
    }

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

  async function signOut() {
    setLoading(true);
    setError(null);

    try {
      const supabase = createOptionalClient();
      if (!supabase) throw new Error("Command access is not configured.");
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
        <button className="auth-signout" type="button" onClick={() => void signOut()} disabled={loading} aria-label="Sign out">
          <LogOut size={15} />
        </button>
        {error ? <small role="alert">{error}</small> : null}
      </span>
    );
  }

  return (
    <span className="auth-control">
      <Link className="button ghost" href="/command/login">
        <LogIn size={16} /> Command Access
      </Link>
      {error ? <small role="alert">{error}</small> : null}
    </span>
  );
}

export function GoogleLoginButton(props: CommandAccessButtonProps) {
  return <CommandAccessButton {...props} />;
}
