import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Radio,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CardRow = {
  id: string;
  name: string;
  status: string;
  submitted_at: string | null;
  operators: { callsign: string } | { callsign: string }[] | null;
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
  const sessionClient = await createClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await sessionClient
    .from("profiles")
    .select("display_name,email,role,account_status")
    .eq("id", user.id)
    .maybeSingle();

  const status = profile?.account_status ?? "pending";
  const role = profile?.role ?? "pending";
  const approved = status === "approved";
  const admin = approved && role === "admin";

  if (!approved) {
    return (
      <main className="section command-page">
        <div className="section-index">COMMAND ACCESS</div>
        <span className="kicker">GOOGLE IDENTITY VERIFIED</span>
        <h1 className="page-title">Approval pending.</h1>
        <p>
          Signed in as {profile?.email ?? user.email}. Your Shadow Group role is
          <strong> {role}</strong> and your account status is <strong>{status}</strong>.
        </p>
        <p>An administrator must approve this account before command tools become available.</p>
        <Link href="/" className="button secondary">Return to team site</Link>
      </main>
    );
  }

  if (!admin) {
    return (
      <main className="section command-page">
        <div className="section-index">MEMBER ACCESS</div>
        <span className="kicker">IDENTITY VERIFIED // ACCESS APPROVED</span>
        <h1 className="page-title">Member portal.</h1>
        <p>
          Signed in as {profile?.email ?? user.email}. Your current role is <strong>{role}</strong>.
        </p>
        <p>
          Keep your details on file with the team. Your private contact and medical information is stored
          securely and never shown publicly; your public profile is reviewed before it goes live.
        </p>
        <div className="actions">
          <Link href="/command/profile" className="button primary">Manage my profile</Link>
          <Link href="/" className="button secondary">Return to team site</Link>
        </div>
      </main>
    );
  }

  const adminClient = createSupabaseAdmin();
  const [cardsResult, operatorsResult, eventsResult, brandsResult, socialResult, recruitsResult, profileSubsResult] = await Promise.all([
    adminClient
      .from("cards")
      .select("id,name,status,submitted_at,operators(callsign)")
      .in("status", ["submitted", "changes_requested", "draft"])
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
  ]);

  const cards = (cardsResult.data ?? []) as CardRow[];
  const operators = (operatorsResult.data ?? []) as OperatorRow[];
  const events = (eventsResult.data ?? []) as EventRow[];
  const submittedCards = cards.filter((card) => card.status === "submitted").length;

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
      title: "Sponsors & social",
      detail: `${brandsResult.count ?? 0} brands · ${socialResult.count ?? 0} social links`,
      href: "/command/partners",
      icon: Radio,
    },
  ];

  return (
    <main className="section command-page">
      <div className="section-index">COMMAND ACCESS // ADMIN</div>
      <div className="command-heading">
        <div>
          <span className="kicker">GOOGLE IDENTITY VERIFIED // ADMINISTRATOR</span>
          <h1 className="page-title">Command center.</h1>
          <p>Manage Shadow Group cards, personnel, events, recruiting, sponsors, and public team content.</p>
        </div>
        <div className="command-identity">
          <ShieldCheck size={20} />
          <span>{profile?.display_name ?? "Matthew Ward"}</span>
          <small>{profile?.email ?? user.email}</small>
        </div>
      </div>

      <div className="module-grid command-modules">
        {modules.map(({ title, detail, href, icon: Icon }, index) => (
          <Link href={href} className="module command-module" key={title}>
            <span className="module-code">0{index + 1}</span>
            <Icon />
            <h3>{title}</h3>
            <p>{detail}</p>
            <span className="module-state">OPEN MODULE <ChevronRight size={14} /></span>
          </Link>
        ))}
      </div>

      <section className="command-grid">
        <article className="command-panel admin-list-panel">
          <div className="panel-label"><span>CARD REVIEW QUEUE</span><span>{cards.length} ACTIVE</span></div>
          <div className="admin-list">
            {cards.length ? cards.map((card) => {
              const operator = first(card.operators);
              return (
                <Link href={`/command/cards?card=${card.id}`} className="admin-row" key={card.id}>
                  <div><strong>{card.name}</strong><span>{operator?.callsign ?? "UNKNOWN OPERATOR"}</span></div>
                  <em>{card.status.replaceAll("_", " ")}</em>
                </Link>
              );
            }) : <p className="admin-empty">No active card reviews.</p>}
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
