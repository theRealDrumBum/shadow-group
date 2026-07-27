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
          <Image src="/shadow-group-logo.png" width={58} height={58} alt="Shadow Group" priority />
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
        <div className="hero-watermark"><Image src="/shadow-group-logo.png" fill alt="" priority /></div>
        <div className="hero-copy">
          <div className="classification"><span>CONTROLLED // SHADOW GROUP</span><span>SG-NET 01</span></div>
          <span className="kicker">PRIVATE MILSIM UNIT // DIGITAL COMMAND PLATFORM</span>
          <h1>From the shadows.<br /><em>Into legend.</em></h1>
          <p>A hardened archive for Shadow Group personnel, operations, and the custom expansion built from the operators behind the kit.</p>
          <div className="actions">
            <Link className="button primary" href="/cards">Enter the archive <ArrowUpRight size={17} /></Link>
            <button className="button secondary">Submit card intelligence</button>
          </div>
          <div className="mission-strip">
            <div><Radio /><span>UNIT STATUS</span><strong>OPERATIONAL</strong></div>
            <div><ShieldCheck /><span>CANON CONTROL</span><strong>ADMIN APPROVED</strong></div>
            <div><Crosshair /><span>ACTIVE EXPANSION</span><strong>SHADOW GROUP // 001</strong></div>
          </div>
        </div>
        <aside className="command-panel">
          <div className="panel-label"><span>FEATURED CANON</span><span>RANDOMIZED QUERY</span></div>
          <FeaturedCanon />
          <div className="panel-footer"><span>PUBLIC CLEARANCE</span><span>AUTO-ROTATE ON LOAD</span></div>
        </aside>
      </section>

      <section id="registry" className="section archive-section">
        <div className="section-index">SECTION // 01</div>
        <div className="section-heading">
          <div><span className="kicker">CANONICAL RECORDS</span><h2>Expansion Archive</h2><p>Only command-approved versions enter the official expansion. Drafts and proposed revisions remain quarantined until reviewed.</p></div>
          <Link href="/cards" className="text-link">Open complete registry <ArrowUpRight size={16} /></Link>
        </div>
        <div className="archive-console">
          <div className="console-copy"><span className="stamp">AUTHORIZED PERSONNEL ONLY</span><h3>Every card is evidence.</h3><p>Each record retains the operator facts, generated artwork, card mechanics, version history, review decisions, and the exact data required to recreate it.</p></div>
          <div className="console-grid"><div><span>STATUS</span><strong>CANON GATED</strong></div><div><span>VERSIONING</span><strong>IMMUTABLE HISTORY</strong></div><div><span>SYNC</span><strong>GPT CONNECTED</strong></div><div><span>AUTHORITY</span><strong>COMMAND REVIEW</strong></div></div>
        </div>
      </section>

      <section id="platform" className="section platform-section">
        <div className="section-index">SECTION // 02</div>
        <span className="kicker">MODULAR COMMAND SYSTEM</span><h2>Built for the unit.</h2>
        <div className="module-grid">{modules.map(({ code, title, text, icon: Icon }) => <article className="module" key={title}><span className="module-code">{code}</span><Icon /><h3>{title}</h3><p>{text}</p><span className="module-state">MODULE STAGED</span></article>)}</div>
      </section>

      <footer><div><Image src="/shadow-group-logo.png" width={54} height={54} alt="" /><span><strong>SHADOW GROUP</strong><small>EX UMBRIS MORS</small></span></div><span>Independent custom expansion archive. Not affiliated with Wizards of the Coast.</span></footer>
    </main>
  );
}
