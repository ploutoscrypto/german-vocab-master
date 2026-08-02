/* Quiz engine checks: answer grading, directions, distractor generation. */
import { checkAnswer, normalizeAnswer } from '@/features/quiz/answer';
import {
  buildOptions,
  buildQuizItem,
  facesFor,
  resolveDirection,
  supportsDirection,
} from '@/features/quiz/session';
import type { VocabularyEntry } from '@/lib/types';

let failures = 0;
function assert(label: string, cond: boolean) {
  console.log(`${cond ? '✓' : '✗'} ${label}`);
  if (!cond) failures += 1;
}

console.log('--- answer grading ---');
assert('exact match', checkAnswer('Haus', 'Haus') === 'correct');
assert('case insensitive', checkAnswer('haus', 'Haus') === 'correct');
assert('article ignored', checkAnswer('das Haus', 'Haus') === 'correct');
assert('umlaut typed as ae', checkAnswer('Kaese', 'Käse') === 'correct');
assert('ss for ß', checkAnswer('Strasse', 'Straße') === 'correct');
assert('trailing punctuation ignored', checkAnswer('Haus.', 'Haus') === 'correct');
assert('one synonym of a slash list', checkAnswer('حقيبة صغيرة', 'كيس / حقيبة صغيرة') === 'correct');
assert('english synonym from comma list', checkAnswer('sufficient', 'enough, sufficient') === 'correct');
assert('parenthetical ignored', checkAnswer('علبة', 'علبة (معدنية / conserve)') === 'correct');
assert('to- prefix ignored', checkAnswer('order', 'to order') === 'correct');
assert('arabic diacritics folded', checkAnswer('كَافٍ', 'كاف') === 'correct');
assert('single typo = almost', checkAnswer('Rindfleish', 'Rindfleisch') === 'almost');
assert('short word typo = wrong', checkAnswer('Hund', 'Haus') === 'wrong');
assert('genuinely wrong', checkAnswer('Auto', 'Rindfleisch') === 'wrong');
assert('empty is wrong', checkAnswer('   ', 'Haus') === 'wrong');
assert('normalize strips articles+punct', normalizeAnswer('  Der Hund! ') === 'hund');

console.log('\n--- directions ---');
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

const full = mk({});
assert('de-ar faces', facesFor('de-ar').prompt === 'german' && facesFor('de-ar').answer === 'arabic');
assert('ar-de faces', facesFor('ar-de').prompt === 'arabic' && facesFor('ar-de').answer === 'german');
assert('en-de faces', facesFor('en-de').prompt === 'english' && facesFor('en-de').answer === 'german');
assert('full entry supports all directions', supportsDirection(full, 'de-ar') && supportsDirection(full, 'en-de'));

const noArabic = mk({ arabic: '' });
assert('missing Arabic ⇒ de-ar unsupported', !supportsDirection(noArabic, 'de-ar'));
assert('falls back to a usable direction', resolveDirection(noArabic, 'de-ar') === 'de-en');
const onlyGerman = mk({ arabic: '', english: '' });
assert('no translation ⇒ no direction', resolveDirection(onlyGerman, 'de-ar') === null);

console.log('\n--- multiple choice ---');
const pool: VocabularyEntry[] = [
  full,
  mk({ german: 'Wohnung', arabic: 'شقة', english: 'apartment', category: 'housing' }),
  mk({ german: 'Miete', arabic: 'إيجار', english: 'rent', category: 'housing' }),
  mk({ german: 'Zimmer', arabic: 'غرفة', english: 'room', category: 'housing' }),
  mk({ german: 'Auto', arabic: 'سيارة', english: 'car', category: 'transportation' }),
];
const { options, correctIndex } = buildOptions(full, pool, 'arabic');
assert('four options generated', options.length === 4);
assert('correct answer present', options[correctIndex] === 'بيت');
assert('options unique', new Set(options).size === options.length);
assert('no self-duplicate of prompt answer', options.filter((o) => o === 'بيت').length === 1);

const thin = buildOptions(full, [full], 'arabic');
assert('degrades gracefully with no distractors', thin.options.length === 1);
const thinItem = buildQuizItem(full, [full], 'multiple-choice', 'de-ar');
assert('MC without distractors falls back to recall', thinItem.mode === 'review');

console.log('\n--- item building ---');
const mc = buildQuizItem(full, pool, 'multiple-choice', 'ar-de');
assert('MC item prompt is Arabic', mc.promptFace === 'arabic' && mc.promptText === 'بيت');
assert('MC item answer is German', mc.answerFace === 'german');
assert('MC options non-empty', mc.options.length >= 2);
const typing = buildQuizItem(full, pool, 'typing', 'de-ar');
assert('typing shows article with German prompt', typing.promptText === 'das Haus');
const mixed = buildQuizItem(full, pool, 'mixed', 'de-ar');
assert('mixed resolves to a concrete mode', mixed.mode !== ('mixed' as never));

// Regression: untestable words must not become empty typing/MC cards.
const noTranslation = mk({ arabic: '', english: '' });
assert(
  'word with no translation falls back to recall',
  buildQuizItem(noTranslation, pool, 'typing', 'de-ar').mode === 'review',
);
assert(
  'untestable word also falls back from multiple choice',
  buildQuizItem(noTranslation, pool, 'multiple-choice', 'de-ar').mode === 'review',
);

console.log(`\n${failures === 0 ? 'ALL PASSED ✅' : failures + ' FAILED ❌'}`);
process.exit(failures === 0 ? 0 : 1);
