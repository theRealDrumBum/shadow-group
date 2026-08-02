import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { GearConsole, type BrandRow, type GearRow, type LoadoutRow, type OperatorOption } from "./gear-console";

export const dynamic = "force-dynamic";

export default async function GearPage() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await session.from("profiles").select("role,account_status").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.account_status !== "approved") redirect("/command");

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
    <main className="section command-page">
      <Link href="/command" className="text-link"><ArrowLeft size={16} /> Command center</Link>
      <span className="kicker">ADMIN MODULE // GEAR &amp; EQUIPMENT</span>
      <h1 className="page-title">Gear &amp; equipment.</h1>
      <p>
        Maintain the brand and gear catalog with product and affiliate links for attribution, then assign gear to
        each operator&apos;s loadout. Active gear and public loadout items appear on the site with tracked outbound links.
      </p>
      <GearConsole
        brands={((brands ?? []) as Record<string, unknown>[]).map(normalizeBrand)}
        gear={((gear ?? []) as Record<string, unknown>[]).map(normalizeGear)}
        operators={(operators ?? []) as OperatorOption[]}
        loadout={((loadout ?? []) as Record<string, unknown>[]).map(normalizeLoadout)}
      />
    </main>
  );
}
