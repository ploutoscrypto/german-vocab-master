/**
 * German gender is largely predictable from the word ending. These suffix
 * rules cover a large share of everyday nouns and are far more useful to a
 * learner than "just memorise it" — so when a noun matches one, we say so.
 *
 * Rules are returned as structured data (suffix + article + reliability) and
 * rendered through i18n, so the explanation works in all four UI languages.
 */
import type { Article } from '@/lib/types';

export interface GenderRule {
  suffix: string;
  article: Exclude<Article, null>;
  /** 'always' rules have essentially no exceptions; 'usually' have a few. */
  strength: 'always' | 'usually';
}

const RULES: GenderRule[] = [
  // — feminine —
  { suffix: 'ung', article: 'die', strength: 'always' },
  { suffix: 'heit', article: 'die', strength: 'always' },
  { suffix: 'keit', article: 'die', strength: 'always' },
  { suffix: 'schaft', article: 'die', strength: 'always' },
  { suffix: 'tion', article: 'die', strength: 'always' },
  { suffix: 'sion', article: 'die', strength: 'always' },
  { suffix: 'tät', article: 'die', strength: 'always' },
  { suffix: 'ik', article: 'die', strength: 'usually' },
  { suffix: 'ur', article: 'die', strength: 'usually' },
  { suffix: 'enz', article: 'die', strength: 'always' },
  { suffix: 'anz', article: 'die', strength: 'always' },
  { suffix: 'ei', article: 'die', strength: 'usually' },
  { suffix: 'ie', article: 'die', strength: 'usually' },
  { suffix: 'in', article: 'die', strength: 'usually' },

  // — neuter —
  { suffix: 'chen', article: 'das', strength: 'always' },
  { suffix: 'lein', article: 'das', strength: 'always' },
  { suffix: 'ment', article: 'das', strength: 'usually' },
  { suffix: 'um', article: 'das', strength: 'usually' },
  { suffix: 'tum', article: 'das', strength: 'usually' },
  { suffix: 'nis', article: 'das', strength: 'usually' },

  // — masculine —
  { suffix: 'ling', article: 'der', strength: 'always' },
  { suffix: 'ismus', article: 'der', strength: 'always' },
  { suffix: 'or', article: 'der', strength: 'usually' },
  { suffix: 'ant', article: 'der', strength: 'usually' },
  { suffix: 'ist', article: 'der', strength: 'usually' },
  { suffix: 'eur', article: 'der', strength: 'usually' },
  { suffix: 'ig', article: 'der', strength: 'usually' },
];

// Longest suffix first so "-schaft" wins over "-t"-style short matches.
const SORTED = [...RULES].sort((a, b) => b.suffix.length - a.suffix.length);

export function genderRuleFor(word: string): GenderRule | null {
  const w = word.trim().toLowerCase();
  if (w.length < 4) return null;
  for (const rule of SORTED) {
    if (w.endsWith(rule.suffix) && w.length > rule.suffix.length + 1) return rule;
  }
  return null;
}

/** Colour-coding is a classic article mnemonic; keep it consistent app-wide. */
export const ARTICLE_COLOR_WORD: Record<string, 'blue' | 'red' | 'green'> = {
  der: 'blue',
  die: 'red',
  das: 'green',
};
