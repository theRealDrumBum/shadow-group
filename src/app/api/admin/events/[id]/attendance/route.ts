import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

// Admin marks who actually attended an event (true), was a no-show (false), or
// clears the mark (null). This drives historical attendance + no-show insight.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: eventId } = await context.params;
  const body = (await request.json().catch(() => null)) as { profileId?: string; attended?: boolean | null } | null;
  if (!body?.profileId) {
    return NextResponse.json({ error: "profileId is required." }, { status: 400 });
  }
  const attended = body.attended === undefined ? null : body.attended;

  const { data, error } = await auth.supabase
    .from("event_rsvps")
    .update({ attended, updated_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("profile_id", body.profileId)
    .select("profile_id,attended")
    .maybeSingle();

  if (error) {
    console.error("Attendance update failed", error);
    return NextResponse.json({ error: "Unable to update attendance." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "That member has no RSVP for this event." }, { status: 404 });
  }

  return NextResponse.json({ attendance: data });
}
