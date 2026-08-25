import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { notFound } from "next/navigation";
import { OperatorCard } from "@/components/operator-card";
import { showsPowerToughness } from "@/lib/card-face";
import { getGalleryCardDetailBySlug } from "@/lib/card-registry";
import "../cards.css";

export const dynamic = "force-dynamic";

export default async function CardDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = await getGalleryCardDetailBySlug(slug);
  if (!detail) notFound();

  const { card, extras } = detail;
  const expansion = extras.expansionName
    ? `${extras.expansionName}${extras.expansionCode ? ` (${extras.expansionCode})` : ""}`
    : extras.expansionCode ?? "Shadow Group";

  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand"><span className="brand-mark"><Shield size={20} /></span><span>SHADOW GROUP</span></Link>
        <Link className="text-link" href="/cards"><ArrowLeft size={16} /> Registry</Link>
      </header>
      <section className="section detail-page">
        <div className="detail-grid">
          <OperatorCard card={card} linked={false} />
          <div className="detail-copy">
            <span className="kicker">OPERATOR RECORD // APPROVED</span>
            <h1 className="page-title">{card.callsign}</h1>
            <p className="detail-lead">
              {card.name}. This record preserves the approved canonical card interpretation and the source facts
              needed to rebuild future versions.
            </p>
            <div className="fact-panel"><span>Role</span><strong>{card.role}</strong></div>
            <div className="fact-panel"><span>Card Type</span><strong>{card.typeLine || "—"}</strong></div>
            <div className="fact-panel"><span>Mana Cost</span><strong>{card.manaCost || "—"}</strong></div>
            {showsPowerToughness(card.typeLine) ? (
              <div className="fact-panel"><span>Power / Toughness</span><strong>{card.power}/{card.toughness}</strong></div>
            ) : null}
            <div className="fact-panel"><span>Color Identity</span><strong>{card.colors.length ? card.colors.join(" / ") : "—"}</strong></div>
            <div className="fact-panel"><span>Rarity</span><strong>{extras.rarity ?? "—"}</strong></div>
            <div className="fact-panel"><span>Expansion</span><strong>{expansion}</strong></div>
            {extras.collectorNumber ? (
              <div className="fact-panel"><span>Collector №</span><strong>{extras.collectorNumber}</strong></div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
