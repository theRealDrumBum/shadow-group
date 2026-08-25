import Image from "next/image";
import Link from "next/link";
import "./cinematic.css";
import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  Crosshair,
  Handshake,
  Users,
} from "lucide-react";
import { EventCard } from "@/components/event-card";
import { FeaturedCanon } from "@/components/featured-canon";
import { CommandAccessButton } from "@/components/google-login-button";
import { getPublicEvents } from "@/lib/events";
import { createOptionalClient } from "@/lib/supabase/server";

const AUTH_ERRORS: Record<string, string> = {
  missing_code: "Google sign-in did not complete. Open Command Access and use email and password.",
  callback_failed: "Google sign-in failed. Open Command Access and sign in with email and password."
};


const launchTiles = [
  {
    href: "/team",
    title: "Team Roster",
    text: "Meet the operators who make up Shadow Group.",
    action: "View Roster",
    imageClass: "card-1",
    icon: Users,
  },
  {
    href: "#events",
    title: "Events",
    text: "See where Shadow Group is deploying next.",
    action: "View Events",
    imageClass: "card-2",
    icon: CalendarDays,
  },
  {
    href: "#recruitment",
    title: "Recruitment",
    text: "Think you have what it takes? Apply to join the team.",
    action: "Apply Now",
    imageClass: "card-3",
    icon: Crosshair,
  },
  {
    href: "/sponsors",
    title: "Sponsors",
    text: "Partners, affiliate gear, and brands supporting the team.",
    action: "Our Sponsors",
    imageClass: "card-4",
    icon: Handshake,
  },
  {
    href: "/cards",
    title: "Card Archive",
    text: "Browse the approved Shadow Group card project.",
    action: "View Archive",
    imageClass: "card-5",
    icon: Camera,
  },
];

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{ auth_error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createOptionalClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const authError = params.auth_error ? AUTH_ERRORS[params.auth_error] ?? "Sign-in failed. Open Command Access to try email and password." : null;

  const upcomingEvents = await getPublicEvents(3);

  return (
    <main className="home-shell">
      {authError ? <div className="home-auth-error" role="alert">{authError}</div> : null}
      <header className="site-header cinematic-header">
        <Link href="/" className="brand">
          <Image src="/shadow_group_logo.png" width={56} height={56} alt="Shadow Group" priority />
          <span>
            <strong>SHADOW GROUP</strong>
            <small>AIRSOFT MILSIM TEAM</small>
          </span>
        </Link>

        <nav>
          <a href="#top">Home</a>
          <a href="#team">Team</a>
          <a href="#events">Events</a>
          <a href="#recruitment">Recruitment</a>
          <a href="#partners">Sponsors</a>
          <a href="#card-archive">Card Archive</a>
          <CommandAccessButton initiallyAuthenticated={Boolean(user)} />
        </nav>
      </header>

      <section id="top" className="reference-hero">
        <div className="reference-watermark" aria-hidden="true">
          <Image src="/shadow_group_logo.png" fill alt="" priority sizes="760px" />
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
          <h1>
            <span>SHADOW</span>
            <em>GROUP</em>
          </h1>
          <div className="reference-subtitle">AIRSOFT MILSIM TEAM</div>
          <p>
            We are Shadow Group, an airsoft milsim team built on discipline, teamwork, fieldcraft, and
            brotherhood. D4 is one of our home fields, and American Milsim is our primary event circuit.
          </p>
          <div className="reference-actions">
            <Link className="button primary" href="#team">
              Meet the Team <ArrowUpRight size={17} />
            </Link>
            <Link className="button secondary" href="#events">
              Upcoming Events <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>

        <div className="battlefield-status" aria-label="Team status">
          <span>
            TEAM STATUS
            <strong>ACTIVE</strong>
          </span>
          <span>
            HOME FIELD
            <strong>D4 AIRSOFT</strong>
          </span>
          <span>
            PRIMARY CIRCUIT
            <strong>AMERICAN MILSIM</strong>
          </span>
          <span>
            SESSION
            <strong>{user ? "ACTIVE" : "PUBLIC"}</strong>
          </span>
        </div>
      </section>

      <section className="reference-launch-grid" aria-label="Shadow Group sections">
        {launchTiles.map(({ href, title, text, action, imageClass, icon: Icon }) => (
          <Link href={href} className={`reference-launch-card ${imageClass}`} key={title}>
            <Icon />
            <h2>{title}</h2>
            <p>{text}</p>
            <span className="card-action">
              {action} <ArrowUpRight size={14} />
            </span>
          </Link>
        ))}
      </section>

      <section className="motto-strip" aria-label="Team motto">
        <span className="motto-line" aria-hidden="true" />
        <h2>EX UMBRIS MORS</h2>
        <span className="motto-line right" aria-hidden="true" />
      </section>

      <section id="team" className="section archive-section">
        <div className="section-index">SECTION // 01</div>
        <div className="section-heading">
          <div>
            <span className="kicker">TEAM DOSSIERS</span>
            <h2>Meet Shadow Group</h2>
            <p>Learn who we are, the roles we fill, the events we attend, and the gear each operator trusts in the field.</p>
          </div>
          <Link href="/team" className="text-link">
            View team roster <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      <section id="events" className="section platform-section">
        <div className="section-index">SECTION // 02</div>
        <div className="section-heading">
          <div>
            <span className="kicker">UPCOMING DEPLOYMENTS</span>
            <h2>Where we will be.</h2>
            <p>Event announcements, dates, locations, attendance status, and tracked links to official organizer pages.</p>
          </div>
          <Link href="/events" className="text-link">
            View event schedule <ArrowUpRight size={16} />
          </Link>
        </div>
        {upcomingEvents.length > 0 ? (
          <div className="events-grid events-grid--preview">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="events-empty">
            <p>Next deployments are being locked in. Check back soon for dates and locations.</p>
          </div>
        )}
      </section>

      <section id="recruitment" className="section archive-section">
        <div className="section-index">SECTION // 03</div>
        <div className="section-heading">
          <div>
            <span className="kicker">JOIN THE TEAM</span>
            <h2>Recruitment</h2>
            <p>Submit your background, availability, and airsoft experience for review by Shadow Group leadership.</p>
          </div>
          <Link href="/recruitment" className="text-link">
            Start an application <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      <section id="partners" className="section platform-section">
        <div className="section-index">SECTION // 04</div>
        <div className="section-heading">
          <div>
            <span className="kicker">PARTNERSHIPS</span>
            <h2>Sponsors &amp; social.</h2>
            <p>Meet the companies that support the team and follow Shadow Group across our official channels.</p>
          </div>
          <Link href="/sponsors" className="text-link">
            View partners <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>

      <section id="card-archive" className="section archive-section">
        <div className="section-index">SUBSECTION // A</div>
        <div className="section-heading">
          <div>
            <span className="kicker">TEAM CREATIVE PROJECT</span>
            <h2>Shadow Group Card Archive</h2>
            <p>Our custom Magic-style cards are a side project built around team personalities and history.</p>
          </div>
          <Link href="/cards" className="text-link">
            Open card archive <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="command-panel card-project-panel">
          <div className="panel-label">
            <span>FEATURED CARD</span>
            <span>APPROVED CANON</span>
          </div>
          <FeaturedCanon />
          <div className="panel-footer">
            <span>TEAM SIDE PROJECT</span>
            <span>ADMIN APPROVED</span>
          </div>
        </div>
      </section>

      <footer>
        <div>
          <Image src="/shadow_group_logo.png" width={64} height={64} alt="" />
          <span>
            <strong>SHADOW GROUP</strong>
            <small>EX UMBRIS MORS</small>
          </span>
        </div>
        <span>Independent Central Texas airsoft milsim team.</span>
      </footer>
    </main>
  );
}
