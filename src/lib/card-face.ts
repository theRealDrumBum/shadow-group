import type { OperatorCard } from "@/lib/data";

/** True when the src is missing or is the site logo used as a stand-in. */
export function isPlaceholderArt(src: string | null | undefined): boolean {
  if (!src) return true;
  return /shadow[_-]?group[_-]?logo/i.test(src);
}

/** Stored Magic card image from Supabase — show it as the card, not as inset art. */
export function hasStoredCardImage(card: Pick<OperatorCard, "image">): boolean {
  return Boolean(card.image) && !isPlaceholderArt(card.image);
}

/** Build the gallery/preview/admin card model from registry or version rows. */
export function toOperatorCard(input: {
  slug: string;
  name: string;
  callsign?: string | null;
  typeLine?: string | null;
  manaCost?: string | null;
  rules?: string[] | null;
  flavor?: string | null;
  power?: string | null;
  toughness?: string | null;
  colors?: string[] | null;
  role?: string | null;
  image?: string | null;
  imageKind?: string | null;
  collectorNumber?: string | null;
  expansionCode?: string | null;
  expansionName?: string | null;
  rarity?: string | null;
}): OperatorCard {
  const image = input.image && !isPlaceholderArt(input.image) ? input.image : "";
  return {
    slug: input.slug,
    name: input.name,
    callsign: (input.callsign ?? "").toUpperCase() || "UNKNOWN",
    typeLine: input.typeLine ?? "",
    manaCost: input.manaCost ?? "",
    rules: input.rules ?? [],
    flavor: input.flavor ?? "",
    power: input.power ?? "—",
    toughness: input.toughness ?? "—",
    colors: input.colors ?? [],
    role: input.role ?? "Shadow Group Operator",
    image,
    imageKind: input.imageKind ?? null,
    collectorNumber: input.collectorNumber ?? null,
    expansionCode: input.expansionCode ?? null,
    expansionName: input.expansionName ?? null,
    rarity: input.rarity ?? null
  };
}

/** Lands (and other non-creature, non-vehicle cards) do not show power/toughness. */
export function showsPowerToughness(typeLine: string | null | undefined): boolean {
  const type = typeLine ?? "";
  if (/\b(creature|vehicle)\b/i.test(type)) return true;
  if (/\bland\b/i.test(type)) return false;
  return Boolean(type);
}
