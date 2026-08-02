# German Vocabulary Master

An **offline-first Progressive Web App** for permanently remembering German
vocabulary. Import messy word lists from ChatGPT (TXT / Markdown / CSV / paste)
and the app extracts, organises and schedules every word for review — the
memory science of Anki with the simplicity of a single-purpose app.

> Not a dictionary. Not a note app. A memory system.

📖 **[USER-GUIDE.md](./USER-GUIDE.md)** — how to use the app day to day
🚀 **[PUSH.md](./PUSH.md)** — publish it to your own GitHub Pages URL

---

## Features

| | |
| --- | --- |
| **Import** | TXT · Markdown · CSV · copy-paste, including full ChatGPT conversation exports |
| **Extraction** | Word, article, plural, verb forms, Arabic + English meanings, examples — chat noise ignored |
| **Never loses words** | Ambiguous lines go to a *Needs review* bucket instead of being dropped |
| **Deduplication** | Re-importing merges and enriches; it never creates duplicates |
| **Categories** | 30 topics assigned automatically, editable per word |
| **Spaced repetition** | SM-2 with Anki-style learning steps; forgotten words get top priority |
| **Today's Review** | One tap, no configuration |
| **Quiz modes** | Active recall · flashcards · typing · multiple choice · mixed |
| **Directions** | DE→AR · AR→DE · DE→EN · EN→DE |
| **Word pools** | Due · New · Wrong words · Favorites · Recent · Random · All |
| **Memory helper** | Compound splitting, gender rules, false friends, separable verbs, opposites |
| **Search** | Instant, across German / English / Arabic / category |
| **Statistics** | Totals, streak, accuracy, retention, 14-day history |
| **Favorites** | Star any word; practise favourites as their own pool |
| **Offline PWA** | Installable, fully functional with no connection |
| **Backup** | JSON export / import + automatic local snapshots |
| **Languages** | English · Deutsch · العربية (RTL) · Français |
| **Responsive** | Phone tab bar; desktop navigation rail and multi-column layouts |

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Requires **Node 20+**.

### All commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production PWA → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Strict TypeScript check |
| `npm test` | Run every test suite |
| `npm test -- e2e` | Run only suites matching "e2e" |
| `npm run build:single` | One self-contained HTML file (easy sharing) |

---

## Deployment

`dist/` is a static site. Every asset path, the service-worker scope and the
manifest are **relative**, and routing uses `HashRouter`, so it works from a
sub-path (`user.github.io/repo/`) as well as a domain root — no configuration.

### GitHub Pages (CI included)

`.github/workflows/deploy.yml` runs install → typecheck → **tests** → build →
publish on every push to `main`. See **[PUSH.md](./PUSH.md)** for the three
commands.

### Cloudflare Pages / Netlify

Build command `npm run build`, output directory `dist`.

### Vercel

Framework preset “Vite”. No extra configuration.

> **HTTPS is required** for installation and offline mode. Over plain HTTP or
> `file://` the app still runs, but the browser will not register the service
> worker or offer to install it.

---

## Architecture

| Layer | Choice | Why |
| --- | --- | --- |
| UI | React 18 + Vite + TypeScript (strict) | Fast builds, no `any` |
| Styling | Tailwind CSS + shadcn/ui (Radix + CVA) | Logical properties give RTL for free |
| Storage | Dexie over IndexedDB | Handles 100k+ rows; reactive via `useLiveQuery` |
| State | Zustand (ephemeral only) | IndexedDB is the single source of truth |
| Scheduling | Custom SM-2 engine | Pure functions, fully unit-tested |
| i18n | i18next | Four languages, RTL-aware |
| PWA | vite-plugin-pwa (Workbox) | Precaching + installability |

```
src/
  app/         router, responsive shell, navigation, settings store
  components/  ui/ (shadcn-style primitives), shared/
  features/    home · review · quiz · import · vocabulary · statistics · settings
  db/          Dexie schema, repositories, backup
  srs/         SM-2 engine + study-queue scheduler
  parsing/     parsers, extractor, ChatGPT tables, categoriser, dedup/merge
  memory/      gender rules, compounds, antonyms, pitfalls, orchestrator
  i18n/        de · ar · en · fr
  lib/         types, utils, stats, tts, categories
  styles/      design tokens + globals
scripts/       test suites and the test runner
test-fixtures/ real ChatGPT exports used by the tests
```

### Data model

`vocabulary` (indexed on `normalized`, `category`, `dueDate`, `memoryLevel`,
`importedDate`, `wrongCount`) · `reviewLogs` · `sessions` · `settings` ·
`imports`. Backups round-trip all five.

### Spaced repetition

Each card carries an ease factor (2.5 start, 1.3 floor), interval, reps and
lapses. New cards pass through 1-minute and 10-minute learning steps before
graduating to day-scale intervals. Forgetting a graduated card records a lapse,
lowers its ease, and sends it back to the front of the queue. The daily queue is
ordered: lapsed → most overdue → new (capped by your daily limits).

---

## Testing

```bash
npm test
```

Five suites, no test framework — just esbuild + Node:

| Suite | Covers |
| --- | --- |
| `smoke.ts` | Extractor + SM-2, asserted against **real ChatGPT exports** |
| `quiz-smoke.ts` | Answer grading, directions, distractor generation |
| `memory-smoke.ts` | Gender rules, compounds, antonyms, pitfalls, performance |
| `e2e-smoke.ts` | Full journey against a **real IndexedDB**: import → merge → review → SRS → quiz → search → stats → backup/restore |
| `ui-smoke.ts` | Renders the **real React app** in jsdom: all four languages, RTL, responsive shell, graceful failure when storage is blocked |

The two fixtures in `test-fixtures/` are genuine ChatGPT conversation exports,
so parser changes are validated against real-world input rather than idealised
samples.

---

## Privacy

Everything stays on your device. There is no account, no server, no analytics
and no network request after the page loads. Your vocabulary lives in your
browser's IndexedDB, and the only way data leaves is when *you* export a backup.

---

## Licence

Private project — all rights reserved by the author.
