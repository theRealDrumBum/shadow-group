import { ArrowUpRight, CalendarDays, MapPin, Ticket } from "lucide-react";
import { formatEventDate, type PublicEvent } from "@/lib/events";

const STATUS_LABEL: Record<string, string> = {
  interested: "Scouting",
  attending: "Attending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled"
};

export function EventCard({ event }: { event: PublicEvent }) {
  const place = [event.venue_name, event.location].filter(Boolean).join(" · ");
  const status = event.attendance_status ? STATUS_LABEL[event.attendance_status] ?? event.attendance_status : null;

  return (
    <article className="event-card">
      {event.cover_image_url ? (
        <div className="event-card-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.cover_image_url} alt={`${event.name} promo`} loading="lazy" />
        </div>
      ) : (
        <div className="event-card-cover event-card-cover--empty" aria-hidden="true">
          <CalendarDays size={40} />
        </div>
      )}
      <div className="event-card-body">
        <div className="event-card-tags">
          {event.is_featured ? <span className="event-tag event-tag--featured">Featured</span> : null}
          {status ? <span className="event-tag">{status}</span> : null}
        </div>
        <h3>{event.name}</h3>
        <div className="event-card-meta">
          <span><CalendarDays size={14} /> {formatEventDate(event.event_date, event.end_date)}</span>
          {place ? <span><MapPin size={14} /> {place}</span> : null}
          {event.organizer ? <span>{event.organizer}</span> : null}
        </div>
        {event.summary ? <p className="event-card-summary">{event.summary}</p> : null}
        <div className="event-card-actions">
          {event.event_url ? (
            <a className="button primary" href={event.event_url} target="_blank" rel="noreferrer noopener">
              Event details <ArrowUpRight size={15} />
            </a>
          ) : null}
          {event.ticket_url ? (
            <a className="button secondary" href={event.ticket_url} target="_blank" rel="noreferrer noopener">
              Tickets <Ticket size={14} />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
