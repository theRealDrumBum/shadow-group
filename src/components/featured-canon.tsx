"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Crosshair, Loader2 } from "lucide-react";

type CanonCard = {
  slug?: string;
  card_name?: string;
  name?: string;
  callsign?: string;
  operator_callsign?: string;
  type_line?: string;
  expansion_code?: string;
  collector_number?: string;
  render_url?: string;
  image_url?: string;
};

export function FeaturedCanon() {
  const [card, setCard] = useState<CanonCard | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/cards/random", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setCard(payload.card ?? null))
      .catch(() => setCard(null));
  }, []);

  if (card === undefined) {
    return <div className="canon-empty"><Loader2 className="spin" /><span>QUERYING CANONICAL ARCHIVE</span></div>;
  }

  if (!card) {
    return (
      <div className="canon-empty">
        <Crosshair size={42} />
        <strong>NO CANONICAL CARD ON FILE</strong>
        <span>Approved cards will rotate through this position once command authorizes them.</span>
      </div>
    );
  }

  const name = card.card_name ?? card.name ?? "CLASSIFIED OPERATOR";
  const callsign = card.operator_callsign ?? card.callsign ?? "UNKNOWN";
  const image = card.render_url ?? card.image_url;

  return (
    <Link href={`/cards/${card.slug ?? ""}`} className="canon-card">
      {image ? <img src={image} alt={name} /> : <div className="canon-art-fallback"><img src="/shadow-group-logo.svg" alt="" /></div>}
      <div className="canon-overlay">
        <span>{card.expansion_code ?? "SG"} // {card.collector_number ?? "UNASSIGNED"}</span>
        <h3>{name}</h3>
        <p>{callsign} · {card.type_line ?? "CANONICAL ASSET"}</p>
      </div>
    </Link>
  );
}
