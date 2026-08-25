import { ArrowUpRight } from "lucide-react";
import { CARDSMITH_GPT_URL } from "@/lib/cardsmith";

const LABEL = "Design a card in Card Forge";
const NOTE = "Opens ChatGPT. Unofficial fan-made — not Wizards of the Coast.";

export function CardForgeCta({
  variant = "banner",
}: {
  variant?: "banner" | "compact" | "inline";
}) {
  const linkClass = variant === "inline" ? "text-link" : "button primary";

  const link = (
    <a
      className={linkClass}
      href={CARDSMITH_GPT_URL}
      target="_blank"
      rel="noreferrer noopener"
      title={NOTE}
    >
      {LABEL}
      <ArrowUpRight size={variant === "inline" ? 16 : 17} />
    </a>
  );

  if (variant === "inline") {
    return (
      <span className="card-forge-cta card-forge-cta--inline" data-card-forge-cta={variant}>
        {link}
        <span className="card-forge-note">{NOTE}</span>
      </span>
    );
  }

  return (
    <div className={`card-forge-cta card-forge-cta--${variant}`} data-card-forge-cta={variant}>
      {variant === "banner" ? (
        <div className="card-forge-cta-copy">
          <strong>Card Forge</strong>
          <p className="card-forge-note">{NOTE}</p>
        </div>
      ) : null}
      {link}
      {variant === "compact" ? <p className="card-forge-note">{NOTE}</p> : null}
    </div>
  );
}
