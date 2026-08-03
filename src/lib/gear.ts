import { createClient } from "@supabase/supabase-js";

export type Brand = {
  id: string;
  slug: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  description: string | null;
  is_sponsor: boolean;
  partnership_level: string | null;
  featured: boolean;
};

export type GearItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  model: string | null;
  image_url: string | null;
  product_url: string | null;
  affiliate_url: string | null;
  affiliate_campaign: string | null;
  affiliate_code: string | null;
  sponsor_note: string | null;
  disclosure_text: string | null;
  brand: { name: string; website_url: string | null } | null;
};

type LinkableGear = {
  affiliate_url?: string | null;
  product_url?: string | null;
  custom_affiliate_url?: string | null;
  custom_product_url?: string | null;
  affiliate_campaign?: string | null;
  slug?: string | null;
  brand?: { website_url?: string | null } | null;
};

/** Append Shadow Group UTM attribution to an outbound URL without clobbering existing params. */
function withAttribution(url: string, campaign?: string | null): string {
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("utm_source")) parsed.searchParams.set("utm_source", "shadow-group");
    if (!parsed.searchParams.has("utm_medium")) parsed.searchParams.set("utm_medium", "team-site");
    if (campaign && !parsed.searchParams.has("utm_campaign")) parsed.searchParams.set("utm_campaign", campaign);
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Resolve the best outbound link for a gear item: an affiliate link (marked
 * sponsored) if present, otherwise the product page, otherwise the brand site.
 * UTM attribution is attached so we can track referrals.
 */
export function resolveGearHref(item: LinkableGear): { href: string | null; sponsored: boolean } {
  const campaign = item.affiliate_campaign ?? item.slug ?? undefined;
  const affiliate = item.custom_affiliate_url || item.affiliate_url;
  if (affiliate) return { href: withAttribution(affiliate, campaign), sponsored: true };
  const product = item.custom_product_url || item.product_url;
  if (product) return { href: withAttribution(product, campaign), sponsored: false };
  const site = item.brand?.website_url;
  if (site) return { href: withAttribution(site, campaign), sponsored: false };
  return { href: null, sponsored: false };
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getSponsorBrands(): Promise<Brand[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("brands")
    .select("id,slug,name,website_url,logo_url,description,is_sponsor,partnership_level,featured")
    .eq("is_active", true)
    .eq("is_sponsor", true)
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (error || !data) {
    if (error) console.error("Unable to load sponsors", error);
    return [];
  }
  return data as Brand[];
}

export async function getPublicGear(): Promise<GearItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("gear_catalog")
    .select("id,slug,name,category,model,image_url,product_url,affiliate_url,affiliate_campaign,affiliate_code,sponsor_note,disclosure_text,brand:brands(name,website_url)")
    .eq("is_active", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error || !data) {
    if (error) console.error("Unable to load gear", error);
    return [];
  }
  return (data as unknown[]).map((row) => {
    const record = row as Record<string, unknown>;
    const brand = Array.isArray(record.brand) ? record.brand[0] : record.brand;
    return { ...(record as object), brand: brand ?? null } as GearItem;
  });
}
