import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Crosshair, Database, Radio, ShieldCheck, Users } from "lucide-react";
import { FeaturedCanon } from "@/components/featured-canon";

const modules = [
  { code: "01", title: "Operator Registry", text: "Personnel files, callsigns, roles, qualifications, source facts, and unit history.", icon: Users },
  { code: "02", title: "Expansion Archive", text: "Approved canonical cards, revision history, alternate artwork, and collector records.", icon: Database },
  { code: "03", title: "Operations", text: "Planned home for deployments, facilities, after-action reports, and institutional memory.", icon: Crosshair }
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand">
          <Image src="/shadow_group_logo.png" width={58} height={58} alt="Shadow Group" priority />
          <span><strong>SHADOW GROUP</strong><small>EX UMBRIS MORS</small></span>
        </Link>
        <nav>
          <a href="#registry">Archive</a>
          <a href="#platform">Platform</a>
          <span className="secure-state"><i /> NETWORK SECURE</span>
          <button className="button ghost">Command Access</button>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-watermark"><Image src="/shadow_group_logo.png" fill alt="" priority /></div>
        <div className="hero-copy">
          <div className="classification"><span>SHADOW GROUP // AIRSOFT MILSIM</span><span>EX UMBRIS MORS</span></div>
          <span className="kicker">CENTRAL TEXAS AIRSOFT MILSIM TEAM</span>
          <h1>Shadow Group<br /><em>Airsoft Milsim.</em></h1>
          <p>We are an organized airsoft milsim team focused on teamwork, fieldcraft, training, and showing up prepared for large-scale events across Texas and beyond.</p>
          <div className="actions">
            <Link className="button primary" href="/cards">Meet the team <ArrowUpRight size={17} /></Link>
            <button className="button secondary">Apply to join</button>
          </div>
          <div className="mission-strip">
            <div><Radio /><span>TEAM STATUS</span><strong>ACTIVE</strong></div>
            <div><ShieldCheck /><span>UNIT MOTTO</span><strong>EX UMBRIS MORS</strong></div>
            <div><Crosshair /><span>PRIMARY FOCUS</span><strong>AIRSOFT MILSIM</strong></div>
          </div>
        </div>
        <aside className="command-panel">
          <div className="panel-label"><span>FEATURED OPERATOR</span><span>TEAM ARCHIVE</span></div>
          <FeaturedCanon />
          <div className="panel-footer"><span>PUBLIC PROFILE</span><span>RANDOMIZED ON LOAD</span></div>
        </aside>
      </section>

      <section id="registry" className="section archive-section">
        <div className="section-index">SECTION // 01</div>
        <div className="section-heading">
          <div><span className="kicker">TEAM DOSSIERS</span><h2>Meet Shadow Group</h2><p>Learn who we are, the roles we fill, the events we attend, and the gear each operator trusts in the field.</p></div>
          <Link href="/cards" className="text-link">View operator archive <ArrowUpRight size={16} /></Link>
        </div>
        <div className="archive-console">
          <div className="console-copy"><span className="stamp">SHADOW GROUP AIRSOFT</span><h3>Built around the team.</h3><p>Operator dossiers, event photography, loadouts, team history, social links, recruitment, sponsorships, and the custom card project all live in one place.</p></div>
          <div className="console-grid"><div><span>TEAM</span><strong>ACTIVE ROSTER</strong></div><div><span>EVENTS</span><strong>FIELD ARCHIVE</strong></div><div><span>RECRUITING</span><strong>APPLICATION REVIEW</strong></div><div><span>PARTNERS</span><strong>SPONSOR READY</strong></div></div>
        </div>
      </section>

      <section id="platform" className="section platform-section">
        <div className="section-index">SECTION // 02</div>
        <span className="kicker">TEAM PLATFORM</span><h2>Everything behind the patch.</h2>
        <div className="module-grid">{modules.map(({ code, title, text, icon: Icon }) => <article className="module" key={title}><span className="module-code">{code}</span><Icon /><h3>{title}</h3><p>{text}</p><span className="module-state">MODULE STAGED</span></article>)}</div>
      </section>

      <footer><div><Image src="/shadow_group_logo.png" width={54} height={54} alt="" /><span><strong>SHADOW GROUP</strong><small>EX UMBRIS MORS</small></span></div><span>Independent airsoft milsim team. Not affiliated with Wizards of the Coast.</span></footer>
    </main>
  );
}
