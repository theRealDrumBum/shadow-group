import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthedUserAndProfile, isApprovedAdmin } from "@/lib/auth/session-profile";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

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
    <main className="section command-page">
      <Link href="/command" className="text-link"><ArrowLeft size={16} /> Command center</Link>
      <span className="kicker">ADMIN MODULE // PARTNERS & CHANNELS</span>
      <h1 className="page-title">Sponsors and social.</h1>
      <p>Manage sponsor visibility, brand links, affiliate attribution, and operator social profiles.</p>
      <h2>Brands</h2>
      <div className="admin-table">
        <div className="admin-table-head"><span>BRAND</span><span>SPONSOR</span><span>ACTIVE</span><span>WEBSITE</span></div>
        {(brands ?? []).map((brand) => <div className="admin-table-row" key={brand.id}><strong>{brand.name}</strong><span>{brand.is_sponsor ? "YES" : "NO"}</span><em>{brand.is_active ? "ACTIVE" : "INACTIVE"}</em><span>{brand.website_url ?? "—"}</span></div>)}
      </div>
      <h2>Social links</h2>
      <div className="admin-table">
        <div className="admin-table-head"><span>OPERATOR</span><span>PLATFORM</span><span>LABEL</span><span>PUBLIC</span></div>
        {(socials ?? []).map((social: any) => {
          const operator = Array.isArray(social.operators) ? social.operators[0] : social.operators;
          return <div className="admin-table-row" key={social.id}><strong>{operator?.callsign ?? "TEAM"}</strong><span>{social.platform}</span><span>{social.label ?? social.url}</span><em>{social.is_public ? "YES" : "NO"}</em></div>;
        })}
      </div>
    </main>
  );
}
