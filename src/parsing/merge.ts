import type { ParsedCandidate, VocabularyEntry } from '@/lib/types';

export function uniqueExamples(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const e = raw.trim();
    const key = e.toLowerCase();
    if (e && !seen.has(key)) {
      seen.add(key);
      out.push(e);
    }
  }
  return out.slice(0, 8);
}

/** Merge two candidates that resolve to the same word, keeping the richer data. */
export function mergeCandidates(
  a: ParsedCandidate,
  b: ParsedCandidate,
): ParsedCandidate {
  return {
    german: a.german,
    article: a.article ?? b.article,
    plural: a.plural ?? b.plural,
    pos: a.pos !== 'other' ? a.pos : b.pos,
    verbForms: a.verbForms ?? b.verbForms,
    arabic: a.arabic || b.arabic,
    english: a.english || b.english,
    examples: uniqueExamples([...a.examples, ...b.examples]),
    category: a.category !== 'unknown' ? a.category : b.category,
    confidence: Math.max(a.confidence, b.confidence),
    raw: a.raw,
  };
}

/** Fold a freshly parsed candidate into an existing stored entry. */
export function applyCandidateToEntry(
  existing: VocabularyEntry,
  c: ParsedCandidate,
): VocabularyEntry {
  return {
    ...existing,
    article: existing.article ?? c.article,
    plural: existing.plural ?? c.plural,
    verbForms: existing.verbForms ?? c.verbForms,
    arabic: existing.arabic || c.arabic,
    english: existing.english || c.english,
    examples: uniqueExamples([...existing.examples, ...c.examples]),
    category:
      existing.category !== 'unknown' ? existing.category : c.category,
    pos: existing.pos !== 'other' ? existing.pos : c.pos,
  };
}
