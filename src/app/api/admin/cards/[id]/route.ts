import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { optionalText, slugifyCardName } from "@/lib/card-admin";

export const dynamic = "force-dynamic";

type PatchBody = {
  name?: string;
  slug?: string;
  operatorId?: string;
  collectorNumber?: string | null;
  expansionCode?: string | null;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as PatchBody | null;
  if (!body) return NextResponse.json({ error: "Invalid card update." }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Card name cannot be empty." }, { status: 400 });
    updates.name = name;
  }
  if (typeof body.slug === "string") {
    const slug = slugifyCardName(body.slug);
    if (!slug) return NextResponse.json({ error: "A valid slug is required." }, { status: 400 });
    updates.slug = slug;
  }
  if (typeof body.operatorId === "string" && body.operatorId.trim()) {
    updates.operator_id = body.operatorId.trim();
  }
  if ("collectorNumber" in body) updates.collector_number = optionalText(body.collectorNumber);

  try {
    if (typeof body.expansionCode === "string") {
      const code = body.expansionCode.trim().toUpperCase();
      if (!code) {
        updates.expansion_id = null;
      } else {
        const { data: expansion, error } = await auth.supabase
          .from("expansions")
          .upsert(
            { code, name: code, updated_at: new Date().toISOString() },
            { onConflict: "code" }
          )
          .select("id")
          .single();
        if (error) throw error;
        updates.expansion_id = expansion.id;
      }
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: "No card fields to update." }, { status: 400 });
    }

    const { data, error } = await auth.supabase
      .from("cards")
      .update(updates)
      .eq("id", id)
      .select("id, name, slug, collector_number, operator_id, expansion_id")
      .single();
    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "A card with that slug already exists." }, { status: 409 });
      }
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Card not found." }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ card: data });
  } catch (error) {
    console.error("Admin card update failed", error);
    return NextResponse.json({ error: "Unable to update the card." }, { status: 500 });
  }
}
