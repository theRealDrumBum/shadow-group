import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { getGalleryCards } from "@/lib/card-registry";
import { CardGallery } from "./card-gallery";
import "./cards.css";

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
        <p className="registry-lead">
          Every approved operator card in the Shadow Group canon. Cards are proposed through the Cardsmith GPT,
          reviewed by command, and published here once approved.
        </p>
        {source === "sample" ? (
          <div className="notice">
            Showing sample cards. Approved cards published through the Cardsmith workflow will appear here
            automatically once the registry has canonical entries.
          </div>
        ) : null}
        <CardGallery cards={cards} />
      </section>
    </main>
  );
}
