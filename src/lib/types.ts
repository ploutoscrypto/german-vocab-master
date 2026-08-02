/**
 * Core domain types for German Vocabulary Master.
 * These are the single source of truth for the data model used across
 * the database, SRS engine, import pipeline and UI.
 */

export type UUID = string;

/** Grammatical gender article; null when the word is not a noun. */
export type Article = 'der' | 'die' | 'das' | null;

export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'phrase'
  | 'other';

/** Coarse learning state derived from the SRS numbers. */
export type MemoryLevel = 'new' | 'learning' | 'review' | 'mastered';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface VerbForms {
  praesens?: string;
  praeteritum?: string;
  partizipII?: string;
  auxiliary?: 'haben' | 'sein';
}

export interface VocabularyEntry {
  id: UUID;
  /** Headword / lemma without the article, e.g. "Haus". */
  german: string;
  /** Lowercased, article-stripped key used for dedup + search. */
  normalized: string;
  article: Article;
  plural: string | null;
  pos: PartOfSpeech;
  verbForms: VerbForms | null;
  arabic: string;
  english: string;
  examples: string[];
  category: string;
  difficulty: Difficulty;
  notes: string;
  /** Where the word came from (conversation title / file name). */
  source: string;
  importedDate: number;

  // --- Spaced repetition state ---
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
  memoryLevel: MemoryLevel;
  /** SM-2 ease factor. */
  easeFactor: number;
  /** Current interval in days (0 while still in learning steps). */
  interval: number;
  /** Consecutive successful repetitions. */
  reps: number;
  /** Number of times the card was forgotten after graduating. */
  lapses: number;
  /** Index into the learning steps; -1 once graduated to review. */
  learningStep: number;
  dueDate: number;
  lastReviewDate: number | null;
  mastered: boolean;
  favorite: boolean;
}

/** Flashcard grading (Anki style). */
export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';
/** Active-recall confidence grading. */
export type RecallGrade = 'forgot' | 'hard' | 'easy';

export type QuizDirection = 'de-ar' | 'ar-de' | 'de-en' | 'en-de';

export type StudyMode =
  | 'review' // Today review (active recall)
  | 'flashcard'
  | 'typing'
  | 'multiple-choice'
  | 'mixed';

/** Which pool of words a session draws from. */
export type SessionSource =
  | 'due' // Today review
  | 'new' // Learn new words
  | 'wrong' // Wrong words only
  | 'favorites'
  | 'recent'
  | 'random'
  | 'all';

export interface ReviewLog {
  id: UUID;
  vocabId: UUID;
  ts: number;
  grade: ReviewGrade;
  mode: StudyMode;
  correct: boolean;
  ms: number;
}

export interface StudySession {
  id: UUID;
  date: string; // YYYY-MM-DD local
  startedAt: number;
  endedAt: number | null;
  reviewed: number;
  correct: number;
  wrong: number;
  ms: number;
}

export type UiLanguage = 'de' | 'ar' | 'en' | 'fr';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface SrsConfig {
  learningStepsMinutes: number[];
  graduatingIntervalDays: number;
  easyIntervalDays: number;
  startingEase: number;
  minEase: number;
  easyBonus: number;
  hardMultiplier: number;
  masteredIntervalDays: number;
}

export interface Settings {
  id: 'app';
  uiLanguage: UiLanguage;
  explanationLanguage: UiLanguage;
  theme: ThemeMode;
  dailyNewLimit: number;
  dailyReviewLimit: number;
  ttsEnabled: boolean;
  /** Last-used quiz mode, remembered between sessions. */
  quizMode: StudyMode;
  /** Last-used prompt/answer direction. */
  quizDirection: QuizDirection;
  srs: SrsConfig;
}

export interface ImportRecord {
  id: UUID;
  filename: string;
  date: number;
  added: number;
  merged: number;
  needsReview: number;
}

/** A vocabulary candidate produced by the import pipeline before commit. */
export interface ParsedCandidate {
  german: string;
  article: Article;
  plural: string | null;
  pos: PartOfSpeech;
  verbForms: VerbForms | null;
  arabic: string;
  english: string;
  examples: string[];
  category: string;
  /** 0..1 — how confident the extractor is this is real vocabulary. */
  confidence: number;
  raw: string;
}

/** Buckets shown on the import preview screen. */
export interface ImportPreview {
  fresh: ParsedCandidate[];
  merges: Array<{ candidate: ParsedCandidate; existing: VocabularyEntry }>;
  needsReview: ParsedCandidate[];
  source: string;
}

/** Full database snapshot used for backup export / import. */
export interface DatabaseBackup {
  app: 'german-vocabulary-master';
  version: number;
  exportedAt: number;
  vocabulary: VocabularyEntry[];
  reviewLogs: ReviewLog[];
  sessions: StudySession[];
  settings: Settings | null;
  imports: ImportRecord[];
}
