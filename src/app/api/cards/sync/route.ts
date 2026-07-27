import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type SyncPayload = {
  syncKey: string;
  card: {
    slug: string;
    name: string;
    status?: "draft" | "generating" | "submitted" | "changes_requested";
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
    let query = supabase.from("cards").select("*, operators(*), card_versions(*), expansions(*)").limit(10);
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

  const requestedStatus = payload.card.status ?? "draft";
  if (!["draft", "generating", "submitted", "changes_requested"].includes(requestedStatus)) {
    return NextResponse.json(
      { error: "The sync API cannot approve, reject, or archive cards. Submit the card for administrator review." },
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
      .select("id, status")
      .eq("sync_key", payload.syncKey)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existingCard?.status === "approved") {
      return NextResponse.json(
        { error: "This card is canonical. Create a proposed revision without changing its approval state." },
        { status: 409 }
      );
    }

    const cardRecord = {
      operator_id: operator.id,
      expansion_id: expansionId,
      sync_key: payload.syncKey,
      slug: payload.card.slug,
      name: payload.card.name,
      status: requestedStatus,
      collector_number: payload.card.collectorNumber ?? null,
      submitted_at: requestedStatus === "submitted" ? now : null,
      published_at: null
    };

    let cardId: string;
    if (existingCard) {
      const { data, error } = await supabase.from("cards").update(cardRecord).eq("id", existingCard.id).select("id").single();
      if (error) throw error;
      cardId = data.id;
    } else {
      const { data, error } = await supabase.from("cards").insert(cardRecord).select("id").single();
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
      .select("id, version_number")
      .single();
    if (versionError) throw versionError;

    const { error: currentVersionError } = await supabase.from("cards").update({ current_version_id: version.id }).eq("id", cardId);
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
      action: existingCard ? "updated" : "created",
      workflowStatus: requestedStatus,
      canonical: false,
      cardId,
      versionId: version.id,
      versionNumber: version.version_number,
      syncKey: payload.syncKey
    }, { status: existingCard ? 200 : 201 });
  } catch (error) {
    console.error("Card sync failed", error);
    return NextResponse.json({ error: "Unable to synchronize card." }, { status: 500 });
  }
}
