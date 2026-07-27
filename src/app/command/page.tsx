import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CommandPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,email,role,account_status")
    .eq("id", user.id)
    .maybeSingle();

  const status = profile?.account_status ?? "pending";
  const role = profile?.role ?? "pending";
  const approved = status === "approved";

  return (
    <main className="section">
      <div className="section-index">COMMAND ACCESS</div>
      <span className="kicker">GOOGLE IDENTITY VERIFIED</span>
      <h1>{approved ? "Access granted." : "Approval pending."}</h1>
      <p>
        Signed in as {profile?.email ?? user.email}. Your Shadow Group role is
        <strong> {role}</strong> and your account status is <strong>{status}</strong>.
      </p>
      {approved ? (
        <p>Your available command modules will appear here based on your assigned role.</p>
      ) : (
        <p>An administrator must approve this account before member or recruit tools become available.</p>
      )}
      <Link href="/" className="button secondary">Return to team site</Link>
    </main>
  );
}
