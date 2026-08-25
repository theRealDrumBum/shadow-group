import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthedUserAndProfile, isApprovedAccount } from "@/lib/auth/session-profile";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { EventsConsole, type EventItem, type RsvpEntry, type MyStats } from "./events-console";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  slug: string;
  name: string;
  event_date: string | null;
  end_date: string | null;
  location: string | null;
  venue_name: string | null;
  organizer: string | null;
  summary: string | null;
  description: string | null;
  cover_image_url: string | null;
  event_url: string | null;
  ticket_url: string | null;
  attendance_status: string | null;
  is_public: boolean;
  is_featured: boolean;
};

type RsvpRow = {
  event_id: string;
  profile_id: string;
  status: string;
  attended: boolean | null;
  profiles: { display_name: string | null; email: string | null } | { display_name: string | null; email: string | null }[] | null;
};

export default async function EventsPage() {
  const { user, profile } = await getAuthedUserAndProfile();
  if (!user) redirect("/");
  if (!isApprovedAccount(profile)) redirect("/command");
  const isAdmin = profile?.role === "admin";

  const admin = createSupabaseAdmin();
  const [{ data: eventRows }, { data: rsvpRows }, { count: rosterCount }] = await Promise.all([
    admin
      .from("events")
      .select("id,slug,name,event_date,end_date,location,venue_name,organizer,summary,description,cover_image_url,event_url,ticket_url,attendance_status,is_public,is_featured")
      .order("event_date", { ascending: true, nullsFirst: false }),
    admin
      .from("event_rsvps")
      .select("event_id,profile_id,status,attended,profiles(display_name,email)"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("account_status", "approved")
  ]);

  const rsvpsByEvent = new Map<string, RsvpEntry[]>();
  const myStatusByEvent = new Map<string, string>();
  const invitedEventIds = new Set<string>();
  const myStats: MyStats = { invitations: 0, going: 0, attended: 0, awaiting: 0 };

  for (const row of (rsvpRows ?? []) as RsvpRow[]) {
    const member = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const list = rsvpsByEvent.get(row.event_id) ?? [];
    list.push({
      profileId: row.profile_id,
      name: member?.display_name ?? member?.email ?? "Member",
      status: row.status,
      attended: row.attended
    });
    rsvpsByEvent.set(row.event_id, list);
    if (row.profile_id === user.id) {
      myStatusByEvent.set(row.event_id, row.status);
      invitedEventIds.add(row.event_id);
      myStats.invitations += 1;
      if (row.status === "going") myStats.going += 1;
      if (row.status === "invited") myStats.awaiting += 1;
      if (row.attended === true) myStats.attended += 1;
    }
  }

  const allEvents = ((eventRows ?? []) as EventRow[])
    // Members only see events that are public or that they have been invited to;
    // admins see everything, including private drafts.
    .filter((event) => isAdmin || event.is_public || invitedEventIds.has(event.id))
    .map((event) => {
      const rsvps = rsvpsByEvent.get(event.id) ?? [];
      return {
        ...event,
        goingCount: rsvps.filter((r) => r.status === "going").length,
        maybeCount: rsvps.filter((r) => r.status === "maybe").length,
        notGoingCount: rsvps.filter((r) => r.status === "not_going").length,
        invitedCount: rsvps.filter((r) => r.status === "invited").length,
        responseCount: rsvps.filter((r) => r.status !== "invited").length,
        myStatus: myStatusByEvent.get(event.id) ?? null,
        rsvps: isAdmin ? rsvps : []
      } satisfies EventItem;
    });

  return (
    <main className="section command-page">
      <Link href="/command" className="text-link"><ArrowLeft size={16} /> Command center</Link>
      <span className="kicker">{isAdmin ? "ADMIN MODULE // DEPLOYMENTS" : "MEMBER MODULE // DEPLOYMENTS"}</span>
      <h1 className="page-title">Events.</h1>
      <p>
        {isAdmin
          ? "Paste an event link to import the details, publish it to the public site, invite the whole roster, and record who actually showed up."
          : "You'll see every event the team invites you to here. Tell command whether you're going so we can coordinate rides, loadouts, and headcount."}
      </p>
      <EventsConsole isAdmin={isAdmin} events={allEvents} rosterCount={rosterCount ?? 0} myStats={myStats} />
    </main>
  );
}
