import Link from "next/link";
import { ArrowLeft, Search, Shield } from "lucide-react";
import { OperatorCard } from "@/components/operator-card";
import { getGalleryCards } from "@/lib/card-registry";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const { cards, source } = await getGalleryCards();

  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand"><span className="brand-mark"><Shield size={20} /></span><span>SHADOW GROUP</span></Link>
        <Link className="text-link" href="/"><ArrowLeft size={16} /> Return to HQ</Link>
      </header>
      <section className="section registry-page">
        <span className="kicker">SHADOW GROUP // ARCHIVE</span>
        <h1 className="page-title">Card Registry</h1>
        <div className="registry-toolbar">
          <div className="search-box"><Search size={17} /><span>Search by card, operator, or role</span></div>
          <span>{cards.length} approved {cards.length === 1 ? "record" : "records"}</span>
        </div>
        {source === "sample" ? (
          <div className="notice">
            Showing sample cards. Approved cards published through the Cardsmith workflow will appear here
            automatically once the registry has canonical entries.
          </div>
        ) : null}
        <div className="card-grid">{cards.map((card) => <OperatorCard key={card.slug} card={card} />)}</div>
      </section>
    </main>
  );
}
