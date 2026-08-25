"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Sparkles, Upload } from "lucide-react";
import { adminBearerToken } from "@/lib/auth/browser-admin";
import { parseColors, parseRules, slugifyCardName } from "@/lib/card-admin";
import type { CardsmithDraft } from "@/lib/cardsmith";

export type OperatorOption = {
  id: string;
  callsign: string;
  display_name: string | null;
  team_role?: string | null;
};

type ComposerProps = {
  operators: OperatorOption[];
};

type FormState = {
  operatorId: string;
  name: string;
  slug: string;
  collectorNumber: string;
  expansionCode: string;
  typeLine: string;
  manaCost: string;
  colorIdentity: string;
  rulesText: string;
  flavorText: string;
  power: string;
  toughness: string;
  rarity: string;
};

const EMPTY: FormState = {
  operatorId: "",
  name: "",
  slug: "",
  collectorNumber: "",
  expansionCode: "SG",
  typeLine: "",
  manaCost: "",
  colorIdentity: "",
  rulesText: "",
  flavorText: "",
  power: "",
  toughness: "",
  rarity: "",
};

function matchOperator(operators: OperatorOption[], guess: string) {
  const needle = guess.trim().toLowerCase();
  if (!needle) return null;
  return (
    operators.find((operator) => operator.callsign.toLowerCase() === needle) ??
    operators.find((operator) => operator.display_name?.toLowerCase() === needle) ??
    operators.find((operator) => operator.callsign.toLowerCase().includes(needle) || needle.includes(operator.callsign.toLowerCase())) ??
    null
  );
}

function applyDraft(current: FormState, draft: CardsmithDraft, operators: OperatorOption[]): FormState {
  const matched = matchOperator(operators, draft.operatorCallsign);
  return {
    ...current,
    operatorId: matched?.id || current.operatorId,
    name: draft.name || current.name,
    slug: draft.slug || current.slug,
    collectorNumber: draft.collectorNumber || current.collectorNumber,
    expansionCode: draft.expansionCode || current.expansionCode,
    typeLine: draft.typeLine || current.typeLine,
    manaCost: draft.manaCost || current.manaCost,
    colorIdentity: draft.colorIdentity || current.colorIdentity,
    rulesText: draft.rulesText || current.rulesText,
    flavorText: draft.flavorText || current.flavorText,
    power: draft.power || current.power,
    toughness: draft.toughness || current.toughness,
    rarity: draft.rarity || current.rarity,
  };
}

export function CardComposer({ operators }: ComposerProps) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState<"read" | "commission" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const slugPreview = useMemo(
    () => slugifyCardName(form.slug || form.name),
    [form.slug, form.name],
  );

  const selectedOperator = operators.find((operator) => operator.id === form.operatorId) ?? null;

  function setField(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseFile(next: File | null, autoRead = true) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
    if (next && autoRead) void readImage(next);
  }

  async function readImage(target?: File) {
    const image = target ?? file;
    if (!image) {
      setError("Choose a card image first.");
      return;
    }
    setBusy("read");
    setError(null);
    setNotice(null);
    try {
      const token = await adminBearerToken();
      const data = new FormData();
      data.set("file", image);
      const response = await fetch("/api/admin/cards/read-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });
      const payload = await response.json().catch(() => null) as { error?: string; card?: CardsmithDraft } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to read that image.");
      if (!payload?.card) throw new Error("No card data came back.");
      setForm((current) => applyDraft(current, payload.card!, operators));
      const matched = matchOperator(operators, payload.card.operatorCallsign);
      setNotice(
        payload.card.notes
          || (matched
            ? "Fields filled from the image. Check them, then create the card."
            : "Fields filled from the image. Select the operator, then create the card."),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to read that image.");
    } finally {
      setBusy(null);
    }
  }

  async function commission() {
    if (!selectedOperator) {
      setError("Select the operator this card is for.");
      return;
    }
    if (!brief.trim()) {
      setError("Describe the card you want Cardsmith to make.");
      return;
    }
    setBusy("commission");
    setError(null);
    setNotice(null);
    try {
      const token = await adminBearerToken();
      const response = await fetch("/api/admin/cards/commission", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          brief: brief.trim(),
          operatorCallsign: selectedOperator.callsign,
          operatorName: selectedOperator.display_name,
          operatorRole: selectedOperator.team_role,
          expansionCode: form.expansionCode,
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; card?: CardsmithDraft } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Cardsmith could not draft that card.");
      if (!payload?.card) throw new Error("No card data came back.");
      setForm((current) => applyDraft(current, payload.card!, operators));
      setNotice(payload.card.notes || "Cardsmith drafted the fields below. Edit anything you want, then create the card.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to commission that card.");
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    setBusy("save");
    setError(null);
    try {
      const token = await adminBearerToken();
      const response = await fetch("/api/admin/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          operatorId: form.operatorId,
          name: form.name,
          slug: form.slug || slugPreview,
          collectorNumber: form.collectorNumber || null,
          expansionCode: form.expansionCode || null,
          status: "submitted",
          version: {
            typeLine: form.typeLine,
            manaCost: form.manaCost || null,
            colorIdentity: parseColors(form.colorIdentity),
            rulesText: parseRules(form.rulesText),
            flavorText: form.flavorText || null,
            power: form.power || null,
            toughness: form.toughness || null,
            rarity: form.rarity || null,
          },
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string; versionId?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to create the card.");

      if (file && payload?.versionId) {
        const data = new FormData();
        data.set("file", file);
        data.set("kind", "render");
        const upload = await fetch(`/api/admin/card-versions/${payload.versionId}/assets`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: data,
        });
        const uploadPayload = await upload.json().catch(() => null) as { error?: string } | null;
        if (!upload.ok) throw new Error(uploadPayload?.error ?? "Card created, but the image did not upload.");
      }

      setForm({ ...EMPTY, operatorId: form.operatorId, expansionCode: form.expansionCode });
      setBrief("");
      chooseFile(null);
      setNotice("Card submitted for review.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create the card.");
    } finally {
      setBusy(null);
    }
  }

  const working = busy !== null;

  return (
    <form
      className="command-panel card-composer-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="panel-label">
        <span>NEW CARD</span>
        <span>REVIEW BEFORE IT GOES PUBLIC</span>
      </div>

      <label>Operator
        <select value={form.operatorId} onChange={(event) => setField("operatorId", event.target.value)} required>
          <option value="">Select operator</option>
          {operators.map((operator) => (
            <option key={operator.id} value={operator.id}>
              {operator.callsign}{operator.display_name ? ` — ${operator.display_name}` : ""}
            </option>
          ))}
        </select>
      </label>

      <div className="card-ingest-grid">
        <div className="card-ingest-pane">
          <h3>From a finished image</h3>
          <p className="form-hint">Drop a photo or PNG of the printed card. We read the name, type, rules, and stats into the form.</p>
          <label
            className={`card-drop${file ? " has-file" : ""}${busy === "read" ? " is-busy" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const dropped = event.dataTransfer.files?.[0];
              if (dropped) chooseFile(dropped);
            }}
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              disabled={working}
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Selected card" className="card-drop-preview" />
            ) : (
              <span className="card-drop-label">
                <Upload size={18} />
                Drop image or click to choose
              </span>
            )}
            <span className="card-drop-hint">
              {busy === "read" ? "Reading printed fields…" : "JPEG, PNG, WebP, or GIF · under 6 MB"}
            </span>
          </label>
          <button className="button secondary" type="button" disabled={working || !file} onClick={() => void readImage()}>
            <ImagePlus size={16} /> {busy === "read" ? "Reading card…" : "Re-read image"}
          </button>
        </div>

        <div className="card-ingest-pane card-commission">
          <h3>Ask Cardsmith</h3>
          <p className="form-hint">Drafts with the same Cardsmith brief used in ChatGPT. Edit anything before you create the card.</p>
          <label>What should this card do?
            <textarea
              value={brief}
              rows={4}
              placeholder="SINS as a black mythic that taxes the table when he patches comms…"
              onChange={(event) => setBrief(event.target.value)}
            />
          </label>
          <button className="button secondary" type="button" disabled={working} onClick={() => void commission()}>
            <Sparkles size={16} /> {busy === "commission" ? "Drafting…" : "Draft with Cardsmith"}
          </button>
        </div>
      </div>

      {error ? <div className="notice" role="alert">{error}</div> : null}
      {notice ? <div className="form-success">{notice}</div> : null}

      <div className="field-grid">
        <label>Card name
          <input value={form.name} onChange={(event) => setField("name", event.target.value)} required />
        </label>
        <label>Slug
          <input value={form.slug} placeholder={slugPreview || "auto from name"} onChange={(event) => setField("slug", event.target.value)} />
        </label>
        <label>Collector number
          <input value={form.collectorNumber} onChange={(event) => setField("collectorNumber", event.target.value)} />
        </label>
        <label>Expansion code
          <input value={form.expansionCode} onChange={(event) => setField("expansionCode", event.target.value)} />
        </label>
        <label>Type line
          <input value={form.typeLine} placeholder="Artifact Creature — Construct" onChange={(event) => setField("typeLine", event.target.value)} required />
        </label>
        <label>Mana cost
          <input value={form.manaCost} placeholder="{2}{B}" onChange={(event) => setField("manaCost", event.target.value)} />
        </label>
        <label>Color identity
          <input value={form.colorIdentity} placeholder="B or W U B" onChange={(event) => setField("colorIdentity", event.target.value)} />
        </label>
        <label>Power
          <input value={form.power} onChange={(event) => setField("power", event.target.value)} />
        </label>
        <label>Toughness
          <input value={form.toughness} onChange={(event) => setField("toughness", event.target.value)} />
        </label>
        <label>Rarity
          <input value={form.rarity} placeholder="rare" onChange={(event) => setField("rarity", event.target.value)} />
        </label>
      </div>
      <label>Rules text (one ability per line)
        <textarea value={form.rulesText} onChange={(event) => setField("rulesText", event.target.value)} rows={4} />
      </label>
      <label>Flavor text
        <textarea value={form.flavorText} onChange={(event) => setField("flavorText", event.target.value)} rows={2} />
      </label>
      <div className="form-actions">
        <button className="button primary" type="submit" disabled={working}>
          {busy === "save" ? "Saving…" : "Create card"}
        </button>
      </div>
    </form>
  );
}
