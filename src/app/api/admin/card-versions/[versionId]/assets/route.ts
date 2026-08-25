import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { ArtworkIngestError, storeCardArtwork, type ArtworkKind } from "@/lib/card-assets";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const KINDS = new Set<ArtworkKind>(["reference", "artwork", "render", "thumbnail", "alternate"]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ versionId: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { versionId } = await context.params;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: "Choose a JPEG, PNG, WebP, or GIF image." }, { status: 400 });
    }

    const kindValue = String(form.get("kind") ?? "render");
    const kind: ArtworkKind = KINDS.has(kindValue as ArtworkKind) ? kindValue as ArtworkKind : "render";

    const { data: version, error: versionError } = await auth.supabase
      .from("card_versions")
      .select("id, card_id, status, version_number")
      .eq("id", versionId)
      .maybeSingle();
    if (versionError) throw versionError;
    if (!version) return NextResponse.json({ error: "Version not found." }, { status: 404 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const artwork = await storeCardArtwork(auth.supabase, {
      cardId: version.card_id,
      versionId: version.id,
      createdBy: auth.user.id,
      input: {
        kind,
        bytes,
        mimeType: file.type || null
      }
    });

    return NextResponse.json({
      action: "artwork_attached",
      cardId: version.card_id,
      versionId: version.id,
      versionNumber: version.version_number,
      versionStatus: version.status,
      artworkUrl: artwork.url,
      artwork
    });
  } catch (error) {
    if (error instanceof ArtworkIngestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Admin card image upload failed", error);
    return NextResponse.json({ error: "Unable to upload the card image." }, { status: 500 });
  }
}
