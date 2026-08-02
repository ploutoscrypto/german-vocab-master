/**
 * End-to-end tests against a REAL IndexedDB (fake-indexeddb in-memory).
 *
 * Unlike the other suites — which test pure functions — this one exercises the
 * genuine persistence path a user hits every day: importing a real ChatGPT
 * export, merging a second import, running a review that advances SM-2 state,
 * searching, favouriting, computing statistics and restoring a backup.
 *
 * If this suite passes, the app's data layer works.
 */
import 'fake-indexeddb/auto';

import { db } from '@/db/database';
import {
  commitImport,
  getStudyCounts,
  getSettings,
  recordReview,
  saveSettings,
  searchVocabulary,
  toggleFavorite,
  updateEntry,
} from '@/db/repositories';
import { buildPreview } from '@/parsing/pipeline';
import { buildQueue, studyCounts } from '@/srs/scheduler';
import { computeStatistics } from '@/lib/stats';
import { exportBackup, importBackup, parseBackup } from '@/db/backup';
import { checkAnswer } from '@/features/quiz/answer';
import { buildQuizItem } from '@/features/quiz/session';
import { DAY_MS } from '@/lib/utils';
import { tableFixture } from './fixtures';

let failures = 0;
function assert(label: string, cond: boolean, detail = '') {
  console.log(`${cond ? '✓' : '✗'} ${label}${!cond && detail ? ` — ${detail}` : ''}`);
  if (!cond) failures += 1;
}

async function reset() {
  await Promise.all([
    db.vocabulary.clear(),
    db.reviewLogs.clear(),
    db.sessions.clear(),
    db.imports.clear(),
    db.settings.clear(),
  ]);
}

async function main() {
  await db.open();
  await reset();

  // ---------------------------------------------------------------- import --
  console.log('--- 1. import a real ChatGPT export ---');
  const fixture = tableFixture();
  const realExport = fixture.text;
  const minWords = fixture.isReal ? 500 : 15;
  console.log(`   using ${fixture.isReal ? 'real' : 'sample'} fixture: ${fixture.path}`);
  const preview = buildPreview(realExport, [], 'Vocabulary Sample Tabelle');
  assert('preview finds new words', preview.fresh.length > minWords,
    `got ${preview.fresh.length}`);

  const record = await commitImport({
    fresh: preview.fresh,
    merges: preview.merges,
    needsReview: preview.needsReview,
    filename: 'Vocabulary Sample Tabelle',
  });
  const stored = await db.vocabulary.count();
  console.log(`   stored ${stored} words (added ${record.added})`);
  assert('words persisted to IndexedDB', stored > minWords);
  assert('import audit row written', (await db.imports.count()) === 1);

  const suessig = await db.vocabulary.where('normalized').equals('süßigkeiten').first();
  assert('Süßigkeiten stored with article + Arabic',
    suessig?.article === 'die' && !!suessig?.arabic, JSON.stringify(suessig?.article));

  // ------------------------------------------------------------- duplicates --
  console.log('\n--- 2. re-import the same file: merge, never duplicate ---');
  const existing = await db.vocabulary.toArray();
  const preview2 = buildPreview(realExport, existing, 'second import');
  assert('everything routes to merges', preview2.fresh.length === 0,
    `fresh=${preview2.fresh.length}`);
  await commitImport({
    fresh: preview2.fresh,
    merges: preview2.merges,
    needsReview: [],
    filename: 'second import',
  });
  const afterSecond = await db.vocabulary.count();
  assert('word count unchanged after re-import', afterSecond === stored,
    `${stored} -> ${afterSecond}`);

  console.log('\n--- 3. merging enriches a sparse entry ---');
  await reset();
  const seed = buildPreview('Koffer — suitcase', [], 'seed');
  await commitImport({ fresh: seed.fresh, merges: [], needsReview: seed.needsReview, filename: 'seed' });
  const before = await db.vocabulary.where('normalized').equals('koffer').first();
  assert('seed word has no Arabic yet', !before?.arabic);
  const enrich = buildPreview(
    'Deutsch\nArtikel\nBedeutung (AR)\nKoffer\nder (Plural: die Koffer)\nحقيبة سفر',
    await db.vocabulary.toArray(),
    'enrich',
  );
  await commitImport({ fresh: enrich.fresh, merges: enrich.merges, needsReview: [], filename: 'enrich' });
  const after = await db.vocabulary.where('normalized').equals('koffer').first();
  assert('merge filled in the article', after?.article === 'der');
  assert('merge filled in Arabic', !!after?.arabic);
  assert('still exactly one Koffer', (await db.vocabulary.where('normalized').equals('koffer').count()) === 1);

  // ------------------------------------------------------ review + SM-2 flow --
  console.log('\n--- 4. review session advances spaced repetition ---');
  await reset();
  const lesson = buildPreview(
    [
      'Deutsch', 'Artikel', 'Bedeutung (AR)',
      'Haus', 'das', 'بيت',
      'Wohnung', 'die', 'شقة',
      'Tisch', 'der', 'طاولة',
      'Auto', 'das', 'سيارة',
    ].join('\n'),
    [],
    'lesson',
  );
  await commitImport({ fresh: lesson.fresh, merges: [], needsReview: [], filename: 'lesson' });
  assert('4 words imported', (await db.vocabulary.count()) === 4);

  let counts = await getStudyCounts();
  assert('all start as new', counts.fresh === 4 && counts.due === 0);

  const queue = buildQueue(await db.vocabulary.toArray(), { source: 'new', newLimit: 20 });
  assert('new queue returns all 4', queue.length === 4);

  // Pick a specific card by name: IndexedDB returns rows in primary-key (UUID)
  // order, so "the first card in the queue" is not deterministic across runs.
  const hausId = (await db.vocabulary.where('normalized').equals('haus').first())!.id;
  assert('queue contains the card under test', queue.some((e) => e.id === hausId));

  // Answer it "good" twice -> should graduate out of learning.
  let card = (await db.vocabulary.get(hausId))!;
  await recordReview(card, 'good', 'review', 1200);
  card = (await db.vocabulary.get(card.id))!;
  assert('after 1st good: in learning', card.memoryLevel === 'learning', card.memoryLevel);
  await recordReview(card, 'good', 'review', 1100);
  card = (await db.vocabulary.get(card.id))!;
  assert('after 2nd good: graduated to review', card.memoryLevel === 'review', card.memoryLevel);
  assert('interval is at least a day', card.interval >= 1);
  assert('due date moved into the future', card.dueDate > Date.now() + DAY_MS / 2);
  assert('review counters updated', card.reviewCount === 2 && card.correctCount === 2);
  assert('review log written', (await db.reviewLogs.count()) === 2);
  assert('daily session row written', (await db.sessions.count()) === 1);

  // Forgetting a graduated card must reset it and raise its priority.
  await recordReview(card, 'again', 'review', 900);
  card = (await db.vocabulary.get(card.id))!;
  assert('forgot: back to learning', card.memoryLevel === 'learning');
  assert('forgot: lapse recorded', card.lapses === 1);
  assert('forgot: wrong count incremented', card.wrongCount === 1);
  assert('forgot: due again within minutes', card.dueDate < Date.now() + 20 * 60_000);

  counts = await getStudyCounts();
  assert('wrong-words pool now has it', counts.wrong === 1);

  // ------------------------------------------------------------------ quiz --
  console.log('\n--- 5. quizzes in both directions ---');
  const pool = await db.vocabulary.toArray();
  const haus = pool.find((e) => e.normalized === 'haus')!;

  const deAr = buildQuizItem(haus, pool, 'typing', 'de-ar');
  assert('DE→AR prompts in German', deAr.promptText.includes('Haus'));
  assert('DE→AR expects the Arabic', deAr.answerText === 'بيت');
  assert('correct Arabic accepted', checkAnswer('بيت', deAr.answerText) === 'correct');
  assert('wrong Arabic rejected', checkAnswer('سيارة', deAr.answerText) === 'wrong');

  const arDe = buildQuizItem(haus, pool, 'typing', 'ar-de');
  assert('AR→DE prompts in Arabic', arDe.promptText === 'بيت');
  assert('AR→DE expects the German', arDe.answerText === 'Haus');
  assert('German accepted without article', checkAnswer('Haus', arDe.answerText) === 'correct');
  assert('German accepted with article', checkAnswer('das Haus', arDe.answerText) === 'correct');

  const mc = buildQuizItem(haus, pool, 'multiple-choice', 'de-ar');
  assert('multiple choice offers options', mc.options.length >= 2);
  assert('correct option is present', mc.options[mc.correctIndex] === 'بيت');

  // ------------------------------------------------- search / favorites/stats --
  console.log('\n--- 6. search, favorites, statistics ---');
  assert('search by German', (await searchVocabulary('Wohnung')).length === 1);
  assert('search by Arabic', (await searchVocabulary('شقة')).length === 1);
  assert('search by category', (await searchVocabulary('housing')).length >= 1);
  assert('empty query lists everything', (await searchVocabulary('')).length === 4);
  assert('no match returns nothing', (await searchVocabulary('zzzznotaword')).length === 0);

  await toggleFavorite(haus.id);
  assert('favorite set', (await db.vocabulary.get(haus.id))!.favorite === true);
  assert('favorites pool sees it', (await getStudyCounts()).favorites === 1);
  assert('favorites queue returns it',
    buildQueue(await db.vocabulary.toArray(), { source: 'favorites' }).length === 1);
  await toggleFavorite(haus.id);
  assert('favorite cleared', (await db.vocabulary.get(haus.id))!.favorite === false);

  const stats = computeStatistics(await db.vocabulary.toArray(), await db.sessions.toArray());
  assert('stats count all words', stats.total === 4);
  assert('stats show reviews', stats.reviewsTotal === 3);
  assert('stats compute accuracy', stats.accuracy > 0 && stats.accuracy <= 100);
  assert('stats show a 1-day streak', stats.streak === 1);
  assert('stats history covers 14 days', stats.history.length === 14);

  // ------------------------------------------------------ manual edit + i18n --
  console.log('\n--- 7. manual edit and settings ---');
  await updateEntry(haus.id, { german: 'Häuschen', category: 'family', notes: 'test' });
  const edited = await db.vocabulary.get(haus.id);
  assert('edit saved', edited?.german === 'Häuschen' && edited?.category === 'family');
  assert('search key re-normalised after rename', edited?.normalized === 'häuschen');
  assert('renamed word is findable', (await searchVocabulary('Häuschen')).length === 1);

  for (const lang of ['ar', 'de', 'fr', 'en'] as const) {
    await saveSettings({ uiLanguage: lang });
    assert(`settings persist uiLanguage=${lang}`, (await getSettings()).uiLanguage === lang);
  }

  // ------------------------------------------------------------ backup flow --
  console.log('\n--- 8. backup and restore ---');
  const backup = await exportBackup();
  assert('backup contains every word', backup.vocabulary.length === 4);
  assert('backup contains review logs', backup.reviewLogs.length === 3);
  assert('backup is round-trippable JSON',
    parseBackup(JSON.stringify(backup)).vocabulary.length === 4);

  await db.vocabulary.clear();
  assert('database emptied (simulated loss)', (await db.vocabulary.count()) === 0);

  await importBackup(backup, 'replace');
  assert('restore brings every word back', (await db.vocabulary.count()) === 4);
  const restored = await db.vocabulary.get(haus.id);
  assert('restored word keeps its SRS state', restored?.reviewCount === 3);
  assert('restored word keeps edits', restored?.german === 'Häuschen');

  const mergeResult = await importBackup(backup, 'merge');
  assert('merge-restore does not duplicate', (await db.vocabulary.count()) === 4);
  assert('merge reports everything skipped', mergeResult.skipped === 4);

  const bad = () => { try { parseBackup('{"app":"other"}'); return false; } catch { return true; } };
  assert('invalid backup file rejected', bad());

  // ------------------------------------------------------------------ scale --
  console.log('\n--- 9. bulk write performance ---');
  await reset();
  const many = buildPreview(realExport, [], 'bulk');
  const t0 = Date.now();
  await commitImport({ fresh: many.fresh, merges: [], needsReview: many.needsReview, filename: 'bulk' });
  const importMs = Date.now() - t0;
  const total = await db.vocabulary.count();
  const t1 = Date.now();
  const found = await searchVocabulary('Haus');
  const searchMs = Date.now() - t1;
  console.log(`   ${total} words: import ${importMs}ms · search ${searchMs}ms (${found.length} hits)`);
  assert('bulk import under 15s', importMs < 15000);
  assert('search under 3s on the full set', searchMs < 3000);
  assert('counts query works at scale', (await getStudyCounts()).total === total);

  console.log(`\n${failures === 0 ? 'ALL PASSED ✅' : failures + ' FAILED ❌'}`);
  await db.close();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('E2E crashed:', err);
  process.exit(1);
});
