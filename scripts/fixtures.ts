/**
 * Test fixture resolution.
 *
 * The repository ships a synthetic ChatGPT export that exercises every shape
 * the parser must handle (column-flattened tables, article/plural cells,
 * conjugation drills, export scaffolding, inline pairs and CSV rows) without
 * containing anyone's real conversations.
 *
 * Real exports are personal data, so they are git-ignored. If you drop your own
 * export into `test-fixtures/`, the suites automatically prefer it and assert
 * against much larger, messier input.
 */
import { existsSync, readFileSync } from 'node:fs';

export interface Fixture {
  text: string;
  path: string;
  /** True when running against a real (git-ignored) export. */
  isReal: boolean;
}

const SAMPLE = 'test-fixtures/sample-chatgpt-export.txt';

/** Prefer a real local export; fall back to the committed sample. */
export function tableFixture(): Fixture {
  const candidates = [
    'test-fixtures/chatgpt-vocab-table.txt',
    'test-fixtures/chatgpt-spreche.txt',
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      return { text: readFileSync(path, 'utf8'), path, isReal: true };
    }
  }
  return { text: readFileSync(SAMPLE, 'utf8'), path: SAMPLE, isReal: false };
}

/** A conversational export (mostly prose) when one is available locally. */
export function conversationFixture(): Fixture | null {
  const path = 'test-fixtures/chatgpt-spreche.txt';
  if (!existsSync(path)) return null;
  return { text: readFileSync(path, 'utf8'), path, isReal: true };
}
