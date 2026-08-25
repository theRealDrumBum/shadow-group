"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type ProfileSubmission = {
  id: string;
  status: string;
  memberName: string | null;
  memberEmail: string | null;
  display_name: string | null;
  callsign: string | null;
  primary_role: string | null;
  secondary_role: string | null;
  short_bio: string | null;
  bio: string | null;
  portrait_url: string | null;
  gallery_urls: string[];
  review_notes: string | null;
  submitted_at: string | null;
};

type Action = { label: string; status: string; needsNotes?: boolean };

const ACTIONS: Action[] = [
  { label: "Approve & publish", status: "approved" },
  { label: "Request changes", status: "changes_requested", needsNotes: true },
  { label: "Reject", status: "rejected", needsNotes: true }
];

export function ProfileReviewQueue({ submissions }: { submissions: ProfileSubmission[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return submissions;
    return submissions.filter((submission) =>
      [submission.callsign, submission.display_name, submission.memberName, submission.memberEmail, submission.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [submissions, query]);

  async function transition(id: string, status: string) {
    setBusyId(id);
    setError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your admin session expired. Sign in again.");

      const response = await fetch(`/api/admin/profile-submissions/${id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, notes: notes[id]?.trim() || null })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to update this submission.");
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update this submission.");
    } finally {
      setBusyId(null);
    }
  }

  if (!submissions.length) {
    return <div className="notice">No member profile submissions yet.</div>;
  }

  return (
    <div className="review-queue">
      <div className="command-list-toolbar">
        <input
          className="command-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search callsign, name, email…"
        />
      </div>
      {error ? <div className="notice" role="alert">{error}</div> : null}
      {!visible.length ? <p className="admin-empty">No submissions match that search.</p> : null}
      {visible.map((submission) => {
        const busy = busyId === submission.id;
        return (
          <div className="review-card command-panel" key={submission.id}>
            <div className="panel-label">
              <span>{submission.callsign || submission.display_name || submission.memberName || "Member"} // {submission.memberEmail ?? ""}</span>
              <span className={`status-pill status-${submission.status}`}>{submission.status.replace(/_/g, " ")}</span>
            </div>

            <div className="review-profile-body">
              {submission.portrait_url ? (
                <div className="review-portrait">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={submission.portrait_url} alt={`${submission.display_name ?? "member"} portrait`} />
                </div>
              ) : null}
              <div className="review-profile-fields">
                <p><strong>Name:</strong> {submission.display_name ?? "—"}</p>
                <p><strong>Roles:</strong> {[submission.primary_role, submission.secondary_role].filter(Boolean).join(" · ") || "—"}</p>
                {submission.short_bio ? <p><strong>Short bio:</strong> {submission.short_bio}</p> : null}
                {submission.bio ? <p><strong>Bio:</strong> {submission.bio}</p> : null}
                {submission.gallery_urls?.length ? (
                  <div className="gallery-strip">
                    {submission.gallery_urls.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <div className="gallery-thumb" key={url}><img src={url} alt="Gallery submission" /></div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {submission.status === "pending" ? (
              <>
                <textarea
                  className="review-note-input"
                  placeholder="Reviewer notes (shared with the member if you request changes or reject)"
                  value={notes[submission.id] ?? ""}
                  onChange={(event) => setNotes((current) => ({ ...current, [submission.id]: event.target.value }))}
                />
                <div className="review-actions">
                  {ACTIONS.map((action) => (
                    <button
                      key={action.status}
                      type="button"
                      className="button ghost"
                      disabled={busy}
                      onClick={() => transition(submission.id, action.status)}
                    >
                      {busy ? "Working…" : action.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <span className="review-terminal">
                {submission.review_notes ? `Note: ${submission.review_notes}` : "No further actions."}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
