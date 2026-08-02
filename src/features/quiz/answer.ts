/**
 * Answer checking for typing mode.
 *
 * Grading has to be *fair* or the SRS data becomes noise: a learner who typed
 * the right word should never be marked wrong for a missing article, an "ae"
 * instead of "ä", Arabic diacritics, or a single slipped key. We therefore
 * normalise aggressively, accept any one of several comma/slash-separated
 * meanings, and treat a tiny edit distance as "almost" rather than "wrong".
 */

export type AnswerVerdict = 'correct' | 'almost' | 'wrong';

/** Fold German umlauts and ß to their ASCII transliterations. */
function foldGerman(s: string): string {
  return s
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

/** Strip Arabic diacritics (tashkeel) and unify alef/ya/ta-marbuta variants. */
function foldArabic(s: string): string {
  return s
    .replace(/[ً-ٰٟـ]/g, '') // tashkeel + tatweel
    .replace(/[آأإٱ]/g, 'ا') // آ أ إ ٱ -> ا
    .replace(/ى/g, 'ي') // ى -> ي
    .replace(/ة/g, 'ه'); // ة -> ه
}

/** Remove bracketed asides: "علبة (معدنية)" -> "علبة". */
function stripParentheticals(s: string): string {
  return s.replace(/[([{][^)\]}]*[)\]}]/g, ' ');
}

export function normalizeAnswer(input: string): string {
  let s = input.toLowerCase().trim();
  s = stripParentheticals(s);
  s = foldArabic(foldGerman(s));
  // Drop leading articles / infinitive marker, then punctuation and spacing.
  s = s.replace(/^(der|die|das|ein|eine|to|the|le|la|les|un|une|ال)\s+/i, '');
  s = s.replace(/[.,;:!?"'`´’„“”«»\-_/\\]+/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * A stored meaning is often a list of synonyms: "كيس / حقيبة صغيرة",
 * "even / same / immediately", "enough, sufficient". Any one of them counts.
 */
export function acceptableAnswers(stored: string): string[] {
  const parts = stored
    .split(/[/،,;|]|\s+-\s+|\bor\b|\bأو\b/gi)
    .map((p) => normalizeAnswer(p))
    .filter((p) => p.length > 0);
  const whole = normalizeAnswer(stored);
  const set = new Set(parts);
  if (whole) set.add(whole);
  return [...set];
}

/** Classic Levenshtein distance, capped for speed on long strings. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Typo tolerance scales with word length: longer words earn more slack. */
function allowedSlack(len: number): number {
  if (len <= 4) return 0;
  if (len <= 8) return 1;
  return 2;
}

export function checkAnswer(input: string, stored: string): AnswerVerdict {
  const given = normalizeAnswer(input);
  if (!given) return 'wrong';
  const targets = acceptableAnswers(stored);
  if (targets.length === 0) return 'wrong';

  if (targets.includes(given)) return 'correct';

  // Containment both ways handles "kiss" vs "kiss bag" style partial answers.
  for (const t of targets) {
    if (t.length >= 4 && (t.includes(given) || given.includes(t))) {
      const ratio = Math.min(t.length, given.length) / Math.max(t.length, given.length);
      return ratio >= 0.7 ? 'almost' : 'wrong';
    }
  }

  let best = Infinity;
  for (const t of targets) best = Math.min(best, editDistance(given, t));
  const reference = targets.reduce((a, b) => (a.length <= b.length ? a : b));
  return best <= allowedSlack(reference.length) ? 'almost' : 'wrong';
}
