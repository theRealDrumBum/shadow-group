import type { OperatorCard } from "@/lib/data";

const FALLBACK_IMAGE = "/shadow-group-logo.svg";

/** Build the MTG-style card face used in the gallery, preview page, and admin review. */
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
  collectorNumber?: string | null;
  expansionCode?: string | null;
  expansionName?: string | null;
  rarity?: string | null;
}): OperatorCard {
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
    image: input.image || FALLBACK_IMAGE,
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
