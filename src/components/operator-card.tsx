import Link from "next/link";
import type { OperatorCard as Card } from "@/lib/data";

export function OperatorCard({
  card,
  href,
  linked = true
}: {
  card: Card;
  href?: string | null;
  linked?: boolean;
}) {
  const expansion = card.expansionCode ?? "SG";
  const collector = card.collectorNumber ?? "—";
  const article = (
    <article className="operator-card" data-colors={card.colors.join(" ")}>
      <div className="card-header">
        <div>
          <span className="eyebrow">{card.callsign}</span>
          <h3>{card.name}</h3>
        </div>
        <span className="mana">{card.manaCost}</span>
      </div>
      <div className="card-art">
        {/* Plain img so ChatGPT-uploaded storage URLs and local Supabase work without next/image host allowlists. */}
        <img src={card.image} alt={card.name} />
        <span className="role-tag">{card.role}</span>
      </div>
      <div className="type-line">{card.typeLine}</div>
      <div className="rules-box">
        {card.rules.map((rule) => <p key={rule}>{rule}</p>)}
        {card.flavor ? <p className="flavor">{card.flavor}</p> : null}
      </div>
      <div className="card-footer">
        <span>{expansion} • {collector}</span>
        <strong>{card.power}/{card.toughness}</strong>
      </div>
    </article>
  );

  if (!linked || href === null) {
    return <div className="card-shell card-shell-static">{article}</div>;
  }

  return (
    <Link className="card-shell" href={href ?? `/cards/${card.slug}`}>
      {article}
    </Link>
  );
}
