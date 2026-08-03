"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type ReviewVersion = {
  id: string;
  version_number: number;
  status: string;
  type_line: string | null;
  mana_cost: string | null;
  rules_text: string[] | null;
  flavor_text: string | null;
  power: string | null;
  toughness: string | null;
  rarity: string | null;
  review_notes: string | null;
  submitted_at: string | null;
  created_at: string | null;
};

export type ReviewCard = {
  id: string;
  name: string;
  status: string;
  callsign: string | null;
  operatorName: string | null;
  submittedAt: string | null;
  versions: ReviewVersion[];
};

type Action = { label: string; status: string; needsNotes?: boolean; tone?: "approve" | "reject" | "neutral" };

// Mirrors the server-enforced transitions in
// src/app/api/admin/card-versions/[versionId]/transition/route.ts
const ACTIONS: Record<string, Action[]> = {
  submitted: [
    { label: "Approve as canon", status: "approved", tone: "approve" },
    { label: "Request changes", status: "changes_requested", needsNotes: true, tone: "neutral" },
    { label: "Reject", status: "rejected", needsNotes: true, tone: "reject" }
  ],
  changes_requested: [
    { label: "Reject", status: "rejected", needsNotes: true, tone: "reject" },
    { label: "Archive", status: "archived", tone: "neutral" }
  ],
  draft: [{ label: "Archive", status: "archived", tone: "neutral" }],
  generating: [{ label: "Archive", status: "archived", tone: "neutral" }],
  approved: [{ label: "Archive", status: "archived", tone: "neutral" }],
  rejected: [{ label: "Archive", status: "archived", tone: "neutral" }]
};

const FILTERS: Array<{ label: string; value: string }> = [
  { label: "Needs review", value: "review" },
  { label: "All", value: "all" },
  { label: "Approved", value: "approved" },
  { label: "Draft", value: "draft" },
  { label: "Rejected", value: "rejected" }
];

function isPendingReview(card: ReviewCard) {
  return card.versions.some((v) => v.status === "submitted" || v.status === "changes_requested");
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function CardReviewQueue({ cards }: { cards: ReviewCard[] }) {
  const router = useRouter();
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("review");

  const filtered = useMemo(() => {
    if (filter === "all") return cards;
    if (filter === "review") return cards.filter(isPendingReview);
    return cards.filter((card) => card.status === filter);
  }, [cards, filter]);

  async function transition(versionId: string, status: string, needsNotes?: boolean) {
    const trimmedNote = notes[versionId]?.trim();
    if (needsNotes && !trimmedNote) {
      setError("Add a reviewer note before requesting changes or rejecting so the Cardsmith GPT can iterate.");
      return;
    }
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
        body: JSON.stringify({ status, notes: trimmedNote || null })
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

  return (
    <div className="review-queue">
      <div className="review-filters">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`review-filter${filter === option.value ? " is-active" : ""}`}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error ? <div className="notice" role="alert">{error}</div> : null}

      {!filtered.length ? (
        <div className="notice">
          {filter === "review"
            ? "Nothing is awaiting review. Submitted cards from the Cardsmith GPT will appear here."
            : "No cards match this filter yet."}
        </div>
      ) : null}

      {filtered.map((card) => (
        <div className="review-card command-panel" key={card.id}>
          <div className="panel-label">
            <span>{card.callsign ?? "—"} // {card.name}</span>
            <span>CARD STATUS: {card.status.toUpperCase()}</span>
          </div>
          {card.operatorName || card.submittedAt ? (
            <p className="review-card-meta">
              {card.operatorName ? <span>{card.operatorName}</span> : null}
              {formatDate(card.submittedAt) ? <span>Submitted {formatDate(card.submittedAt)}</span> : null}
            </p>
          ) : null}
          <div className="review-versions">
            {card.versions.map((version) => {
              const actions = ACTIONS[version.status] ?? [];
              const busy = busyVersionId === version.id;
              const rules = version.rules_text ?? [];
              return (
                <div className="review-version" key={version.id}>
                  <div className="review-version-head">
                    <strong>v{version.version_number}</strong>
                    <em className={`status-pill status-${version.status}`}>{version.status.replace(/_/g, " ")}</em>
                    {version.mana_cost ? <span className="review-mana">{version.mana_cost}</span> : null}
                  </div>

                  <div className="review-typeline">
                    <span>{version.type_line ?? "—"}</span>
                    {version.rarity ? <span className="review-rarity">{version.rarity}</span> : null}
                  </div>

                  {rules.length ? (
                    <ul className="review-rules">
                      {rules.map((rule, index) => (
                        <li key={`${version.id}-rule-${index}`}>{rule}</li>
                      ))}
                    </ul>
                  ) : null}

                  {version.flavor_text ? <p className="review-flavor">“{version.flavor_text}”</p> : null}

                  {version.power || version.toughness ? (
                    <p className="review-stats">Power / Toughness: <strong>{version.power ?? "—"}/{version.toughness ?? "—"}</strong></p>
                  ) : null}

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
                          className={`button ghost review-action-${action.tone ?? "neutral"}`}
                          disabled={busy}
                          onClick={() => transition(version.id, action.status, action.needsNotes)}
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
