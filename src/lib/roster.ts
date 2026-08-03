import { createClient } from "@supabase/supabase-js";

export type PublicOperator = {
  id: string;
  callsign: string;
  slug: string;
  display_name: string | null;
  rank: string | null;
  primary_role: string | null;
  secondary_role: string | null;
  team_role: string | null;
  short_bio: string | null;
  long_bio: string | null;
  portrait_url: string | null;
  gallery_urls: string[];
  joined_at: string | null;
  is_featured: boolean;
};

export type OperatorSocialLink = { platform: string; label: string | null; url: string };

const OPERATOR_COLUMNS =
  "id,callsign,slug,display_name,rank,primary_role,secondary_role,team_role,short_bio,long_bio,portrait_url,gallery_urls,joined_at,is_featured";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function normalize(row: Record<string, unknown>): PublicOperator {
  return {
    id: row.id as string,
    callsign: row.callsign as string,
    slug: row.slug as string,
    display_name: (row.display_name as string) ?? null,
    rank: (row.rank as string) ?? null,
    primary_role: (row.primary_role as string) ?? null,
    secondary_role: (row.secondary_role as string) ?? null,
    team_role: (row.team_role as string) ?? null,
    short_bio: (row.short_bio as string) ?? null,
    long_bio: (row.long_bio as string) ?? null,
    portrait_url: (row.portrait_url as string) ?? null,
    gallery_urls: ((row.gallery_urls as string[]) ?? []) ?? [],
    joined_at: (row.joined_at as string) ?? null,
    is_featured: Boolean(row.is_featured)
  };
}

export async function getPublicRoster(): Promise<PublicOperator[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("operators")
    .select(OPERATOR_COLUMNS)
    .eq("is_public", true)
    .eq("active", true)
    .order("display_order", { ascending: true });
  if (error || !data) {
    if (error) console.error("Unable to load public roster", error);
    return [];
  }
  return (data as Record<string, unknown>[]).map(normalize);
}

export async function getPublicOperator(
  slug: string
): Promise<{ operator: PublicOperator; social: OperatorSocialLink[] } | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("operators")
    .select(OPERATOR_COLUMNS)
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();
  if (error || !data) return null;

  const operator = normalize(data as Record<string, unknown>);
  const { data: socialRows } = await supabase
    .from("operator_social_links")
    .select("platform,label,url")
    .eq("operator_id", operator.id)
    .eq("is_public", true)
    .order("display_order", { ascending: true });

  return { operator, social: (socialRows ?? []) as OperatorSocialLink[] };
}
