# User Guide — German Vocabulary Master

Everything you need to use the app day to day. It works offline, keeps all your
words on your own device, and is designed around one goal: **remembering German
vocabulary permanently**.

---

## 1. Install it on your phone

Open the app's URL in your phone browser, then:

- **iPhone / iPad (Safari):** tap **Share** → **Add to Home Screen**
- **Android (Chrome):** tap **⋮** → **Install app** (or *Add to Home screen*)

It then opens fullscreen with its own icon and works with **no internet**.

> Installing requires an `https://` address. Opening the file directly from your
> computer (`file://…`) still runs the app, but the browser will not offer to
> install it.

---

## 2. Import your vocabulary

Tap **Import**. You have two ways in:

**Paste text** — copy anything from a ChatGPT conversation and paste it.
**Upload file** — drop a `.txt`, `.md` or `.csv` file (including a full ChatGPT
conversation export).

Then press **Analyze**.

### What it understands

You do not need to clean anything up first. The importer reads:

```
der Tisch, -e — table — طاولة
das Haus (Häuser) = house = بيت
gehen (ging, ist gegangen) - to go - ذهب
```

CSV and Markdown tables:

```
German,English,Arabic          | German    | English | Arabic |
Wasser,water,ماء               | ---       | ---     | ---    |
                               | die Katze | cat     | قطة    |
```

And the column-style tables ChatGPT produces in conversation exports:

```
Deutsch
Artikel
Bedeutung (AR)
Süßigkeiten
die
الحلويات
```

It automatically pulls out the **word, article (der/die/das), plural, verb
forms, Arabic meaning, English meaning and example sentences**, and ignores the
conversation around them — prompts, dates, timestamps, headings and chat
boilerplate.

### The import preview

Before anything is saved you see three groups:

| Group | Meaning |
| --- | --- |
| **New** | Words that will be added |
| **Merged** | Words you already have — existing entries get *enriched* with any new detail, never duplicated |
| **Needs review** | Lines that might be vocabulary but were unclear |

“Needs review” exists so nothing is ever silently thrown away. Use the toggle to
include or skip them, then confirm.

> **Tip:** importing the same file twice is safe. Everything lands in *Merged*
> and your collection does not grow duplicates.

---

## 3. Daily review — the main habit

The home screen is deliberately small. Tap **Review Today** and start; there is
nothing to configure.

Each card shows the German word first. **Think of the meaning before revealing
it** — that moment of effort is what builds memory. Then tap *Show answer* and
rate how it went:

| Button | Use it when | Effect |
| --- | --- | --- |
| **Again** | You did not know it | Comes back in ~1 minute, and again today |
| **Hard** | You got it, but slowly | Comes back sooner than usual |
| **Good** | You knew it | Normal interval growth |
| **Easy** | Instant, effortless | Bigger jump forward |

Each button shows *when* the word will return (`1m`, `10m`, `3d`, `12d`…).

Words you forget always jump to the front of the queue. Words you know keep
moving further into the future, so your daily reviews stay short even as your
collection grows.

**Keyboard (desktop):** `Space` reveals · `1` `2` `3` `4` grade the card.

---

## 4. Practice modes

Inside any session, tap the **⚙ icon** (top right) to change how you are tested.
Your choice is remembered.

**Modes**
- **Active recall** — think, then reveal and grade yourself
- **Flashcards** — classic card with Again/Hard/Good/Easy
- **Typing** — type the answer; it is checked for you
- **Multiple choice** — pick from four options
- **Mixed** — the app varies the mode automatically

**Direction** — German → Arabic · Arabic → German · German → English · English → German

**Words** — Due today · New · Wrong words · Favorites · Recently imported ·
Random · All

### How typing is marked

Marking is deliberately forgiving, because a correct answer typed slightly
differently should not damage your review schedule:

- Articles are optional — `Haus` is accepted for *das Haus*
- `ae oe ue ss` work for `ä ö ü ß` — `Kaese` ✓ for *Käse*
- Arabic diacritics and alef/ya variants are ignored
- **Any one** meaning from a list counts — `حقيبة صغيرة` ✓ for *كيس / حقيبة صغيرة*
- A single typo is graded **“Almost”**, not wrong

If it is ever too strict, press **“I was right”** to override.

---

## 5. The memory helper

When you reveal an answer (and on any word's detail page) the app shows hints it
works out on your device:

- **Built from** — long words split into parts you already know:
  `Badezimmer = Bad (bath) + Zimmer (room)`
- **Gender rule** — *“words ending in **-ung** are always **die**”*
- **Watch out** — false friends and confusions: *bekommen ≠ become*,
  *schon vs schön*, *kennen vs wissen* (shown in Arabic if that is your
  explanation language)
- **Separable verb** — *abholen splits: ich **hol**e … **ab***
- **Opposites** and **related words** from your own collection
- **Example** — a simple sentence if the word has none

---

## 6. Finding and organising words

**Words** tab → instant search across German, English, Arabic and category.
Filter chips below the search box narrow by topic.

Tap any word to edit it: fix the article, plural, meanings, examples, notes, or
change its category. Tap the **★** to favourite it (favourites become their own
practice pool).

Every word is auto-sorted into a topic — Food, Travel, Work, Medical, Housing
and ~25 more.

---

## 7. Statistics

Total words · Mastered · Learning · Forgotten · Current streak · Accuracy ·
Retention · Total reviews, plus a 14-day activity chart.

- **Accuracy** — how often you answer correctly overall
- **Retention** — accuracy on words that have graduated into long-term review;
  this is the number that reflects real memory

---

## 8. Backup — never lose your words

**Settings → Data & backup**

- **Export database** — downloads a `.json` file with every word, all review
  history and your settings. Keep it somewhere safe.
- **Import database** — restore from that file. Choose **Replace everything**
  or **Merge** (adds only words you do not already have).
- **Auto-backup** — the app also keeps a recent snapshot on the device
  automatically, which you can restore with one tap.

> Your vocabulary lives in your browser's storage on that device. Clearing site
> data, or deleting the app, deletes it. **Export a backup now and then** —
> especially before switching phones.

---

## 9. Settings worth knowing

- **Interface language** — English, Deutsch, العربية (right-to-left), Français
- **Explanation language** — the language used for memory-helper explanations,
  independent of the interface
- **Theme** — System, Light or Dark
- **Pronunciation** — reads German words aloud (uses your device's built-in
  voices; no internet needed)
- **New words per day / Max reviews per day** — keeps daily sessions to a size
  you will actually finish

---

## 10. Troubleshooting

**“Local storage is blocked”**
The app needs your browser's local database. Turn off private/incognito mode,
open the app in its own tab (not inside an embedded frame), and allow site data.

**No sound from pronunciation**
Your device has no German voice installed. On Android: *Settings → Language &
input → Text-to-speech*. On iOS the German voice downloads with the German
keyboard/language.

**A word imported with the wrong article or meaning**
Tap it in the **Words** list and correct it — your edits are kept and are never
overwritten by a later import.

**Some words landed in “Needs review”**
Those lines were ambiguous (often a bare word from your own prompt with no
translation). Import them anyway and fill in the meaning later, or skip them.

**Nothing is due today**
That is the system working. Add new words with *Learn New Words*, or practise
freely with *Random Learning* — free practice does not disturb your schedule
more than an ordinary review would.
