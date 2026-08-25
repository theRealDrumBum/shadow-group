import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { optionalText, parseColors, parseRules } from "@/lib/card-admin";

export const dynamic = "force-dynamic";

type PatchBody = {
  typeLine?: string;
  manaCost?: string | null;
  colorIdentity?: unknown;
  rulesText?: unknown;
  flavorText?: string | null;
  power?: string | null;
  toughness?: string | null;
  rarity?: string | null;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ versionId: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { versionId } = await context.params;
  const body = await request.json().catch(() => null) as PatchBody | null;
  if (!body) return NextResponse.json({ error: "Invalid version update." }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof body.typeLine === "string") {
    const typeLine = body.typeLine.trim();
    if (!typeLine) return NextResponse.json({ error: "Type line cannot be empty." }, { status: 400 });
    updates.type_line = typeLine;
  }
  if ("manaCost" in body) updates.mana_cost = optionalText(body.manaCost);
  if ("colorIdentity" in body) updates.color_identity = parseColors(body.colorIdentity);
  if ("rulesText" in body) updates.rules_text = parseRules(body.rulesText);
  if ("flavorText" in body) updates.flavor_text = optionalText(body.flavorText);
  if ("power" in body) updates.power = optionalText(body.power);
  if ("toughness" in body) updates.toughness = optionalText(body.toughness);
  if ("rarity" in body) updates.rarity = optionalText(body.rarity);

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "No version fields to update." }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("card_versions")
    .update(updates)
    .eq("id", versionId)
    .select("id, card_id, version_number, status, type_line, mana_cost, color_identity, rules_text, flavor_text, power, toughness, rarity")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Version not found." }, { status: 404 });
    }
    console.error("Admin version update failed", error);
    return NextResponse.json({ error: "Unable to update this version." }, { status: 500 });
  }

  return NextResponse.json({ version: data });
}
