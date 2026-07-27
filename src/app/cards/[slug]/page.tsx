import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { OperatorCard } from "@/components/operator-card";
import { cards } from "@/lib/data";

export function generateStaticParams() {
  return cards.map((card) => ({ slug: card.slug }));
}

export default async function CardDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const card = cards.find((item) => item.slug === slug);
  if (!card) notFound();

  return (
    <main>
      <section className="section detail-page">
        <Link className="text-link" href="/cards"><ArrowLeft size={16} /> Registry</Link>
        <div className="detail-grid">
          <OperatorCard card={card} />
          <div className="detail-copy">
            <span className="kicker">OPERATOR RECORD // APPROVED</span>
            <h1 className="page-title">{card.callsign}</h1>
            <p className="detail-lead">This record preserves the card interpretation and the source facts needed to rebuild future versions.</p>
            <div className="fact-panel"><span>ROLE</span><strong>{card.role}</strong></div>
            <div className="fact-panel"><span>COLOR IDENTITY</span><strong>{card.colors.join(" / ")}</strong></div>
            <div className="fact-panel"><span>CARD TYPE</span><strong>{card.typeLine}</strong></div>
            <div className="notice">Supabase-backed facts, generation history, artwork revisions, and approval controls are scaffolded in the included migration and will replace this sample record after setup.</div>
          </div>
        </div>
      </section>
    </main>
  );
}
