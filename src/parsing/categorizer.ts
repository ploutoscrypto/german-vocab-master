import { CATEGORY_KEYWORDS } from '@/lib/categories';
import type { PartOfSpeech } from '@/lib/types';
import { normalizeSearch } from '@/lib/utils';

/**
 * Assigns a topic category using keyword dictionaries, with a part-of-speech
 * fallback (verbs / nouns / adjectives / expressions) and finally "unknown".
 * Substring matching is intentional — German compounds like "Krankenhaus"
 * should still match the "krank" stem.
 */
export function categorize(
  german: string,
  english: string,
  pos: PartOfSpeech,
): string {
  const hay = normalizeSearch(`${german} ${english}`);
  const tokens = new Set(hay.split(/[^a-zäöüß]+/i).filter(Boolean));

  let best = '';
  let bestScore = 0;
  for (const cat in CATEGORY_KEYWORDS) {
    let score = 0;
    for (const kw of CATEGORY_KEYWORDS[cat]) {
      if (kw.length >= 4) {
        if (hay.includes(kw)) score += 2;
      } else if (tokens.has(kw)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  if (bestScore >= 2) return best;

  switch (pos) {
    case 'verb':
      return 'verbs';
    case 'adjective':
      return 'adjectives';
    case 'noun':
      return 'nouns';
    case 'phrase':
      return 'expressions';
    default:
      return 'unknown';
  }
}
