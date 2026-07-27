import Link from "next/link";
import { ArrowLeft, Search, Shield } from "lucide-react";
import { OperatorCard } from "@/components/operator-card";
import { cards } from "@/lib/data";

export default function CardsPage() {
  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand"><span className="brand-mark"><Shield size={20} /></span><span>SHADOW GROUP</span></Link>
        <Link className="text-link" href="/"><ArrowLeft size={16} /> Return to HQ</Link>
      </header>
      <section className="section registry-page">
        <span className="kicker">SHADOW GROUP // ARCHIVE</span>
        <h1 className="page-title">Card Registry</h1>
        <div className="registry-toolbar"><div className="search-box"><Search size={17} /><span>Search by card, operator, or role</span></div><span>{cards.length} approved records</span></div>
        <div className="card-grid">{cards.map((card) => <OperatorCard key={card.slug} card={card} />)}</div>
      </section>
    </main>
  );
}
