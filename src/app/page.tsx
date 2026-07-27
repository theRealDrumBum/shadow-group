import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  Crosshair,
  Handshake,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";
import { FeaturedCanon } from "@/components/featured-canon";
import { GoogleLoginButton } from "@/components/google-login-button";
import { createClient } from "@/lib/supabase/server";

const launchTiles = [
  { href: "/team", title: "Team Roster", text: "Meet the operators behind the Shadow Group patch.", icon: Users },
  { href: "/events", title: "Events", text: "See where Shadow Group is deploying next.", icon: CalendarDays },
  { href: "/recruitment", title: "Recruitment", text: "Think you have what it takes? Apply to train with us.", icon: Crosshair },
  { href: "/sponsors", title: "Sponsors", text: "Partners, field support, and gear trusted by the team.", icon: Handshake },
  { href: "/cards", title: "Card Archive", text: "Browse the team creative project and approved cards.", icon: Camera },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main>
      <header className="site-header cinematic-header">
        <Link href="/" className="brand">
          <Image src="/shadow_group_logo.png" width={62} height={62} alt="Shadow Group" priority />
          <span><strong>SHADOW GROUP</strong><small>AIRSOFT MILSIM TEAM</small></span>
        </Link>
        <nav>
          <a href="#team">Team</a>
          <a href="#events">Events</a>
          <a href="#recruitment">Recruitment</a>
          <a href="#partners">Sponsors</a>
          <a href="#card-archive">Card Archive</a>
          <GoogleLoginButton initiallyAuthenticated={Boolean(user)} />
        </nav>
      </header>

      <section className="hero cinematic-hero">
        <div className="hero-emblem-watermark" aria-hidden="true">
          <Image src="/shadow_group_logo.png" fill alt="" priority />
        </div>
        <div className="battlefield-haze" aria-hidden="true" />

        <div className="hero-emblem-stage">
          <div className="hero-emblem-ring" />
          <Image
            className="hero-emblem"
            src="/shadow_group_logo.png"
            width={620}
            height={620}
            alt="Shadow Group — Ex Umbris Mors"
            priority
          />
          <div className="motto-plaque">EX UMBRIS MORS</div>
        </div>

        <div className="hero-copy cinematic-copy">
          <div className="classification"><span>SHADOW GROUP // CENTRAL TEXAS</span><span>{user ? "SESSION ACTIVE" : "PUBLIC ACCESS"}</span></div>
          <span className="kicker">AIRSOFT MILSIM TEAM</span>
          <h1><span>Shadow</span><br /><em>Group</em></h1>
          <div className="hero-subtitle">AIRSOFT MILSIM</div>
          <p>Built on discipline, teamwork, fieldcraft, and brotherhood. D4 is one of our home fields, and American Milsim is where we primarily deploy.</p>
          <div className="actions">
            <a className="button primary" href="#team">Meet the team <ArrowUpRight size={17} /></a>
            <a className="button secondary" href="#events">Upcoming deployments</a>
          </div>
          <div className="mission-strip cinematic-status">
            <div><Radio /><span>TEAM STATUS</span><strong>ACTIVE</strong></div>
            <div><ShieldCheck /><span>HOME FIELD</span><strong>D4 AIRSOFT</strong></div>
            <div><Crosshair /><span>PRIMARY CIRCUIT</span><strong>AMERICAN MILSIM</strong></div>
          </div>
        </div>
      </section>

      <section className="launch-strip" aria-label="Shadow Group sections">
        {launchTiles.map(({ href, title, text, icon: Icon }) => (
          <Link href={href} className="launch-tile" key={title}>
            <Icon />
            <h2>{title}</h2>
            <p>{text}</p>
            <span>Open section <ArrowUpRight size={14} /></span>
          </Link>
        ))}
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
        <div className="section-heading">
          <div><span className="kicker">UPCOMING DEPLOYMENTS</span><h2>Where we will be.</h2><p>Event announcements, dates, locations, attendance status, and tracked links to the organizer’s official event page.</p></div>
          <Link href="/events" className="text-link">View event schedule <ArrowUpRight size={16} /></Link>
        </div>
      </section>

      <section id="recruitment" className="section archive-section">
        <div className="section-index">SECTION // 03</div>
        <div className="section-heading">
          <div><span className="kicker">JOIN THE TEAM</span><h2>Recruitment</h2><p>Hopefuls can submit their information, background, availability, and airsoft experience for review by Shadow Group leadership.</p></div>
          <Link href="/recruitment" className="text-link">Start an application <ArrowUpRight size={16} /></Link>
        </div>
      </section>

      <section id="partners" className="section platform-section">
        <div className="section-index">SECTION // 04</div>
        <div className="section-heading">
          <div><span className="kicker">PARTNERSHIPS</span><h2>Sponsors & social.</h2><p>Meet the companies that support the team and follow Shadow Group across our official social channels.</p></div>
          <Link href="/sponsors" className="text-link">View partners <ArrowUpRight size={16} /></Link>
        </div>
      </section>

      <section id="card-archive" className="section archive-section">
        <div className="section-index">SUBSECTION // A</div>
        <div className="section-heading">
          <div><span className="kicker">TEAM CREATIVE PROJECT</span><h2>Shadow Group Card Archive</h2><p>Our custom Magic-style cards are a side project built around team personalities and history—not the primary purpose of the site.</p></div>
          <Link href="/cards" className="text-link">Open card archive <ArrowUpRight size={16} /></Link>
        </div>
        <div className="command-panel card-project-panel">
          <div className="panel-label"><span>FEATURED CARD</span><span>APPROVED CANON</span></div>
          <FeaturedCanon />
          <div className="panel-footer"><span>TEAM SIDE PROJECT</span><span>ADMIN APPROVED</span></div>
        </div>
      </section>

      <footer><div><Image src="/shadow_group_logo.png" width={64} height={64} alt="" /><span><strong>SHADOW GROUP</strong><small>EX UMBRIS MORS</small></span></div><span>Independent Central Texas airsoft milsim team.</span></footer>
    </main>
  );
}
