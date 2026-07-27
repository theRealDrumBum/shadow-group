"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            prompt: "consent",
          },
        },
      });

      if (authError) throw authError;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start Google sign-in.");
      setLoading(false);
    }
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
