"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { OperatorCard } from "@/components/operator-card";
import type { OperatorCard as Card } from "@/lib/data";

export function CardGallery({ cards }: { cards: Card[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return cards;
    return cards.filter((card) => {
      const haystack = [
        card.name,
        card.callsign,
        card.role,
        card.typeLine,
        card.collectorNumber,
        card.expansionCode,
        card.rarity,
        card.flavor,
        ...card.colors,
        ...card.rules
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [cards, query]);

  return (
    <>
      <div className="registry-toolbar">
        <label className="search-box">
          <Search size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by card, operator, or role"
            aria-label="Search cards"
          />
        </label>
        <span>
          {filtered.length} {filtered.length === 1 ? "record" : "records"}
          {query.trim() ? ` of ${cards.length}` : " approved"}
        </span>
      </div>

      {filtered.length ? (
        <div className="card-grid">
          {filtered.map((card) => (
            <OperatorCard key={card.slug} card={card} />
          ))}
        </div>
      ) : (
        <div className="notice">
          No records match “{query.trim()}”. Try a different callsign, role, or card name.
        </div>
      )}
    </>
  );
}
