import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await session.from("profiles").select("role,account_status").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.account_status !== "approved") redirect("/command");

  const admin = createSupabaseAdmin();
  const { data: operators } = await admin
    .from("operators")
    .select("id,callsign,display_name,rank,team_role,short_bio,is_public,active,joined_at")
    .order("display_order", { ascending: true });

  return (
    <main className="section command-page">
      <Link href="/command" className="text-link"><ArrowLeft size={16} /> Command center</Link>
      <span className="kicker">ADMIN MODULE // PERSONNEL</span>
      <h1 className="page-title">Roster management.</h1>
      <p>Review operator identity, rank, field role, public visibility, patch date, and dossier readiness.</p>
      <div className="admin-table">
        <div className="admin-table-head"><span>CALLSIGN</span><span>NAME</span><span>RANK</span><span>ROLE</span><span>PUBLIC</span></div>
        {(operators ?? []).map((operator) => (
          <div className="admin-table-row five" key={operator.id}>
            <strong>{operator.callsign}</strong><span>{operator.display_name ?? "—"}</span><span>{operator.rank ?? "—"}</span><span>{operator.team_role ?? "—"}</span><em>{operator.is_public ? "YES" : "NO"}</em>
          </div>
        ))}
      </div>
    </main>
  );
}
