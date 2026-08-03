import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function metaContent(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`, "i")
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeEntities(match[1]);
  }
  return null;
}

function absolutize(candidate: string | null, base: string): string | null {
  if (!candidate) return null;
  try {
    return new URL(candidate, base).toString();
  } catch {
    return candidate;
  }
}

// Reduce a schema.org datetime (e.g. "2026-05-18T09:00:00-05:00" or "2026-05-18")
// to a plain YYYY-MM-DD date, which is what the events table stores.
function toDateOnly(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return decodeEntities(value.trim());
  }
  return null;
}

// schema.org location can be a Place with an address that is either a plain
// string or a PostalAddress object. Flatten it into a human-readable line.
function formatAddress(address: unknown): string | null {
  if (!address) return null;
  if (typeof address === "string") return decodeEntities(address.trim()) || null;
  if (typeof address === "object") {
    const a = address as Record<string, unknown>;
    const parts = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, a.addressCountry]
      .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
      .map((part) => part.trim());
    if (parts.length) return decodeEntities(parts.join(", "));
  }
  return null;
}

type ExtractedEvent = {
  name: string | null;
  description: string | null;
  image: string | null;
  startDate: string | null;
  endDate: string | null;
  venueName: string | null;
  location: string | null;
  organizer: string | null;
  eventUrl: string | null;
  ticketUrl: string | null;
};

function isEventType(type: unknown): boolean {
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => typeof t === "string" && /event$/i.test(t));
}

// Walk arbitrarily nested JSON-LD (objects, arrays, and @graph) and return the
// first node that looks like a schema.org Event.
function findEventNode(node: unknown, depth = 0): Record<string, unknown> | null {
  if (!node || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findEventNode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (isEventType(obj["@type"])) return obj;
    if (obj["@graph"]) {
      const found = findEventNode(obj["@graph"], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function extractJsonLdEvent(html: string): Partial<ExtractedEvent> {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const block of blocks) {
    const raw = block[1]?.trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    const event = findEventNode(parsed);
    if (!event) continue;

    const location = event.location as Record<string, unknown> | string | undefined;
    let venueName: string | null = null;
    let address: string | null = null;
    if (typeof location === "string") {
      address = decodeEntities(location) || null;
    } else if (location && typeof location === "object") {
      venueName = firstString(location.name);
      address = formatAddress(location.address) ?? firstString(location.name);
    }

    const organizer = event.organizer as Record<string, unknown> | string | undefined;
    const organizerName =
      typeof organizer === "string"
        ? decodeEntities(organizer)
        : organizer && typeof organizer === "object"
          ? firstString(organizer.name)
          : null;

    const offers = event.offers as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
    const firstOffer = Array.isArray(offers) ? offers[0] : offers;
    const ticketUrl = firstOffer ? firstString(firstOffer.url) : null;

    const image = event.image;
    const imageUrl = Array.isArray(image) ? firstString(image[0]) : firstString(image);

    return {
      name: firstString(event.name),
      description: firstString(event.description),
      image: imageUrl,
      startDate: toDateOnly(event.startDate),
      endDate: toDateOnly(event.endDate),
      venueName,
      location: address,
      organizer: organizerName,
      eventUrl: firstString(event.url),
      ticketUrl
    };
  }
  return {};
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  const url = body?.url?.trim();
  if (!url) return NextResponse.json({ error: "Provide an event URL." }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "That is not a valid URL." }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only http(s) links can be imported." }, { status: 400 });
  }

  let html = "";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const response = await fetch(url, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ShadowGroupBot/1.0; +https://shadowgroup.team)",
        accept: "text/html,application/xhtml+xml"
      },
      redirect: "follow",
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) {
      return NextResponse.json({ error: `The link returned ${response.status}.` }, { status: 422 });
    }
    html = (await response.text()).slice(0, 500_000);
  } catch {
    return NextResponse.json({ error: "Could not fetch that link." }, { status: 422 });
  }

  // Prefer structured schema.org Event data, then fall back to Open Graph /
  // Twitter cards, then the bare <title>.
  const ld = extractJsonLdEvent(html);

  const title =
    ld.name ||
    metaContent(html, "og:title") ||
    metaContent(html, "twitter:title") ||
    decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "") ||
    parsed.hostname;
  const image = absolutize(
    ld.image || metaContent(html, "og:image") || metaContent(html, "twitter:image"),
    url
  );
  const description = ld.description || metaContent(html, "og:description") || metaContent(html, "description");
  const siteName = metaContent(html, "og:site_name");
  const canonicalUrl = ld.eventUrl || metaContent(html, "og:url") || url;

  const name = title || parsed.hostname;
  const slug = slugify(name) || slugify(`${parsed.hostname}-${parsed.pathname}`) || `event-${Date.now()}`;

  const record = {
    slug,
    name,
    summary: description ? description.slice(0, 280) : null,
    description: description || null,
    cover_image_url: image,
    event_date: ld.startDate,
    end_date: ld.endDate,
    venue_name: ld.venueName,
    location: ld.location,
    event_url: canonicalUrl,
    ticket_url: ld.ticketUrl,
    source_url: url,
    organizer: ld.organizer || siteName || parsed.hostname,
    attendance_status: "interested",
    // Imported events start private so an admin can review the details and
    // publish (which invites the roster) when ready.
    is_public: false,
    attribution_source: "shadow-group",
    attribution_medium: "team-site",
    attribution_campaign: slug,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await auth.supabase
    .from("events")
    .upsert(record, { onConflict: "slug" })
    .select("*")
    .single();

  if (error) {
    console.error("Event import save failed", error);
    return NextResponse.json({ error: "Fetched the link but could not save the event." }, { status: 500 });
  }

  return NextResponse.json({
    event: data,
    imported: {
      name,
      image,
      description,
      organizer: record.organizer,
      event_date: record.event_date,
      end_date: record.end_date,
      venue_name: record.venue_name,
      location: record.location
    }
  }, { status: 201 });
}
