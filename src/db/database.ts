import Dexie, { type Table } from 'dexie';
import type {
  ImportRecord,
  ReviewLog,
  Settings,
  StudySession,
  VocabularyEntry,
} from '@/lib/types';

/**
 * IndexedDB schema (via Dexie). Only valid IndexedDB key paths are indexed —
 * booleans (favorite / mastered) are filtered in memory instead. `normalized`
 * powers both dedup and prefix search; `dueDate` + `memoryLevel` power the
 * study queue; `wrongCount` powers the "wrong words" pool.
 */
export class VocabDB extends Dexie {
  vocabulary!: Table<VocabularyEntry, string>;
  reviewLogs!: Table<ReviewLog, string>;
  sessions!: Table<StudySession, string>;
  settings!: Table<Settings, string>;
  imports!: Table<ImportRecord, string>;

  constructor() {
    super('german-vocabulary-master');
    this.version(1).stores({
      vocabulary:
        'id, normalized, category, dueDate, memoryLevel, importedDate, wrongCount, lastReviewDate',
      reviewLogs: 'id, vocabId, ts',
      sessions: 'id, date',
      settings: 'id',
      imports: 'id, date',
    });
  }
}

export const db = new VocabDB();
