export type OperatorCard = {
  slug: string;
  name: string;
  callsign: string;
  typeLine: string;
  manaCost: string;
  rules: string[];
  flavor: string;
  power: string;
  toughness: string;
  colors: string[];
  role: string;
  image: string;
  imageKind?: string | null;
  collectorNumber?: string | null;
  expansionCode?: string | null;
  expansionName?: string | null;
  rarity?: string | null;
};
