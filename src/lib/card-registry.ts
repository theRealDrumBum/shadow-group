import { createClient } from "@supabase/supabase-js";
import type { OperatorCard } from "@/lib/data";

type RegistryRow = {
  slug: string;
  name: string;
  operator: { callsign: string; team_role: string | null } | { callsign: string; team_role: string | null }[] | null;
  version: {
    mana_cost: string | null;
    color_identity: string[];
    type_line: string;
    rules_text: string[];
    flavor_text: string | null;
    power: string | null;
    toughness: string | null;
    assets: { kind: string; storage_path: string }[];
  } | {
    mana_cost: string | null;
    color_identity: string[];
    type_line: string;
    rules_text: string[];
    flavor_text: string | null;
    power: string | null;
    toughness: string | null;
    assets: { kind: string; storage_path: string }[];
  }[] | null;
};

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function normalizeCard(row: RegistryRow, supabase: NonNullable<ReturnType<typeof getSupabase>>): OperatorCard | null {
  const operator = first(row.operator);
  const version = first(row.version);
  if (!operator || !version || !version.type_line || version.rules_text.length === 0) return null;

  const asset = [...(version.assets ?? [])].sort((a, b) => {
    const priority = { render: 0, artwork: 1, thumbnail: 2, alternate: 3, reference: 4 } as Record<string, number>;
    return (priority[a.kind] ?? 9) - (priority[b.kind] ?? 9);
  })[0];
  if (!asset) return null;

  const { data } = supabase.storage.from("card-assets").getPublicUrl(asset.storage_path);
  if (!data.publicUrl) return null;

  return {
    slug: row.slug,
    name: row.name,
    callsign: operator.callsign.toUpperCase(),
    typeLine: version.type_line,
    manaCost: version.mana_cost ?? "",
    rules: version.rules_text,
    flavor: version.flavor_text ?? "",
    power: version.power ?? "—",
    toughness: version.toughness ?? "—",
    colors: version.color_identity ?? [],
    role: operator.team_role ?? "Shadow Group Operator",
    image: data.publicUrl
  };
}

export async function getCompletePublishedCards(): Promise<OperatorCard[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("cards")
    .select(`
      slug,
      name,
      operator:operators!cards_operator_id_fkey(callsign, team_role),
      version:card_versions!cards_current_version_fk(
        mana_cost,
        color_identity,
        type_line,
        rules_text,
        flavor_text,
        power,
        toughness,
        assets:card_assets(kind, storage_path)
      )
    `)
    .eq("status", "approved")
    .not("current_version_id", "is", null);

  if (error || !data) {
    console.error("Unable to load the card registry", error);
    return [];
  }

  return (data as unknown as RegistryRow[])
    .map((row) => normalizeCard(row, supabase))
    .filter((card): card is OperatorCard => card !== null);
}

export async function getRandomCompletePublishedCard(): Promise<OperatorCard | null> {
  const cards = await getCompletePublishedCards();
  if (cards.length === 0) return null;
  return cards[Math.floor(Math.random() * cards.length)];
}
