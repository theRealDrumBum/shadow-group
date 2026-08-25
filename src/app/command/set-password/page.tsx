import Link from "next/link";
import { redirect } from "next/navigation";
import { createOptionalClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./set-password-form";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage() {
  const supabase = await createOptionalClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect("/command/login");

  return (
    <main className="section command-page command-login-page">
      <span className="kicker">IDENTITY // COMMAND</span>
      <h1 className="page-title">Choose a password.</h1>
      <p>This sets an email-and-password login for your allowlisted account so Command does not depend on Google.</p>
      <SetPasswordForm />
      <p className="command-login-back">
        <Link href="/command" className="text-link">Skip and open Command</Link>
      </p>
    </main>
  );
}
