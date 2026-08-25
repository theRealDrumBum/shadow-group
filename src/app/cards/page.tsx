import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { getGalleryCards } from "@/lib/card-registry";
import { CardGallery } from "./card-gallery";
import "./cards.css";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const { cards } = await getGalleryCards();

  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand"><span className="brand-mark"><Shield size={20} /></span><span>SHADOW GROUP</span></Link>
        <Link className="text-link" href="/"><ArrowLeft size={16} /> Return to HQ</Link>
      </header>
      <section className="section registry-page">
        <span className="kicker">SHADOW GROUP // ARCHIVE</span>
        <h1 className="page-title">Card Registry</h1>
        <p className="registry-lead">
          Approved cards from the Shadow Group registry. New cards are submitted through Cardsmith
          and appear here after command signs off.
        </p>
        <CardGallery cards={cards} />
      </section>
    </main>
  );
}
