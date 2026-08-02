/* Memory helper checks: gender rules, compounds, antonyms, pitfalls, examples. */
import { genderRuleFor } from '@/memory/gender';
import { buildStemIndex, splitCompound } from '@/memory/compounds';
import { oppositesFor } from '@/memory/antonyms';
import { pitfallFor, separableVerb } from '@/memory/pitfalls';
import { buildMemoryContext, generateInsights, hasInsights } from '@/memory/mnemonic';
import type { VocabularyEntry } from '@/lib/types';

let failures = 0;
function assert(label: string, cond: boolean) {
  console.log(`${cond ? '✓' : '✗'} ${label}`);
  if (!cond) failures += 1;
}

const mk = (over: Partial<VocabularyEntry>): VocabularyEntry => ({
  id: Math.random().toString(36).slice(2),
  german: 'Haus', normalized: 'haus', article: 'das', plural: 'Häuser',
  pos: 'noun', verbForms: null, arabic: 'بيت', english: 'house', examples: [],
  category: 'housing', difficulty: 'medium', notes: '', source: 't',
  importedDate: 1, reviewCount: 0, correctCount: 0, wrongCount: 0,
  memoryLevel: 'new', easeFactor: 2.5, interval: 0, reps: 0, lapses: 0,
  learningStep: 0, dueDate: 1, lastReviewDate: null, mastered: false,
  favorite: false, ...over,
});

console.log('--- gender suffix rules ---');
assert('-ung → die', genderRuleFor('Wohnung')?.article === 'die');
assert('-heit → die', genderRuleFor('Freiheit')?.article === 'die');
assert('-keit → die', genderRuleFor('Möglichkeit')?.article === 'die');
assert('-chen → das', genderRuleFor('Mädchen')?.article === 'das');
assert('-ling → der', genderRuleFor('Schmetterling')?.article === 'der');
assert('-tion → die', genderRuleFor('Nation')?.article === 'die');
assert('longest suffix wins (-schaft not -t)', genderRuleFor('Freundschaft')?.suffix === 'schaft');
assert('no rule for plain word', genderRuleFor('Tisch') === null);
assert('too short → no rule', genderRuleFor('Ei') === null);

console.log('\n--- compound splitting ---');
const vocab = [
  mk({ german: 'Haus', english: 'house' }),
  mk({ german: 'Zimmer', english: 'room' }),
  mk({ german: 'Arbeit', english: 'work' }),
  mk({ german: 'Bad', english: 'bath' }),
  mk({ german: 'Anzug', english: 'suit' }),
];
const stems = buildStemIndex(vocab);
const kh = splitCompound('Krankenhaus', stems);
console.log('  Krankenhaus →', kh?.map((p) => p.text).join(' + '));
assert('Krankenhaus = krank + Haus', !!kh && kh.length === 2 && kh[1].text === 'Haus');
const az = splitCompound('Arbeitszimmer', stems);
console.log('  Arbeitszimmer →', az?.map((p) => p.text).join(' + '));
assert('Fugen-s handled (Arbeit+s+Zimmer)', !!az && az[0].text === 'Arbeit' && az[1].text === 'Zimmer');
const ba = splitCompound('Badeanzug', stems);
console.log('  Badeanzug →', ba?.map((p) => p.text).join(' + '));
assert('Badeanzug splits', !!ba && ba.length >= 2);
assert('short word not split', splitCompound('Haus', stems) === null);
assert('nonsense not split', splitCompound('Xyzabcdef', stems) === null);
assert('compound part carries a gloss', !!kh && kh[1].gloss === 'house');

console.log('\n--- opposites ---');
assert('gut ↔ schlecht', oppositesFor('gut').some((o) => o.word === 'schlecht'));
assert('teuer has opposites', oppositesFor('teuer').length >= 1);
assert('reverse direction works', oppositesFor('schlecht').some((o) => o.word === 'gut'));
assert('un- morphology', oppositesFor('unmöglich').some((o) => o.word === 'möglich'));
assert('unknown word → none', oppositesFor('Rindfleisch').length === 0);
assert('capped at 4', oppositesFor('alt').length <= 4);

console.log('\n--- pitfalls & separable verbs ---');
assert('bekommen false friend', !!pitfallFor('bekommen'));
assert('Gift warning exists', pitfallFor('Gift')?.en.includes('poison') === true);
assert('kennen/wissen confusion', !!pitfallFor('kennen'));
assert('pitfall has Arabic text', (pitfallFor('also')?.ar.length ?? 0) > 5);
assert('ordinary word → no pitfall', pitfallFor('Tisch') === null);
assert('abholen is separable', separableVerb('abholen', true)?.prefix === 'ab');
assert('mitkommen is separable', separableVerb('mitkommen', true)?.prefix === 'mit');
assert('verstehen is NOT separable', separableVerb('verstehen', true) === null);
assert('bekommen is NOT separable', separableVerb('bekommen', true) === null);
assert('nouns are not checked', separableVerb('Abend', false) === null);

console.log('\n--- insights orchestration ---');
const ctx = buildMemoryContext([
  ...vocab,
  mk({ german: 'Wohnung', english: 'apartment', article: 'die', category: 'housing' }),
  mk({ german: 'Miete', english: 'rent', article: 'die', category: 'housing' }),
  mk({ german: 'schon', english: 'already', article: null, pos: 'adverb' }),
  mk({ german: 'schön', english: 'beautiful', article: null, pos: 'adjective' }),
]);

const wohnung = mk({ german: 'Wohnung', english: 'apartment', article: 'die', category: 'housing' });
const wi = generateInsights(wohnung, ctx);
assert('Wohnung gets the -ung rule', wi.genderRule?.article === 'die');
assert('Wohnung has insights', hasInsights(wi));

const schon = mk({ german: 'schon', english: 'already', article: null, pos: 'adverb' });
const si = generateInsights(schon, ctx);
assert('schon flags the schön confusion', !!si.pitfall);
assert('schön appears as a look-alike', si.similar.some((s) => s.german === 'schön' && s.reason === 'lookalike'));

const holen = mk({ german: 'abholen', english: 'to pick up', article: null, pos: 'verb', plural: null });
const hi = generateInsights(holen, ctx);
assert('abholen flagged separable', hi.separable?.prefix === 'ab');
assert('verb gets a generated example', !!hi.generatedExample);

const haus = mk({ german: 'Haus', english: 'house', examples: ['Das Haus ist groß.'] });
assert('entry with a real example gets no generated one', generateInsights(haus, ctx).generatedExample === null);
const noun = mk({ german: 'Tisch', english: 'table', article: 'der', examples: [] });
const ni = generateInsights(noun, ctx);
assert('noun example uses accusative den', ni.generatedExample?.includes('den Tisch') === true);
assert('cognate detected for Haus/house', !!generateInsights(haus, ctx).cognate);

console.log('\n--- compound splitting is noun-only ---');
const verbCompound = mk({
  german: 'arbeitslos', english: 'unemployed', article: null, pos: 'adjective', plural: null,
});
assert(
  'non-noun does not get a misleading compound split',
  generateInsights(verbCompound, ctx).compound === null,
);
const nounCompound = mk({ german: 'Badezimmer', english: 'bathroom', article: 'das', plural: null });
assert(
  'noun compound still splits',
  (generateInsights(nounCompound, ctx).compound?.length ?? 0) >= 2,
);
assert(
  'multi-word entries are not split',
  generateInsights(mk({ german: 'guten Tag', english: 'good day' }), ctx).compound === null,
);

console.log('\n--- performance guard ---');
const many: VocabularyEntry[] = [];
for (let i = 0; i < 20000; i++) {
  many.push(mk({ german: `Testwort${i}`, english: `word ${i}`, category: i % 2 ? 'food' : 'work' }));
}
const t0 = Date.now();
const bigCtx = buildMemoryContext(many);
const ctxMs = Date.now() - t0;
const t1 = Date.now();
for (let i = 0; i < 50; i++) generateInsights(many[i], bigCtx);
const perCard = (Date.now() - t1) / 50;
console.log(`  20k words: context ${ctxMs}ms · per card ${perCard.toFixed(2)}ms`);
assert('context build stays under 500ms at 20k words', ctxMs < 500);
assert('per-card insight stays under 15ms at 20k words', perCard < 15);

console.log(`\n${failures === 0 ? 'ALL PASSED ✅' : failures + ' FAILED ❌'}`);
process.exit(failures === 0 ? 0 : 1);
