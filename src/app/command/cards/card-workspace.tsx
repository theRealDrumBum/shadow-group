"use client";

import { useMemo, useState } from "react";
import { CardComposer, type OperatorOption } from "./card-composer";
import { CardReviewQueue, type ReviewCard } from "./card-review-queue";

export function CardWorkspace({
  cards,
  operators,
  initialTab,
}: {
  cards: ReviewCard[];
  operators: OperatorOption[];
  initialTab?: "create" | "review";
}) {
  const pending = useMemo(
    () => cards.filter((card) => card.versions.some((version) => version.status === "submitted" || version.status === "changes_requested")).length,
    [cards],
  );
  const [tab, setTab] = useState<"create" | "review">(initialTab ?? (pending ? "review" : "create"));

  return (
    <div className="card-workspace">
      <div className="command-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "create"}
          className={`command-tab${tab === "create" ? " is-active" : ""}`}
          onClick={() => setTab("create")}
        >
          Create
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "review"}
          className={`command-tab${tab === "review" ? " is-active" : ""}`}
          onClick={() => setTab("review")}
        >
          Review{pending ? ` (${pending})` : ""}
        </button>
      </div>
      {tab === "create" ? <CardComposer operators={operators} /> : <CardReviewQueue cards={cards} operators={operators} />}
    </div>
  );
}
