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
  collectorNumber?: string | null;
  expansionCode?: string | null;
};

export const cards: OperatorCard[] = [
  {
    slug: "breacher-caffeinated-vanguard",
    name: "Breacher, Caffeinated Vanguard",
    callsign: "BREACHER",
    typeLine: "Legendary Creature — Human Soldier",
    manaCost: "2RW",
    rules: [
      "Haste",
      "Whenever Breacher attacks, another target creature you control gets +2/+0 until end of turn.",
      "Coffee Fueled — Whenever you sacrifice a Food token, Breacher gains indestructible until end of turn."
    ],
    flavor: "“Fuck it, push.”",
    power: "4",
    toughness: "4",
    colors: ["Red", "White"],
    role: "Fire Team Lead",
    image: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1200&q=85"
  },
  {
    slug: "sins-combat-controller",
    name: "Sins, Combat Controller",
    callsign: "SINS",
    typeLine: "Legendary Creature — Human Advisor",
    manaCost: "1UBR",
    rules: [
      "Vigilance",
      "Whenever one or more creatures you control deal combat damage to a player, surveil 1.",
      "At the beginning of combat, you may exchange control of two target creatures you control until end of turn."
    ],
    flavor: "The battle is won before the first trigger is pulled.",
    power: "3",
    toughness: "4",
    colors: ["Blue", "Black", "Red"],
    role: "Combat Controller",
    image: "https://images.unsplash.com/photo-1595590424283-b8f17842773f?auto=format&fit=crop&w=1200&q=85"
  },
  {
    slug: "wraith-shadow-pathfinder",
    name: "Wraith, Shadow Pathfinder",
    callsign: "WRAITH",
    typeLine: "Legendary Creature — Human Scout",
    manaCost: "2BG",
    rules: [
      "Deathtouch",
      "Wraith can't be blocked by creatures with power 2 or less.",
      "Whenever Wraith deals combat damage to a player, create a Map token."
    ],
    flavor: "You never see the route. You only see where he arrived.",
    power: "3",
    toughness: "3",
    colors: ["Black", "Green"],
    role: "Reconnaissance",
    image: "https://images.unsplash.com/photo-1569242840510-3e4f55d9e2a2?auto=format&fit=crop&w=1200&q=85"
  }
];
