import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

// Invite the whole active roster to an event. Every approved member gets an
// "invited" RSVP they can then answer (going / not going / maybe). Idempotent:
// members who already have an RSVP are left untouched, so it is safe to re-run
// as the roster grows.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: eventId } = await context.params;

  const { data: event, error: eventError } = await auth.supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();
  if (eventError) {
    console.error("Invite roster lookup failed", eventError);
    return NextResponse.json({ error: "Unable to load that event." }, { status: 500 });
  }
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  const { data, error } = await auth.supabase.rpc("invite_roster_to_event", {
    p_event_id: eventId,
    p_invited_by: auth.user.id
  });
  if (error) {
    console.error("Invite roster failed", error);
    return NextResponse.json({ error: "Unable to invite the roster." }, { status: 500 });
  }

  const { count } = await auth.supabase
    .from("event_rsvps")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  return NextResponse.json({ invited: data ?? 0, totalInvited: count ?? 0 }, { status: 200 });
}
