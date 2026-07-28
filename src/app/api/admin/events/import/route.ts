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

  const title =
    metaContent(html, "og:title") ||
    metaContent(html, "twitter:title") ||
    decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "") ||
    parsed.hostname;
  const image = absolutize(metaContent(html, "og:image") || metaContent(html, "twitter:image"), url);
  const description = metaContent(html, "og:description") || metaContent(html, "description");
  const siteName = metaContent(html, "og:site_name");
  const canonicalUrl = metaContent(html, "og:url") || url;

  const name = title || parsed.hostname;
  const slug = slugify(name) || slugify(`${parsed.hostname}-${parsed.pathname}`) || `event-${Date.now()}`;

  const record = {
    slug,
    name,
    summary: description ? description.slice(0, 280) : null,
    description: description || null,
    cover_image_url: image,
    event_url: canonicalUrl,
    source_url: url,
    organizer: siteName || parsed.hostname,
    attendance_status: "interested",
    // Imported events start private so an admin can add the date before publishing.
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
    imported: { name, image, description, organizer: record.organizer }
  }, { status: 201 });
}
