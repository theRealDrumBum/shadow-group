"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ExternalLink,
  Link2,
  Loader2,
  MapPin,
  Pencil,
  Send,
  Ticket,
  Users,
  X
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type RsvpEntry = {
  profileId: string;
  name: string;
  status: string;
  attended: boolean | null;
};

export type EventItem = {
  id: string;
  slug: string;
  name: string;
  event_date: string | null;
  end_date: string | null;
  location: string | null;
  venue_name: string | null;
  organizer: string | null;
  summary: string | null;
  description: string | null;
  cover_image_url: string | null;
  event_url: string | null;
  ticket_url: string | null;
  attendance_status: string | null;
  is_public: boolean;
  is_featured: boolean;
  goingCount: number;
  maybeCount: number;
  notGoingCount: number;
  invitedCount: number;
  responseCount: number;
  myStatus: string | null;
  rsvps: RsvpEntry[];
};

export type MyStats = {
  invitations: number;
  going: number;
  attended: number;
  awaiting: number;
};

const RSVP_OPTIONS = [
  { value: "going", label: "I'm going" },
  { value: "maybe", label: "Maybe" },
  { value: "not_going", label: "Can't make it" }
];

// Fields the admin can edit and that must be echoed back on every upsert so the
// slug-keyed POST does not blank out untouched columns.
type EditableEvent = {
  slug: string;
  name: string;
  event_date: string;
  end_date: string;
  venue_name: string;
  location: string;
  organizer: string;
  summary: string;
  description: string;
  cover_image_url: string;
  event_url: string;
  ticket_url: string;
  attendance_status: string;
  is_featured: boolean;
  is_public: boolean;
};

function toEditable(event: EventItem): EditableEvent {
  return {
    slug: event.slug,
    name: event.name,
    event_date: event.event_date ?? "",
    end_date: event.end_date ?? "",
    venue_name: event.venue_name ?? "",
    location: event.location ?? "",
    organizer: event.organizer ?? "",
    summary: event.summary ?? "",
    description: event.description ?? "",
    cover_image_url: event.cover_image_url ?? "",
    event_url: event.event_url ?? "",
    ticket_url: event.ticket_url ?? "",
    attendance_status: event.attendance_status ?? "attending",
    is_featured: event.is_featured,
    is_public: event.is_public
  };
}

async function adminToken() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your admin session expired. Sign in again.");
  return token;
}

export function EventsConsole({
  isAdmin,
  events,
  rosterCount,
  myStats
}: {
  isAdmin: boolean;
  events: EventItem[];
  rosterCount: number;
  myStats: MyStats;
}) {
  const router = useRouter();
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [busyEvent, setBusyEvent] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableEvent | null>(null);
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
      const imported = payload?.imported ?? {};
      const dateNote = imported.event_date ? ` Detected date ${imported.event_date}.` : " Add the date,";
      setMessage(`Imported "${imported.name ?? "event"}".${dateNote} review the details, then publish to invite the roster.`);
      setImportUrl("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to import that link.");
    } finally {
      setImporting(false);
    }
  }

  async function saveEvent(event: EventItem, patch: Partial<EditableEvent>, opts?: { inviteAfter?: boolean; label?: string }) {
    setBusyEvent(event.id);
    setError(null);
    setMessage(null);
    try {
      const token = await adminToken();
      const record = { ...toEditable(event), ...patch };
      const response = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(record)
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Unable to save the event.");

      if (opts?.inviteAfter) {
        const invited = await inviteRoster(event.id, token);
        setMessage(`${opts.label ?? "Saved."} ${invited} member${invited === 1 ? "" : "s"} newly invited.`);
      } else if (opts?.label) {
        setMessage(opts.label);
      }
      setEditingId(null);
      setDraft(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the event.");
    } finally {
      setBusyEvent(null);
    }
  }

  async function inviteRoster(eventId: string, token: string): Promise<number> {
    const response = await fetch(`/api/admin/events/${eventId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error ?? "Unable to invite the roster.");
    return payload?.invited ?? 0;
  }

  async function inviteRosterAction(eventId: string) {
    setBusyEvent(eventId);
    setError(null);
    setMessage(null);
    try {
      const token = await adminToken();
      const invited = await inviteRoster(eventId, token);
      setMessage(
        invited === 0
          ? "The whole roster was already invited."
          : `Invited ${invited} member${invited === 1 ? "" : "s"} to this event.`
      );
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to invite the roster.");
    } finally {
      setBusyEvent(null);
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

  function startEditing(event: EventItem) {
    setEditingId(event.id);
    setDraft(toEditable(event));
    setMessage(null);
    setError(null);
  }

  return (
    <div className="events-console">
      {error ? <div className="notice" role="alert">{error}</div> : null}
      {message ? <div className="form-success" role="status">{message}</div> : null}

      {!isAdmin ? (
        <div className="attendance-strip">
          <div className="stat"><strong>{myStats.awaiting}</strong><span>awaiting your reply</span></div>
          <div className="stat"><strong>{myStats.going}</strong><span>you&apos;re going to</span></div>
          <div className="stat"><strong>{myStats.attended}</strong><span>attended all-time</span></div>
          <div className="stat"><strong>{myStats.invitations}</strong><span>total invites</span></div>
        </div>
      ) : null}

      {isAdmin ? (
        <div className="command-panel import-panel">
          <div className="panel-label"><span>IMPORT EVENT FROM A LINK</span><Link2 size={14} /></div>
          <p className="form-hint">
            Paste an American Milsim, D4, or organizer event link. We&apos;ll pull the title, date, venue, graphic,
            and ticket link when they&apos;re published on the page. Imported events stay private until you publish
            them — publishing advertises the event and invites the whole roster ({rosterCount} member{rosterCount === 1 ? "" : "s"}).
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
        </div>
      ) : null}

      {events.length === 0 ? (
        <div className="notice">No events yet. {isAdmin ? "Import one from a link above." : "You'll see events here when command invites you."}</div>
      ) : null}

      <div className="events-list">
        {events.map((event) => {
          const isEditing = editingId === event.id;
          const invited = !isAdmin && event.myStatus === "invited";
          return (
            <div className={`command-panel event-item ${invited ? "event-invited" : ""}`} key={event.id}>
              {event.cover_image_url ? (
                <div className="event-cover">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={event.cover_image_url} alt={`${event.name} promo`} />
                </div>
              ) : null}
              <div className="event-body">
                <div className="event-head">
                  <h3>{event.name}</h3>
                  {invited ? <span className="status-pill status-pending">Invited — please reply</span> : null}
                  {isAdmin ? (
                    <span className={`status-pill ${event.is_public ? "status-approved" : "status-pending"}`}>
                      {event.is_public ? "public" : "draft"}
                    </span>
                  ) : null}
                </div>

                <div className="event-meta">
                  <span><CalendarDays size={14} /> {event.event_date ?? "Date TBD"}{event.end_date ? ` – ${event.end_date}` : ""}</span>
                  {event.location || event.venue_name ? (
                    <span><MapPin size={14} /> {[event.venue_name, event.location].filter(Boolean).join(" · ")}</span>
                  ) : null}
                  {event.organizer ? <span>{event.organizer}</span> : null}
                  {event.event_url ? (
                    <a href={event.event_url} target="_blank" rel="noreferrer noopener">Event page <ExternalLink size={12} /></a>
                  ) : null}
                  {event.ticket_url ? (
                    <a href={event.ticket_url} target="_blank" rel="noreferrer noopener">Tickets <Ticket size={12} /></a>
                  ) : null}
                </div>

                {event.summary ? <p className="event-summary">{event.summary}</p> : null}

                <div className="rsvp-counts">
                  <strong>{event.goingCount}</strong> going · {event.maybeCount} maybe · {event.notGoingCount} out
                  {isAdmin ? <> · {event.invitedCount} awaiting reply</> : null}
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

                {isAdmin ? (
                  <div className="admin-event-actions">
                    <button type="button" className="button ghost" disabled={busyEvent === event.id} onClick={() => (isEditing ? setEditingId(null) : startEditing(event))}>
                      <Pencil size={14} /> {isEditing ? "Close" : "Edit details"}
                    </button>
                    {event.is_public ? (
                      <button type="button" className="button ghost" disabled={busyEvent === event.id} onClick={() => saveEvent(event, { is_public: false }, { label: "Event unpublished." })}>
                        Unpublish
                      </button>
                    ) : (
                      <button type="button" className="button primary" disabled={busyEvent === event.id} onClick={() => saveEvent(event, { is_public: true }, { inviteAfter: true, label: "Published to the public site." })}>
                        <Send size={14} /> Publish &amp; invite roster
                      </button>
                    )}
                    <button type="button" className="button secondary" disabled={busyEvent === event.id} onClick={() => inviteRosterAction(event.id)}>
                      <Users size={14} /> Invite roster
                    </button>
                    {busyEvent === event.id ? <Loader2 className="spin" size={16} /> : null}
                  </div>
                ) : null}

                {isAdmin && isEditing && draft ? (
                  <form
                    className="event-edit-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveEvent(event, draft, { label: "Event details saved." });
                    }}
                  >
                    <div className="event-edit-grid">
                      <label>Name<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></label>
                      <label>Start date<input type="date" value={draft.event_date} onChange={(e) => setDraft({ ...draft, event_date: e.target.value })} /></label>
                      <label>End date<input type="date" value={draft.end_date} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} /></label>
                      <label>Venue<input value={draft.venue_name} onChange={(e) => setDraft({ ...draft, venue_name: e.target.value })} /></label>
                      <label>Location<input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} /></label>
                      <label>Organizer<input value={draft.organizer} onChange={(e) => setDraft({ ...draft, organizer: e.target.value })} /></label>
                      <label>Event URL<input type="url" value={draft.event_url} onChange={(e) => setDraft({ ...draft, event_url: e.target.value })} /></label>
                      <label>Ticket URL<input type="url" value={draft.ticket_url} onChange={(e) => setDraft({ ...draft, ticket_url: e.target.value })} /></label>
                      <label>Cover image URL<input type="url" value={draft.cover_image_url} onChange={(e) => setDraft({ ...draft, cover_image_url: e.target.value })} /></label>
                      <label>Status
                        <select value={draft.attendance_status} onChange={(e) => setDraft({ ...draft, attendance_status: e.target.value })}>
                          {["interested", "attending", "confirmed", "completed", "cancelled"].map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label className="event-edit-full">Summary<textarea value={draft.summary} maxLength={280} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></label>
                    <div className="event-edit-toggles">
                      <label className="inline-check"><input type="checkbox" checked={draft.is_public} onChange={(e) => setDraft({ ...draft, is_public: e.target.checked })} /> Public on team site</label>
                      <label className="inline-check"><input type="checkbox" checked={draft.is_featured} onChange={(e) => setDraft({ ...draft, is_featured: e.target.checked })} /> Featured</label>
                    </div>
                    <div className="admin-event-actions">
                      <button type="submit" className="button primary" disabled={busyEvent === event.id}><Check size={14} /> Save details</button>
                      <button type="button" className="button ghost" disabled={busyEvent === event.id} onClick={() => { setEditingId(null); setDraft(null); }}><X size={14} /> Cancel</button>
                    </div>
                  </form>
                ) : null}

                {isAdmin && event.rsvps.length ? (
                  <details className="attendance-panel">
                    <summary>Roster responses &amp; attendance ({event.rsvps.length})</summary>
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
          );
        })}
      </div>
    </div>
  );
}
