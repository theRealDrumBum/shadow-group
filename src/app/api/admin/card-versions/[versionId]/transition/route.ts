import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

type TransitionStatus = "submitted" | "changes_requested" | "approved" | "rejected" | "archived";

type TransitionBody = {
  status: TransitionStatus;
  notes?: string | null;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ versionId: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { versionId } = await context.params;
  const body = await request.json().catch(() => null) as TransitionBody | null;
  if (!body || !["submitted", "changes_requested", "approved", "rejected", "archived"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid version transition." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { supabase, user } = auth;
  const adminId = user.id;

  try {
    const { data: version, error: versionError } = await supabase
      .from("card_versions")
      .select("id, card_id, version_number, status")
      .eq("id", versionId)
      .single();
    if (versionError) throw versionError;

    const allowed: Record<string, TransitionStatus[]> = {
      draft: ["submitted", "approved", "archived"],
      generating: ["submitted", "archived"],
      submitted: ["changes_requested", "approved", "rejected", "archived"],
      changes_requested: ["submitted", "approved", "rejected", "archived"],
      approved: ["archived"],
      rejected: ["submitted", "archived"],
      archived: []
    };

    if (!allowed[version.status]?.includes(body.status)) {
      return NextResponse.json(
        { error: `Cannot transition version from ${version.status} to ${body.status}.` },
        { status: 409 }
      );
    }

    const update: Record<string, unknown> = {
      status: body.status,
      review_notes: body.notes ?? null
    };

    if (body.status === "submitted") {
      update.submitted_at = now;
      update.reviewed_at = null;
      update.reviewed_by = null;
    } else {
      update.reviewed_at = now;
      update.reviewed_by = adminId;
    }

    const { error: updateError } = await supabase
      .from("card_versions")
      .update(update)
      .eq("id", version.id);
    if (updateError) throw updateError;

    if (body.status === "approved") {
      const { data: card, error: cardError } = await supabase
        .from("cards")
        .select("published_at")
        .eq("id", version.card_id)
        .single();
      if (cardError) throw cardError;

      const { error: publishError } = await supabase
        .from("cards")
        .update({
          canonical_version_id: version.id,
          current_version_id: version.id,
          status: "approved",
          published_at: card.published_at ?? now
        })
        .eq("id", version.card_id);
      if (publishError) throw publishError;
    }

    const { error: eventError } = await supabase
      .from("card_version_review_events")
      .insert({
        card_id: version.card_id,
        card_version_id: version.id,
        from_status: version.status,
        to_status: body.status,
        notes: body.notes ?? null,
        reviewed_by: adminId
      });
    if (eventError) throw eventError;

    return NextResponse.json({
      cardId: version.card_id,
      versionId: version.id,
      versionNumber: version.version_number,
      previousStatus: version.status,
      status: body.status,
      canonical: body.status === "approved"
    });
  } catch (error) {
    console.error("Version transition failed", error);
    return NextResponse.json({ error: "Unable to transition card version." }, { status: 500 });
  }
}
