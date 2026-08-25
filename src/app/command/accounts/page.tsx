import { redirect } from "next/navigation";
import { getAuthedUserAndProfile, isApprovedAdmin } from "@/lib/auth/session-profile";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { CommandPageHeader } from "../command-header";
import { AccountsManager, type AccountRow, type OperatorOption } from "./accounts-manager";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const { user, profile } = await getAuthedUserAndProfile();
  if (!user) redirect("/command/login");
  if (!isApprovedAdmin(profile)) redirect("/command");

  const admin = createSupabaseAdmin();
  const [{ data: accounts }, { data: operators }] = await Promise.all([
    admin.from("profiles").select("id,email,display_name,role,account_status,operator_id,last_sign_in_at").order("account_status", { ascending: true }).order("email", { ascending: true }),
    admin.from("operators").select("id,callsign").order("display_order", { ascending: true })
  ]);

  return (
    <main className="command-page">
      <CommandPageHeader
        kicker="Access"
        title="Accounts"
        description="Approve sign-ins, set role, and link a login to a roster operator. Pending accounts cannot use Command until you approve them."
      />
      <AccountsManager accounts={(accounts ?? []) as AccountRow[]} operators={(operators ?? []) as OperatorOption[]} />
    </main>
  );
}
