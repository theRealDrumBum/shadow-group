import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CardWorkflowPage() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await session.from("profiles").select("role,account_status").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.account_status !== "approved") redirect("/command");

  const admin = createSupabaseAdmin();
  const { data: cards } = await admin
    .from("cards")
    .select("id,name,status,submitted_at,review_notes,operators(callsign),card_versions(version_number,type_line,created_at)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="section command-page">
      <Link href="/command" className="text-link"><ArrowLeft size={16} /> Command center</Link>
      <span className="kicker">ADMIN MODULE // CARD GOVERNANCE</span>
      <h1 className="page-title">Card workflow.</h1>
      <p>Review drafts, submitted cards, requested revisions, and approved canon. Approval actions remain restricted to authenticated administrators.</p>
      <div className="admin-table">
        <div className="admin-table-head"><span>CARD</span><span>OPERATOR</span><span>STATUS</span><span>VERSIONS</span></div>
        {(cards ?? []).map((card: any) => {
          const operator = Array.isArray(card.operators) ? card.operators[0] : card.operators;
          return <div className="admin-table-row" key={card.id}><strong>{card.name}</strong><span>{operator?.callsign ?? "—"}</span><em>{card.status}</em><span>{card.card_versions?.length ?? 0}</span></div>;
        })}
      </div>
    </main>
  );
}
