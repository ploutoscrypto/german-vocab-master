/**
 * ChatGPT conversation-export support.
 *
 * Real exports store vocabulary as a **column-flattened table**: a run of
 * column-header lines followed by rows whose cells are written one per line.
 *
 *     Deutsch            <- header run (K = 3)
 *     Artikel
 *     Bedeutung (AR)
 *     Süßigkeiten        <- row 1, cell 1
 *     die                <- row 1, cell 2
 *     الحلويات            <- row 1, cell 3
 *     Rindfleisch        <- row 2 …
 *
 * This module recognises those tables (plus the export's scaffolding noise)
 * and turns them into candidates. Conjugation drills (ich/du/er…) are skipped
 * because pronoun forms are not headwords, while Singular/Plural tables are
 * kept as plural enrichment for words captured elsewhere.
 */
import type { Article, ParsedCandidate, PartOfSpeech, VerbForms } from '@/lib/types';
import { hasArabic, hasLatin } from '@/lib/utils';
import { categorize } from './categorizer';

export type ColumnRole =
  | 'german'
  | 'article'
  | 'meaning'
  | 'english'
  | 'pos'
  | 'plural'
  | 'singular'
  | 'example'
  | 'skip';

/** Known column headers → their role. Keys are compared case-insensitively. */
const COLUMN_ROLES: Array<[RegExp, ColumnRole]> = [
  [/^(deutsch|wort|w[öo]rter|german|infinitiv|begriff)$/i, 'german'],
  [/^(artikel|article)$/i, 'article'],
  [/^bedeutung(\s*\(.*\))?$/i, 'meaning'],
  [/^(arabisch|arabic|عربي|المعنى)$/i, 'meaning'],
  [/^(englisch|english)$/i, 'english'],
  [/^(typ|art|wortart|kategorie)$/i, 'pos'],
  [/^(plural|mehrzahl)$/i, 'plural'],
  [/^(singular|einzahl)$/i, 'singular'],
  [/^(beispiel|beispielsatz|satz|example)$/i, 'example'],
  // Conjugation-drill columns — recognised so the table is detected, then skipped.
  [/^(person|form|pronomen|konjugation|verb|adjektiv|adverb|nomen|pr[äa]teritum|perfekt|pr[äa]sens|komparativ|superlativ)$/i, 'skip'],
];

export function columnRole(line: string): ColumnRole | null {
  const t = line.trim();
  if (!t || t.length > 30) return null;
  for (const [re, role] of COLUMN_ROLES) if (re.test(t)) return role;
  return null;
}

/** Scaffolding emitted by the ChatGPT export itself — never vocabulary. */
const EXPORT_NOISE: RegExp[] = [
  /^(user|created|updated|exported|link)\s*:/i,
  /^##\s*(prompt|response)\s*:?/i,
  /^\d{1,2}\/\d{1,2}\/\d{4},?\s*\d{1,2}:\d{2}(:\d{2})?$/, // 17/03/2026, 11:20:29
  /^\d{1,2}:\d{2}(:\d{2})?$/, // 00:00:00 transcript stamps
  /^vocabulary\s*[-–—]?\s*german.*$/i,
  /^vocabulary\s*$/i,
  /^(präsens|konjugation|beispiele?|أمثلة|ملاحظة.*|التصريف.*)$/i,
];

export function isExportNoise(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return EXPORT_NOISE.some((re) => re.test(t));
}

/** True when the text carries ChatGPT conversation-export scaffolding. */
export function isChatGptExport(text: string): boolean {
  const head = text.slice(0, 4000);
  return (
    /^##\s*(Prompt|Response):/m.test(head) ||
    (/^User:\s*/m.test(head) && /^(Created|Exported):\s*/m.test(head))
  );
}

/** Index of the first non-empty line (the conversation title in an export). */
export function titleLineIndex(lines: string[]): number {
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    if (lines[i].trim()) return i;
  }
  return -1;
}

/** First non-empty line of an export is the conversation title. */
export function detectSourceName(text: string): string | null {
  const lines = text.split(/\r?\n/, 12);
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    if (isExportNoise(l)) return null;
    return l.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim() || null;
  }
  return null;
}

const POS_WORDS: Record<string, PartOfSpeech> = {
  verb: 'verb',
  verben: 'verb',
  nomen: 'noun',
  substantiv: 'noun',
  nomeneigenname: 'noun',
  adjektiv: 'adjective',
  adverb: 'adverb',
  pronomen: 'other',
  präposition: 'other',
  redewendung: 'phrase',
  ausdruck: 'phrase',
};

/**
 * Closed-class forms that fill conjugation drills ("ich / male"). On their own,
 * with no translation attached, they are table furniture rather than vocabulary.
 */
const DRILL_FORMS = new Set([
  'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'er/sie/es', 'sie/sie',
  'sie/ sie', 'man', 'singular', 'plural', 'infinitiv', 'präsens', 'perfekt',
  'präteritum',
]);

export function isDrillForm(word: string): boolean {
  return DRILL_FORMS.has(word.trim().toLowerCase());
}

/** A plausible German headword cell (not prose, not a sentence). */
export function isHeadwordCell(cell: string): boolean {
  const t = cell.trim();
  if (!t || t.length > 60) return false;
  if (!hasLatin(t) || hasArabic(t)) return false;
  if (/[.!?؟]$/.test(t)) return false;
  if (t.split(/\s+/).length > 5) return false;
  if (/^(https?:|www\.)/i.test(t)) return false;
  return true;
}

function parseArticleCell(cell: string): { article: Article; plural: string | null } {
  const t = cell.trim();
  if (!t || t === '—' || t === '-') return { article: null, plural: null };
  const art = t.match(/\b(der|die|das)\b/i);
  const pl = t.match(/plural\s*:?\s*(?:die\s+)?([^)\n,]+)/i);
  return {
    article: art ? (art[1].toLowerCase() as Article) : null,
    plural: pl ? pl[1].trim() : null,
  };
}

/** Strip a leading article from a Singular/Plural cell. */
function stripArticle(cell: string): { article: Article; word: string } {
  const m = cell.trim().match(/^(der|die|das)\s+(.+)$/i);
  if (m) return { article: m[1].toLowerCase() as Article, word: m[2].trim() };
  return { article: null, word: cell.trim() };
}

interface TableSpec {
  roles: ColumnRole[];
  /** Index after the header run. */
  bodyStart: number;
}

/** Detect a run of >= 2 consecutive known column headers. */
function detectTable(lines: string[], i: number): TableSpec | null {
  const roles: ColumnRole[] = [];
  let j = i;
  while (j < lines.length) {
    const role = columnRole(lines[j]);
    if (role === null) break;
    roles.push(role);
    j += 1;
  }
  if (roles.length < 2) return null;
  return { roles, bodyStart: j };
}

function buildFromRow(
  cells: string[],
  roles: ColumnRole[],
): ParsedCandidate | null {
  let german = '';
  let article: Article = null;
  let plural: string | null = null;
  let arabic = '';
  let english = '';
  let pos: PartOfSpeech = 'other';
  const examples: string[] = [];
  const verbForms: VerbForms | null = null;

  roles.forEach((role, idx) => {
    const cell = (cells[idx] ?? '').trim();
    if (!cell) return;
    switch (role) {
      case 'german':
        german = cell;
        break;
      case 'article': {
        const p = parseArticleCell(cell);
        article = p.article;
        if (p.plural) plural = p.plural;
        break;
      }
      case 'meaning':
        if (hasArabic(cell)) arabic = cell;
        else english = english || cell;
        break;
      case 'english':
        english = cell;
        break;
      case 'pos': {
        const key = cell.toLowerCase().replace(/[^a-zäöüß]/g, '');
        pos = POS_WORDS[key] ?? 'other';
        break;
      }
      case 'plural':
        plural = stripArticle(cell).word || plural;
        break;
      case 'singular': {
        const s = stripArticle(cell);
        german = s.word;
        article = s.article ?? article;
        break;
      }
      case 'example':
        if (cell.length > 3) examples.push(cell);
        break;
      case 'skip':
      default:
        break;
    }
  });

  if (!german || !isHeadwordCell(german)) return null;
  if (!arabic && !english && !plural) return null; // no information gained

  if (pos === 'other') {
    if (article) pos = 'noun';
    else if (/^to\s/i.test(english) || /[a-zäöüß]en$/i.test(german)) pos = 'verb';
  }

  let confidence = 0.55;
  if (article) confidence += 0.2;
  if (arabic) confidence += 0.2;
  if (english) confidence += 0.1;
  if (plural) confidence += 0.05;

  return {
    german,
    article,
    plural,
    pos,
    verbForms,
    arabic,
    english,
    examples,
    category: categorize(german, english, pos),
    confidence: Math.min(1, confidence),
    raw: cells.join(' | '),
  };
}

export interface TableScanResult {
  candidates: ParsedCandidate[];
  /** Line indices consumed by tables, so the caller skips them. */
  consumed: Set<number>;
}

/**
 * Scan the whole document for column-flattened tables. Rows are the contiguous
 * non-empty lines after the header run, chunked by the column count; the table
 * ends at a blank line, an export marker, or a row that fails validation.
 */
export function scanColumnTables(lines: string[]): TableScanResult {
  const candidates: ParsedCandidate[] = [];
  const consumed = new Set<number>();

  let i = 0;
  while (i < lines.length) {
    if (!lines[i].trim()) {
      i += 1;
      continue;
    }
    const spec = detectTable(lines, i);
    if (!spec) {
      i += 1;
      continue;
    }

    const k = spec.roles.length;
    const vocabTable = spec.roles.includes('german') || spec.roles.includes('singular');

    // Collect the contiguous body lines.
    const body: number[] = [];
    let j = spec.bodyStart;
    while (j < lines.length) {
      const line = lines[j];
      if (!line.trim()) break;
      if (isExportNoise(line)) break;
      body.push(j);
      j += 1;
    }

    if (!vocabTable) {
      // Conjugation drill — consume so it produces no junk words.
      for (let x = i; x < j; x++) consumed.add(x);
      i = j;
      continue;
    }

    let produced = false;
    for (let r = 0; r + k <= body.length; r += k) {
      const idxs = body.slice(r, r + k);
      const cells = idxs.map((x) => lines[x].trim());
      const cand = buildFromRow(cells, spec.roles);
      if (!cand) break; // cadence broken — stop consuming this table
      candidates.push(cand);
      idxs.forEach((x) => consumed.add(x));
      produced = true;
    }
    if (produced) for (let x = i; x < spec.bodyStart; x++) consumed.add(x);
    i = produced ? j : spec.bodyStart;
  }

  return { candidates, consumed };
}
