import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

const allowedTransitions = {
  submitted: ["approved", "changes_requested", "rejected"],
  changes_requested: ["submitted", "rejected"],
  approved: ["archived"],
  rejected: ["submitted", "archived"],
  draft: ["submitted", "archived"]
} as const;

type TargetStatus = "approved" | "changes_requested" | "rejected" | "submitted" | "archived";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { status?: TargetStatus; notes?: string } | null;
  if (!body?.status) {
    return NextResponse.json({ error: "A target status is required." }, { status: 400 });
  }

  const { data: card, error: lookupError } = await auth.supabase
    .from("cards")
    .select("id, status")
    .eq("id", id)
    .single();

  if (lookupError || !card) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  const validTargets = allowedTransitions[card.status as keyof typeof allowedTransitions] ?? [];
  if (!validTargets.includes(body.status as never)) {
    return NextResponse.json(
      { error: `Invalid transition from ${card.status} to ${body.status}.` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const updates = {
    status: body.status,
    review_notes: body.notes ?? null,
    reviewed_at: now,
    reviewed_by: auth.user.id,
    published_at: body.status === "approved" ? now : null
  };

  const { data: updated, error: updateError } = await auth.supabase
    .from("cards")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    console.error("Card transition failed", updateError);
    return NextResponse.json({ error: "Unable to update card status." }, { status: 500 });
  }

  const { error: eventError } = await auth.supabase
    .from("card_review_events")
    .insert({
      card_id: id,
      from_status: card.status,
      to_status: body.status,
      notes: body.notes ?? null,
      actor_id: auth.user.id
    });

  if (eventError) {
    console.error("Review event logging failed", eventError);
    return NextResponse.json({ error: "Card updated, but review history could not be recorded." }, { status: 500 });
  }

  return NextResponse.json({ card: updated });
}
