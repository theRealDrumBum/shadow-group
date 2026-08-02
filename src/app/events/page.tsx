import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "../cinematic.css";
import { ArrowLeft } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { getPublicEvents } from "@/lib/events";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events · Shadow Group",
  description: "Where Shadow Group is deploying next — upcoming airsoft milsim events, dates, locations, and organizer links."
};

export default async function EventsPage() {
  const events = await getPublicEvents(24);

  return (
    <main className="home-shell">
      <header className="site-header cinematic-header">
        <Link href="/" className="brand">
          <Image src="/shadow_group_logo.png" width={56} height={56} alt="Shadow Group" priority />
          <span>
            <strong>SHADOW GROUP</strong>
            <small>AIRSOFT MILSIM TEAM</small>
          </span>
        </Link>
        <nav>
          <Link href="/">Home</Link>
          <a href="/#team">Team</a>
          <Link href="/events">Events</Link>
          <a href="/#recruitment">Recruitment</a>
          <a href="/#partners">Sponsors</a>
          <Link href="/cards">Card Archive</Link>
        </nav>
      </header>

      <section className="section events-page-section">
        <div className="section-index">SECTION // 02</div>
        <div className="section-heading">
          <div>
            <span className="kicker">UPCOMING DEPLOYMENTS</span>
            <h2>Where we will be.</h2>
            <p>
              Every event Shadow Group is deploying to — dates, locations, attendance status, and tracked links to the
              official organizer pages. Come find us on the field.
            </p>
          </div>
          <Link href="/" className="text-link"><ArrowLeft size={16} /> Back to home</Link>
        </div>

        {events.length === 0 ? (
          <div className="events-empty">
            <p>No upcoming events are posted right now. Check back soon — we&apos;re always planning the next deployment.</p>
          </div>
        ) : (
          <div className="events-grid">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
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
