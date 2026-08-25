import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth/admin";
import { optionalText, parseColors, parseRules, slugifyCardName } from "@/lib/card-admin";

export const dynamic = "force-dynamic";

type VersionInput = {
  typeLine?: string;
  manaCost?: string | null;
  colorIdentity?: unknown;
  rulesText?: unknown;
  flavorText?: string | null;
  power?: string | null;
  toughness?: string | null;
  rarity?: string | null;
};

type CreateBody = {
  operatorId?: string;
  name?: string;
  slug?: string;
  collectorNumber?: string | null;
  expansionCode?: string | null;
  status?: string;
  version?: VersionInput;
};

async function ensureExpansion(supabase: SupabaseClient, code: string | null) {
  const normalized = code?.trim().toUpperCase();
  if (!normalized) return null;
  const { data, error } = await supabase
    .from("expansions")
    .upsert(
      { code: normalized, name: normalized, updated_at: new Date().toISOString() },
      { onConflict: "code" }
    )
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const status = request.nextUrl.searchParams.get("status") ?? "submitted";
  const { data, error } = await auth.supabase
    .from("cards")
    .select("*, operators!cards_operator_id_fkey(*), expansions(*), card_versions!card_versions_card_id_fkey(*)")
    .eq("status", status)
    .order("submitted_at", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Admin review queue failed", error);
    return NextResponse.json({ error: "Unable to load review queue." }, { status: 500 });
  }

  return NextResponse.json({ cards: data ?? [], count: data?.length ?? 0 });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => null) as CreateBody | null;
  const operatorId = body?.operatorId?.trim();
  const name = body?.name?.trim();
  const typeLine = body?.version?.typeLine?.trim();
  if (!operatorId || !name || !typeLine) {
    return NextResponse.json({ error: "Operator, card name, and type line are required." }, { status: 400 });
  }

  const slug = slugifyCardName(body?.slug || name);
  if (!slug) {
    return NextResponse.json({ error: "A valid slug is required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const versionStatus = body?.status === "draft" ? "draft" : "submitted";

  try {
    const expansionId = await ensureExpansion(auth.supabase, optionalText(body?.expansionCode));
    const { data: operator, error: operatorError } = await auth.supabase
      .from("operators")
      .select("id")
      .eq("id", operatorId)
      .maybeSingle();
    if (operatorError) throw operatorError;
    if (!operator) return NextResponse.json({ error: "Operator not found." }, { status: 404 });

    const { data: card, error: cardError } = await auth.supabase
      .from("cards")
      .insert({
        operator_id: operatorId,
        expansion_id: expansionId,
        slug,
        name,
        collector_number: optionalText(body?.collectorNumber),
        sync_key: `command:${slug}`,
        status: versionStatus === "submitted" ? "submitted" : "draft",
        submitted_at: versionStatus === "submitted" ? now : null,
        submitted_by: auth.user.id,
        created_by: auth.user.id
      })
      .select("id, slug")
      .single();
    if (cardError) {
      if (cardError.code === "23505") {
        return NextResponse.json({ error: "A card with that slug already exists." }, { status: 409 });
      }
      throw cardError;
    }

    const { data: version, error: versionError } = await auth.supabase
      .from("card_versions")
      .insert({
        card_id: card.id,
        version_number: 1,
        status: versionStatus,
        submitted_at: versionStatus === "submitted" ? now : null,
        mana_cost: optionalText(body?.version?.manaCost),
        color_identity: parseColors(body?.version?.colorIdentity),
        type_line: typeLine,
        rules_text: parseRules(body?.version?.rulesText),
        flavor_text: optionalText(body?.version?.flavorText),
        power: optionalText(body?.version?.power),
        toughness: optionalText(body?.version?.toughness),
        rarity: optionalText(body?.version?.rarity),
        created_by: auth.user.id
      })
      .select("id, version_number")
      .single();
    if (versionError) throw versionError;

    const { error: currentError } = await auth.supabase
      .from("cards")
      .update({ current_version_id: version.id })
      .eq("id", card.id);
    if (currentError) throw currentError;

    return NextResponse.json({
      action: "card_created",
      cardId: card.id,
      slug: card.slug,
      versionId: version.id,
      versionNumber: version.version_number
    }, { status: 201 });
  } catch (error) {
    console.error("Admin card create failed", error);
    return NextResponse.json({ error: "Unable to create the card." }, { status: 500 });
  }
}
