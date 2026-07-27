import Image from "next/image";
import Link from "next/link";
import type { OperatorCard as Card } from "@/lib/data";

export function OperatorCard({ card }: { card: Card }) {
  return (
    <Link className="card-shell" href={`/cards/${card.slug}`}>
      <article className="operator-card">
        <div className="card-header">
          <div>
            <span className="eyebrow">{card.callsign}</span>
            <h3>{card.name}</h3>
          </div>
          <span className="mana">{card.manaCost}</span>
        </div>
        <div className="card-art">
          <Image src={card.image} alt={card.name} fill sizes="(max-width: 760px) 92vw, 30vw" />
          <span className="role-tag">{card.role}</span>
        </div>
        <div className="type-line">{card.typeLine}</div>
        <div className="rules-box">
          {card.rules.map((rule) => <p key={rule}>{rule}</p>)}
          <p className="flavor">{card.flavor}</p>
        </div>
        <div className="card-footer">
          <span>SG • 001</span>
          <strong>{card.power}/{card.toughness}</strong>
        </div>
      </article>
    </Link>
  );
}
