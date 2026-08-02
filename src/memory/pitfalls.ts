/**
 * Common mistakes: false friends and classic confusion pairs.
 *
 * These are the errors that survive years of study because nothing ever flags
 * them. Each entry carries a short warning in English and Arabic (the
 * learner's two working languages) — the UI picks by explanation language and
 * falls back to English.
 */

export interface Pitfall {
  /** Lowercased German headword this warning attaches to. */
  word: string;
  en: string;
  ar: string;
}

/** False friends: look like an English word, mean something else. */
const FALSE_FRIENDS: Pitfall[] = [
  { word: 'bekommen', en: 'Means “to receive”, NOT “to become”. “Ich bekomme ein Buch” = I get a book.', ar: 'تعني «يحصل على»، وليست «يصبح».' },
  { word: 'also', en: 'Means “so / therefore”, NOT English “also” (that is “auch”).', ar: 'تعني «إذن»، وليست «أيضًا» (أيضًا = auch).' },
  { word: 'gift', en: 'Means “poison”! A present is “das Geschenk”.', ar: 'تعني «سُمّ»! الهدية هي das Geschenk.' },
  { word: 'rock', en: 'Means “skirt”. The music genre is also der Rock, but the clothing sense is primary.', ar: 'تعني «تنورة»، وليست الصخرة.' },
  { word: 'chef', en: 'Means “boss”, not a cook. A cook is “der Koch”.', ar: 'تعني «المدير»، وليست الطبّاخ (الطبّاخ = der Koch).' },
  { word: 'handy', en: 'Means “mobile phone”, not “practical”.', ar: 'تعني «الهاتف المحمول».' },
  { word: 'sensibel', en: 'Means “sensitive”, not “sensible” (that is “vernünftig”).', ar: 'تعني «حسّاس»، وليست «عاقل».' },
  { word: 'aktuell', en: 'Means “current / up-to-date”, not “actual”.', ar: 'تعني «حالي / راهن»، وليست «فعلي».' },
  { word: 'eventuell', en: 'Means “possibly / maybe”, not “eventually”.', ar: 'تعني «ربما»، وليست «في النهاية».' },
  { word: 'bald', en: 'Means “soon”, not “bald” (hairless = “kahl”).', ar: 'تعني «قريبًا»، وليست «أصلع».' },
  { word: 'brav', en: 'Means “well-behaved”, not “brave” (that is “mutig”).', ar: 'تعني «مهذّب»، وليست «شجاع».' },
  { word: 'fast', en: 'Means “almost”, not “fast” (quick = “schnell”).', ar: 'تعني «تقريبًا»، وليست «سريع» (سريع = schnell).' },
  { word: 'see', en: 'der See = lake, die See = sea. The article changes the meaning!', ar: 'der See = بحيرة، die See = بحر. الأداة تغيّر المعنى!' },
  { word: 'art', en: 'Means “kind / type”, not “art” (that is “die Kunst”).', ar: 'تعني «نوع»، وليست «فنّ» (الفن = die Kunst).' },
  { word: 'kind', en: 'Means “child”, not the English adjective “kind”.', ar: 'تعني «طفل».' },
  { word: 'meinung', en: 'Means “opinion”. “Meaning” is “die Bedeutung”.', ar: 'تعني «رأي»؛ أما «المعنى» فهي die Bedeutung.' },
  { word: 'spenden', en: 'Means “to donate”, not “to spend” (that is “ausgeben”).', ar: 'تعني «يتبرّع»، وليست «ينفق».' },
  { word: 'wer', en: '“wer” = who, “wo” = where. Easy to swap!', ar: '«wer» = مَن، «wo» = أين. سهل الخلط بينهما!' },
];

/** Word pairs learners routinely mix up. */
const CONFUSIONS: Pitfall[] = [
  { word: 'kennen', en: 'kennen = know a person/place; wissen = know a fact.', ar: 'kennen = يعرف شخصًا/مكانًا، wissen = يعرف معلومة.' },
  { word: 'wissen', en: 'wissen = know a fact; kennen = know a person/place.', ar: 'wissen = يعرف معلومة، kennen = يعرف شخصًا/مكانًا.' },
  { word: 'liegen', en: 'liegen = to lie (no object); legen = to lay something down.', ar: 'liegen = يرقد (لازم)، legen = يضع شيئًا.' },
  { word: 'legen', en: 'legen = lay something down; liegen = to be lying.', ar: 'legen = يضع شيئًا، liegen = يكون مستلقيًا.' },
  { word: 'sitzen', en: 'sitzen = to be sitting; setzen = to set/seat something.', ar: 'sitzen = يجلس، setzen = يُجلس شيئًا.' },
  { word: 'setzen', en: 'setzen = to seat/place; sitzen = to be sitting.', ar: 'setzen = يضع/يُجلس، sitzen = يجلس.' },
  { word: 'schon', en: 'schon = already; schön = beautiful. The umlaut changes everything.', ar: 'schon = بالفعل، schön = جميل. الأوملاوت يغيّر المعنى.' },
  { word: 'schön', en: 'schön = beautiful; schon = already.', ar: 'schön = جميل، schon = بالفعل.' },
  { word: 'stehen', en: 'stehen = to stand; stellen = to put upright.', ar: 'stehen = يقف، stellen = يضع منتصبًا.' },
  { word: 'nach', en: 'nach = after/to (cities, countries); zu = to (people, places).', ar: 'nach للمدن والدول، zu للأشخاص والأماكن.' },
  { word: 'seit', en: 'seit = since (time); da/weil = because. Do not confuse with English “sit”.', ar: 'seit = منذ (زمن).' },
  { word: 'als', en: 'als = when (single past event); wenn = when/if (repeated or future).', ar: 'als لحدث ماضٍ واحد، wenn للمتكرر أو المستقبل.' },
  { word: 'wenn', en: 'wenn = if/whenever; als = when (one past event).', ar: 'wenn = إذا/كلما، als = عندما (حدث ماضٍ واحد).' },
];

const INDEX = new Map<string, Pitfall>();
for (const p of [...FALSE_FRIENDS, ...CONFUSIONS]) INDEX.set(p.word, p);

export function pitfallFor(word: string): Pitfall | null {
  return INDEX.get(word.trim().toLowerCase()) ?? null;
}

/** Separable-prefix verbs trip learners up in main clauses. */
const SEPARABLE_PREFIXES = [
  'ab', 'an', 'auf', 'aus', 'bei', 'ein', 'her', 'hin', 'los', 'mit',
  'nach', 'vor', 'weg', 'zu', 'zurück', 'zusammen',
];

/** Prefixes that are NEVER separated. */
const INSEPARABLE_PREFIXES = ['be', 'emp', 'ent', 'er', 'ge', 'miss', 'ver', 'zer'];

export interface SeparableInfo {
  prefix: string;
  stem: string;
}

/** Detect a separable-prefix verb, e.g. "abholen" -> ab + holen. */
export function separableVerb(word: string, isVerb: boolean): SeparableInfo | null {
  if (!isVerb) return null;
  const w = word.trim().toLowerCase();
  if (!w.endsWith('en') || w.length < 6) return null;
  if (INSEPARABLE_PREFIXES.some((p) => w.startsWith(p))) return null;
  for (const p of [...SEPARABLE_PREFIXES].sort((a, b) => b.length - a.length)) {
    if (w.startsWith(p) && w.length - p.length >= 4) {
      return { prefix: p, stem: w.slice(p.length) };
    }
  }
  return null;
}
