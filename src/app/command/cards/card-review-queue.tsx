"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type ReviewVersion = {
  id: string;
  version_number: number;
  status: string;
  type_line: string | null;
  review_notes: string | null;
};

export type ReviewCard = {
  id: string;
  name: string;
  status: string;
  callsign: string | null;
  versions: ReviewVersion[];
};

type Action = { label: string; status: string; needsNotes?: boolean };

// Mirrors the server-enforced transitions in
// src/app/api/admin/card-versions/[versionId]/transition/route.ts
const ACTIONS: Record<string, Action[]> = {
  submitted: [
    { label: "Approve as canon", status: "approved" },
    { label: "Request changes", status: "changes_requested", needsNotes: true },
    { label: "Reject", status: "rejected", needsNotes: true }
  ],
  changes_requested: [
    { label: "Reject", status: "rejected", needsNotes: true },
    { label: "Archive", status: "archived" }
  ],
  draft: [{ label: "Archive", status: "archived" }],
  generating: [{ label: "Archive", status: "archived" }],
  approved: [{ label: "Archive", status: "archived" }],
  rejected: [{ label: "Archive", status: "archived" }]
};

export function CardReviewQueue({ cards }: { cards: ReviewCard[] }) {
  const router = useRouter();
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function transition(versionId: string, status: string) {
    setBusyVersionId(versionId);
    setError(null);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your admin session expired. Sign in again.");

      const response = await fetch(`/api/admin/card-versions/${versionId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, notes: notes[versionId]?.trim() || null })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to update this version.");
      }

      setNotes((current) => ({ ...current, [versionId]: "" }));
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update this version.");
    } finally {
      setBusyVersionId(null);
    }
  }

  if (!cards.length) {
    return <div className="notice">No cards have been synchronized yet. Submitted cards from the Cardsmith GPT will appear here for review.</div>;
  }

  return (
    <div className="review-queue">
      {error ? <div className="notice" role="alert">{error}</div> : null}
      {cards.map((card) => (
        <div className="review-card command-panel" key={card.id}>
          <div className="panel-label">
            <span>{card.callsign ?? "—"} // {card.name}</span>
            <span>CARD STATUS: {card.status.toUpperCase()}</span>
          </div>
          <div className="review-versions">
            {card.versions.map((version) => {
              const actions = ACTIONS[version.status] ?? [];
              const busy = busyVersionId === version.id;
              return (
                <div className="review-version" key={version.id}>
                  <div className="review-version-head">
                    <strong>v{version.version_number}</strong>
                    <em className={`status-pill status-${version.status}`}>{version.status.replace(/_/g, " ")}</em>
                    <span>{version.type_line ?? "—"}</span>
                  </div>
                  {version.review_notes ? (
                    <p className="review-note">Last review note: {version.review_notes}</p>
                  ) : null}
                  {actions.some((action) => action.needsNotes) ? (
                    <textarea
                      className="review-note-input"
                      placeholder="Reviewer notes (shared with the Cardsmith GPT so it can iterate)"
                      value={notes[version.id] ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [version.id]: event.target.value }))}
                    />
                  ) : null}
                  {actions.length ? (
                    <div className="review-actions">
                      {actions.map((action) => (
                        <button
                          key={action.status}
                          type="button"
                          className="button ghost"
                          disabled={busy}
                          onClick={() => transition(version.id, action.status)}
                        >
                          {busy ? "Working…" : action.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="review-terminal">No further actions.</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
