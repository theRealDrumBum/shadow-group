import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await session.from("profiles").select("role,account_status").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.account_status !== "approved") redirect("/command");

  const admin = createSupabaseAdmin();
  const { data: events } = await admin
    .from("events")
    .select("id,name,event_date,location,is_public,summary")
    .order("event_date", { ascending: true, nullsFirst: false });

  return (
    <main className="section command-page">
      <Link href="/command" className="text-link"><ArrowLeft size={16} /> Command center</Link>
      <span className="kicker">ADMIN MODULE // DEPLOYMENTS</span>
      <h1 className="page-title">Event management.</h1>
      <p>Manage upcoming attendance, event dates, locations, public visibility, and promotional links.</p>
      <div className="admin-table">
        <div className="admin-table-head"><span>EVENT</span><span>DATE</span><span>LOCATION</span><span>PUBLIC</span></div>
        {(events ?? []).map((event) => (
          <div className="admin-table-row" key={event.id}>
            <strong>{event.name}</strong><span>{event.event_date ?? "TBD"}</span><span>{event.location ?? "TBD"}</span><em>{event.is_public ? "YES" : "NO"}</em>
          </div>
        ))}
      </div>
      <div className="notice">The next step is adding create/edit forms and tracked outbound links for American Milsim and D4 events.</div>
      <Link href="/#events" className="button secondary">View public event section <ExternalLink size={15} /></Link>
    </main>
  );
}
