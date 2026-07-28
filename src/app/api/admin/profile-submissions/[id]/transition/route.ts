import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

type TargetStatus = "approved" | "changes_requested" | "rejected";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { status?: TargetStatus; notes?: string } | null;
  if (!body?.status || !["approved", "changes_requested", "rejected"].includes(body.status)) {
    return NextResponse.json({ error: "A valid target status is required." }, { status: 400 });
  }

  const { supabase, user } = auth;
  const now = new Date().toISOString();

  try {
    const { data: submission, error: loadError } = await supabase
      .from("member_profile_submissions")
      .select("*")
      .eq("id", id)
      .single();
    if (loadError || !submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    let appliedOperatorId: string | null = submission.operator_id ?? null;

    if (body.status === "approved") {
      // Resolve the operator this profile maps to.
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, operator_id")
        .eq("id", submission.profile_id)
        .maybeSingle();

      // Only apply fields the member actually provided so a partial update never
      // wipes existing public data.
      const operatorFields: Record<string, unknown> = { is_public: true, updated_at: now };
      if (submission.display_name) operatorFields.display_name = submission.display_name;
      if (submission.short_bio) operatorFields.short_bio = submission.short_bio;
      if (submission.bio) operatorFields.long_bio = submission.bio;
      if (submission.primary_role) {
        operatorFields.primary_role = submission.primary_role;
        operatorFields.team_role = submission.primary_role;
      }
      if (submission.secondary_role) operatorFields.secondary_role = submission.secondary_role;
      if (submission.portrait_url) operatorFields.portrait_url = submission.portrait_url;
      if (Array.isArray(submission.gallery_urls)) operatorFields.gallery_urls = submission.gallery_urls;

      const operatorId = profile?.operator_id ?? null;

      if (operatorId) {
        const { error: updateOperatorError } = await supabase
          .from("operators")
          .update(operatorFields)
          .eq("id", operatorId);
        if (updateOperatorError) throw updateOperatorError;
        appliedOperatorId = operatorId;
      } else {
        // No linked operator yet — create one from the submission.
        const callsign = submission.callsign || submission.display_name;
        if (!callsign) {
          return NextResponse.json(
            { error: "This member has no linked operator and no callsign to create one. Link them in Roster first." },
            { status: 409 }
          );
        }
        const { data: created, error: createError } = await supabase
          .from("operators")
          .insert({ ...operatorFields, callsign, slug: slugify(callsign), active: true })
          .select("id")
          .single();
        if (createError) {
          return NextResponse.json(
            { error: `Could not create an operator (callsign may already exist): ${createError.message}. Link this member in Roster first.` },
            { status: 409 }
          );
        }
        appliedOperatorId = created.id;
        if (profile?.id) {
          await supabase.from("profiles").update({ operator_id: created.id }).eq("id", profile.id);
        }
      }
    }

    const { error: updateError } = await supabase
      .from("member_profile_submissions")
      .update({
        status: body.status,
        review_notes: body.notes ?? null,
        reviewed_by: user.id,
        reviewed_at: now,
        operator_id: appliedOperatorId,
        updated_at: now
      })
      .eq("id", id);
    if (updateError) throw updateError;

    return NextResponse.json({
      id,
      status: body.status,
      operatorId: appliedOperatorId,
      published: body.status === "approved"
    });
  } catch (error) {
    console.error("Profile submission transition failed", error);
    return NextResponse.json({ error: "Unable to update this submission." }, { status: 500 });
  }
}
