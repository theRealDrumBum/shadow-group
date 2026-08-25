import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Package,
  Radio,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import { CommandPageHeader } from "./command-header";
import { getAuthedUserAndProfile, isApprovedAccount, isApprovedAdmin } from "@/lib/auth/session-profile";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PendingVersionRow = {
  id: string;
  status: string;
  version_number: number;
  submitted_at: string | null;
  cards:
    | { id: string; name: string; status: string; operators: { callsign: string } | { callsign: string }[] | null }
    | { id: string; name: string; status: string; operators: { callsign: string } | { callsign: string }[] | null }[]
    | null;
};

type OperatorRow = {
  id: string;
  callsign: string;
  display_name: string | null;
  rank: string | null;
  team_role: string | null;
  active: boolean;
};

type EventRow = {
  id: string;
  name: string;
  event_date: string | null;
  location: string | null;
  is_public: boolean;
};

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function CommandPage() {
  const { user, profile } = await getAuthedUserAndProfile();

  if (!user) redirect("/command/login");

  const status = profile?.account_status ?? "pending";
  const role = profile?.role ?? "pending";
  const approved = isApprovedAccount(profile);
  const admin = isApprovedAdmin(profile);

  if (!approved) {
    return (
      <main className="command-page">
        <CommandPageHeader kicker="Access" title="Approval pending" />
        <p>
          Signed in as {profile?.email ?? user.email}. Role is
          <strong> {role}</strong>, status is <strong>{status}</strong>. An administrator has to approve this account before Command tools open.
        </p>
        <Link href="/" className="button secondary">Return to team site</Link>
      </main>
    );
  }

  if (!admin) {
    return (
      <main className="command-page">
        <CommandPageHeader kicker="Member" title="Member portal" />
        <p>
          Signed in as {profile?.email ?? user.email}. Role is <strong>{role}</strong>.
          Private details stay off the public site; public roster copy is reviewed first.
        </p>
        <div className="actions">
          <Link href="/command/profile" className="button primary">Manage my profile</Link>
          <Link href="/" className="button secondary">Public site</Link>
        </div>
      </main>
    );
  }

  const adminClient = createSupabaseAdmin();
  const [cardsResult, operatorsResult, eventsResult, brandsResult, socialResult, recruitsResult, profileSubsResult, pendingAccountsResult, gearResult] = await Promise.all([
    adminClient
      .from("card_versions")
      .select("id,status,version_number,submitted_at,cards!card_versions_card_id_fkey!inner(id,name,status,operators!cards_operator_id_fkey(callsign))")
      .in("status", ["submitted", "changes_requested"])
      .order("submitted_at", { ascending: true, nullsFirst: false })
      .limit(8),
    adminClient
      .from("operators")
      .select("id,callsign,display_name,rank,team_role,active")
      .order("display_order", { ascending: true })
      .limit(12),
    adminClient
      .from("events")
      .select("id,name,event_date,location,is_public")
      .order("event_date", { ascending: true, nullsFirst: false })
      .limit(8),
    adminClient.from("brands").select("id", { count: "exact", head: true }).eq("is_active", true),
    adminClient.from("operator_social_links").select("id", { count: "exact", head: true }).eq("is_public", true),
    adminClient.from("recruitment_submissions").select("id", { count: "exact", head: true }).in("status", ["new", "reviewing"]),
    adminClient.from("member_profile_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    adminClient.from("profiles").select("id", { count: "exact", head: true }).eq("account_status", "pending"),
    adminClient.from("gear_catalog").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const pendingVersions = (cardsResult.data ?? []) as PendingVersionRow[];
  const operators = (operatorsResult.data ?? []) as OperatorRow[];
  const events = (eventsResult.data ?? []) as EventRow[];
  const submittedCards = pendingVersions.filter((version) => version.status === "submitted").length;

  const modules = [
    {
      title: "Card workflow",
      detail: `${submittedCards} awaiting command review`,
      href: "/command/cards",
      icon: CreditCard,
    },
    {
      title: "Roster management",
      detail: `${operators.length} operators loaded`,
      href: "/command/roster",
      icon: Users,
    },
    {
      title: "Accounts",
      detail: `${pendingAccountsResult.count ?? 0} awaiting approval`,
      href: "/command/accounts",
      icon: UserCheck,
    },
    {
      title: "Events",
      detail: `${events.length} upcoming or staged events`,
      href: "/command/events",
      icon: CalendarDays,
    },
    {
      title: "Profile approvals",
      detail: `${profileSubsResult.count ?? 0} member profiles awaiting review`,
      href: "/command/profile-review",
      icon: UserCog,
    },
    {
      title: "Gear & equipment",
      detail: `${gearResult.count ?? 0} active gear items`,
      href: "/command/gear",
      icon: Package,
    },
    {
      title: "Sponsors & social",
      detail: `${brandsResult.count ?? 0} brands · ${socialResult.count ?? 0} social links`,
      href: "/command/partners",
      icon: Radio,
    },
  ];

  return (
    <main className="command-page">
      <CommandPageHeader
        kicker="Overview"
        title="Command"
        description="Work queues first. Open a module only when you need the full editor."
        actions={
          <div className="command-identity">
            <ShieldCheck size={20} />
            <span>{profile?.display_name ?? "Operator"}</span>
            <small>{profile?.email ?? user.email}</small>
          </div>
        }
      />

      <div className="module-grid command-modules">
        {modules.map(({ title, detail, href, icon: Icon }, index) => (
          <Link href={href} className="module command-module" key={title}>
            <span className="module-code">0{index + 1}</span>
            <Icon />
            <h3>{title}</h3>
            <p>{detail}</p>
            <span className="module-state">Open <ChevronRight size={14} /></span>
          </Link>
        ))}
      </div>

      <section className="command-grid">
        <article className="command-panel admin-list-panel">
          <div className="panel-label"><span>CARD REVIEW QUEUE</span><span>{pendingVersions.length} ACTIVE</span></div>
          <div className="admin-list">
            {pendingVersions.length ? pendingVersions.map((version) => {
              const card = first(version.cards);
              const operator = first(card?.operators ?? null);
              return (
                <Link href={`/command/cards?card=${card?.id ?? ""}`} className="admin-row" key={version.id}>
                  <div><strong>{card?.name ?? "Untitled card"}</strong><span>{operator?.callsign ?? "UNKNOWN OPERATOR"} · v{version.version_number}</span></div>
                  <em>{version.status.replaceAll("_", " ")}</em>
                </Link>
              );
            }) : <p className="admin-empty">No versions awaiting review.</p>}
          </div>
          <div className="panel-footer"><Link href="/command/cards">OPEN CARD WORKFLOW</Link><ExternalLink size={13} /></div>
        </article>

        <article className="command-panel admin-list-panel">
          <div className="panel-label"><span>ROSTER SNAPSHOT</span><span>{operators.length} SHOWN</span></div>
          <div className="admin-list">
            {operators.map((operator) => (
              <Link href={`/command/roster?operator=${operator.id}`} className="admin-row" key={operator.id}>
                <div><strong>{operator.callsign}</strong><span>{operator.display_name ?? "NAME NOT SET"}</span></div>
                <em>{operator.rank ?? operator.team_role ?? "UNASSIGNED"}</em>
              </Link>
            ))}
          </div>
          <div className="panel-footer"><Link href="/command/roster">MANAGE FULL ROSTER</Link><ExternalLink size={13} /></div>
        </article>

        <article className="command-panel admin-list-panel">
          <div className="panel-label"><span>EVENT BOARD</span><span>{events.length} RECORDS</span></div>
          <div className="admin-list">
            {events.length ? events.map((event) => (
              <Link href={`/command/events?event=${event.id}`} className="admin-row" key={event.id}>
                <div><strong>{event.name}</strong><span>{event.location ?? "LOCATION TBD"}</span></div>
                <em>{event.event_date ?? "DATE TBD"}</em>
              </Link>
            )) : <p className="admin-empty">No events have been published yet.</p>}
          </div>
          <div className="panel-footer"><Link href="/command/events">ADD OR EDIT EVENTS</Link><ExternalLink size={13} /></div>
        </article>

        <article className="command-panel admin-list-panel command-summary-panel">
          <div className="panel-label"><span>INBOUND QUEUES</span><span>LIVE</span></div>
          <div className="console-grid">
            <div><span>RECRUITS</span><strong>{recruitsResult.count ?? 0} OPEN</strong></div>
            <div><span>SPONSORS</span><strong>{brandsResult.count ?? 0} ACTIVE</strong></div>
            <div><span>SOCIAL LINKS</span><strong>{socialResult.count ?? 0} PUBLIC</strong></div>
            <div><span>ACCOUNT</span><strong>ADMIN</strong></div>
          </div>
          <div className="panel-footer"><Link href="/command/profile">EDIT MY PROFILE</Link><Link href="/">VIEW PUBLIC SITE <ExternalLink size={12} /></Link></div>
        </article>
      </section>
    </main>
  );
}
