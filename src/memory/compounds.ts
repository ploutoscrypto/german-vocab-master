/**
 * German compound splitting.
 *
 * Long German nouns are usually transparent once broken apart — "Krankenhaus"
 * is just krank + Haus ("sick house"). Showing that decomposition turns an
 * intimidating 12-letter word into two words the learner already knows, which
 * is the single most effective offline memory aid for German.
 *
 * The dictionary is built from the learner's OWN vocabulary plus a compact list
 * of very common building blocks, so it improves as their collection grows.
 */
import type { VocabularyEntry } from '@/lib/types';

/** Frequent compound components that may not be in the user's list yet. */
const COMMON_PARTS: Record<string, string> = {
  haus: 'house',
  zimmer: 'room',
  wasser: 'water',
  arbeit: 'work',
  zeit: 'time',
  tag: 'day',
  nacht: 'night',
  jahr: 'year',
  stadt: 'city',
  land: 'country',
  strasse: 'street',
  straße: 'street',
  bahn: 'rail/train',
  hof: 'yard/court',
  platz: 'place',
  markt: 'market',
  geld: 'money',
  karte: 'card',
  buch: 'book',
  schule: 'school',
  lehrer: 'teacher',
  kind: 'child',
  mann: 'man',
  frau: 'woman',
  freund: 'friend',
  hand: 'hand',
  kopf: 'head',
  auge: 'eye',
  tisch: 'table',
  stuhl: 'chair',
  tür: 'door',
  fenster: 'window',
  küche: 'kitchen',
  bad: 'bath',
  bett: 'bed',
  essen: 'food/eating',
  brot: 'bread',
  milch: 'milk',
  fleisch: 'meat',
  obst: 'fruit',
  saft: 'juice',
  wein: 'wine',
  auto: 'car',
  zug: 'train',
  flug: 'flight',
  reise: 'journey',
  weg: 'way',
  fahrt: 'ride/trip',
  halt: 'stop',
  arzt: 'doctor',
  krank: 'sick',
  gesund: 'healthy',
  hilfe: 'help',
  amt: 'office/authority',
  post: 'mail',
  bank: 'bank',
  konto: 'account',
  preis: 'price',
  kauf: 'purchase',
  laden: 'shop',
  tasche: 'bag',
  schrank: 'cupboard',
  spiel: 'game',
  sport: 'sport',
  musik: 'music',
  film: 'film',
  telefon: 'telephone',
  computer: 'computer',
  rechner: 'computer',
  nummer: 'number',
  name: 'name',
  wort: 'word',
  sprache: 'language',
  schrift: 'writing',
  brief: 'letter',
  papier: 'paper',
  gross: 'big',
  groß: 'big',
  klein: 'small',
  hoch: 'high',
  alt: 'old',
  neu: 'new',
  ober: 'upper',
  unter: 'under',
  vor: 'pre/before',
  nach: 'after',
  mit: 'with',
  aus: 'out',
  ein: 'in',
  über: 'over',
  haupt: 'main',
  lieblings: 'favourite',
  wetter: 'weather',
  sonne: 'sun',
  regen: 'rain',
  schnee: 'snow',
  wind: 'wind',
  feuer: 'fire',
  licht: 'light',
  luft: 'air',
  baum: 'tree',
  garten: 'garden',
  tier: 'animal',
  hund: 'dog',
  katze: 'cat',
};

/** Linking morphemes that glue German compounds together. */
const LINKERS = ['', 's', 'es', 'n', 'en', 'er', 'e'];

export interface CompoundPart {
  text: string;
  gloss: string;
}

export interface CompoundSplit {
  parts: CompoundPart[];
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Build a lookup of known stems: the learner's own words (with their meanings)
 * layered over the common-parts list.
 */
export function buildStemIndex(entries: VocabularyEntry[]): Map<string, string> {
  const index = new Map<string, string>(Object.entries(COMMON_PARTS));
  for (const e of entries) {
    const key = e.german.trim().toLowerCase();
    if (key.length < 3 || key.includes(' ')) continue;
    const gloss = (e.english || e.arabic).trim();
    if (gloss) index.set(key, gloss);
    else if (!index.has(key)) index.set(key, '');
  }
  return index;
}

/**
 * Split a compound into two or three known stems. Returns null when the word
 * is not a (recognisable) compound — we would rather say nothing than invent a
 * bogus decomposition.
 */
export function splitCompound(
  word: string,
  stems: Map<string, string>,
  depth = 0,
): CompoundPart[] | null {
  const w = word.trim().toLowerCase();
  if (w.length < 7 || w.includes(' ') || depth > 1) return null;

  // Prefer the longest possible first stem: "Kranken|haus" not "Kran|kenhaus".
  for (let cut = w.length - 3; cut >= 3; cut--) {
    const head = w.slice(0, cut);
    if (!stems.has(head)) continue;

    for (const link of LINKERS) {
      if (!w.slice(cut).startsWith(link)) continue;
      const tail = w.slice(cut + link.length);
      if (tail.length < 3) continue;

      if (stems.has(tail)) {
        return [
          { text: titleCase(head), gloss: stems.get(head) ?? '' },
          { text: titleCase(tail), gloss: stems.get(tail) ?? '' },
        ];
      }
      // Allow one further split so three-stem compounds still resolve.
      const rest = splitCompound(tail, stems, depth + 1);
      if (rest) {
        return [{ text: titleCase(head), gloss: stems.get(head) ?? '' }, ...rest];
      }
    }
  }
  return null;
}
