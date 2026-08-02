import type { StudySession, VocabularyEntry } from '@/lib/types';
import { DAY_MS, dayKey, pct } from '@/lib/utils';

export interface DayStat {
  date: string;
  reviewed: number;
  correct: number;
}

export interface Statistics {
  total: number;
  fresh: number;
  learning: number;
  review: number;
  mastered: number;
  forgotten: number;
  favorites: number;
  reviewsTotal: number;
  accuracy: number; // %
  retention: number; // % over graduated cards
  streak: number;
  todayReviewed: number;
  todayCorrect: number;
  todayAccuracy: number;
  history: DayStat[];
}

/** Consecutive-day study streak ending today (or yesterday if not yet studied). */
export function computeStreak(sessions: StudySession[], now = Date.now()): number {
  const days = new Set(sessions.filter((s) => s.reviewed > 0).map((s) => s.date));
  let streak = 0;
  let cursor = now;
  if (!days.has(dayKey(now))) cursor = now - DAY_MS;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

export function lastNDays(sessions: StudySession[], n = 14, now = Date.now()): DayStat[] {
  const byDate = new Map(sessions.map((s) => [s.date, s]));
  const out: DayStat[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const key = dayKey(now - i * DAY_MS);
    const s = byDate.get(key);
    out.push({ date: key, reviewed: s?.reviewed ?? 0, correct: s?.correct ?? 0 });
  }
  return out;
}

export function computeStatistics(
  vocab: VocabularyEntry[],
  sessions: StudySession[],
  now = Date.now(),
): Statistics {
  let fresh = 0;
  let learning = 0;
  let review = 0;
  let mastered = 0;
  let forgotten = 0;
  let favorites = 0;
  let correctSum = 0;
  let wrongSum = 0;
  let matureCorrect = 0;
  let matureTotal = 0;

  for (const e of vocab) {
    switch (e.memoryLevel) {
      case 'new':
        fresh += 1;
        break;
      case 'learning':
        learning += 1;
        break;
      case 'review':
        review += 1;
        break;
      case 'mastered':
        mastered += 1;
        break;
    }
    if (e.wrongCount > 0 && !e.mastered) forgotten += 1;
    if (e.favorite) favorites += 1;
    correctSum += e.correctCount;
    wrongSum += e.wrongCount;
    if (e.memoryLevel === 'review' || e.memoryLevel === 'mastered') {
      matureCorrect += e.correctCount;
      matureTotal += e.correctCount + e.wrongCount;
    }
  }

  const reviewsTotal = correctSum + wrongSum;
  const today = sessions.find((s) => s.date === dayKey(now));

  return {
    total: vocab.length,
    fresh,
    learning,
    review,
    mastered,
    forgotten,
    favorites,
    reviewsTotal,
    accuracy: pct(correctSum, reviewsTotal),
    retention: pct(matureCorrect, matureTotal),
    streak: computeStreak(sessions, now),
    todayReviewed: today?.reviewed ?? 0,
    todayCorrect: today?.correct ?? 0,
    todayAccuracy: today ? pct(today.correct, today.reviewed) : 0,
    history: lastNDays(sessions, 14, now),
  };
}
