/**
 * Offline memory helper.
 *
 * Produces every hint the app shows for a word: article tricks, gender rules,
 * compound breakdowns, cognates, similar and opposite words, common-mistake
 * warnings and a fallback example sentence.
 *
 * Everything is derived locally — no network, no API key — from the learner's
 * own vocabulary plus compact curated tables. Output is *structured data*, not
 * prose, so the UI can render it in German, Arabic, English or French.
 */
import type { Article, VocabularyEntry } from '@/lib/types';
import { editDistance } from '@/features/quiz/answer';
import { genderRuleFor, type GenderRule } from './gender';
import {
  buildStemIndex,
  splitCompound,
  type CompoundPart,
} from './compounds';
import { oppositesFor, type Opposite } from './antonyms';
import { pitfallFor, separableVerb, type Pitfall, type SeparableInfo } from './pitfalls';

export interface SimilarWord {
  id: string;
  german: string;
  meaning: string;
  /** Why it is being shown — drives the label and the warning styling. */
  reason: 'lookalike' | 'category' | 'sharedStem';
}

export interface MemoryInsights {
  article: Article;
  genderRule: GenderRule | null;
  compound: CompoundPart[] | null;
  cognate: string | null;
  similar: SimilarWord[];
  opposites: Opposite[];
  pitfall: Pitfall | null;
  separable: SeparableInfo | null;
  pluralNote: string | null;
  /** Auto-built sentence, only when the entry has no real example. */
  generatedExample: string | null;
}

/**
 * Context shared across a list of words so we build indexes only once.
 * The length and category buckets keep related-word lookup roughly constant
 * time instead of scanning the whole collection for every card — which matters
 * at the 100k-entry scale the app targets.
 */
export interface MemoryContext {
  stems: Map<string, string>;
  known: Set<string>;
  entries: VocabularyEntry[];
  byLength: Map<number, VocabularyEntry[]>;
  byCategory: Map<string, VocabularyEntry[]>;
}

/** Cap per-bucket work so pathological collections cannot stall the UI. */
const BUCKET_SCAN_LIMIT = 400;

export function buildMemoryContext(entries: VocabularyEntry[]): MemoryContext {
  const byLength = new Map<number, VocabularyEntry[]>();
  const byCategory = new Map<string, VocabularyEntry[]>();

  for (const e of entries) {
    const len = e.german.trim().length;
    if (!byLength.has(len)) byLength.set(len, []);
    const lengthBucket = byLength.get(len)!;
    if (lengthBucket.length < BUCKET_SCAN_LIMIT) lengthBucket.push(e);

    if (!byCategory.has(e.category)) byCategory.set(e.category, []);
    const categoryBucket = byCategory.get(e.category)!;
    if (categoryBucket.length < BUCKET_SCAN_LIMIT) categoryBucket.push(e);
  }

  return {
    stems: buildStemIndex(entries),
    known: new Set(entries.map((e) => e.german.trim().toLowerCase())),
    entries,
    byLength,
    byCategory,
  };
}

function cognateHint(german: string, english: string): string | null {
  // Fold umlauts first so Haus/house and Maus/mouse compare fairly.
  const g = german
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z]/g, '');
  const e = english.toLowerCase().replace(/^to\s+/, '').replace(/[^a-z]/g, '');
  if (g.length < 4 || e.length < 3) return null;
  // A single English gloss only — "same; identical" is not a cognate claim.
  if (/[;,/]/.test(english)) return null;

  const distance = editDistance(g, e);
  const longest = Math.max(g.length, e.length);
  // Short words need absolute slack; longer ones scale proportionally.
  const allowed = longest <= 5 ? 2 : Math.ceil(longest * 0.34);
  // Identical spellings are usually false friends, which the pitfall table
  // already covers — so require a real (but small) difference.
  if (distance > 0 && distance <= allowed) {
    return english.replace(/^to\s+/, '');
  }
  return null;
}

/**
 * Words worth showing alongside this one. Look-alikes come first because they
 * are the ones that cause errors; same-category words reinforce topic links.
 */
function findSimilar(
  entry: VocabularyEntry,
  ctx: MemoryContext,
  limit = 4,
): SimilarWord[] {
  const target = entry.german.toLowerCase();
  const lookalikes: SimilarWord[] = [];
  const sharedStem: SimilarWord[] = [];
  const sameCategory: SimilarWord[] = [];
  const seen = new Set<string>([entry.id]);

  const row = (other: VocabularyEntry) => ({
    id: other.id,
    german: other.german,
    meaning: (other.arabic || other.english).trim(),
  });

  // Look-alikes can only live in a nearby length bucket.
  for (let len = target.length - 2; len <= target.length + 2; len++) {
    for (const other of ctx.byLength.get(len) ?? []) {
      if (seen.has(other.id)) continue;
      const word = other.german.toLowerCase();
      if (!word || word === target || Math.min(word.length, target.length) < 4) {
        continue;
      }
      if (editDistance(word, target) <= 2) {
        seen.add(other.id);
        lookalikes.push({ ...row(other), reason: 'lookalike' });
        if (lookalikes.length >= limit) break;
      }
    }
    if (lookalikes.length >= limit) break;
  }

  // Shared stems and topic neighbours both come from the category bucket.
  if (entry.category !== 'unknown') {
    for (const other of ctx.byCategory.get(entry.category) ?? []) {
      if (seen.has(other.id)) continue;
      const word = other.german.toLowerCase();
      if (!word || word === target) continue;
      seen.add(other.id);
      if (
        target.length >= 6 &&
        word.length >= 6 &&
        (word.includes(target) || target.includes(word))
      ) {
        sharedStem.push({ ...row(other), reason: 'sharedStem' });
      } else if (sameCategory.length < limit) {
        sameCategory.push({ ...row(other), reason: 'category' });
      }
      if (sharedStem.length + sameCategory.length >= limit * 2) break;
    }
  }

  return [...lookalikes, ...sharedStem, ...sameCategory].slice(0, limit);
}

/**
 * Build a simple example sentence when the entry has none. Templates stay at
 * A1 level so they are always correct — a wrong example is worse than none.
 */
function generateExample(entry: VocabularyEntry): string | null {
  const { pos, article, german } = entry;
  if (pos === 'noun' && article) {
    const accusative = article === 'der' ? 'den' : article;
    return `Das ist ${article} ${german}. — Ich sehe ${accusative} ${german}.`;
  }
  if (pos === 'verb') {
    const stem = german.replace(/en$/, '');
    if (german.endsWith('en') && stem.length >= 2) {
      return `Ich ${stem}e gern. — Wir ${german} zusammen.`;
    }
    return null;
  }
  if (pos === 'adjective') {
    return `Das ist sehr ${german}.`;
  }
  return null;
}

function pluralNote(entry: VocabularyEntry): string | null {
  if (!entry.plural) return null;
  return `die ${entry.plural}`;
}

export function generateInsights(
  entry: VocabularyEntry,
  ctx: MemoryContext,
): MemoryInsights {
  const isVerb = entry.pos === 'verb';
  const hasRealExample = entry.examples.length > 0;

  // Compound breakdowns are only reliable for nouns. For verbs the prefix is a
  // grammatical particle, not a word with its own meaning ("arbeitslos" is not
  // "Arbeit + Los(start)"), so those get the separable-verb hint instead.
  const splittable = entry.pos === 'noun' && !entry.german.includes(' ');

  return {
    article: entry.article,
    genderRule: entry.pos === 'noun' ? genderRuleFor(entry.german) : null,
    compound: splittable ? splitCompound(entry.german, ctx.stems) : null,
    cognate: cognateHint(entry.german, entry.english),
    similar: findSimilar(entry, ctx),
    opposites: oppositesFor(entry.german, ctx.known),
    pitfall: pitfallFor(entry.german),
    separable: separableVerb(entry.german, isVerb),
    pluralNote: pluralNote(entry),
    generatedExample: hasRealExample ? null : generateExample(entry),
  };
}

/** True when there is anything worth showing at all. */
export function hasInsights(i: MemoryInsights): boolean {
  return !!(
    i.genderRule ||
    i.compound ||
    i.cognate ||
    i.similar.length ||
    i.opposites.length ||
    i.pitfall ||
    i.separable ||
    i.generatedExample
  );
}

/** Lightweight hints used on study cards (kept cheap — no index needed). */
export interface MemoryHints {
  gender?: string;
  cognate?: string;
  plural?: string;
}

const ARTICLE_TRICK: Record<string, string> = {
  der: 'der → picture the word in blue.',
  die: 'die → picture the word in red.',
  das: 'das → picture the word in green.',
};

export function generateHints(entry: VocabularyEntry): MemoryHints {
  const hints: MemoryHints = {};
  if (entry.article) hints.gender = ARTICLE_TRICK[entry.article];
  const cog = cognateHint(entry.german, entry.english);
  if (cog) hints.cognate = cog;
  if (entry.plural) hints.plural = `die ${entry.plural}`;
  return hints;
}

export interface AiMnemonicOptions {
  language: string;
}

/**
 * Phase-3 hook: enrich with an online LLM and cache the result on the entry so
 * it stays available offline. Returns null today, so every caller must keep an
 * offline fallback.
 */
export async function generateAiMnemonic(
  _entry: VocabularyEntry,
  _options: AiMnemonicOptions,
): Promise<string | null> {
  return null;
}
