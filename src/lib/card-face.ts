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
    expansionCode: input.expansionCode ?? null
  };
}
