import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthedUserAndProfile, isApprovedAdmin } from "@/lib/auth/session-profile";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { RosterManager, type ManagedOperator } from "./roster-manager";

export const dynamic = "force-dynamic";

type OperatorRow = {
  id: string;
  callsign: string;
  display_name: string | null;
  rank: string | null;
  primary_role: string | null;
  secondary_role: string | null;
  team_role: string | null;
  joined_at: string | null;
  display_order: number | null;
  is_public: boolean;
  is_featured: boolean;
  active: boolean;
  short_bio: string | null;
  long_bio: string | null;
  portrait_url: string | null;
  roster_notes: string | null;
};

export default async function RosterPage() {
  const { user, profile } = await getAuthedUserAndProfile();
  if (!user) redirect("/");
  if (!isApprovedAdmin(profile)) redirect("/command");

  const admin = createSupabaseAdmin();
  const [{ data: operators }, { data: profiles }, { data: rsvps }] = await Promise.all([
    admin.from("operators").select("id,callsign,display_name,rank,primary_role,secondary_role,team_role,joined_at,display_order,is_public,is_featured,active,short_bio,long_bio,portrait_url,roster_notes").order("display_order", { ascending: true }),
    admin.from("profiles").select("id,operator_id,email"),
    admin.from("event_rsvps").select("profile_id,status,attended")
  ]);

  const operatorByProfile = new Map<string, string>();
  const emailByOperator = new Map<string, string>();
  for (const row of (profiles ?? []) as { id: string; operator_id: string | null; email: string | null }[]) {
    if (row.operator_id) {
      operatorByProfile.set(row.id, row.operator_id);
      if (row.email && !emailByOperator.has(row.operator_id)) emailByOperator.set(row.operator_id, row.email);
    }
  }
  const invited = new Map<string, number>();
  const going = new Map<string, number>();
  const games = new Map<string, number>();
  const noShows = new Map<string, number>();
  const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);
  for (const rsvp of (rsvps ?? []) as { profile_id: string; status: string; attended: boolean | null }[]) {
    const operatorId = operatorByProfile.get(rsvp.profile_id);
    if (!operatorId) continue;
    bump(invited, operatorId);
    if (rsvp.status === "going") bump(going, operatorId);
    if (rsvp.attended === true) bump(games, operatorId);
    if (rsvp.status === "going" && rsvp.attended === false) bump(noShows, operatorId);
  }

  const managed: ManagedOperator[] = ((operators ?? []) as OperatorRow[]).map((operator) => ({
    ...operator,
    invited: invited.get(operator.id) ?? 0,
    saidYes: going.get(operator.id) ?? 0,
    games: games.get(operator.id) ?? 0,
    noShows: noShows.get(operator.id) ?? 0,
    memberEmail: emailByOperator.get(operator.id) ?? null
  }));

  return (
    <main className="section command-page">
      <Link href="/command" className="text-link"><ArrowLeft size={16} /> Command center</Link>
      <span className="kicker">ADMIN MODULE // PERSONNEL</span>
      <h1 className="page-title">Roster management.</h1>
      <p>
        Add operators and edit identity, rank/status, field role, patch date, bios, and public visibility.
        Long-term event attendance — invitations received, RSVP&apos;d yes, games actually played, and RSVP&apos;d-but-no-show —
        is recorded from the Events module. Changes made here publish to the public roster immediately when an operator
        is marked public.
      </p>
      <RosterManager operators={managed} />
    </main>
  );
}
