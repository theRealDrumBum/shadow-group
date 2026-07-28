import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { EventsConsole, type EventItem, type RsvpEntry } from "./events-console";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  name: string;
  event_date: string | null;
  location: string | null;
  venue_name: string | null;
  organizer: string | null;
  cover_image_url: string | null;
  event_url: string | null;
  is_public: boolean;
};

type RsvpRow = {
  event_id: string;
  profile_id: string;
  status: string;
  attended: boolean | null;
  profiles: { display_name: string | null; email: string | null } | { display_name: string | null; email: string | null }[] | null;
};

export default async function EventsPage() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await session
    .from("profiles")
    .select("role,account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.account_status !== "approved") redirect("/command");
  const isAdmin = profile.role === "admin";

  const admin = createSupabaseAdmin();
  const [{ data: eventRows }, { data: rsvpRows }] = await Promise.all([
    admin
      .from("events")
      .select("id,name,event_date,location,venue_name,organizer,cover_image_url,event_url,is_public")
      .order("event_date", { ascending: true, nullsFirst: false }),
    admin
      .from("event_rsvps")
      .select("event_id,profile_id,status,attended,profiles(display_name,email)")
  ]);

  const rsvpsByEvent = new Map<string, RsvpEntry[]>();
  const myStatusByEvent = new Map<string, string>();
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
    if (row.profile_id === user.id) myStatusByEvent.set(row.event_id, row.status);
  }

  const events: EventItem[] = ((eventRows ?? []) as EventRow[]).map((event) => {
    const rsvps = rsvpsByEvent.get(event.id) ?? [];
    return {
      id: event.id,
      name: event.name,
      event_date: event.event_date,
      location: event.location,
      venue_name: event.venue_name,
      organizer: event.organizer,
      cover_image_url: event.cover_image_url,
      event_url: event.event_url,
      is_public: event.is_public,
      goingCount: rsvps.filter((r) => r.status === "going").length,
      maybeCount: rsvps.filter((r) => r.status === "maybe").length,
      notGoingCount: rsvps.filter((r) => r.status === "not_going").length,
      myStatus: myStatusByEvent.get(event.id) ?? null,
      rsvps: isAdmin ? rsvps : []
    };
  });

  return (
    <main className="section command-page">
      <Link href="/command" className="text-link"><ArrowLeft size={16} /> Command center</Link>
      <span className="kicker">{isAdmin ? "ADMIN MODULE // DEPLOYMENTS" : "MEMBER MODULE // DEPLOYMENTS"}</span>
      <h1 className="page-title">Events.</h1>
      <p>
        {isAdmin
          ? "Import events from a link, publish them, track who is coming, and record who actually showed up."
          : "Tell the team whether you're coming. Your RSVP helps command coordinate rides, loadouts, and headcount."}
      </p>
      <EventsConsole isAdmin={isAdmin} events={events} />
    </main>
  );
}
