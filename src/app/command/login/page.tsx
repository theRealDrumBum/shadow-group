import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createOptionalClient } from "@/lib/supabase/server";
import { hasPublicSupabaseConfig } from "@/lib/supabase/config";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

const AUTH_ERRORS: Record<string, string> = {
  missing_code: "Google sign-in did not return a session. Use email and password below, or reconnect Google in Supabase Auth.",
  callback_failed: "Google sign-in failed. Use email and password, or check the Supabase redirect URL and Google provider settings."
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; auth_error?: string; error?: string }>;
};

export default async function CommandLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createOptionalClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (user) redirect("/command");

  const nextPath = params.next && params.next.startsWith("/") && !params.next.startsWith("//")
    ? params.next
    : "/command";
  const errorKey = params.auth_error ?? params.error ?? "";
  const initialError = AUTH_ERRORS[errorKey] ?? (errorKey ? "Sign-in failed. Try email and password." : null);

  return (
    <main className="section command-page command-login-page">
      <Link href="/" className="brand command-login-brand">
        <Image src="/shadow_group_logo.png" width={48} height={48} alt="Shadow Group" />
        <span>
          <strong>SHADOW GROUP</strong>
          <small>COMMAND ACCESS</small>
        </span>
      </Link>
      <span className="kicker">IDENTITY // COMMAND</span>
      <h1 className="page-title">Sign in.</h1>
      <p>
        Command is for allowlisted Shadow Group accounts. Email and password work without Google.
        Google remains available if the provider is configured in Supabase Auth.
      </p>
      <LoginForm
        nextPath={nextPath}
        initialError={initialError}
        configured={hasPublicSupabaseConfig()}
      />
      <p className="command-login-back">
        <Link href="/" className="text-link">Return to team site</Link>
      </p>
    </main>
  );
}
