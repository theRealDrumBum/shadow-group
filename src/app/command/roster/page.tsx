import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type OperatorRow = {
  id: string;
  callsign: string;
  display_name: string | null;
  rank: string | null;
  team_role: string | null;
  is_public: boolean;
  joined_at: string | null;
};

export default async function RosterPage() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await session.from("profiles").select("role,account_status").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.account_status !== "approved") redirect("/command");

  const admin = createSupabaseAdmin();
  const [{ data: operators }, { data: profiles }, { data: rsvps }] = await Promise.all([
    admin.from("operators").select("id,callsign,display_name,rank,team_role,is_public,joined_at").order("display_order", { ascending: true }),
    admin.from("profiles").select("id,operator_id"),
    admin.from("event_rsvps").select("profile_id,status,attended")
  ]);

  // Map each profile to its operator, then tally attendance per operator.
  const operatorByProfile = new Map<string, string>();
  for (const row of (profiles ?? []) as { id: string; operator_id: string | null }[]) {
    if (row.operator_id) operatorByProfile.set(row.id, row.operator_id);
  }
  const games = new Map<string, number>();
  const noShows = new Map<string, number>();
  for (const rsvp of (rsvps ?? []) as { profile_id: string; status: string; attended: boolean | null }[]) {
    const operatorId = operatorByProfile.get(rsvp.profile_id);
    if (!operatorId) continue;
    if (rsvp.attended === true) games.set(operatorId, (games.get(operatorId) ?? 0) + 1);
    if (rsvp.status === "going" && rsvp.attended === false) noShows.set(operatorId, (noShows.get(operatorId) ?? 0) + 1);
  }

  return (
    <main className="section command-page">
      <Link href="/command" className="text-link"><ArrowLeft size={16} /> Command center</Link>
      <span className="kicker">ADMIN MODULE // PERSONNEL</span>
      <h1 className="page-title">Roster management.</h1>
      <p>Identity, rank, field role, patch date, public visibility, and game attendance — including who RSVP&apos;d yes but didn&apos;t show.</p>
      <div className="admin-table">
        <div className="admin-table-head roster-row"><span>CALLSIGN</span><span>NAME</span><span>RANK</span><span>ROLE</span><span>JOINED</span><span>GAMES</span><span>NO-SHOWS</span><span>PUBLIC</span></div>
        {((operators ?? []) as OperatorRow[]).map((operator) => (
          <div className="admin-table-row roster-row" key={operator.id}>
            <strong>{operator.callsign}</strong>
            <span>{operator.display_name ?? "—"}</span>
            <span>{operator.rank ?? "—"}</span>
            <span>{operator.team_role ?? "—"}</span>
            <span>{operator.joined_at ?? "—"}</span>
            <span>{games.get(operator.id) ?? 0}</span>
            <span>{noShows.get(operator.id) ?? 0}</span>
            <em>{operator.is_public ? "YES" : "NO"}</em>
          </div>
        ))}
      </div>
      <div className="notice">
        Attendance is recorded from event RSVPs: administrators mark who actually attended on each event in the
        Events module, which populates games played and no-show counts here.
      </div>
    </main>
  );
}
