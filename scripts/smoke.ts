/* Core-logic smoke test: extraction pipeline + SM-2 engine. No DOM / IndexedDB. */
import { buildPreview, extractFromText } from '@/parsing/pipeline';
import { defaultSrsConfig, schedule } from '@/srs/sm2';
import type { VocabularyEntry } from '@/lib/types';

const SAMPLE = `Sure! Here are some useful words from our restaurant conversation:

der Kellner, - — waiter — النادل
die Rechnung, -en = bill = الفاتورة
bestellen (bestellte, bestellt) - to order - يطلب
Ich möchte bitte bestellen.
das Trinkgeld — tip — البقشيش

2024-05-01
# Vocabulary
Guten Appetit! — Enjoy your meal — بالهناء والشفاء

German,English,Arabic
Wasser,water,ماء
`;

let failures = 0;
function assert(label: string, cond: boolean) {
  console.log(`${cond ? '✓' : '✗'} ${label}`);
  if (!cond) failures += 1;
}

const cands = extractFromText(SAMPLE, 'restaurant');
console.log(`\nExtracted ${cands.length} candidates:`);
for (const c of cands) {
  console.log(
    `  • ${c.article ? c.article + ' ' : ''}${c.german}` +
      `${c.plural ? ' (pl. ' + c.plural + ')' : ''}` +
      `${c.verbForms ? ' [verb]' : ''}` +
      ` | ar="${c.arabic}" en="${c.english}" cat=${c.category} conf=${c.confidence.toFixed(2)}` +
      `${c.examples.length ? ' ex=' + c.examples.length : ''}`,
  );
}

const byWord = new Map(cands.map((c) => [c.german.toLowerCase(), c]));
assert('found Kellner as der + plural', byWord.get('kellner')?.article === 'der');
assert('found Rechnung as die', byWord.get('rechnung')?.article === 'die');
assert('bestellen detected as verb', byWord.get('bestellen')?.pos === 'verb');
assert(
  'bestellen has verb forms',
  !!byWord.get('bestellen')?.verbForms,
);
assert(
  'example sentence attached to bestellen',
  (byWord.get('bestellen')?.examples.length ?? 0) >= 1,
);
assert('Trinkgeld is das', byWord.get('trinkgeld')?.article === 'das');
assert('Arabic captured for Kellner', /النادل/.test(byWord.get('kellner')?.arabic ?? ''));
assert('CSV row Wasser parsed', byWord.has('wasser'));
assert('noise line "Sure!" skipped', !byWord.has('sure! here are some useful words from our restaurant conversation'));
assert('date line skipped', ![...byWord.keys()].some((k) => k.includes('2024')));

// Preview bucketing against an existing entry (Kellner already known).
const existing: VocabularyEntry[] = [
  {
    id: 'x1',
    german: 'Kellner',
    normalized: 'kellner',
    article: 'der',
    plural: null,
    pos: 'noun',
    verbForms: null,
    arabic: '',
    english: 'waiter',
    examples: [],
    category: 'restaurant',
    difficulty: 'medium',
    notes: '',
    source: 'old',
    importedDate: 1,
    reviewCount: 0,
    correctCount: 0,
    wrongCount: 0,
    memoryLevel: 'new',
    easeFactor: 2.5,
    interval: 0,
    reps: 0,
    lapses: 0,
    learningStep: 0,
    dueDate: 1,
    lastReviewDate: null,
    mastered: false,
    favorite: false,
  },
];
const preview = buildPreview(SAMPLE, existing, 'restaurant');
console.log(
  `\nPreview: ${preview.fresh.length} new, ${preview.merges.length} merged, ${preview.needsReview.length} needs-review`,
);
assert('Kellner routed to merges (dedup works)', preview.merges.length === 1);
assert('at least 3 fresh words', preview.fresh.length >= 3);

// SM-2 progression sanity.
console.log('\nSM-2 progression (good, good, good):');
let s = { easeFactor: 2.5, interval: 0, reps: 0, lapses: 0, learningStep: 0 };
const now = Date.now();
for (let i = 0; i < 3; i++) {
  const r = schedule(s, 'good', defaultSrsConfig, now);
  s = {
    easeFactor: r.easeFactor,
    interval: r.interval,
    reps: r.reps,
    lapses: r.lapses,
    learningStep: r.learningStep,
  };
  console.log(
    `  step ${i + 1}: level=${r.memoryLevel} interval=${r.interval}d ease=${r.easeFactor.toFixed(2)} learningStep=${r.learningStep}`,
  );
}
assert('graduates to review after learning steps', s.learningStep === -1 && s.interval >= 1);

const lapse = schedule(
  { easeFactor: 2.5, interval: 20, reps: 4, lapses: 0, learningStep: -1 },
  'again',
  defaultSrsConfig,
  now,
);
assert('lapse resets to relearning + records lapse', lapse.lapses === 1 && lapse.learningStep === 0);
assert('lapse lowers ease', lapse.easeFactor < 2.5);

// ---------------------------------------------------------------------------
// Real ChatGPT export fixtures (column-flattened tables + conversation noise).
// ---------------------------------------------------------------------------
import { dedupeCandidates } from '@/parsing/pipeline';
import { detectSourceName } from '@/parsing/chatgpt';
import { conversationFixture, tableFixture } from './fixtures';

const fixture = tableFixture();
const tableText = fixture.text;
console.log(`\n(using ${fixture.isReal ? 'real' : 'sample'} fixture: ${fixture.path})`);
const t0 = Date.now();
const tableCands = dedupeCandidates(extractFromText(tableText, 'vocab-table'));
const tableMs = Date.now() - t0;
const find = (w: string) =>
  tableCands.find((c) => c.german.toLowerCase() === w.toLowerCase());

console.log(
  `\nReal export: ${tableCands.length} unique words from ${(tableText.length / 1024).toFixed(0)}KB in ${tableMs}ms`,
);
assert('flattened table: Süßigkeiten = die + Arabic', find('Süßigkeiten')?.article === 'die' && !!find('Süßigkeiten')?.arabic);
assert('flattened table: Rindfleisch = das', find('Rindfleisch')?.article === 'das');
assert('flattened table: Badeanzug = der + Arabic', find('Badeanzug')?.article === 'der' && !!find('Badeanzug')?.arabic);
assert('article cell "der (Plural: die Koffer)" parsed', find('Koffer')?.article === 'der' && !!find('Koffer')?.plural);
assert('extracts a full vocabulary set', tableCands.length > (fixture.isReal ? 2000 : 20));
assert('most words carry a meaning',
  tableCands.filter((c) => c.arabic || c.english).length > (fixture.isReal ? 1200 : 15));
assert('parses quickly', tableMs < 2000);
assert('no parenthetical gloss mistaken for plural', !find('genug')?.plural);

const leaked = tableCands.filter((c) =>
  /^(##|\d{1,2}:\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|User:|Created:|Updated:|Exported:|Link:|Vocabulary\b|Deutsch$|Bedeutung \(|Typ$|Pronomen$|Konjugation$)/i.test(
    c.german,
  ),
);
assert(`no export scaffolding leaked (found ${leaked.length})`, leaked.length === 0);
if (leaked.length) leaked.slice(0, 5).forEach((c) => console.log(`    ✗ "${c.german}"`));

const pronouns = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];
const leakedPronouns = pronouns.filter((p) => find(p));
assert(
  `conjugation drills skipped (leaked: ${leakedPronouns.join(', ') || 'none'})`,
  leakedPronouns.length === 0,
);
assert('source name detected from export title',
  (detectSourceName(tableText) ?? '').startsWith('Vocabulary'));

const conversation = conversationFixture();
const conversationText = conversation?.text ?? tableText;
const spCands = dedupeCandidates(extractFromText(conversationText, 'conversation'));
const spFind = (w: string) => spCands.find((c) => c.german.toLowerCase() === w.toLowerCase());
console.log(`Conversation text: ${spCands.length} unique words`);
assert('conversation: "wichtig" captured with Arabic', !!spFind('wichtig')?.arabic);
assert('conversation: phrase "das ist teuer" captured', !!spFind('das ist teuer')?.arabic);
assert(
  'conversation: export header not captured',
  !spCands.some((c) =>
    /^(User:|Created:|Exported:|Updated:|Link:)/i.test(c.german) ||
    /^Spreche de/i.test(c.german),
  ),
);

console.log(`\n${failures === 0 ? 'ALL PASSED ✅' : failures + ' FAILED ❌'}`);
process.exit(failures === 0 ? 0 : 1);
