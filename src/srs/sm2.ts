/**
 * SM-2 spaced repetition with Anki-style learning steps.
 *
 * A card starts in "learning" (short minute-based steps). Answering it well
 * enough graduates it into "review", where intervals grow by the ease factor.
 * Forgetting a graduated card is a *lapse*: it drops back into relearning and
 * jumps to the front of the queue, exactly as the spec requires
 * ("forgotten words must always receive highest priority").
 */
import type {
  MemoryLevel,
  RecallGrade,
  ReviewGrade,
  SrsConfig,
  VocabularyEntry,
} from '@/lib/types';
import { DAY_MS, MIN_MS, clamp } from '@/lib/utils';

export const defaultSrsConfig: SrsConfig = {
  learningStepsMinutes: [1, 10],
  graduatingIntervalDays: 1,
  easyIntervalDays: 4,
  startingEase: 2.5,
  minEase: 1.3,
  easyBonus: 1.3,
  hardMultiplier: 1.2,
  masteredIntervalDays: 30,
};

const MAX_EASE = 3.5;

export interface SrsState {
  easeFactor: number;
  interval: number;
  reps: number;
  lapses: number;
  learningStep: number;
  dueDate: number;
  memoryLevel: MemoryLevel;
  mastered: boolean;
}

export interface ScheduleResult extends SrsState {
  correct: boolean;
  /** True when the card should reappear later in the same session. */
  repeatInSession: boolean;
}

type SrsInput = Pick<
  VocabularyEntry,
  'easeFactor' | 'interval' | 'reps' | 'lapses' | 'learningStep'
>;

/** Fresh SRS state for a newly imported word. */
export function initialSrs(config: SrsConfig, now = Date.now()): SrsState {
  return {
    easeFactor: config.startingEase,
    interval: 0,
    reps: 0,
    lapses: 0,
    learningStep: 0,
    dueDate: now,
    memoryLevel: 'new',
    mastered: false,
  };
}

/** Map the 3-button active-recall confidence onto the 4-grade core. */
export function recallToGrade(grade: RecallGrade): ReviewGrade {
  if (grade === 'forgot') return 'again';
  if (grade === 'hard') return 'hard';
  return 'good';
}

/**
 * Compute the next SRS state for a card given a grade. Pure function — it never
 * mutates its input, so it is trivial to unit-test and preview.
 */
export function schedule(
  entry: SrsInput,
  grade: ReviewGrade,
  config: SrsConfig = defaultSrsConfig,
  now = Date.now(),
): ScheduleResult {
  let { easeFactor, interval, reps, lapses, learningStep } = entry;
  const steps =
    config.learningStepsMinutes.length > 0
      ? config.learningStepsMinutes
      : [1, 10];
  const correct = grade !== 'again';
  let dueDate = now;
  let repeatInSession = false;

  if (learningStep >= 0) {
    // ---- Card is in (re)learning ----
    switch (grade) {
      case 'again':
        learningStep = 0;
        dueDate = now + steps[0] * MIN_MS;
        repeatInSession = true;
        break;
      case 'hard': {
        const step = Math.min(learningStep, steps.length - 1);
        dueDate = now + Math.round(steps[step] * 1.5) * MIN_MS;
        repeatInSession = true;
        break;
      }
      case 'good': {
        const next = learningStep + 1;
        if (next >= steps.length) {
          learningStep = -1;
          interval = config.graduatingIntervalDays;
          reps = 1;
          dueDate = now + interval * DAY_MS;
        } else {
          learningStep = next;
          dueDate = now + steps[next] * MIN_MS;
          repeatInSession = true;
        }
        break;
      }
      case 'easy':
        learningStep = -1;
        interval = config.easyIntervalDays;
        reps = 1;
        easeFactor = clamp(easeFactor + 0.15, config.minEase, MAX_EASE);
        dueDate = now + interval * DAY_MS;
        break;
    }
  } else {
    // ---- Card is in review ----
    switch (grade) {
      case 'again':
        lapses += 1;
        reps = 0;
        easeFactor = clamp(easeFactor - 0.2, config.minEase, MAX_EASE);
        learningStep = 0;
        interval = 0;
        dueDate = now + steps[0] * MIN_MS;
        repeatInSession = true;
        break;
      case 'hard':
        easeFactor = clamp(easeFactor - 0.15, config.minEase, MAX_EASE);
        interval = Math.max(interval + 1, Math.round(interval * config.hardMultiplier));
        reps += 1;
        dueDate = now + interval * DAY_MS;
        break;
      case 'good':
        interval = Math.max(interval + 1, Math.round(interval * easeFactor));
        reps += 1;
        dueDate = now + interval * DAY_MS;
        break;
      case 'easy':
        easeFactor = clamp(easeFactor + 0.15, config.minEase, MAX_EASE);
        interval = Math.max(
          interval + 1,
          Math.round(interval * easeFactor * config.easyBonus),
        );
        reps += 1;
        dueDate = now + interval * DAY_MS;
        break;
    }
  }

  const mastered =
    learningStep < 0 &&
    interval >= config.masteredIntervalDays &&
    easeFactor >= config.startingEase;
  const memoryLevel: MemoryLevel =
    learningStep >= 0 ? 'learning' : mastered ? 'mastered' : 'review';

  return {
    easeFactor,
    interval,
    reps,
    lapses,
    learningStep,
    dueDate,
    memoryLevel,
    mastered,
    correct,
    repeatInSession,
  };
}

/** Next due timestamps for every grade — used to label the answer buttons. */
export function gradeOutcomes(
  entry: SrsInput,
  config: SrsConfig = defaultSrsConfig,
  now = Date.now(),
): Record<ReviewGrade, number> {
  const grades: ReviewGrade[] = ['again', 'hard', 'good', 'easy'];
  const out = {} as Record<ReviewGrade, number>;
  for (const g of grades) out[g] = schedule(entry, g, config, now).dueDate;
  return out;
}
