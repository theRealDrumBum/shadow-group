"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { adminBearerToken } from "@/lib/auth/browser-admin";
import { parseColors, parseRules, slugifyCardName } from "@/lib/card-admin";

export type OperatorOption = {
  id: string;
  callsign: string;
  display_name: string | null;
};

type ComposerProps = {
  operators: OperatorOption[];
};

const EMPTY = {
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
  rarity: ""
};

export function CardComposer({ operators }: ComposerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugPreview = useMemo(
    () => slugifyCardName(form.slug || form.name),
    [form.slug, form.name]
  );

  function setField(key: keyof typeof EMPTY, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setBusy(true);
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
            rarity: form.rarity || null
          }
        })
      });
      const payload = await response.json().catch(() => null) as {
        error?: string;
        versionId?: string;
      } | null;
      if (!response.ok) throw new Error(payload?.error ?? "Unable to create the card.");

      if (file && payload?.versionId) {
        const data = new FormData();
        data.set("file", file);
        data.set("kind", "render");
        const upload = await fetch(`/api/admin/card-versions/${payload.versionId}/assets`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: data
        });
        const uploadPayload = await upload.json().catch(() => null) as { error?: string } | null;
        if (!upload.ok) throw new Error(uploadPayload?.error ?? "Card created, but the image did not upload.");
      }

      setForm({ ...EMPTY, operatorId: form.operatorId, expansionCode: form.expansionCode });
      setFile(null);
      setOpen(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create the card.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-composer">
      <button type="button" className="button primary" onClick={() => setOpen((value) => !value)}>
        <Plus size={16} /> {open ? "Close new card" : "Add card"}
      </button>
      {open ? (
        <form
          className="command-panel card-composer-form"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="panel-label">
            <span>NEW CARD</span>
            <span>SUBMITS FOR APPROVAL</span>
          </div>
          <p className="form-hint">
            Creates a submitted version you can approve. Upload the finished Magic card render so the
            public gallery shows the real card instead of a generated face.
          </p>
          {error ? <div className="notice" role="alert">{error}</div> : null}
          <div className="field-grid">
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
          <label>Finished Magic card image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {file ? <p className="form-hint">Selected: {file.name}</p> : null}
          <div className="form-actions">
            <button className="button primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Create card"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
