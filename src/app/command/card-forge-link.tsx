import { ExternalLink } from "lucide-react";
import { CARD_FORGE_GPT_URL } from "@/lib/cardsmith";

export function CardForgeLink({
  className = "button secondary",
  label = "Design a card in Card Forge",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={CARD_FORGE_GPT_URL}
      className={className}
      target="_blank"
      rel="noreferrer noopener"
    >
      {label} <ExternalLink size={14} />
    </a>
  );
}
