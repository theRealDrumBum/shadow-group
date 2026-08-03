import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { getPublicRoster } from "@/lib/roster";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const roster = await getPublicRoster();

  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand"><span className="brand-mark"><Shield size={20} /></span><span>SHADOW GROUP</span></Link>
        <Link className="text-link" href="/"><ArrowLeft size={16} /> Return to HQ</Link>
      </header>
      <section className="section registry-page">
        <span className="kicker">SHADOW GROUP // ROSTER</span>
        <h1 className="page-title">The Team</h1>
        <p className="detail-lead">The operators who make up Shadow Group.</p>
        {roster.length === 0 ? (
          <div className="notice">Roster coming online — approved operator profiles will appear here.</div>
        ) : (
          <div className="roster-grid">
            {roster.map((operator) => (
              <Link href={`/team/${operator.slug}`} className="roster-card" key={operator.id}>
                <div className="roster-portrait">
                  {operator.portrait_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={operator.portrait_url} alt={`${operator.callsign} portrait`} />
                  ) : (
                    <span className="portrait-initials">{operator.callsign.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="roster-card-body">
                  <h3>{operator.callsign}</h3>
                  {operator.display_name ? <span className="roster-name">{operator.display_name}</span> : null}
                  <span className="roster-role">{operator.team_role ?? operator.primary_role ?? "Operator"}</span>
                  {operator.short_bio ? <p>{operator.short_bio}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
