import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Camera, Crosshair, Radio, ShieldCheck, Users } from "lucide-react";
import { FeaturedCanon } from "@/components/featured-canon";
import { GoogleLoginButton } from "@/components/google-login-button";
import { createClient } from "@/lib/supabase/server";

const modules = [
  { code: "01", title: "Team Roster", text: "Member dossiers, callsigns, ranks, biographies, qualifications, social links, and field loadouts.", icon: Users },
  { code: "02", title: "Event Gallery", text: "Photos, videos, locations, and after-action records from milsim events, training days, and team operations.", icon: Camera },
  { code: "03", title: "Recruitment", text: "A structured path for hopefuls to introduce themselves, share experience, and apply to train with the team.", icon: Crosshair }
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand">
          <Image src="/shadow_group_logo.png" width={58} height={58} alt="Shadow Group" priority />
          <span><strong>SHADOW GROUP</strong><small>EX UMBRIS MORS</small></span>
        </Link>
        <nav>
          <a href="#team">Team</a>
          <a href="#events">Events</a>
          <a href="#recruitment">Recruitment</a>
          <a href="#card-archive">Card Archive</a>
          <GoogleLoginButton initiallyAuthenticated={Boolean(user)} />
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
            <a className="button primary" href="#team">Meet the team <ArrowUpRight size={17} /></a>
            <a className="button secondary" href="#recruitment">Apply to join</a>
          </div>
          <div className="mission-strip">
            <div><Radio /><span>TEAM STATUS</span><strong>ACTIVE</strong></div>
            <div><ShieldCheck /><span>UNIT MOTTO</span><strong>EX UMBRIS MORS</strong></div>
            <div><Crosshair /><span>PRIMARY FOCUS</span><strong>AIRSOFT MILSIM</strong></div>
          </div>
        </div>
        <aside className="command-panel">
          <div className="panel-label"><span>UNIT PROFILE</span><span>CENTRAL TEXAS</span></div>
          <div className="console-copy">
            <span className="stamp">SHADOW GROUP AIRSOFT</span>
            <h3>Train together. Deploy together.</h3>
            <p>Our site documents the people, events, field roles, loadouts, partnerships, and standards behind the Shadow Group patch.</p>
          </div>
          <div className="console-grid">
            <div><span>ROSTER</span><strong>TEAM DOSSIERS</strong></div>
            <div><span>OPERATIONS</span><strong>EVENT ARCHIVE</strong></div>
            <div><span>ACCESS</span><strong>{user ? "SESSION ACTIVE" : "MEMBER PORTAL"}</strong></div>
            <div><span>PIPELINE</span><strong>RECRUITMENT</strong></div>
          </div>
          <div className="panel-footer"><span>PUBLIC TEAM PROFILE</span><span>EST. CENTRAL TEXAS</span></div>
        </aside>
      </section>

      <section id="team" className="section archive-section">
        <div className="section-index">SECTION // 01</div>
        <div className="section-heading">
          <div><span className="kicker">TEAM DOSSIERS</span><h2>Meet Shadow Group</h2><p>Learn who we are, the roles we fill, the events we attend, and the gear each operator trusts in the field.</p></div>
          <Link href="/team" className="text-link">View team roster <ArrowUpRight size={16} /></Link>
        </div>
        <div className="archive-console">
          <div className="console-copy"><span className="stamp">SHADOW GROUP AIRSOFT</span><h3>Built around the team.</h3><p>Operator dossiers combine rank, biography, field role, event history, social accounts, personal loadout, and sponsor or affiliate gear attribution.</p></div>
          <div className="console-grid"><div><span>TEAM</span><strong>ACTIVE ROSTER</strong></div><div><span>RANK</span><strong>CHAIN OF COMMAND</strong></div><div><span>LOADOUTS</span><strong>FIELD PROVEN</strong></div><div><span>PARTNERS</span><strong>SPONSOR READY</strong></div></div>
        </div>
      </section>

      <section id="events" className="section platform-section">
        <div className="section-index">SECTION // 02</div>
        <span className="kicker">TEAM PLATFORM</span><h2>Everything behind the patch.</h2>
        <div className="module-grid">{modules.map(({ code, title, text, icon: Icon }) => <article className="module" key={title}><span className="module-code">{code}</span><Icon /><h3>{title}</h3><p>{text}</p><span className="module-state">MODULE STAGED</span></article>)}</div>
      </section>

      <section id="recruitment" className="section archive-section">
        <div className="section-index">SECTION // 03</div>
        <div className="section-heading">
          <div><span className="kicker">JOIN THE TEAM</span><h2>Recruitment</h2><p>Hopefuls can submit their information, background, availability, and airsoft experience for review by Shadow Group leadership.</p></div>
          <Link href="/recruitment" className="text-link">Start an application <ArrowUpRight size={16} /></Link>
        </div>
      </section>

      <section id="card-archive" className="section platform-section">
        <div className="section-index">SUBSECTION // A</div>
        <div className="section-heading">
          <div><span className="kicker">TEAM CREATIVE PROJECT</span><h2>Shadow Group Card Archive</h2><p>Our custom Magic-style cards are a side project built around team personalities and history. They are not the primary purpose of this site.</p></div>
          <Link href="/cards" className="text-link">Open card archive <ArrowUpRight size={16} /></Link>
        </div>
        <div className="command-panel">
          <div className="panel-label"><span>FEATURED CARD</span><span>APPROVED CANON</span></div>
          <FeaturedCanon />
          <div className="panel-footer"><span>TEAM SIDE PROJECT</span><span>NOT THE PRIMARY SITE</span></div>
        </div>
      </section>

      <footer><div><Image src="/shadow_group_logo.png" width={54} height={54} alt="" /><span><strong>SHADOW GROUP</strong><small>EX UMBRIS MORS</small></span></div><span>Independent Central Texas airsoft milsim team. Custom card archive maintained as a team side project.</span></footer>
    </main>
  );
}
