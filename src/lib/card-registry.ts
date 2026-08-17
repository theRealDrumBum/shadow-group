import { createClient } from "@supabase/supabase-js";
import { toOperatorCard } from "@/lib/card-face";
import { cards as sampleCards, type OperatorCard } from "@/lib/data";

const CARD_ASSET_BUCKET = "card-assets";
const FALLBACK_IMAGE = "/shadow-group-logo.svg";

/**
 * Row shape returned by the public `complete_cards` view (approved canon only).
 * The view is defined in supabase/migrations/011_public_card_view_reconcile.sql.
 */
export type CompleteCardRow = {
  id: string;
  slug: string;
  sync_key: string | null;
  name: string;
  status: string;
  collector_number: string | null;
  published_at: string | null;
  callsign: string | null;
  operator_slug: string | null;
  team_role: string | null;
  expansion_code: string | null;
  expansion_name: string | null;
  version_id: string | null;
  version_number: number | null;
  mana_cost: string | null;
  color_identity: string[] | null;
  type_line: string | null;
  rules_text: string[] | null;
  flavor_text: string | null;
  power: string | null;
  toughness: string | null;
  rarity: string | null;
  art_prompt: string | null;
  image_path: string | null;
};

/**
 * Build a public URL for a card asset. Accepts either an already-absolute URL or
 * a storage path inside the public `card-assets` bucket. Returns null when the
 * Supabase URL is not configured or no path is provided.
 */
export function publicCardAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const normalized = path.replace(/^\/+/, "");
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${CARD_ASSET_BUCKET}/${normalized}`;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const COMPLETE_CARD_COLUMNS =
  "slug,name,callsign,team_role,type_line,mana_cost,color_identity,rules_text,flavor_text,power,toughness,rarity,collector_number,expansion_code,image_path,published_at";

function mapRowToCard(row: CompleteCardRow): OperatorCard {
  return toOperatorCard({
    slug: row.slug,
    name: row.name,
    callsign: row.callsign,
    typeLine: row.type_line,
    manaCost: row.mana_cost,
    rules: row.rules_text,
    flavor: row.flavor_text,
    power: row.power,
    toughness: row.toughness,
    colors: row.color_identity,
    role: row.team_role,
    image: publicCardAssetUrl(row.image_path) ?? FALLBACK_IMAGE,
    collectorNumber: row.collector_number,
    expansionCode: row.expansion_code
  });
}

export type GalleryResult = {
  cards: OperatorCard[];
  /** "registry" when cards came from Supabase, "sample" when using seed data. */
  source: "registry" | "sample";
};

/**
 * Approved canonical cards for the public gallery. Falls back to the bundled
 * sample roster when Supabase is not configured or no cards are published yet,
 * so the gallery always renders something meaningful.
 */
export async function getGalleryCards(): Promise<GalleryResult> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("complete_cards")
      .select(COMPLETE_CARD_COLUMNS)
      .order("published_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Unable to load the card registry", error);
    } else if (data && data.length) {
      return { cards: (data as unknown as CompleteCardRow[]).map(mapRowToCard), source: "registry" };
    }
  }
  return { cards: sampleCards, source: "sample" };
}

/** A single approved card by slug, falling back to the sample roster. */
export async function getGalleryCardBySlug(slug: string): Promise<OperatorCard | null> {
  const detail = await getGalleryCardDetailBySlug(slug);
  return detail?.card ?? null;
}

/** Extra approved-card metadata surfaced on the public detail page. */
export type CardDetailExtras = {
  rarity: string | null;
  collectorNumber: string | null;
  expansionCode: string | null;
  expansionName: string | null;
  publishedAt: string | null;
};

export type CardDetail = {
  card: OperatorCard;
  extras: CardDetailExtras;
};

const DETAIL_COLUMNS = `${COMPLETE_CARD_COLUMNS},expansion_name`;

function mapRowToExtras(row: CompleteCardRow): CardDetailExtras {
  return {
    rarity: row.rarity ?? null,
    collectorNumber: row.collector_number ?? null,
    expansionCode: row.expansion_code ?? null,
    expansionName: row.expansion_name ?? null,
    publishedAt: row.published_at ?? null
  };
}

/**
 * A single approved card by slug with the extra metadata needed for the detail
 * page. Falls back to the bundled sample roster (with empty extras) so the page
 * renders even before Supabase is configured or populated.
 */
export async function getGalleryCardDetailBySlug(slug: string): Promise<CardDetail | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("complete_cards")
      .select(DETAIL_COLUMNS)
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Unable to load card detail", error);
    } else if (data) {
      const row = data as unknown as CompleteCardRow;
      return { card: mapRowToCard(row), extras: mapRowToExtras(row) };
    }
  }

  const sample = sampleCards.find((card) => card.slug === slug);
  if (!sample) return null;
  return {
    card: sample,
    extras: { rarity: null, collectorNumber: null, expansionCode: null, expansionName: null, publishedAt: null }
  };
}
