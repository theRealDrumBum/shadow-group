import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { ArtworkIngestError, storeCardArtwork, type ArtworkKind } from "@/lib/card-assets";
import { cardPreviewUrl, siteOriginFromRequest } from "@/lib/site-url";

type AssetPayload = {
  syncKey?: string;
  versionId?: string;
  kind?: ArtworkKind;
  artworkUrl?: string | null;
  artworkBase64?: string | null;
  artworkMimeType?: string | null;
};

function authorized(request: NextRequest) {
  const expected = process.env.CARD_SYNC_API_KEY;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(expected && supplied && supplied === expected);
}

const ATTACHABLE_STATUSES = new Set(["draft", "generating", "submitted", "changes_requested"]);

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const payload = await request.json().catch(() => null) as AssetPayload | null;
  const syncKey = payload?.syncKey?.trim();
  if (!payload || !syncKey) {
    return NextResponse.json({ error: "Provide syncKey and artworkUrl or artworkBase64." }, { status: 400 });
  }
  if (!payload.artworkUrl && !payload.artworkBase64) {
    return NextResponse.json({ error: "Provide artworkUrl or artworkBase64." }, { status: 400 });
  }

  try {
    const supabase = createSupabaseAdmin();
    const origin = siteOriginFromRequest(request);

    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("id, current_version_id, slug")
      .eq("sync_key", syncKey)
      .maybeSingle();
    if (cardError) throw cardError;
    if (!card) return NextResponse.json({ error: "No card exists for that syncKey." }, { status: 404 });

    const versionId = payload.versionId?.trim() || card.current_version_id;
    if (!versionId) {
      return NextResponse.json({ error: "No card version is available to attach artwork to." }, { status: 409 });
    }

    const { data: version, error: versionError } = await supabase
      .from("card_versions")
      .select("id, card_id, status, preview_token, version_number")
      .eq("id", versionId)
      .eq("card_id", card.id)
      .maybeSingle();
    if (versionError) throw versionError;
    if (!version) return NextResponse.json({ error: "That version does not belong to this card." }, { status: 404 });
    if (!ATTACHABLE_STATUSES.has(version.status)) {
      return NextResponse.json(
        { error: "Artwork can only be attached to draft, generating, submitted, or changes_requested versions. Propose a new version instead." },
        { status: 409 }
      );
    }

    const artwork = await storeCardArtwork(supabase, {
      cardId: card.id,
      versionId: version.id,
      input: {
        kind: payload.kind ?? "artwork",
        url: payload.artworkUrl,
        base64: payload.artworkBase64,
        mimeType: payload.artworkMimeType
      }
    });

    return NextResponse.json({
      action: "artwork_attached",
      cardId: card.id,
      versionId: version.id,
      versionNumber: version.version_number,
      syncKey,
      previewUrl: version.preview_token ? cardPreviewUrl(origin, version.preview_token) : null,
      artworkUrl: artwork.url,
      artwork
    });
  } catch (error) {
    if (error instanceof ArtworkIngestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Card artwork upload failed", error);
    return NextResponse.json({ error: "Unable to attach artwork." }, { status: 500 });
  }
}
