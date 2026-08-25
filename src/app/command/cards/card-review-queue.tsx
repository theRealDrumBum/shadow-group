"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { adminBearerToken } from "@/lib/auth/browser-admin";
import { colorsToText, parseColors, parseRules, rulesToText } from "@/lib/card-admin";
import { OperatorCard } from "@/components/operator-card";
import { toOperatorCard } from "@/lib/card-face";
import { CardComposer, type OperatorOption } from "./card-composer";

export type ReviewVersion = {
  id: string;
  version_number: number;
  status: string;
  type_line: string | null;
  mana_cost: string | null;
  color_identity?: string[] | null;
  rules_text: string[] | null;
  flavor_text: string | null;
  power: string | null;
  toughness: string | null;
  rarity: string | null;
  review_notes: string | null;
  submitted_at: string | null;
  created_at: string | null;
  previewPath?: string | null;
  artworkUrl?: string | null;
  callsign?: string | null;
  role?: string | null;
  slug?: string | null;
  cardName?: string | null;
  collectorNumber?: string | null;
  expansionCode?: string | null;
};

export type ReviewCard = {
  id: string;
  name: string;
  slug?: string | null;
  status: string;
  callsign: string | null;
  operatorName: string | null;
  operatorId?: string | null;
  submittedAt: string | null;
  versions: ReviewVersion[];
};

type Action = { label: string; status: string; needsNotes?: boolean; tone?: "approve" | "reject" | "neutral" };

const ACTIONS: Record<string, Action[]> = {
  submitted: [
    { label: "Approve as canon", status: "approved", tone: "approve" },
    { label: "Request changes", status: "changes_requested", needsNotes: true, tone: "neutral" },
    { label: "Reject", status: "rejected", needsNotes: true, tone: "reject" }
  ],
  changes_requested: [
    { label: "Approve as canon", status: "approved", tone: "approve" },
    { label: "Reject", status: "rejected", needsNotes: true, tone: "reject" },
    { label: "Archive", status: "archived", tone: "neutral" }
  ],
  draft: [
    { label: "Submit for review", status: "submitted", tone: "neutral" },
    { label: "Approve as canon", status: "approved", tone: "approve" },
    { label: "Archive", status: "archived", tone: "neutral" }
  ],
  generating: [
    { label: "Submit for review", status: "submitted", tone: "neutral" },
    { label: "Archive", status: "archived", tone: "neutral" }
  ],
  approved: [{ label: "Archive", status: "archived", tone: "neutral" }],
  rejected: [{ label: "Archive", status: "archived", tone: "neutral" }]
};

const FILTERS: Array<{ label: string; value: string }> = [
  { label: "All", value: "all" },
  { label: "Needs review", value: "review" },
  { label: "Missing art", value: "missing-art" },
  { label: "Approved", value: "approved" },
  { label: "Draft", value: "draft" },
  { label: "Rejected", value: "rejected" }
];

function isPendingReview(card: ReviewCard) {
  return card.versions.some((v) => v.status === "submitted" || v.status === "changes_requested");
}

function isMissingArt(card: ReviewCard) {
  const latest = card.versions[0];
  const approved = card.versions.find((version) => version.status === "approved") ?? latest;
  return !approved?.artworkUrl;
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function VersionEditor({
  card,
  version,
  operators,
  busy,
  onBusy
}: {
  card: ReviewCard;
  version: ReviewVersion;
  operators: OperatorOption[];
  busy: boolean;
  onBusy: (value: boolean) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(card.name);
  const [operatorId, setOperatorId] = useState(card.operatorId ?? "");
  const [collectorNumber, setCollectorNumber] = useState(version.collectorNumber ?? "");
  const [expansionCode, setExpansionCode] = useState(version.expansionCode ?? "");
  const [typeLine, setTypeLine] = useState(version.type_line ?? "");
  const [manaCost, setManaCost] = useState(version.mana_cost ?? "");
  const [colorIdentity, setColorIdentity] = useState(colorsToText(version.color_identity));
  const [rulesText, setRulesText] = useState(rulesToText(version.rules_text));
  const [flavorText, setFlavorText] = useState(version.flavor_text ?? "");
  const [power, setPower] = useState(version.power ?? "");
  const [toughness, setToughness] = useState(version.toughness ?? "");
  const [rarity, setRarity] = useState(version.rarity ?? "");

  async function save() {
    onBusy(true);
    setError(null);
    try {
      const token = await adminBearerToken();
      const cardResponse = await fetch(`/api/admin/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          operatorId: operatorId || undefined,
          collectorNumber: collectorNumber || null,
          expansionCode: expansionCode || null
        })
      });
      const cardPayload = await cardResponse.json().catch(() => null) as { error?: string } | null;
      if (!cardResponse.ok) throw new Error(cardPayload?.error ?? "Unable to update the card.");

      const versionResponse = await fetch(`/api/admin/card-versions/${version.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          typeLine,
          manaCost: manaCost || null,
          colorIdentity: parseColors(colorIdentity),
          rulesText: parseRules(rulesText),
          flavorText: flavorText || null,
          power: power || null,
          toughness: toughness || null,
          rarity: rarity || null
        })
      });
      const versionPayload = await versionResponse.json().catch(() => null) as { error?: string } | null;
      if (!versionResponse.ok) throw new Error(versionPayload?.error ?? "Unable to update this version.");
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save edits.");
    } finally {
      onBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="button ghost" type="button" disabled={busy} onClick={() => setOpen(true)}>
        Edit card
      </button>
    );
  }

  return (
    <div className="version-editor">
      {error ? <div className="notice" role="alert">{error}</div> : null}
      <div className="field-grid">
        <label>Card name
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>Operator
          <select value={operatorId} onChange={(event) => setOperatorId(event.target.value)}>
            <option value="">Keep current</option>
            {operators.map((operator) => (
              <option key={operator.id} value={operator.id}>
                {operator.callsign}{operator.display_name ? ` — ${operator.display_name}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>Collector number
          <input value={collectorNumber} onChange={(event) => setCollectorNumber(event.target.value)} />
        </label>
        <label>Expansion code
          <input value={expansionCode} onChange={(event) => setExpansionCode(event.target.value)} />
        </label>
        <label>Type line
          <input value={typeLine} onChange={(event) => setTypeLine(event.target.value)} />
        </label>
        <label>Mana cost
          <input value={manaCost} onChange={(event) => setManaCost(event.target.value)} />
        </label>
        <label>Color identity
          <input value={colorIdentity} onChange={(event) => setColorIdentity(event.target.value)} />
        </label>
        <label>Rarity
          <input value={rarity} onChange={(event) => setRarity(event.target.value)} />
        </label>
        <label>Power
          <input value={power} onChange={(event) => setPower(event.target.value)} />
        </label>
        <label>Toughness
          <input value={toughness} onChange={(event) => setToughness(event.target.value)} />
        </label>
      </div>
      <label>Rules text (one ability per line)
        <textarea value={rulesText} onChange={(event) => setRulesText(event.target.value)} rows={4} />
      </label>
      <label>Flavor text
        <textarea value={flavorText} onChange={(event) => setFlavorText(event.target.value)} rows={2} />
      </label>
      <div className="form-actions">
        <button className="button primary" type="button" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save edits"}
        </button>
        <button className="button ghost" type="button" disabled={busy} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ArtUpload({
  versionId,
  hasArt,
  approved,
  busy,
  onBusy
}: {
  versionId: string;
  hasArt: boolean;
  approved: boolean;
  busy: boolean;
  onBusy: (value: boolean) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    onBusy(true);
    setError(null);
    try {
      const token = await adminBearerToken();
      const data = new FormData();
      data.set("file", file);
      data.set("kind", "render");
      const response = await fetch(`/api/admin/card-versions/${versionId}/assets`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: data
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to upload the card image.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload the card image.");
    } finally {
      onBusy(false);
    }
  }

  return (
    <div className="art-upload">
      <label className={`button ghost upload-button${busy ? " is-busy" : ""}`}>
        <Upload size={14} />
        {busy ? "Uploading…" : hasArt ? "Replace Magic card image" : "Upload Magic card image"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          hidden
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </label>
      <small>
        {approved
          ? "Replaces the stored render on this approved version. The public gallery updates immediately."
          : "Attach the finished Magic card PNG/JPEG. Approve the version to publish it."}
      </small>
      {error ? <div className="notice" role="alert">{error}</div> : null}
    </div>
  );
}

export function CardReviewQueue({
  cards,
  operators
}: {
  cards: ReviewCard[];
  operators: OperatorOption[];
}) {
  const router = useRouter();
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return cards;
    if (filter === "review") return cards.filter(isPendingReview);
    if (filter === "missing-art") return cards.filter(isMissingArt);
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
      <CardComposer operators={operators} />

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
            ? "Nothing is awaiting review. Add a card above or wait for the Cardsmith GPT to submit one."
            : filter === "missing-art"
              ? "Every visible version already has a stored Magic card image."
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
              {card.slug ? <span>/{card.slug}</span> : null}
            </p>
          ) : null}
          <div className="review-versions">
            {card.versions.map((version) => {
              const actions = ACTIONS[version.status] ?? [];
              const busy = busyVersionId === version.id;
              const rules = version.rules_text ?? [];
              const face = toOperatorCard({
                slug: version.slug ?? card.id,
                name: version.cardName ?? card.name,
                callsign: version.callsign ?? card.callsign,
                typeLine: version.type_line,
                manaCost: version.mana_cost,
                rules: rules,
                flavor: version.flavor_text,
                power: version.power,
                toughness: version.toughness,
                colors: version.color_identity,
                role: version.role,
                image: version.artworkUrl,
                collectorNumber: version.collectorNumber,
                expansionCode: version.expansionCode,
                rarity: version.rarity
              });
              return (
                <div className="review-version" key={version.id}>
                  <div className="review-version-head">
                    <strong>v{version.version_number}</strong>
                    <em className={`status-pill status-${version.status}`}>{version.status.replace(/_/g, " ")}</em>
                    {version.mana_cost ? <span className="review-mana">{version.mana_cost}</span> : null}
                  </div>

                  <div className="review-version-body">
                    <div className="review-card-preview">
                      <OperatorCard card={face} linked={false} />
                      {version.previewPath ? (
                        <a className="text-link review-preview-link" href={version.previewPath} target="_blank" rel="noreferrer">
                          Open full preview
                        </a>
                      ) : null}
                    </div>

                    <div className="review-version-copy">
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

                  <ArtUpload
                    versionId={version.id}
                    hasArt={Boolean(version.artworkUrl)}
                    approved={version.status === "approved"}
                    busy={busy}
                    onBusy={(value) => setBusyVersionId(value ? version.id : null)}
                  />

                  <VersionEditor
                    card={card}
                    version={version}
                    operators={operators}
                    busy={busy}
                    onBusy={(value) => setBusyVersionId(value ? version.id : null)}
                  />

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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
