import Link from "next/link";
import type { OperatorCard as Card } from "@/lib/data";
import { hasStoredCardImage, showsPowerToughness } from "@/lib/card-face";

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
  const showPT = showsPowerToughness(card.typeLine);
  const storedImage = hasStoredCardImage(card);
  const article = storedImage ? (
    <article className="operator-card operator-card-render" data-colors={card.colors.join(" ")}>
      <img src={card.image} alt={card.name} />
    </article>
  ) : (
    <article className="operator-card" data-colors={card.colors.join(" ")}>
      <div className="card-header">
        <div>
          <span className="eyebrow">{card.callsign}</span>
          <h3>{card.name}</h3>
        </div>
        {card.manaCost ? <span className="mana">{card.manaCost}</span> : null}
      </div>
      <div className="card-art">
        <span className="role-tag">{card.role}</span>
      </div>
      <div className="type-line">{card.typeLine}</div>
      <div className="rules-box">
        {card.rules.map((rule) => <p key={rule}>{rule}</p>)}
        {card.flavor ? <p className="flavor">{card.flavor}</p> : null}
      </div>
      <div className="card-footer">
        <span>{expansion} • {collector}{card.rarity ? ` ${card.rarity.charAt(0).toUpperCase()}` : ""}</span>
        {showPT ? <strong>{card.power}/{card.toughness}</strong> : null}
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
