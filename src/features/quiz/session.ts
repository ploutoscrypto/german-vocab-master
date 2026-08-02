/**
 * Turns vocabulary entries into concrete quiz items: which side is the prompt,
 * which side must be answered, and (for multiple choice) a set of plausible
 * distractors.
 */
import type {
  QuizDirection,
  StudyMode,
  VocabularyEntry,
} from '@/lib/types';
import { pickOne, sample, shuffle } from '@/lib/utils';

export type QuizFace = 'german' | 'arabic' | 'english';

export const DIRECTIONS: QuizDirection[] = ['de-ar', 'ar-de', 'de-en', 'en-de'];

export function facesFor(direction: QuizDirection): {
  prompt: QuizFace;
  answer: QuizFace;
} {
  switch (direction) {
    case 'ar-de':
      return { prompt: 'arabic', answer: 'german' };
    case 'de-en':
      return { prompt: 'german', answer: 'english' };
    case 'en-de':
      return { prompt: 'english', answer: 'german' };
    case 'de-ar':
    default:
      return { prompt: 'german', answer: 'arabic' };
  }
}

export function faceText(entry: VocabularyEntry, face: QuizFace): string {
  switch (face) {
    case 'arabic':
      return entry.arabic;
    case 'english':
      return entry.english;
    case 'german':
    default:
      return entry.german;
  }
}

/** German is shown with its article; other faces are plain. */
export function faceDisplay(entry: VocabularyEntry, face: QuizFace): string {
  if (face === 'german' && entry.article) return `${entry.article} ${entry.german}`;
  return faceText(entry, face);
}

export function isRtlFace(face: QuizFace): boolean {
  return face === 'arabic';
}

/** An entry can only be quizzed in a direction if both sides have content. */
export function supportsDirection(
  entry: VocabularyEntry,
  direction: QuizDirection,
): boolean {
  const { prompt, answer } = facesFor(direction);
  return !!faceText(entry, prompt).trim() && !!faceText(entry, answer).trim();
}

/**
 * Pick a direction this entry can actually be quizzed in, preferring the
 * requested one and falling back to whatever data exists.
 */
export function resolveDirection(
  entry: VocabularyEntry,
  preferred: QuizDirection,
): QuizDirection | null {
  if (supportsDirection(entry, preferred)) return preferred;
  const reversed: Record<QuizDirection, QuizDirection> = {
    'de-ar': 'ar-de',
    'ar-de': 'de-ar',
    'de-en': 'en-de',
    'en-de': 'de-en',
  };
  if (supportsDirection(entry, reversed[preferred])) return reversed[preferred];
  for (const d of DIRECTIONS) if (supportsDirection(entry, d)) return d;
  return null;
}

export interface QuizItem {
  entry: VocabularyEntry;
  mode: Exclude<StudyMode, 'mixed'>;
  direction: QuizDirection;
  promptFace: QuizFace;
  answerFace: QuizFace;
  promptText: string;
  answerText: string;
  /** Multiple-choice options (already shuffled); empty for other modes. */
  options: string[];
  correctIndex: number;
}

const CONCRETE_MODES: Array<Exclude<StudyMode, 'mixed'>> = [
  'review',
  'flashcard',
  'typing',
  'multiple-choice',
];

function resolveMode(mode: StudyMode): Exclude<StudyMode, 'mixed'> {
  if (mode !== 'mixed') return mode;
  // Mixed favours active recall over passive flipping.
  return pickOne(['typing', 'multiple-choice', 'review', 'typing'] as const);
}

/**
 * Build distractors for multiple choice. Same-category words make the question
 * meaningfully hard; we top up from the wider pool when a category is thin.
 */
export function buildOptions(
  entry: VocabularyEntry,
  pool: VocabularyEntry[],
  answerFace: QuizFace,
  count = 4,
): { options: string[]; correctIndex: number } {
  const correct = faceText(entry, answerFace).trim();
  const seen = new Set([correct.toLowerCase()]);

  const usable = pool.filter((e) => {
    if (e.id === entry.id) return false;
    const text = faceText(e, answerFace).trim();
    if (!text) return false;
    const key = text.toLowerCase();
    if (seen.has(key)) return false;
    return true;
  });

  const sameCategory = usable.filter((e) => e.category === entry.category);
  const others = usable.filter((e) => e.category !== entry.category);

  const chosen: string[] = [];
  for (const candidate of [...sample(sameCategory, count), ...shuffle(others)]) {
    if (chosen.length >= count - 1) break;
    const text = faceText(candidate, answerFace).trim();
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    chosen.push(text);
  }

  const options = shuffle([correct, ...chosen]);
  return { options, correctIndex: options.indexOf(correct) };
}

export function buildQuizItem(
  entry: VocabularyEntry,
  pool: VocabularyEntry[],
  mode: StudyMode,
  preferredDirection: QuizDirection,
): QuizItem {
  let concrete = resolveMode(mode);
  const resolved = resolveDirection(entry, preferredDirection);
  const direction = resolved ?? 'de-ar';
  const { prompt, answer } = facesFor(direction);

  // A word imported without any translation cannot be typed or chosen between;
  // show it as a recall card instead of an unanswerable prompt.
  if (resolved === null) concrete = 'review';

  const needsOptions = concrete === 'multiple-choice';
  const { options, correctIndex } = needsOptions
    ? buildOptions(entry, pool, answer)
    : { options: [] as string[], correctIndex: -1 };

  // Multiple choice needs at least one distractor to be a real question.
  const finalMode =
    needsOptions && options.length < 2 ? 'review' : concrete;

  return {
    entry,
    mode: finalMode,
    direction,
    promptFace: prompt,
    answerFace: answer,
    promptText: faceDisplay(entry, prompt),
    answerText: faceText(entry, answer),
    options: finalMode === 'multiple-choice' ? options : [],
    correctIndex: finalMode === 'multiple-choice' ? correctIndex : -1,
  };
}

export { CONCRETE_MODES };
