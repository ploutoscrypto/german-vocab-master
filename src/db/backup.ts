/**
 * Data safety: full database export/import as JSON, plus a best-effort
 * automatic snapshot into localStorage that acts as a safety net for smaller
 * libraries. "Never lose vocabulary."
 */
import { db } from './database';
import type { DatabaseBackup, VocabularyEntry } from '@/lib/types';
import { dayKey } from '@/lib/utils';

const BACKUP_VERSION = 1;
const LS_KEY = 'gvm:autobackup';
const LS_MAX_BYTES = 4_000_000;
const AUTO_BACKUP_LIMIT = 5000;

export async function exportBackup(): Promise<DatabaseBackup> {
  const [vocabulary, reviewLogs, sessions, imports, settings] =
    await Promise.all([
      db.vocabulary.toArray(),
      db.reviewLogs.toArray(),
      db.sessions.toArray(),
      db.imports.toArray(),
      db.settings.get('app'),
    ]);
  return {
    app: 'german-vocabulary-master',
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    vocabulary,
    reviewLogs,
    sessions,
    settings: settings ?? null,
    imports,
  };
}

export function backupToBlob(backup: DatabaseBackup): Blob {
  return new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  });
}

export async function downloadBackup(): Promise<void> {
  const backup = await exportBackup();
  const url = URL.createObjectURL(backupToBlob(backup));
  const a = document.createElement('a');
  a.href = url;
  a.download = `german-vocab-backup-${dayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function parseBackup(text: string): DatabaseBackup {
  const data = JSON.parse(text) as DatabaseBackup;
  if (data?.app !== 'german-vocabulary-master' || !Array.isArray(data.vocabulary)) {
    throw new Error('Not a valid German Vocabulary Master backup file.');
  }
  return data;
}

export interface ImportResult {
  added: number;
  skipped: number;
  mode: 'merge' | 'replace';
}

export async function importBackup(
  backup: DatabaseBackup,
  mode: 'merge' | 'replace',
): Promise<ImportResult> {
  let added = 0;
  let skipped = 0;

  await db.transaction(
    'rw',
    db.vocabulary,
    db.reviewLogs,
    db.sessions,
    db.imports,
    db.settings,
    async () => {
      if (mode === 'replace') {
        await Promise.all([
          db.vocabulary.clear(),
          db.reviewLogs.clear(),
          db.sessions.clear(),
          db.imports.clear(),
        ]);
        await db.vocabulary.bulkPut(backup.vocabulary);
        await db.reviewLogs.bulkPut(backup.reviewLogs ?? []);
        await db.sessions.bulkPut(backup.sessions ?? []);
        await db.imports.bulkPut(backup.imports ?? []);
        added = backup.vocabulary.length;
      } else {
        const existing = new Set(
          (await db.vocabulary.toArray()).map((e) => e.normalized),
        );
        const toAdd: VocabularyEntry[] = [];
        for (const entry of backup.vocabulary) {
          if (existing.has(entry.normalized)) {
            skipped += 1;
          } else {
            existing.add(entry.normalized);
            toAdd.push(entry);
          }
        }
        if (toAdd.length) await db.vocabulary.bulkPut(toAdd);
        added = toAdd.length;
      }
      if (backup.settings) await db.settings.put(backup.settings);
    },
  );

  return { added, skipped, mode };
}

export interface AutoBackupInfo {
  exportedAt: number;
  count: number;
}

/** Silently persist a snapshot to localStorage when the library is small. */
export async function autoBackup(): Promise<void> {
  try {
    const count = await db.vocabulary.count();
    if (count === 0 || count > AUTO_BACKUP_LIMIT) return;
    const backup = await exportBackup();
    const json = JSON.stringify(backup);
    if (json.length <= LS_MAX_BYTES) localStorage.setItem(LS_KEY, json);
  } catch {
    /* storage may be full or unavailable — non-fatal */
  }
}

export function getAutoBackupInfo(): AutoBackupInfo | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as DatabaseBackup;
    return { exportedAt: data.exportedAt, count: data.vocabulary.length };
  } catch {
    return null;
  }
}

export async function restoreAutoBackup(): Promise<ImportResult | null> {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return null;
  return importBackup(parseBackup(raw), 'replace');
}
