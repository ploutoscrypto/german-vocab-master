/**
 * Opposite pairs. Learning a word together with its opposite roughly doubles
 * retention value per card and is the classic "association" technique the spec
 * asks for. Two sources: a curated everyday A1–B1 pair list, and morphological
 * negation (un-/-los), which generalises to words not in the table.
 */

/** Curated everyday opposites (both directions are derived automatically). */
const PAIRS: Array<[string, string]> = [
  ['gut', 'schlecht'],
  ['groß', 'klein'],
  ['alt', 'neu'],
  ['alt', 'jung'],
  ['teuer', 'billig'],
  ['teuer', 'günstig'],
  ['schnell', 'langsam'],
  ['warm', 'kalt'],
  ['heiß', 'kalt'],
  ['hell', 'dunkel'],
  ['früh', 'spät'],
  ['leicht', 'schwer'],
  ['einfach', 'schwierig'],
  ['offen', 'geschlossen'],
  ['richtig', 'falsch'],
  ['viel', 'wenig'],
  ['immer', 'nie'],
  ['lang', 'kurz'],
  ['stark', 'schwach'],
  ['sauber', 'schmutzig'],
  ['laut', 'leise'],
  ['voll', 'leer'],
  ['arm', 'reich'],
  ['glücklich', 'traurig'],
  ['fröhlich', 'traurig'],
  ['schön', 'hässlich'],
  ['dick', 'dünn'],
  ['breit', 'schmal'],
  ['hoch', 'niedrig'],
  ['tief', 'flach'],
  ['nah', 'fern'],
  ['weit', 'nah'],
  ['oben', 'unten'],
  ['links', 'rechts'],
  ['vorne', 'hinten'],
  ['innen', 'außen'],
  ['drinnen', 'draußen'],
  ['anfangen', 'aufhören'],
  ['beginnen', 'enden'],
  ['kommen', 'gehen'],
  ['kaufen', 'verkaufen'],
  ['geben', 'nehmen'],
  ['öffnen', 'schließen'],
  ['finden', 'verlieren'],
  ['fragen', 'antworten'],
  ['lachen', 'weinen'],
  ['lieben', 'hassen'],
  ['erlauben', 'verbieten'],
  ['aufstehen', 'sich hinlegen'],
  ['einschlafen', 'aufwachen'],
  ['gewinnen', 'verlieren'],
  ['erinnern', 'vergessen'],
  ['möglich', 'unmöglich'],
  ['bekannt', 'unbekannt'],
  ['zufrieden', 'unzufrieden'],
  ['gesund', 'krank'],
  ['sicher', 'gefährlich'],
  ['wichtig', 'unwichtig'],
  ['tag', 'nacht'],
  ['morgen', 'abend'],
  ['sommer', 'winter'],
  ['frage', 'antwort'],
  ['anfang', 'ende'],
  ['freund', 'feind'],
  ['mann', 'frau'],
  ['junge', 'mädchen'],
  ['himmel', 'erde'],
  ['krieg', 'frieden'],
  ['wahrheit', 'lüge'],
];

const INDEX = new Map<string, Set<string>>();
for (const [a, b] of PAIRS) {
  if (!INDEX.has(a)) INDEX.set(a, new Set());
  if (!INDEX.has(b)) INDEX.set(b, new Set());
  INDEX.get(a)!.add(b);
  INDEX.get(b)!.add(a);
}

export interface Opposite {
  word: string;
  /** 'pair' = from the curated list; 'morphology' = derived with un-/-los. */
  kind: 'pair' | 'morphology';
}

/**
 * Find opposites for a word. `known` (the learner's own vocabulary, lowercased)
 * is used to validate morphological guesses so we never invent a word that
 * does not exist.
 */
export function oppositesFor(word: string, known?: Set<string>): Opposite[] {
  const w = word.trim().toLowerCase();
  const out: Opposite[] = [];

  for (const opp of INDEX.get(w) ?? []) {
    out.push({ word: opp, kind: 'pair' });
  }

  // un- negation: möglich -> unmöglich, and the reverse.
  if (w.startsWith('un') && w.length > 4) {
    const base = w.slice(2);
    if (INDEX.has(base) || known?.has(base)) {
      if (!out.some((o) => o.word === base)) out.push({ word: base, kind: 'morphology' });
    }
  } else if (w.length > 3) {
    const negated = `un${w}`;
    if (INDEX.has(negated) || known?.has(negated)) {
      if (!out.some((o) => o.word === negated)) {
        out.push({ word: negated, kind: 'morphology' });
      }
    }
  }

  return out.slice(0, 4);
}

export function hasOpposite(word: string): boolean {
  return INDEX.has(word.trim().toLowerCase());
}
