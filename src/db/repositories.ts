/**
 * All database writes and the more complex reads live here, so the UI never
 * talks to Dexie tables directly for mutations. Simple reactive reads in the
 * UI use `useLiveQuery` against `db` where convenient.
 */
import { db } from './database';
import type {
  ImportPreview,
  ImportRecord,
  ParsedCandidate,
  ReviewGrade,
  Settings,
  StudyMode,
  StudySession,
  VocabularyEntry,
} from '@/lib/types';
import { dayKey, normalizeGerman, normalizeSearch, uuid } from '@/lib/utils';
import { defaultSrsConfig, initialSrs, schedule } from '@/srs/sm2';
import { applyCandidateToEntry } from '@/parsing/merge';

export const defaultSettings: Settings = {
  id: 'app',
  uiLanguage: 'en',
  explanationLanguage: 'en',
  theme: 'system',
  dailyNewLimit: 20,
  dailyReviewLimit: 200,
  ttsEnabled: true,
  quizMode: 'review',
  quizDirection: 'de-ar',
  srs: defaultSrsConfig,
};

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get('app');
  if (existing) return { ...defaultSettings, ...existing, srs: { ...defaultSrsConfig, ...existing.srs } };
  await db.settings.put(defaultSettings);
  return defaultSettings;
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next: Settings = { ...current, ...patch, id: 'app' };
  await db.settings.put(next);
  return next;
}

/** Build a fresh stored entry from a parsed candidate. */
export function entryFromCandidate(
  c: ParsedCandidate,
  now: number,
  source: string,
  srs = defaultSrsConfig,
): VocabularyEntry {
  const init = initialSrs(srs, now);
  return {
    id: uuid(),
    german: c.german,
    normalized: normalizeGerman(c.german),
    article: c.article,
    plural: c.plural,
    pos: c.pos,
    verbForms: c.verbForms,
    arabic: c.arabic,
    english: c.english,
    examples: c.examples,
    category: c.category,
    difficulty: 'medium',
    notes: '',
    source,
    importedDate: now,
    reviewCount: 0,
    correctCount: 0,
    wrongCount: 0,
    memoryLevel: 'new',
    easeFactor: init.easeFactor,
    interval: 0,
    reps: 0,
    lapses: 0,
    learningStep: 0,
    dueDate: now,
    lastReviewDate: null,
    mastered: false,
    favorite: false,
  };
}

export interface CommitImportParams {
  fresh: ParsedCandidate[];
  merges: ImportPreview['merges'];
  needsReview: ParsedCandidate[];
  filename: string;
}

/** Persist an approved import preview. */
export async function commitImport(
  params: CommitImportParams,
): Promise<ImportRecord> {
  const now = Date.now();
  const settings = await getSettings();
  const toAdd = [...params.fresh, ...params.needsReview].map((c) =>
    entryFromCandidate(c, now, params.filename, settings.srs),
  );
  const record: ImportRecord = {
    id: uuid(),
    filename: params.filename,
    date: now,
    added: toAdd.length,
    merged: params.merges.length,
    needsReview: params.needsReview.length,
  };

  await db.transaction('rw', db.vocabulary, db.imports, async () => {
    if (toAdd.length) await db.vocabulary.bulkAdd(toAdd);
    for (const m of params.merges) {
      await db.vocabulary.put(applyCandidateToEntry(m.existing, m.candidate));
    }
    await db.imports.add(record);
  });
  return record;
}

async function bumpSession(
  correct: boolean,
  ms: number,
  now: number,
): Promise<void> {
  const date = dayKey(now);
  const existing = await db.sessions.where('date').equals(date).first();
  if (existing) {
    await db.sessions.update(existing.id, {
      reviewed: existing.reviewed + 1,
      correct: existing.correct + (correct ? 1 : 0),
      wrong: existing.wrong + (correct ? 0 : 1),
      ms: existing.ms + ms,
      endedAt: now,
    });
  } else {
    const session: StudySession = {
      id: uuid(),
      date,
      startedAt: now,
      endedAt: now,
      reviewed: 1,
      correct: correct ? 1 : 0,
      wrong: correct ? 0 : 1,
      ms,
    };
    await db.sessions.add(session);
  }
}

/** Grade a card: schedule it, update counters, log the review, bump the day. */
export async function recordReview(
  entry: VocabularyEntry,
  grade: ReviewGrade,
  mode: StudyMode,
  ms: number,
): Promise<void> {
  const settings = await getSettings();
  const now = Date.now();
  const res = schedule(entry, grade, settings.srs, now);

  await db.transaction('rw', db.vocabulary, db.reviewLogs, db.sessions, async () => {
    await db.vocabulary.update(entry.id, {
      easeFactor: res.easeFactor,
      interval: res.interval,
      reps: res.reps,
      lapses: res.lapses,
      learningStep: res.learningStep,
      dueDate: res.dueDate,
      memoryLevel: res.memoryLevel,
      mastered: res.mastered,
      lastReviewDate: now,
      reviewCount: entry.reviewCount + 1,
      correctCount: entry.correctCount + (res.correct ? 1 : 0),
      wrongCount: entry.wrongCount + (res.correct ? 0 : 1),
    });
    await db.reviewLogs.add({
      id: uuid(),
      vocabId: entry.id,
      ts: now,
      grade,
      mode,
      correct: res.correct,
      ms,
    });
    await bumpSession(res.correct, ms, now);
  });
}

export async function updateEntry(
  id: string,
  patch: Partial<VocabularyEntry>,
): Promise<void> {
  const next = { ...patch };
  if (typeof patch.german === 'string') {
    next.normalized = normalizeGerman(patch.german);
  }
  await db.vocabulary.update(id, next);
}

export async function toggleFavorite(id: string): Promise<void> {
  const entry = await db.vocabulary.get(id);
  if (entry) await db.vocabulary.update(id, { favorite: !entry.favorite });
}

export async function deleteEntry(id: string): Promise<void> {
  await db.vocabulary.delete(id);
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

/** Indexed counts for the Home screen — scales past naive full scans. */
export async function getStudyCounts(now = Date.now()): Promise<StudyCounts> {
  const [total, fresh, learning, mastered] = await Promise.all([
    db.vocabulary.count(),
    db.vocabulary.where('memoryLevel').equals('new').count(),
    db.vocabulary.where('memoryLevel').equals('learning').count(),
    db.vocabulary.where('memoryLevel').equals('mastered').count(),
  ]);
  const due = await db.vocabulary
    .where('dueDate')
    .belowOrEqual(now)
    .and((e) => e.memoryLevel !== 'new')
    .count();
  const wrong = await db.vocabulary
    .where('wrongCount')
    .above(0)
    .and((e) => !e.mastered)
    .count();
  const favorites = await db.vocabulary.filter((e) => e.favorite).count();
  return { total, due, fresh, wrong, favorites, learning, mastered };
}

function matchesQuery(e: VocabularyEntry, q: string): boolean {
  return (
    e.normalized.includes(q) ||
    normalizeSearch(e.german).includes(q) ||
    normalizeSearch(e.english).includes(q) ||
    e.arabic.includes(q) ||
    normalizeSearch(e.category).includes(q)
  );
}

/**
 * Instant search across German / English / Arabic / category. For MVP this
 * scans the collection (fast for thousands of words); a Phase-2 inverted index
 * will keep it instant at 100k+.
 */
export async function searchVocabulary(
  query: string,
  limit = 300,
): Promise<VocabularyEntry[]> {
  const q = normalizeSearch(query.trim());
  if (!q) {
    return db.vocabulary.orderBy('importedDate').reverse().limit(limit).toArray();
  }
  const results: VocabularyEntry[] = [];
  await db.vocabulary.each((e) => {
    if (matchesQuery(e, q)) results.push(e);
  });
  results.sort((a, b) => b.importedDate - a.importedDate);
  return results.slice(0, limit);
}
