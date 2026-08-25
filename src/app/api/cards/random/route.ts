import { NextRequest, NextResponse } from "next/server";
import { getGalleryCards } from "@/lib/card-registry";
import type { OperatorCard } from "@/lib/data";

export const dynamic = "force-dynamic";

function toCanonPayload(card: OperatorCard) {
  return {
    slug: card.slug,
    name: card.name,
    card_name: card.name,
    callsign: card.callsign,
    operator_callsign: card.callsign,
    type_line: card.typeLine,
    expansion_code: card.expansionCode ?? "SG",
    collector_number: card.collectorNumber,
    rarity: card.rarity,
    render_url: card.image || null,
    image_url: card.image || null
  };
}

export async function GET(request: NextRequest) {
  try {
    const expansion = request.nextUrl.searchParams.get("expansion")?.trim().toUpperCase();
    const { cards } = await getGalleryCards();
    const pool = expansion
      ? cards.filter((card) => (card.expansionCode ?? "SG").toUpperCase() === expansion)
      : cards;

    if (!pool.length) {
      return NextResponse.json({ card: null, count: 0 }, { status: 200 });
    }

    const picked = pool[Math.floor(Math.random() * pool.length)];
    return NextResponse.json(
      { card: toCanonPayload(picked), count: pool.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Random card API failed", error);
    return NextResponse.json({ error: "Unable to load a random card." }, { status: 500 });
  }
}
