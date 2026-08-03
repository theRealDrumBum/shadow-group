import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { getPublicOperator } from "@/lib/roster";

export const dynamic = "force-dynamic";

export default async function OperatorDossier({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getPublicOperator(slug);
  if (!result) notFound();
  const { operator, social } = result;

  return (
    <main>
      <section className="section detail-page">
        <Link className="text-link" href="/team"><ArrowLeft size={16} /> Roster</Link>
        <div className="dossier-grid">
          <div className="dossier-portrait">
            {operator.portrait_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={operator.portrait_url} alt={`${operator.callsign} portrait`} />
            ) : (
              <span className="portrait-initials">{operator.callsign.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="dossier-copy">
            <span className="kicker">OPERATOR DOSSIER</span>
            <h1 className="page-title">{operator.callsign}</h1>
            {operator.display_name ? <p className="detail-lead">{operator.display_name}</p> : null}
            <div className="fact-panel"><span>RANK</span><strong>{operator.rank ?? "—"}</strong></div>
            <div className="fact-panel"><span>ROLE</span><strong>{[operator.primary_role, operator.secondary_role].filter(Boolean).join(" / ") || operator.team_role || "—"}</strong></div>
            <div className="fact-panel"><span>WITH THE TEAM SINCE</span><strong>{operator.joined_at ?? "—"}</strong></div>
            {operator.long_bio || operator.short_bio ? (
              <p className="dossier-bio">{operator.long_bio ?? operator.short_bio}</p>
            ) : null}
            {social.length ? (
              <div className="dossier-social">
                {social.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer noopener" className="text-link">
                    {link.label ?? link.platform} <ExternalLink size={13} />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {operator.gallery_urls.length ? (
          <div className="dossier-gallery">
            {operator.gallery_urls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt={`${operator.callsign} gallery`} />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
