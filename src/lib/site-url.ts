import type { NextRequest } from "next/server";

/** Public origin for preview/gallery links returned to the Cardsmith GPT. */
export function siteOriginFromRequest(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;

  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  if (host) return `${proto}://${host}`.replace(/\/+$/, "");
  return request.nextUrl.origin;
}

export function cardPreviewUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, "")}/cards/preview/${token}`;
}

export function cardGalleryUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/+$/, "")}/cards/${slug}`;
}
