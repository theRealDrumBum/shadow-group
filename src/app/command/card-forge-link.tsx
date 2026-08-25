import { ExternalLink } from "lucide-react";
import { CARDSMITH_GPT_URL } from "@/lib/cardsmith";

export function CardForgeLink({
  className = "button secondary",
  label = "Design a card in Card Forge",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <a
      href={CARDSMITH_GPT_URL}
      className={className}
      target="_blank"
      rel="noreferrer noopener"
      title="Opens ChatGPT. Unofficial fan-made — not Wizards of the Coast."
    >
      {label} <ExternalLink size={14} />
    </a>
  );
}
