import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { AccountsManager, type AccountRow, type OperatorOption } from "./accounts-manager";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await session.from("profiles").select("role,account_status").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.account_status !== "approved") redirect("/command");

  const admin = createSupabaseAdmin();
  const [{ data: accounts }, { data: operators }] = await Promise.all([
    admin.from("profiles").select("id,email,display_name,role,account_status,operator_id,last_sign_in_at").order("account_status", { ascending: true }).order("email", { ascending: true }),
    admin.from("operators").select("id,callsign").order("display_order", { ascending: true })
  ]);

  return (
    <main className="section command-page">
      <Link href="/command" className="text-link"><ArrowLeft size={16} /> Command center</Link>
      <span className="kicker">ADMIN MODULE // ACCESS CONTROL</span>
      <h1 className="page-title">Accounts.</h1>
      <p>
        Approve new Google sign-ins, set each member&apos;s role (recruit, member, editor, admin, alumni), and link
        their login to a roster operator. Approving an account grants access to the member portal.
      </p>
      <AccountsManager accounts={(accounts ?? []) as AccountRow[]} operators={(operators ?? []) as OperatorOption[]} />
    </main>
  );
}
