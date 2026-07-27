import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function trackedUrl(raw: string | null, campaign: string | null, source: string, medium: string) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("utm_source")) url.searchParams.set("utm_source", source);
    if (!url.searchParams.has("utm_medium")) url.searchParams.set("utm_medium", medium);
    if (campaign && !url.searchParams.has("utm_campaign")) url.searchParams.set("utm_campaign", campaign);
    return url.toString();
  } catch {
    return raw;
  }
}

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("events")
      .select("id,slug,name,event_date,end_date,organizer,venue_name,location,summary,cover_image_url,event_url,ticket_url,attendance_status,is_featured,attribution_source,attribution_medium,attribution_campaign")
      .eq("is_public", true)
      .or(`event_date.gte.${today},event_date.is.null`)
      .neq("attendance_status", "cancelled")
      .order("is_featured", { ascending: false })
      .order("event_date", { ascending: true, nullsFirst: false })
      .limit(12);
    if (error) throw error;

    const events = (data ?? []).map((event) => ({
      ...event,
      event_url: trackedUrl(event.event_url, event.attribution_campaign ?? event.slug, event.attribution_source, event.attribution_medium),
      ticket_url: trackedUrl(event.ticket_url, event.attribution_campaign ?? event.slug, event.attribution_source, event.attribution_medium)
    }));

    return NextResponse.json({ events, count: events.length }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" }
    });
  } catch (error) {
    console.error("Upcoming events API failed", error);
    return NextResponse.json({ error: "Unable to load upcoming events." }, { status: 500 });
  }
}
