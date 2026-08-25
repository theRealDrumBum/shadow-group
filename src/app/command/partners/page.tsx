import { redirect } from "next/navigation";
import { getAuthedUserAndProfile, isApprovedAdmin } from "@/lib/auth/session-profile";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { CommandPageHeader } from "../command-header";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const { user, profile } = await getAuthedUserAndProfile();
  if (!user) redirect("/command/login");
  if (!isApprovedAdmin(profile)) redirect("/command");

  const admin = createSupabaseAdmin();
  const [{ data: brands }, { data: socials }] = await Promise.all([
    admin.from("brands").select("id,name,website_url,is_sponsor,is_active").order("name"),
    admin.from("operator_social_links").select("id,platform,label,url,is_public,operators(callsign)").order("platform"),
  ]);

  return (
    <main className="command-page">
      <CommandPageHeader
        kicker="Catalog"
        title="Sponsors"
        description="Sponsor brands and operator social links. Edit brands in Gear if you need to change a record."
      />
      <h2 className="command-section-title">Brands</h2>
      <div className="admin-table">
        <div className="admin-table-head"><span>BRAND</span><span>SPONSOR</span><span>ACTIVE</span><span>WEBSITE</span></div>
        {(brands ?? []).map((brand) => <div className="admin-table-row" key={brand.id}><strong>{brand.name}</strong><span>{brand.is_sponsor ? "YES" : "NO"}</span><em>{brand.is_active ? "ACTIVE" : "INACTIVE"}</em><span>{brand.website_url ?? "—"}</span></div>)}
      </div>
      <h2 className="command-section-title">Social links</h2>
      <div className="admin-table">
        <div className="admin-table-head"><span>OPERATOR</span><span>PLATFORM</span><span>LABEL</span><span>PUBLIC</span></div>
        {(socials ?? []).map((social: { id: string; platform: string; label: string | null; url: string; is_public: boolean; operators: { callsign: string } | { callsign: string }[] | null }) => {
          const operator = Array.isArray(social.operators) ? social.operators[0] : social.operators;
          return <div className="admin-table-row" key={social.id}><strong>{operator?.callsign ?? "TEAM"}</strong><span>{social.platform}</span><span>{social.label ?? social.url}</span><em>{social.is_public ? "YES" : "NO"}</em></div>;
        })}
      </div>
    </main>
  );
}
