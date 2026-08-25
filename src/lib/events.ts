import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type PublicEvent = {
  id: string;
  slug: string;
  name: string;
  event_date: string | null;
  end_date: string | null;
  organizer: string | null;
  venue_name: string | null;
  location: string | null;
  summary: string | null;
  cover_image_url: string | null;
  event_url: string | null;
  ticket_url: string | null;
  attendance_status: string | null;
  is_featured: boolean;
  attribution_source: string;
  attribution_medium: string;
  attribution_campaign: string | null;
};

// Append UTM attribution to outbound organizer/ticket links so we can measure
// the traffic Shadow Group sends to event pages.
export function trackedUrl(raw: string | null, campaign: string | null, source: string, medium: string) {
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

// Public, upcoming (or undated) events the team is advertising, featured first.
// Returns an empty list on any failure so public pages degrade gracefully.
export async function getPublicEvents(limit = 24): Promise<PublicEvent[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return [];
    }
    const supabase = createSupabaseAdmin();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("events")
      .select(
        "id,slug,name,event_date,end_date,organizer,venue_name,location,summary,cover_image_url,event_url,ticket_url,attendance_status,is_featured,attribution_source,attribution_medium,attribution_campaign"
      )
      .eq("is_public", true)
      .or(`event_date.gte.${today},event_date.is.null`)
      .neq("attendance_status", "cancelled")
      .order("is_featured", { ascending: false })
      .order("event_date", { ascending: true, nullsFirst: false })
      .limit(limit);
    if (error) throw error;

    return ((data ?? []) as PublicEvent[]).map((event) => ({
      ...event,
      event_url: trackedUrl(event.event_url, event.attribution_campaign ?? event.slug, event.attribution_source, event.attribution_medium),
      ticket_url: trackedUrl(event.ticket_url, event.attribution_campaign ?? event.slug, event.attribution_source, event.attribution_medium)
    }));
  } catch (error) {
    console.error("getPublicEvents failed", error);
    return [];
  }
}

// Human-friendly date range for public display.
export function formatEventDate(startDate: string | null, endDate: string | null): string {
  if (!startDate) return "Date TBD";
  const fmt = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };
  if (endDate && endDate !== startDate) return `${fmt(startDate)} – ${fmt(endDate)}`;
  return fmt(startDate);
}
