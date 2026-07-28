"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ExternalLink, Link2, Loader2, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type RsvpEntry = {
  profileId: string;
  name: string;
  status: string;
  attended: boolean | null;
};

export type EventItem = {
  id: string;
  name: string;
  event_date: string | null;
  location: string | null;
  venue_name: string | null;
  organizer: string | null;
  cover_image_url: string | null;
  event_url: string | null;
  is_public: boolean;
  goingCount: number;
  maybeCount: number;
  notGoingCount: number;
  myStatus: string | null;
  rsvps: RsvpEntry[];
};

const RSVP_OPTIONS = [
  { value: "going", label: "I'm going" },
  { value: "maybe", label: "Maybe" },
  { value: "not_going", label: "Can't make it" }
];

async function adminToken() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your admin session expired. Sign in again.");
  return token;
}

export function EventsConsole({
  isAdmin,
  events
}: {
  isAdmin: boolean;
  events: EventItem[];
}) {
  const router = useRouter();
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [busyEvent, setBusyEvent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function importEvent() {
    if (!importUrl.trim()) return;
    setImporting(true);
    setError(null);
    setMessage(null);
    try {
      const token = await adminToken();
      const response = await fetch("/api/admin/events/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: importUrl.trim() })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Unable to import that link.");
      setMessage(`Imported "${payload?.imported?.name ?? "event"}". Add a date and publish it when ready.`);
      setImportUrl("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to import that link.");
    } finally {
      setImporting(false);
    }
  }

  async function rsvp(eventId: string, status: string) {
    setBusyEvent(eventId);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save your RSVP.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save your RSVP.");
    } finally {
      setBusyEvent(null);
    }
  }

  async function markAttendance(eventId: string, profileId: string, attended: boolean | null) {
    setBusyEvent(eventId);
    setError(null);
    try {
      const token = await adminToken();
      const response = await fetch(`/api/admin/events/${eventId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ profileId, attended })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Unable to update attendance.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update attendance.");
    } finally {
      setBusyEvent(null);
    }
  }

  return (
    <div className="events-console">
      {error ? <div className="notice" role="alert">{error}</div> : null}

      {isAdmin ? (
        <div className="command-panel import-panel">
          <div className="panel-label"><span>IMPORT EVENT FROM A LINK</span><Link2 size={14} /></div>
          <p className="form-hint">
            Paste an American Milsim, D4, or organizer event link. We&apos;ll pull the title, graphic, and URL.
            Imported events stay private until you add the date and publish them.
          </p>
          <div className="import-row">
            <input
              type="url"
              placeholder="https://americanmilsim.com/events/…"
              value={importUrl}
              onChange={(event) => setImportUrl(event.target.value)}
            />
            <button className="button primary" type="button" onClick={importEvent} disabled={importing}>
              {importing ? <><Loader2 className="spin" size={15} /> Importing…</> : "Import"}
            </button>
          </div>
          {message ? <div className="form-success">{message}</div> : null}
        </div>
      ) : null}

      {events.length === 0 ? (
        <div className="notice">No events yet. {isAdmin ? "Import one from a link above." : "Check back soon."}</div>
      ) : null}

      <div className="events-list">
        {events.map((event) => (
          <div className="command-panel event-item" key={event.id}>
            {event.cover_image_url ? (
              <div className="event-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={event.cover_image_url} alt={`${event.name} promo`} />
              </div>
            ) : null}
            <div className="event-body">
              <div className="event-head">
                <h3>{event.name}</h3>
                {isAdmin ? <span className={`status-pill ${event.is_public ? "status-approved" : "status-pending"}`}>{event.is_public ? "public" : "draft"}</span> : null}
              </div>
              <div className="event-meta">
                <span><CalendarDays size={14} /> {event.event_date ?? "Date TBD"}</span>
                {event.location || event.venue_name ? (
                  <span><MapPin size={14} /> {[event.venue_name, event.location].filter(Boolean).join(" · ")}</span>
                ) : null}
                {event.organizer ? <span>{event.organizer}</span> : null}
                {event.event_url ? (
                  <a href={event.event_url} target="_blank" rel="noreferrer noopener">Event page <ExternalLink size={12} /></a>
                ) : null}
              </div>

              <div className="rsvp-counts">
                <strong>{event.goingCount}</strong> going · {event.maybeCount} maybe · {event.notGoingCount} out
              </div>

              <div className="rsvp-actions" role="group" aria-label={`RSVP for ${event.name}`}>
                {RSVP_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`button ghost ${event.myStatus === option.value ? "rsvp-active" : ""}`}
                    disabled={busyEvent === event.id}
                    onClick={() => rsvp(event.id, option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {isAdmin && event.rsvps.length ? (
                <details className="attendance-panel">
                  <summary>Attendance &amp; roster ({event.rsvps.length})</summary>
                  <div className="attendance-list">
                    {event.rsvps.map((entry) => (
                      <div className="attendance-row" key={entry.profileId}>
                        <span className="attendance-name">{entry.name}</span>
                        <span className={`status-pill status-${entry.status === "going" ? "approved" : entry.status === "not_going" ? "rejected" : "pending"}`}>
                          {entry.status.replace(/_/g, " ")}
                        </span>
                        <div className="attendance-actions">
                          <button
                            type="button"
                            className={`chip ${entry.attended === true ? "chip-on" : ""}`}
                            disabled={busyEvent === event.id}
                            onClick={() => markAttendance(event.id, entry.profileId, entry.attended === true ? null : true)}
                          >
                            Attended
                          </button>
                          <button
                            type="button"
                            className={`chip ${entry.attended === false ? "chip-off" : ""}`}
                            disabled={busyEvent === event.id}
                            onClick={() => markAttendance(event.id, entry.profileId, entry.attended === false ? null : false)}
                          >
                            No-show
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
