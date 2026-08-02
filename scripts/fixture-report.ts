/* Runs the extractor over the real ChatGPT fixtures and prints a report. */
import { readFileSync } from 'node:fs';
import { dedupeCandidates, extractFromText } from '@/parsing/pipeline';

const files = [
  ['spreche', 'test-fixtures/chatgpt-spreche.txt'],
  ['vocab-table', 'test-fixtures/chatgpt-vocab-table.txt'],
] as const;

for (const [label, path] of files) {
  const text = readFileSync(path, 'utf8');
  const t0 = Date.now();
  const raw = extractFromText(text, label);
  const deduped = dedupeCandidates(raw);
  const ms = Date.now() - t0;

  const withArticle = deduped.filter((c) => c.article).length;
  const withArabic = deduped.filter((c) => c.arabic).length;
  const withPlural = deduped.filter((c) => c.plural).length;
  const highConf = deduped.filter((c) => c.confidence >= 0.6).length;

  console.log(`\n===== ${label} (${(text.length / 1024).toFixed(0)} KB) =====`);
  console.log(
    `raw=${raw.length} unique=${deduped.length} article=${withArticle} arabic=${withArabic} plural=${withPlural} conf>=0.6=${highConf} in ${ms}ms`,
  );
  console.log('--- first 25 unique ---');
  for (const c of deduped.slice(0, 25)) {
    console.log(
      `  ${c.article ? c.article + ' ' : ''}${c.german}` +
        `${c.plural ? ' [pl. ' + c.plural + ']' : ''} | ar="${c.arabic.slice(0, 28)}" en="${c.english.slice(0, 24)}" ${c.confidence.toFixed(2)}`,
    );
  }
  const junk = deduped.filter((c) =>
    /^(##|\d{2}:\d{2}|\d{2}\/\d{2}\/\d{4}|Vocabulary|User|Created|Updated|Exported|Link|Deutsch|Artikel|Bedeutung)/i.test(
      c.german,
    ),
  );
  console.log(`--- junk-looking entries: ${junk.length} ---`);
  for (const c of junk.slice(0, 12)) console.log(`  ✗ "${c.german.slice(0, 60)}"`);
}
