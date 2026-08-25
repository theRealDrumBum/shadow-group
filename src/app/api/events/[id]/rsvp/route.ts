import { NextRequest, NextResponse } from "next/server";
import { isApprovedAccount, loadSessionProfile } from "@/lib/auth/session-profile";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ALLOWED = ["going", "not_going", "maybe"] as const;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to RSVP." }, { status: 401 });

  const profile = await loadSessionProfile(user);
  if (!isApprovedAccount(profile)) {
    return NextResponse.json({ error: "Your account is not approved yet." }, { status: 403 });
  }

  const { id: eventId } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: string; note?: string } | null;
  if (!body?.status || !ALLOWED.includes(body.status as (typeof ALLOWED)[number])) {
    return NextResponse.json({ error: "Choose going, not_going, or maybe." }, { status: 400 });
  }

  // Service client performs the write, but only ever for the current user and
  // never touches the admin-controlled `attended` column.
  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("event_rsvps")
    .upsert(
      { event_id: eventId, profile_id: user.id, status: body.status, note: body.note ?? null, responded_at: now, updated_at: now },
      { onConflict: "event_id,profile_id" }
    )
    .select("event_id,status,note")
    .single();

  if (error) {
    console.error("RSVP failed", error);
    return NextResponse.json({ error: "Unable to save your RSVP." }, { status: 500 });
  }

  return NextResponse.json({ rsvp: data });
}
