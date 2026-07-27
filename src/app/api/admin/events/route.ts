import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true, nullsFirst: false });
  if (error) return NextResponse.json({ error: "Unable to load events." }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body?.name || !body?.slug) {
    return NextResponse.json({ error: "Event name and slug are required." }, { status: 400 });
  }

  const record = {
    slug: String(body.slug),
    name: String(body.name),
    event_date: body.event_date || null,
    end_date: body.end_date || null,
    organizer: body.organizer || null,
    venue_name: body.venue_name || null,
    location: body.location || null,
    summary: body.summary || null,
    description: body.description || null,
    cover_image_url: body.cover_image_url || null,
    event_url: body.event_url || null,
    ticket_url: body.ticket_url || null,
    attendance_status: body.attendance_status || "attending",
    is_featured: Boolean(body.is_featured),
    is_public: body.is_public !== false,
    attribution_source: body.attribution_source || "shadow-group",
    attribution_medium: body.attribution_medium || "team-site",
    attribution_campaign: body.attribution_campaign || body.slug,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await auth.supabase
    .from("events")
    .upsert(record, { onConflict: "slug" })
    .select("*")
    .single();
  if (error) {
    console.error("Admin event save failed", error);
    return NextResponse.json({ error: "Unable to save event." }, { status: 500 });
  }
  return NextResponse.json({ event: data }, { status: 201 });
}
