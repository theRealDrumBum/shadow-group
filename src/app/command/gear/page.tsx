import { redirect } from "next/navigation";
import { getAuthedUserAndProfile, isApprovedAdmin } from "@/lib/auth/session-profile";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { CommandPageHeader } from "../command-header";
import { GearConsole, type BrandRow, type GearRow, type LoadoutRow, type OperatorOption } from "./gear-console";

export const dynamic = "force-dynamic";

export default async function GearPage() {
  const { user, profile } = await getAuthedUserAndProfile();
  if (!user) redirect("/command/login");
  if (!isApprovedAdmin(profile)) redirect("/command");

  const admin = createSupabaseAdmin();
  const [{ data: brands }, { data: gear }, { data: operators }, { data: loadout }] = await Promise.all([
    admin.from("brands").select("id,name,website_url,logo_url,description,partnership_level,is_sponsor,is_active,featured,display_order").order("display_order", { ascending: true }).order("name"),
    admin.from("gear_catalog").select("id,name,category,model,brand_id,image_url,product_url,affiliate_url,affiliate_network,affiliate_campaign,affiliate_code,sponsor_note,disclosure_text,is_active,brand:brands(name)").order("category").order("name"),
    admin.from("operators").select("id,callsign").order("display_order", { ascending: true }),
    admin.from("operator_loadout_items").select("id,operator_id,gear_id,custom_name,category,loadout_group,sponsor_label,is_sponsored,is_public,is_featured,display_order,gear:gear_catalog(name)").order("display_order", { ascending: true })
  ]);

  const normalizeBrand = (row: Record<string, unknown>): BrandRow => row as BrandRow;
  const normalizeGear = (row: Record<string, unknown>): GearRow => {
    const brand = Array.isArray(row.brand) ? row.brand[0] : row.brand;
    return { ...(row as object), brand: brand ?? null } as GearRow;
  };
  const normalizeLoadout = (row: Record<string, unknown>): LoadoutRow => {
    const g = Array.isArray(row.gear) ? row.gear[0] : row.gear;
    return { ...(row as object), gear: g ?? null } as LoadoutRow;
  };

  return (
    <main className="command-page">
      <CommandPageHeader
        kicker="Catalog"
        title="Gear"
        description="Brands, product links, and operator loadouts. Public items show on the site with affiliate attribution."
      />
      <GearConsole
        brands={((brands ?? []) as Record<string, unknown>[]).map(normalizeBrand)}
        gear={((gear ?? []) as Record<string, unknown>[]).map(normalizeGear)}
        operators={(operators ?? []) as OperatorOption[]}
        loadout={((loadout ?? []) as Record<string, unknown>[]).map(normalizeLoadout)}
      />
    </main>
  );
}
