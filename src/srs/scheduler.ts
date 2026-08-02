/**
 * Builds the ordered study queue for a session from the full vocabulary set,
 * and derives the counts shown on the Home screen. Pure, in-memory, fast — the
 * whole set is already in memory via Dexie's liveQuery.
 */
import type { SessionSource, VocabularyEntry } from '@/lib/types';
import { shuffle } from '@/lib/utils';

export interface QueueOptions {
  source: SessionSource;
  now?: number;
  newLimit?: number;
  reviewLimit?: number;
  categoryId?: string | null;
}

export function isDue(entry: VocabularyEntry, now = Date.now()): boolean {
  return entry.memoryLevel !== 'new' && entry.dueDate <= now;
}

export interface StudyCounts {
  total: number;
  due: number;
  fresh: number;
  wrong: number;
  favorites: number;
  learning: number;
  mastered: number;
}

export function studyCounts(
  all: VocabularyEntry[],
  now = Date.now(),
): StudyCounts {
  const counts: StudyCounts = {
    total: all.length,
    due: 0,
    fresh: 0,
    wrong: 0,
    favorites: 0,
    learning: 0,
    mastered: 0,
  };
  for (const e of all) {
    if (e.memoryLevel === 'new') counts.fresh += 1;
    else if (e.dueDate <= now) counts.due += 1;
    if (e.wrongCount > 0 && !e.mastered) counts.wrong += 1;
    if (e.favorite) counts.favorites += 1;
    if (e.memoryLevel === 'learning') counts.learning += 1;
    if (e.mastered) counts.mastered += 1;
  }
  return counts;
}

/**
 * Priority order for the Today queue: forgotten/lapsed cards first (highest
 * priority per spec), then the most overdue reviews, then fresh cards up to the
 * daily limits.
 */
export function buildQueue(
  all: VocabularyEntry[],
  opts: QueueOptions,
): VocabularyEntry[] {
  const now = opts.now ?? Date.now();
  let pool = all;
  if (opts.categoryId) pool = pool.filter((e) => e.category === opts.categoryId);

  switch (opts.source) {
    case 'due': {
      const due = pool.filter((e) => isDue(e, now));
      due.sort(
        (a, b) => b.lapses - a.lapses || a.dueDate - b.dueDate,
      );
      const capped =
        opts.reviewLimit && opts.reviewLimit > 0
          ? due.slice(0, opts.reviewLimit)
          : due;
      const fresh = pool
        .filter((e) => e.memoryLevel === 'new')
        .sort((a, b) => a.importedDate - b.importedDate)
        .slice(0, opts.newLimit && opts.newLimit > 0 ? opts.newLimit : 0);
      return [...capped, ...fresh];
    }
    case 'new': {
      const fresh = pool
        .filter((e) => e.memoryLevel === 'new')
        .sort((a, b) => a.importedDate - b.importedDate);
      return opts.newLimit && opts.newLimit > 0
        ? fresh.slice(0, opts.newLimit)
        : fresh;
    }
    case 'wrong': {
      const wrong = pool.filter((e) => e.wrongCount > 0 && !e.mastered);
      wrong.sort(
        (a, b) => b.wrongCount - a.wrongCount || a.dueDate - b.dueDate,
      );
      return wrong;
    }
    case 'favorites':
      return shuffle(pool.filter((e) => e.favorite));
    case 'recent':
      return pool
        .slice()
        .sort((a, b) => b.importedDate - a.importedDate)
        .slice(0, 50);
    case 'random':
      return shuffle(pool).slice(0, 30);
    case 'all':
    default:
      return shuffle(pool);
  }
}
