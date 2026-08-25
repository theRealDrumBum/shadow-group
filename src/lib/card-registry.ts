import { createClient } from "@supabase/supabase-js";
import { hasStoredCardImage, toOperatorCard } from "@/lib/card-face";
import { cards as bundledCards, type OperatorCard } from "@/lib/data";

const CARD_ASSET_BUCKET = "card-assets";

/**
 * Row shape returned by the public `complete_cards` view (approved canon only).
 * The view is defined in supabase/migrations/011_public_card_view_reconcile.sql
 * and extended by 017_public_card_asset_reads.sql.
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
  image_kind: string | null;
};

/**
 * Build a public URL for a card asset. Accepts an already-absolute URL, a
 * site-relative path (for bundled public/ files), or a storage path inside the
 * public `card-assets` bucket. Returns null when the Supabase URL is not
 * configured and the path is a storage object key.
 */
export function publicCardAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const normalized = path.replace(/^\/+/, "");
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${CARD_ASSET_BUCKET}/${normalized}`;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const COMPLETE_CARD_COLUMNS =
  "slug,name,callsign,team_role,type_line,mana_cost,color_identity,rules_text,flavor_text,power,toughness,rarity,collector_number,expansion_code,expansion_name,image_path,published_at";

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
    image: publicCardAssetUrl(row.image_path),
    imageKind: row.image_kind,
    collectorNumber: row.collector_number,
    expansionCode: row.expansion_code,
    expansionName: row.expansion_name,
    rarity: row.rarity
  });
}

/** Extra approved-card metadata surfaced on the public detail page. */
export type CardDetailExtras = {
  rarity: string | null;
  collectorNumber: string | null;
  expansionCode: string | null;
  expansionName: string | null;
  publishedAt: string | null;
};

function extrasFromRow(row: CompleteCardRow): CardDetailExtras {
  return {
    rarity: row.rarity ?? null,
    collectorNumber: row.collector_number ?? null,
    expansionCode: row.expansion_code ?? null,
    expansionName: row.expansion_name ?? null,
    publishedAt: row.published_at ?? null
  };
}

function extrasFromCard(card: OperatorCard): CardDetailExtras {
  return {
    rarity: card.rarity ?? null,
    collectorNumber: card.collectorNumber ?? null,
    expansionCode: card.expansionCode ?? null,
    expansionName: card.expansionName ?? "Shadow Group Expansion",
    publishedAt: null
  };
}

/** Prefer a stored registry image; otherwise keep the bundled Magic card render. */
function preferLiveImage(bundled: OperatorCard, live: OperatorCard): OperatorCard {
  if (hasStoredCardImage(live)) return live;
  return { ...live, image: bundled.image, imageKind: bundled.imageKind ?? "render" };
}

/** Registry rows win on slug when they have a stored image; bundled expansion cards fill the rest. */
export function mergeGalleryCards(registry: OperatorCard[], bundled: OperatorCard[] = bundledCards): OperatorCard[] {
  const bySlug = new Map(registry.map((card) => [card.slug, card]));
  const head = bundled.map((card) => {
    const live = bySlug.get(card.slug);
    return live ? preferLiveImage(card, live) : card;
  });
  const bundledSlugs = new Set(bundled.map((card) => card.slug));
  const tail = registry.filter((card) => !bundledSlugs.has(card.slug));
  return [...head, ...tail];
}

export type GalleryResult = {
  cards: OperatorCard[];
  /** "registry" when any cards came from Supabase; "bundled" when using the expansion set in-repo. */
  source: "registry" | "bundled";
};

/**
 * Approved canonical cards for the public gallery. Bundled expansion renders
 * always appear; matching registry slugs replace the bundled copy when they
 * have a stored Magic card image.
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
    } else if (data) {
      return {
        cards: mergeGalleryCards((data as unknown as CompleteCardRow[]).map(mapRowToCard)),
        source: "registry"
      };
    }
  }
  return { cards: bundledCards, source: "bundled" };
}

export type CardDetail = {
  card: OperatorCard;
  extras: CardDetailExtras;
};

/** A single approved card by slug, or null when it is not in the registry. */
export async function getGalleryCardBySlug(slug: string): Promise<OperatorCard | null> {
  const detail = await getGalleryCardDetailBySlug(slug);
  return detail?.card ?? null;
}

/**
 * A single approved card by slug with the extra metadata needed for the detail
 * page. Falls back to the bundled expansion set so the page renders even before
 * Supabase is configured or populated.
 */
export async function getGalleryCardDetailBySlug(slug: string): Promise<CardDetail | null> {
  const bundled = bundledCards.find((card) => card.slug === slug) ?? null;
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase
      .from("complete_cards")
      .select(COMPLETE_CARD_COLUMNS)
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Unable to load card detail", error);
    } else if (data) {
      const row = data as unknown as CompleteCardRow;
      const live = mapRowToCard(row);
      const card = bundled ? preferLiveImage(bundled, live) : live;
      return { card, extras: extrasFromRow(row) };
    }
  }

  if (!bundled) return null;
  return { card: bundled, extras: extrasFromCard(bundled) };
}
