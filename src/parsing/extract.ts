/**
 * Rule-based field extraction. Turns a set of text segments (a line split on
 * delimiters, or the cells of a table/CSV row) into a structured vocabulary
 * candidate: German headword, article, plural, verb forms, Arabic + English
 * translations, and example sentences.
 */
import type { Article, ParsedCandidate, PartOfSpeech, VerbForms } from '@/lib/types';
import { hasArabic, hasLatin } from '@/lib/utils';
import { categorize } from './categorizer';

const GERMAN_CHARS = /[äöüßÄÖÜ]/;
const TERMINAL = /[.!?…]\s*$/;

const NOISE_RE: RegExp[] = [
  /^(sure|certainly|of course|here('| i)s|as an ai|i hope|let me know|here are|great|okay|ok)\b/i,
  /^(chatgpt|user|assistant|prompt|response|note|tip|beispiel|example|vocabulary|wortschatz|liste?)\s*[:：]?\s*$/i,
  /^[-–—=*_#>\s]+$/, // rules / dividers / empty markdown
  /^\d{1,2}[./-]\d{1,2}([./-]\d{2,4})?$/, // dates
  /^\d{4}-\d{2}-\d{2}/, // ISO dates
  /^(page|seite)\s+\d+/i,
];

const SPLIT_RE = /\s*(?:=>|➜|→|—|–|\t|::|=|\/{1,2}| - | : |：|·|•)\s*/;

export function isNoise(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  return NOISE_RE.some((re) => re.test(t));
}

export function isSeparatorRow(line: string): boolean {
  return /^\|?\s*:?-{2,}.*$/.test(line) && line.includes('-');
}

export function isHeading(line: string): boolean {
  const t = line.trim();
  if (/^#{1,6}\s+/.test(t)) return true;
  if (/^\*\*[^*]+\*\*$/.test(t)) return true;
  return false;
}

/** A full German sentence (candidate example), not a headword. */
export function isGermanSentence(line: string): boolean {
  const words = line.trim().split(/\s+/);
  return words.length >= 4 && (TERMINAL.test(line) || GERMAN_CHARS.test(line));
}

export function looksGerman(text: string): boolean {
  return hasLatin(text) && !hasArabic(text);
}

export function splitSegments(line: string): string[] {
  // strip leading list markers ("- ", "• ", "1. ", "* ")
  const cleaned = line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '');
  return cleaned
    .split(SPLIT_RE)
    .map((s) => s.trim().replace(/^\*\*|\*\*$/g, '').trim())
    .filter(Boolean);
}

function stripAll(text: string): string {
  return text.replace(/^\*\*|\*\*$/g, '').replace(/[「」“”„"]/g, '').trim();
}

/**
 * Split a leading article off a noun. Phrases and sentences that merely start
 * with der/die/das ("Das ist teuer") must keep their first word, so only strip
 * when what follows is short enough to be a headword.
 */
function extractArticle(seg: string): { article: Article; rest: string } {
  const m = seg.match(/^(der|die|das)\s+(.+)$/i);
  if (m) {
    const rest = m[2].trim();
    const wordCount = rest.split(/\s+/).length;
    const isSentence = /[.!?]$/.test(rest) || /\b(ist|sind|war|hat|kann|wird)\b/i.test(rest);
    if (wordCount <= 2 && !isSentence) {
      return { article: m[1].toLowerCase() as Article, rest };
    }
  }
  return { article: null, rest: seg.trim() };
}

function normalizePlural(word: string, inner: string): string | null {
  let p = inner.replace(/^(die|pl\.?|plural:?)\s*/i, '').trim();
  if (!p) return null;
  if (p.startsWith('-')) return word + p.replace(/^-+/, '');
  if (p === '=' || /^same$/i.test(p)) return word;
  return p;
}

/**
 * A parenthetical is only a plural when it is explicitly marked ("Pl.: …",
 * "die …"), starts with a plural suffix ("-e", "¨-er"), or the headword
 * already carries an article. Otherwise it is an English gloss or a comment.
 */
function looksLikePlural(inner: string, article: Article): boolean {
  const t = inner.trim();
  if (!t) return false;
  if (/^(pl\.?|plural)\b/i.test(t)) return true;
  if (/^(die|-|¨)/.test(t)) return true;
  return article !== null && t.split(/\s+/).length === 1;
}

function looksLikeVerbForms(inner: string): boolean {
  return /\b(ge\w+|ist|hat|haben|sein)\b/i.test(inner) || inner.split(',').length >= 2;
}

function extractVerbForms(inner: string): VerbForms | null {
  const parts = inner
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const vf: VerbForms = {};
  for (const part of parts) {
    const p = part.trim();
    if (/^(ist|sein)\b/i.test(p)) {
      vf.auxiliary = 'sein';
      const g = p.replace(/^(ist|sein)\s+/i, '').trim();
      if (/^ge/i.test(g) || /(en|t)$/i.test(g)) vf.partizipII = g;
    } else if (/^(hat|haben)\b/i.test(p)) {
      vf.auxiliary = 'haben';
      const g = p.replace(/^(hat|haben)\s+/i, '').trim();
      if (g) vf.partizipII = g;
    } else if (/^ge\w+(t|en)$/i.test(p)) {
      vf.partizipII = p;
    } else if (!vf.praeteritum) {
      vf.praeteritum = p;
    }
  }
  return Object.keys(vf).length ? vf : null;
}

function classifyPos(
  article: Article,
  word: string,
  english: string,
  verbForms: VerbForms | null,
): PartOfSpeech {
  if (article) return 'noun';
  if (verbForms) return 'verb';
  if (/^to\s+/i.test(english)) return 'verb';
  if (/[a-zäöüß]en$/i.test(word) && word.split(/\s+/).length === 1) return 'verb';
  if (word.split(/\s+/).length >= 3) return 'phrase';
  return 'other';
}

/**
 * Build a candidate from already-split segments. Returns null if nothing
 * German-looking can be found.
 */
export function buildCandidate(
  segments: string[],
  raw: string,
): ParsedCandidate | null {
  const segs = segments.map(stripAll).filter(Boolean);
  if (segs.length === 0) return null;

  const arabicSegs = segs.filter((s) => hasArabic(s));
  const latinSegs = segs.filter((s) => !hasArabic(s) && hasLatin(s));
  if (latinSegs.length === 0) return null;

  // German segment: prefer one with an article or German-specific characters,
  // otherwise the first latin segment.
  let germanSeg =
    latinSegs.find((s) => /^(der|die|das)\s+/i.test(s)) ??
    latinSegs.find((s) => GERMAN_CHARS.test(s) && !/^to\s/i.test(s)) ??
    latinSegs[0];

  const exampleSegs = latinSegs.filter(
    (s) => s !== germanSeg && isGermanSentence(s) && GERMAN_CHARS.test(s),
  );
  const englishSegs = latinSegs.filter(
    (s) => s !== germanSeg && !exampleSegs.includes(s),
  );

  const { article, rest } = extractArticle(germanSeg);
  let word = rest;
  let plural: string | null = null;
  let verbForms: VerbForms | null = null;

  const paren = rest.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  const comma = rest.match(/^([^,]+),\s*(.+)$/);
  if (paren) {
    word = paren[1].trim();
    const inner = paren[2].trim();
    if (!article && looksLikeVerbForms(inner)) verbForms = extractVerbForms(inner);
    else if (looksLikePlural(inner, article)) plural = normalizePlural(word, inner);
    // Otherwise the parenthetical is a gloss/comment, not a plural — ignore it.
  } else if (comma) {
    word = comma[1].trim();
    const inner = comma[2].trim();
    if (article || /^-/.test(inner)) plural = normalizePlural(word, inner);
    else if (looksLikeVerbForms(inner)) verbForms = extractVerbForms(inner);
  }

  word = word.replace(/[.,;:]+$/, '').trim();
  if (!word) return null;

  const english = englishSegs.join('; ').replace(/^to\s+/i, 'to ').trim();
  const arabic = arabicSegs.join('، ').trim();
  const pos = classifyPos(article, word, english, verbForms);
  const category = categorize(word, english, pos);

  const confidence = scoreConfidence({
    article,
    word,
    arabic,
    english,
    examples: exampleSegs,
    verbForms,
  });

  return {
    german: word,
    article,
    plural,
    pos,
    verbForms,
    arabic,
    english,
    examples: exampleSegs,
    category,
    confidence,
    raw,
  };
}

function scoreConfidence(c: {
  article: Article;
  word: string;
  arabic: string;
  english: string;
  examples: string[];
  verbForms: VerbForms | null;
}): number {
  let score = 0.2;
  if (c.article) score += 0.25;
  if (c.arabic) score += 0.3;
  if (c.english) score += 0.25;
  if (c.verbForms) score += 0.1;
  if (c.examples.length) score += 0.1;
  // Penalise things that look like whole sentences masquerading as a headword.
  if (c.word.split(/\s+/).length > 4) score -= 0.4;
  if (/[.!?]$/.test(c.word)) score -= 0.2;
  return Math.max(0, Math.min(1, score));
}
