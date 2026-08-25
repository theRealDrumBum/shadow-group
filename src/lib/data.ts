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
  expansionName?: string | null;
  rarity?: string | null;
};

const LOGO = "/shadow_group_logo.png";
const EXPANSION = "Shadow Group Expansion";

/**
 * First-wave Shadow Group Expansion cards, bundled so the public gallery has
 * canon even before Cardsmith submissions are approved in Supabase.
 * Registry rows with the same slug replace the bundled copy.
 */
export const cards: OperatorCard[] = [
  {
    slug: "breacher-coffee-fueled-vanguard",
    name: "BREACHER, Coffee-Fueled Vanguard",
    callsign: "BREACHER",
    typeLine: "Legendary Creature — Human Soldier Warrior",
    manaCost: "2RW",
    rules: [
      "First strike",
      "Whenever BREACHER attacks, create a Food token.",
      "Whenever you sacrifice a Food, BREACHER gains indestructible until end of turn. If this is the first time this ability has resolved this turn, untap BREACHER and after this phase, there is an additional combat phase."
    ],
    flavor: "“Black coffee. Belt fed. Fuck it, push.”",
    power: "4",
    toughness: "4",
    colors: ["Red", "White"],
    role: "Rifleman",
    image: LOGO,
    collectorNumber: "001",
    expansionCode: "SG",
    expansionName: EXPANSION,
    rarity: "rare"
  },
  {
    slug: "sins-seven-deadly-specialist",
    name: "SINS, Seven-Deadly Specialist",
    callsign: "SINS",
    typeLine: "Legendary Creature — Human Soldier Advisor",
    manaCost: "1WUB",
    rules: [
      "Vigilance",
      "Whenever SINS, Seven-Deadly Specialist enters the battlefield or attacks, investigate and create a 1/1 colorless Drone artifact creature token with flying.",
      "Whenever you sacrifice an artifact, choose one —",
      "• Surveil 2.",
      "• Tap target creature an opponent controls and put a stun counter on it.",
      "• Another target creature you control gains indestructible until end of turn."
    ],
    flavor: "“He already saw the battlefield, wrote the brief, and launched the drone before anyone asked.”",
    power: "3",
    toughness: "5",
    colors: ["White", "Blue", "Black"],
    role: "Combat Controller",
    image: LOGO,
    collectorNumber: "001",
    expansionCode: "SG",
    expansionName: EXPANSION,
    rarity: "mythic"
  },
  {
    slug: "sins-plan-d-coordinator",
    name: "SINS, Plan-D Coordinator",
    callsign: "SINS",
    typeLine: "Legendary Creature — Human Soldier Advisor",
    manaCost: "1WUB",
    rules: [
      "Flash",
      "Artifact spells you cast have flash.",
      "When SINS, Plan-D Coordinator enters the battlefield, choose up to two —",
      "• Investigate.",
      "• Create a 1/1 colorless Drone artifact creature token with flying.",
      "• Tap target creature an opponent controls. It doesn't untap during its controller's next untap step.",
      "• Another target creature you control phases out.",
      "Whenever you cast a spell during an opponent's turn, surveil 1."
    ],
    flavor: "“Violence is Plan D. We skipped A through C because you didn't listen.”",
    power: "3",
    toughness: "4",
    colors: ["White", "Blue", "Black"],
    role: "Combat Controller",
    image: LOGO,
    collectorNumber: "003",
    expansionCode: "SG",
    expansionName: EXPANSION,
    rarity: "mythic"
  },
  {
    slug: "shadow-group-base-camp",
    name: "Shadow Group Base Camp",
    callsign: "BASE CAMP",
    typeLine: "Legendary Land",
    manaCost: "",
    rules: [
      "Shadow Group Base Camp enters the battlefield tapped unless you control a legendary creature.",
      "{T}: Add {C}.",
      "{1}, {T}: Add one mana of any color. Spend this mana only to cast legendary spells, Soldier spells, or artifact spells.",
      "{3}, {T}: Investigate. Activate only as a sorcery."
    ],
    flavor: "Every operation starts here—under canvas, under watch, and already one step ahead.",
    power: "—",
    toughness: "—",
    colors: [],
    role: "Forward Operating Base",
    image: LOGO,
    collectorNumber: "004",
    expansionCode: "SG",
    expansionName: EXPANSION,
    rarity: "rare"
  },
  {
    slug: "sins-blackout-ram",
    name: "SINS's Blackout Ram",
    callsign: "SINS",
    typeLine: "Legendary Artifact — Vehicle",
    manaCost: "3",
    rules: [
      "Whenever SINS's Blackout Ram enters the battlefield or attacks, choose one —",
      "• Investigate.",
      "• Create a Treasure token.",
      "As long as SINS's Blackout Ram is crewed by a legendary creature, it has vigilance and ward {1}.",
      "Crew 1"
    ],
    flavor: "If the mission needs batteries, ammo, awning, transport, or a place to brief under pressure, the Ram is already there.",
    power: "4",
    toughness: "4",
    colors: [],
    role: "Support Vehicle",
    image: LOGO,
    collectorNumber: "005",
    expansionCode: "SG",
    expansionName: EXPANSION,
    rarity: "rare"
  }
];
