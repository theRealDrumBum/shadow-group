import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  Crosshair,
  Handshake,
  Users,
} from "lucide-react";
import { FeaturedCanon } from "@/components/featured-canon";
import { GoogleLoginButton } from "@/components/google-login-button";
import { createClient } from "@/lib/supabase/server";

const launchTiles = [
  { href: "/team", title: "Team Roster", text: "Meet the operators that make up Shadow Group.", action: "View roster", icon: Users },
  { href: "/events", title: "Events", text: "See where we are deployed next.", action: "View events", icon: CalendarDays },
  { href: "/recruitment", title: "Recruitment", text: "Think you have what it takes? Enlist now.", action: "Apply now", icon: Crosshair },
  { href: "/sponsors", title: "Sponsors", text: "Partners and gear trusted in the field.", action: "Our sponsors", icon: Handshake },
  { href: "/cards", title: "Card Archive", text: "Browse the approved team card project.", action: "View archive", icon: Camera },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <main className="home-shell">
      <header className="site-header cinematic-header">
        <Link href="/" className="brand">
          <Image src="/shadow_group_logo.png" width={56} height={56} alt="Shadow Group" priority />
          <span><strong>SHADOW GROUP</strong><small>AIRSOFT MILSIM TEAM</small></span>
        </Link>
        <nav>
          <a href="#top">Home</a>
          <a href="#team">Team</a>
          <a href="#events">Events</a>
          <a href="#recruitment">Recruitment</a>
          <a href="#partners">Sponsors</a>
          <a href="#card-archive">Card Archive</a>
          <GoogleLoginButton initiallyAuthenticated={Boolean(user)} />
        </nav>
      </header>

      <section id="top" className="reference-hero">
        <div className="reference-watermark" aria-hidden="true">
          <Image src="/shadow_group_logo.png" fill alt="" priority />
        </div>

        <div className="reference-logo-column">
          <Image
            className="reference-logo"
            src="/shadow_group_logo.png"
            width={700}
            height={700}
            alt="Shadow Group — Ex Umbris Mors"
            priority
          />
          <div className="reference-motto">EX UMBRIS MORS</div>
        </div>

        <div className="reference-copy-column">
          <div className="reference-eyebrow">SHADOW GROUP // CENTRAL TEXAS</div>
          <h1><span>SHADOW</span><em>GROUP</em></h1>
          <div className="reference-subtitle">AIRSOFT MILSIM TEAM</div>
          <p>We are Shadow Group, an airsoft milsim team built on discipline, teamwork, and fieldcraft. D4 is one of our home fields, and American Milsim is our primary event circuit.</p>
          <div className="reference-actions">
            <Link className="button primary" href="/team">Meet the team <ArrowUpRight size={17} /></Link>
            <Link className="button secondary" href="/events">Upcoming events <ArrowUpRight size={17} /></Link>
          </div>
        </div>

        <div className="reference-battlefield" aria-label="Shadow Group battlefield visual">
          <div className="battlefield-status">
            <span>TEAM STATUS<strong>ACTIVE</strong></span>
            <span>FIELD READY<strong>24/7</strong></span>
            <span>SESSION<strong>{user ? "ACTIVE" : "PUBLIC"}</strong></span>
          </div>
        </div>
      </section>

      <section className="reference-launch-grid" aria-label="Shadow Group sections">
        {launchTiles.map(({ href, title, text, action, icon: Icon }, index) => (
          <Link href={href} className={`reference-launch-card card-${index + 1}`} key={title}>
            <Icon />
            <h2>{title}</h2>
            <p>{text}</p>
            <span>{action} <ArrowUpRight size={14} /></span>
          </Link>
        ))}
      </section>

      <div className="reference-quote">“IN THE SHADOWS, WE ARE ONE. IN THE FIELD, WE ARE LEGION.”</div>

      <section id="team" className="section archive-section">
        <div className="section-index">SECTION // 01</div>
        <div className="section-heading">
          <div><span className="kicker">TEAM DOSSIERS</span><h2>Meet Shadow Group</h2><p>Learn who we are, the roles we fill, the events we attend, and the gear each operator trusts in the field.</p></div>
          <Link href="/team" className="text-link">View team roster <ArrowUpRight size={16} /></Link>
        </div>
      </section>

      <section id="events" className="section platform-section">
        <div className="section-index">SECTION // 02</div>
        <div className="section-heading">
          <div><span className="kicker">UPCOMING DEPLOYMENTS</span><h2>Where we will be.</h2><p>Event announcements, dates, locations, attendance status, and tracked links to official organizer pages.</p></div>
          <Link href="/events" className="text-link">View event schedule <ArrowUpRight size={16} /></Link>
        </div>
      </section>

      <section id="recruitment" className="section archive-section">
        <div className="section-index">SECTION // 03</div>
        <div className="section-heading">
          <div><span className="kicker">JOIN THE TEAM</span><h2>Recruitment</h2><p>Submit your background, availability, and airsoft experience for review by Shadow Group leadership.</p></div>
          <Link href="/recruitment" className="text-link">Start an application <ArrowUpRight size={16} /></Link>
        </div>
      </section>

      <section id="partners" className="section platform-section">
        <div className="section-index">SECTION // 04</div>
        <div className="section-heading">
          <div><span className="kicker">PARTNERSHIPS</span><h2>Sponsors & social.</h2><p>Meet the companies that support the team and follow Shadow Group across our official channels.</p></div>
          <Link href="/sponsors" className="text-link">View partners <ArrowUpRight size={16} /></Link>
        </div>
      </section>

      <section id="card-archive" className="section archive-section">
        <div className="section-index">SUBSECTION // A</div>
        <div className="section-heading">
          <div><span className="kicker">TEAM CREATIVE PROJECT</span><h2>Shadow Group Card Archive</h2><p>Our custom Magic-style cards are a side project built around team personalities and history.</p></div>
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
