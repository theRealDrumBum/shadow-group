import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { notFound } from "next/navigation";
import { OperatorCard } from "@/components/operator-card";
import { showsPowerToughness, toOperatorCard } from "@/lib/card-face";
import { publicCardAssetUrl } from "@/lib/card-registry";
import { pickPrimaryAssetUrl } from "@/lib/card-assets";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import "../../cards.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Card preview — Shadow Group",
  robots: { index: false, follow: false }
};

type OperatorRef = {
  callsign: string | null;
  display_name: string | null;
  team_role: string | null;
};

type ExpansionRef = { code: string | null; name: string | null };

type CardRef = {
  slug: string;
  name: string;
  status: string;
  collector_number: string | null;
  canonical_version_id: string | null;
  operators: OperatorRef | OperatorRef[] | null;
  expansions: ExpansionRef | ExpansionRef[] | null;
};

type AssetRef = { kind: string | null; storage_path: string | null };

type PreviewVersion = {
  id: string;
  version_number: number;
  status: string;
  mana_cost: string | null;
  color_identity: string[] | null;
  type_line: string | null;
  rules_text: string[] | null;
  flavor_text: string | null;
  power: string | null;
  toughness: string | null;
  rarity: string | null;
  review_notes: string | null;
  cards: CardRef | CardRef[] | null;
  card_assets: AssetRef[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function CardPreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) notFound();

  let version: PreviewVersion | null = null;
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("card_versions")
      .select("id,version_number,status,mana_cost,color_identity,type_line,rules_text,flavor_text,power,toughness,rarity,review_notes,cards!card_versions_card_id_fkey(slug,name,status,collector_number,canonical_version_id,operators!cards_operator_id_fkey(callsign,display_name,team_role),expansions(code,name)),card_assets(kind,storage_path)")
      .eq("preview_token", token)
      .maybeSingle();
    if (error) throw error;
    version = data as PreviewVersion | null;
  } catch (error) {
    console.error("Card preview lookup failed", error);
    notFound();
  }

  if (!version) notFound();

  const cardRow = first(version.cards);
  if (!cardRow) notFound();
  const operator = first(cardRow.operators);
  const expansion = first(cardRow.expansions);
  const artworkUrl = pickPrimaryAssetUrl(
    (version.card_assets ?? []).map((asset) => ({
      kind: asset.kind,
      url: publicCardAssetUrl(asset.storage_path)
    }))
  );
  const published = version.status === "approved" && cardRow.canonical_version_id === version.id;
  const card = toOperatorCard({
    slug: cardRow.slug,
    name: cardRow.name,
    callsign: operator?.callsign,
    typeLine: version.type_line,
    manaCost: version.mana_cost,
    rules: version.rules_text,
    flavor: version.flavor_text,
    power: version.power,
    toughness: version.toughness,
    colors: version.color_identity,
    role: operator?.team_role,
    image: artworkUrl,
    collectorNumber: cardRow.collector_number,
    expansionCode: expansion?.code,
    rarity: version.rarity
  });

  const expansionLabel = expansion?.name
    ? `${expansion.name}${expansion.code ? ` (${expansion.code})` : ""}`
    : expansion?.code ?? "Shadow Group";

  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand"><span className="brand-mark"><Shield size={20} /></span><span>SHADOW GROUP</span></Link>
        <Link className="text-link" href="/cards"><ArrowLeft size={16} /> Registry</Link>
      </header>
      <section className="section detail-page">
        <div className={`preview-banner${published ? " is-canon" : ""}`}>
          {published
            ? "This version is approved canon and appears in the public Card Gallery."
            : "Preview only — this version is not public until a Shadow Group administrator approves it."}
        </div>
        <div className="detail-grid">
          <OperatorCard card={card} linked={false} />
          <div className="detail-copy">
            <span className="kicker">OPERATOR RECORD // {published ? "APPROVED" : "PREVIEW"}</span>
            <h1 className="page-title">{card.callsign}</h1>
            <p className="detail-lead">
              {card.name}. Version {version.version_number} is currently{" "}
              <strong>{version.status.replace(/_/g, " ")}</strong>
              {published
                ? " and is the canonical public record."
                : ". Anyone with this link can preview the card face; it will not appear in the gallery until approved."}
            </p>
            <div className="fact-panel"><span>Role</span><strong>{card.role}</strong></div>
            <div className="fact-panel"><span>Card Type</span><strong>{card.typeLine || "—"}</strong></div>
            <div className="fact-panel"><span>Mana Cost</span><strong>{card.manaCost || "—"}</strong></div>
            {showsPowerToughness(card.typeLine) ? (
              <div className="fact-panel"><span>Power / Toughness</span><strong>{card.power}/{card.toughness}</strong></div>
            ) : null}
            <div className="fact-panel"><span>Color Identity</span><strong>{card.colors.length ? card.colors.join(" / ") : "—"}</strong></div>
            <div className="fact-panel"><span>Rarity</span><strong>{version.rarity ?? "—"}</strong></div>
            <div className="fact-panel"><span>Expansion</span><strong>{expansionLabel}</strong></div>
            {cardRow.collector_number ? (
              <div className="fact-panel"><span>Collector №</span><strong>{cardRow.collector_number}</strong></div>
            ) : null}
            {version.review_notes ? (
              <div className="fact-panel"><span>Review notes</span><strong>{version.review_notes}</strong></div>
            ) : null}
            {published ? (
              <Link className="button primary" href={`/cards/${card.slug}`}>Open in gallery</Link>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
