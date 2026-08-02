import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type DraftVersionStatus = "draft" | "generating" | "submitted" | "changes_requested";

type SyncPayload = {
  syncKey: string;
  card: {
    slug: string;
    name: string;
    /** @deprecated Prefer version.status. Retained for older GPT actions. */
    status?: DraftVersionStatus;
    collectorNumber?: string | null;
  };
  operator: {
    callsign: string;
    slug: string;
    displayName?: string | null;
    bio?: string | null;
    teamRole?: string | null;
  };
  expansion?: { code: string; name: string; description?: string | null } | null;
  facts?: Array<{
    category: "strength" | "weakness" | "personality" | "gear" | "appearance" | "quote" | "story" | "role" | "running_joke";
    fact: string;
    source?: string | null;
    approved?: boolean;
  }>;
  version: {
    status?: DraftVersionStatus;
    manaCost?: string | null;
    colorIdentity?: string[];
    typeLine: string;
    rulesText?: string[];
    flavorText?: string | null;
    power?: string | null;
    toughness?: string | null;
    rarity?: string | null;
    factsSnapshot?: Record<string, unknown>;
    artPrompt?: string | null;
    rendererData?: Record<string, unknown>;
  };
};

function authorized(request: NextRequest) {
  const expected = process.env.CARD_SYNC_API_KEY;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(expected && supplied && supplied === expected);
}

function invalidPayload(payload: Partial<SyncPayload>) {
  return !payload.syncKey || !payload.card?.slug || !payload.card?.name ||
    !payload.operator?.callsign || !payload.operator?.slug || !payload.version?.typeLine;
}

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const syncKey = request.nextUrl.searchParams.get("syncKey")?.trim();
  const slug = request.nextUrl.searchParams.get("slug")?.trim();
  if (!syncKey && !slug) return NextResponse.json({ error: "Provide syncKey or slug." }, { status: 400 });

  try {
    const supabase = createSupabaseAdmin();
    // `operators` is related to `cards` through two foreign keys
    // (cards.operator_id and operators.dossier_card_id), so the embed must be
    // disambiguated to the cards.operator_id relationship or PostgREST returns
    // PGRST201 (ambiguous embedding).
    let query = supabase
      .from("cards")
      .select("*, operators!cards_operator_id_fkey(*), card_versions!card_versions_card_id_fkey(*), expansions(*)")
      .limit(10);
    if (syncKey) query = query.eq("sync_key", syncKey);
    if (slug) query = query.eq("slug", slug);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ exists: Boolean(data?.length), matches: data ?? [] });
  } catch (error) {
    console.error("Protected card lookup failed", error);
    return NextResponse.json({ error: "Unable to search the registry." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const payload = await request.json().catch(() => null) as SyncPayload | null;
  if (!payload || invalidPayload(payload)) {
    return NextResponse.json({ error: "Missing required card, operator, version, or syncKey fields." }, { status: 400 });
  }

  const requestedVersionStatus = payload.version.status ?? payload.card.status ?? "draft";
  if (!["draft", "generating", "submitted", "changes_requested"].includes(requestedVersionStatus)) {
    return NextResponse.json(
      { error: "The sync API cannot approve, reject, or archive versions. Submit the version for administrator review." },
      { status: 403 }
    );
  }

  try {
    const supabase = createSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: operator, error: operatorError } = await supabase
      .from("operators")
      .upsert({
        callsign: payload.operator.callsign,
        slug: payload.operator.slug,
        display_name: payload.operator.displayName ?? null,
        bio: payload.operator.bio ?? null,
        team_role: payload.operator.teamRole ?? null,
        updated_at: now
      }, { onConflict: "callsign" })
      .select("*")
      .single();
    if (operatorError) throw operatorError;

    let expansionId: string | null = null;
    if (payload.expansion) {
      const { data: expansion, error } = await supabase
        .from("expansions")
        .upsert({
          code: payload.expansion.code.toUpperCase(),
          name: payload.expansion.name,
          description: payload.expansion.description ?? null,
          updated_at: now
        }, { onConflict: "code" })
        .select("id")
        .single();
      if (error) throw error;
      expansionId = expansion.id;
    }

    const { data: existingCard, error: existingError } = await supabase
      .from("cards")
      .select("id, status, canonical_version_id")
      .eq("sync_key", payload.syncKey)
      .maybeSingle();
    if (existingError) throw existingError;

    const cardRecord = {
      operator_id: operator.id,
      expansion_id: expansionId,
      sync_key: payload.syncKey,
      slug: payload.card.slug,
      name: payload.card.name,
      collector_number: payload.card.collectorNumber ?? null
    };

    let cardId: string;
    if (existingCard) {
      const { data, error } = await supabase
        .from("cards")
        .update(cardRecord)
        .eq("id", existingCard.id)
        .select("id")
        .single();
      if (error) throw error;
      cardId = data.id;
    } else {
      const { data, error } = await supabase
        .from("cards")
        .insert({ ...cardRecord, status: "draft" })
        .select("id")
        .single();
      if (error) throw error;
      cardId = data.id;
    }

    const { data: lastVersion, error: lookupError } = await supabase
      .from("card_versions")
      .select("version_number")
      .eq("card_id", cardId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lookupError) throw lookupError;

    const { data: version, error: versionError } = await supabase
      .from("card_versions")
      .insert({
        card_id: cardId,
        version_number: (lastVersion?.version_number ?? 0) + 1,
        status: requestedVersionStatus,
        submitted_at: requestedVersionStatus === "submitted" ? now : null,
        mana_cost: payload.version.manaCost ?? null,
        color_identity: payload.version.colorIdentity ?? [],
        type_line: payload.version.typeLine,
        rules_text: payload.version.rulesText ?? [],
        flavor_text: payload.version.flavorText ?? null,
        power: payload.version.power ?? null,
        toughness: payload.version.toughness ?? null,
        rarity: payload.version.rarity ?? null,
        facts_snapshot: payload.version.factsSnapshot ?? {},
        art_prompt: payload.version.artPrompt ?? null,
        renderer_data: payload.version.rendererData ?? {}
      })
      .select("id, version_number, status")
      .single();
    if (versionError) throw versionError;

    // current_version_id means newest working revision. canonical_version_id remains
    // untouched until an administrator approves this specific version.
    const { error: currentVersionError } = await supabase
      .from("cards")
      .update({ current_version_id: version.id })
      .eq("id", cardId);
    if (currentVersionError) throw currentVersionError;

    if (payload.facts?.length) {
      const facts = payload.facts.filter(({ fact }) => fact.trim()).map((fact) => ({
        operator_id: operator.id,
        category: fact.category,
        fact: fact.fact.trim(),
        source: fact.source ?? "card-sync",
        approved: false
      }));
      if (facts.length) {
        const { error } = await supabase.from("operator_facts").upsert(facts, {
          onConflict: "operator_id,category,fact",
          ignoreDuplicates: true
        });
        if (error) throw error;
      }
    }

    return NextResponse.json({
      action: existingCard ? "version_created" : "card_created",
      versionStatus: requestedVersionStatus,
      canonical: false,
      existingCanonicalVersionId: existingCard?.canonical_version_id ?? null,
      cardId,
      versionId: version.id,
      versionNumber: version.version_number,
      syncKey: payload.syncKey,
      message: existingCard?.canonical_version_id
        ? "A proposed version was created. The currently approved version remains canonical until this version is approved."
        : "The card and its first proposed version were created."
    }, { status: existingCard ? 200 : 201 });
  } catch (error) {
    console.error("Card sync failed", error);
    return NextResponse.json({ error: "Unable to synchronize card version." }, { status: 500 });
  }
}
