/**
 * Canonical category list + keyword dictionaries used by the auto-categorizer.
 * Category ids are stable strings; human-readable labels come from i18n
 * (`category.<id>`), so the same data works in all four interface languages.
 */

export const CATEGORIES = [
  'daily_life',
  'food',
  'restaurant',
  'shopping',
  'travel',
  'transportation',
  'work',
  'office',
  'medical',
  'hospital',
  'technology',
  'internet',
  'business',
  'family',
  'housing',
  'government',
  'bank',
  'school',
  'university',
  'grammar',
  'verbs',
  'adjectives',
  'nouns',
  'expressions',
  'idioms',
  'animals',
  'nature',
  'sports',
  'entertainment',
  'unknown',
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Lucide icon name per category (resolved in the UI). */
export const CATEGORY_ICON: Record<string, string> = {
  daily_life: 'Sun',
  food: 'Apple',
  restaurant: 'UtensilsCrossed',
  shopping: 'ShoppingCart',
  travel: 'Plane',
  transportation: 'Bus',
  work: 'Briefcase',
  office: 'Building2',
  medical: 'Stethoscope',
  hospital: 'Cross',
  technology: 'Cpu',
  internet: 'Wifi',
  business: 'TrendingUp',
  family: 'Users',
  housing: 'Home',
  government: 'Landmark',
  bank: 'Banknote',
  school: 'GraduationCap',
  university: 'School',
  grammar: 'BookA',
  verbs: 'Zap',
  adjectives: 'Palette',
  nouns: 'Box',
  expressions: 'MessageCircle',
  idioms: 'Sparkles',
  animals: 'PawPrint',
  nature: 'Trees',
  sports: 'Dumbbell',
  entertainment: 'Music',
  unknown: 'HelpCircle',
};

/**
 * German (and a few English) keyword stems per topic. Matching is done on the
 * normalized headword + translations. Order matters only for readability; the
 * categorizer scores every category and takes the best hit.
 */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    'essen', 'brot', 'obst', 'gemüse', 'apfel', 'milch', 'käse', 'fleisch',
    'wasser', 'kaffee', 'tee', 'zucker', 'salz', 'ei', 'reis', 'nudel',
    'frühstück', 'mittagessen', 'abendessen', 'food', 'fruit', 'meal',
  ],
  restaurant: [
    'restaurant', 'kellner', 'speisekarte', 'rechnung', 'trinkgeld',
    'bestellen', 'reservierung', 'menü', 'waiter', 'menu', 'bill',
  ],
  shopping: [
    'kaufen', 'geschäft', 'laden', 'preis', 'kasse', 'angebot', 'rabatt',
    'einkaufen', 'supermarkt', 'quittung', 'shop', 'price', 'buy',
  ],
  travel: [
    'reise', 'urlaub', 'hotel', 'koffer', 'flug', 'ticket', 'grenze',
    'reisepass', 'gepäck', 'travel', 'trip', 'holiday', 'passport',
  ],
  transportation: [
    'zug', 'bus', 'auto', 'bahn', 'fahrrad', 'u-bahn', 'straßenbahn',
    'flugzeug', 'haltestelle', 'fahren', 'ticket', 'train', 'car',
  ],
  work: [
    'arbeit', 'arbeiten', 'job', 'chef', 'kollege', 'gehalt', 'termin',
    'projekt', 'aufgabe', 'work', 'boss', 'salary',
  ],
  office: [
    'büro', 'schreibtisch', 'drucker', 'computer', 'besprechung', 'ordner',
    'dokument', 'office', 'meeting', 'desk',
  ],
  medical: [
    'arzt', 'krank', 'medizin', 'schmerz', 'fieber', 'rezept', 'gesundheit',
    'apotheke', 'tablette', 'doctor', 'pain', 'health', 'medicine',
  ],
  hospital: [
    'krankenhaus', 'notaufnahme', 'operation', 'krankenschwester', 'station',
    'patient', 'hospital', 'nurse',
  ],
  technology: [
    'technik', 'gerät', 'maschine', 'software', 'hardware', 'programm',
    'daten', 'bildschirm', 'technology', 'device', 'data',
  ],
  internet: [
    'internet', 'website', 'e-mail', 'email', 'passwort', 'netzwerk',
    'herunterladen', 'hochladen', 'online', 'browser', 'wlan',
  ],
  business: [
    'geschäft', 'firma', 'unternehmen', 'markt', 'kunde', 'vertrag',
    'gewinn', 'verkauf', 'business', 'company', 'customer', 'contract',
  ],
  family: [
    'familie', 'mutter', 'vater', 'kind', 'bruder', 'schwester', 'eltern',
    'oma', 'opa', 'ehe', 'family', 'mother', 'father', 'child',
  ],
  housing: [
    'wohnung', 'haus', 'miete', 'zimmer', 'küche', 'bad', 'möbel',
    'vermieter', 'wohnen', 'apartment', 'house', 'rent', 'room',
  ],
  government: [
    'amt', 'behörde', 'antrag', 'ausweis', 'formular', 'anmeldung',
    'aufenthalt', 'visum', 'government', 'office', 'permit',
  ],
  bank: [
    'bank', 'konto', 'geld', 'überweisung', 'kredit', 'karte', 'zinsen',
    'sparen', 'account', 'money', 'transfer',
  ],
  school: [
    'schule', 'lehrer', 'schüler', 'hausaufgabe', 'note', 'klasse', 'prüfung',
    'unterricht', 'school', 'teacher', 'homework', 'exam',
  ],
  university: [
    'universität', 'student', 'vorlesung', 'seminar', 'studium', 'professor',
    'bibliothek', 'abschluss', 'university', 'lecture', 'degree',
  ],
  animals: [
    'tier', 'hund', 'katze', 'vogel', 'pferd', 'fisch', 'maus', 'kuh',
    'animal', 'dog', 'cat', 'bird', 'horse',
  ],
  nature: [
    'natur', 'baum', 'blume', 'wald', 'berg', 'fluss', 'meer', 'himmel',
    'wetter', 'sonne', 'regen', 'nature', 'tree', 'mountain', 'weather',
  ],
  sports: [
    'sport', 'fußball', 'laufen', 'schwimmen', 'training', 'spiel', 'mannschaft',
    'fitness', 'sport', 'football', 'run', 'swim', 'team',
  ],
  entertainment: [
    'musik', 'film', 'kino', 'konzert', 'spiel', 'buch', 'fernsehen', 'kunst',
    'theater', 'music', 'movie', 'game', 'book',
  ],
  daily_life: [
    'tag', 'morgen', 'abend', 'zeit', 'uhr', 'woche', 'alltag', 'leben',
    'day', 'time', 'week', 'life',
  ],
};
