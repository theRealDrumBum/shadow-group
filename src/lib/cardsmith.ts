import { parseColors, parseRules } from "@/lib/card-admin";

export type CardsmithDraft = {
  name: string;
  slug: string;
  operatorCallsign: string;
  collectorNumber: string;
  expansionCode: string;
  typeLine: string;
  manaCost: string;
  colorIdentity: string;
  rulesText: string;
  flavorText: string;
  power: string;
  toughness: string;
  rarity: string;
  notes: string;
};

const EMPTY: CardsmithDraft = {
  name: "",
  slug: "",
  operatorCallsign: "",
  collectorNumber: "",
  expansionCode: "SG",
  typeLine: "",
  manaCost: "",
  colorIdentity: "",
  rulesText: "",
  flavorText: "",
  power: "",
  toughness: "",
  rarity: "",
  notes: "",
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

export function normalizeCardsmithDraft(raw: Record<string, unknown>): CardsmithDraft {
  return {
    name: text(raw.name),
    slug: text(raw.slug),
    operatorCallsign: text(raw.operatorCallsign ?? raw.callsign),
    collectorNumber: text(raw.collectorNumber ?? raw.collector_number),
    expansionCode: (text(raw.expansionCode ?? raw.expansion_code) || "SG").toUpperCase(),
    typeLine: text(raw.typeLine ?? raw.type_line),
    manaCost: text(raw.manaCost ?? raw.mana_cost),
    colorIdentity: parseColors(raw.colorIdentity ?? raw.color_identity).join(" "),
    rulesText: parseRules(raw.rulesText ?? raw.rules_text).join("\n"),
    flavorText: text(raw.flavorText ?? raw.flavor_text),
    power: text(raw.power),
    toughness: text(raw.toughness),
    rarity: text(raw.rarity).toLowerCase(),
    notes: text(raw.notes ?? raw.artPrompt ?? raw.rationale),
  };
}

export const EMPTY_CARDSMITH_DRAFT = EMPTY;

export const READ_IMAGE_SYSTEM = `You extract trading-card data from a photograph or render of a Magic: the Gathering style card.
Return JSON only with these keys:
name, typeLine, manaCost, colorIdentity, rulesText, flavorText, power, toughness, rarity, collectorNumber, expansionCode, operatorCallsign, notes.
Rules:
- manaCost uses brace notation like {2}{B}{R}.
- colorIdentity is a space-separated list of W U B R G.
- rulesText is an array of ability lines (no reminder text in parentheses unless printed).
- operatorCallsign is the Shadow Group callsign if printed (often the subtitle or a named creature).
- expansionCode is a 2–5 letter set code if visible, else "SG".
- rarity is common, uncommon, rare, mythic, or empty.
- notes is anything uncertain.
If a field is not visible, use an empty string or empty array. Never invent collector numbers.`;

export const COMMISSION_SYSTEM = `You are the Shadow Group Cardsmith. Design an original Magic-style operator card for this milsim team.
Voice: gritty, specific, in-universe. Not parody, not generic special-forces tropes.
Return JSON only with:
name, typeLine, manaCost, colorIdentity, rulesText, flavorText, power, toughness, rarity, collectorNumber, expansionCode, operatorCallsign, notes.
Rules:
- operatorCallsign MUST be the provided operator callsign.
- expansionCode is SG unless told otherwise.
- manaCost uses brace notation.
- colorIdentity is W U B R G tokens.
- rulesText is an array of 1–3 abilities that fit the operator brief.
- flavorText is one short in-world line.
- rarity is usually uncommon or rare.
- notes should include a one-line art prompt for a finished card render.
Never claim the card is canon or approved.`;
