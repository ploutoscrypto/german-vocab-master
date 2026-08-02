/**
 * Document-level import pipeline. Detects the source shape (CSV / Markdown
 * table / free text), extracts candidates line by line, dedupes them, and
 * splits the result into New / Merged / Needs-review buckets against the words
 * already in the database. Nothing is ever silently dropped.
 */
import type {
  ImportPreview,
  ParsedCandidate,
  VocabularyEntry,
} from '@/lib/types';
import { hasArabic, hasLatin, normalizeGerman } from '@/lib/utils';
import {
  buildCandidate,
  isGermanSentence,
  isHeading,
  isNoise,
  isSeparatorRow,
  looksGerman,
  splitSegments,
} from './extract';
import { applyCandidateToEntry, mergeCandidates } from './merge';
import {
  columnRole,
  detectSourceName,
  isChatGptExport,
  isDrillForm,
  isExportNoise,
  scanColumnTables,
  titleLineIndex,
} from './chatgpt';

const HEADER_WORDS =
  /\b(german|deutsch|wort|word|article|artikel|plural|english|englisch|meaning|bedeutung|arabic|arabisch|عربي|عربية|example|beispiel|satz|category|kategorie|translation)\b/i;

function countChar(line: string, ch: string): number {
  let n = 0;
  for (const c of line) if (c === ch) n += 1;
  return n;
}

function detectCsvDelimiter(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (lines.length < 2) return null;
  for (const delim of [',', ';', '\t']) {
    const counts = lines.map((l) => countChar(l, delim));
    const withDelim = counts.filter((c) => c >= 1).length;
    const first = counts[0];
    const consistent =
      first >= 1 && counts.filter((c) => c === first).length >= lines.length * 0.6;
    if (withDelim >= lines.length * 0.7 && consistent) return delim;
  }
  return null;
}

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delim && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out.filter(Boolean);
}

function isCsvHeader(segments: string[]): boolean {
  return HEADER_WORDS.test(segments.join(' '));
}

/** Parse raw text into candidate words (before dedup / DB comparison). */
export function extractFromText(text: string, _source: string): ParsedCandidate[] {
  const delimiter = detectCsvDelimiter(text);
  const lines = text.split(/\r?\n/);

  // Pass 1 — ChatGPT column-flattened tables (the richest source in real
  // exports). Lines they consume are skipped by the line-based pass below.
  const table = scanColumnTables(lines);
  const candidates: ParsedCandidate[] = [...table.candidates];
  let last: ParsedCandidate | null = null;

  // The first line of a ChatGPT export is the conversation title, not a word.
  const skipTitle = isChatGptExport(text) ? titleLineIndex(lines) : -1;

  // Pass 2 — line-based extraction for everything else.
  for (let idx = 0; idx < lines.length; idx++) {
    if (table.consumed.has(idx) || idx === skipTitle) {
      last = null;
      continue;
    }
    const rawLine = lines[idx];
    const line = rawLine.trim();
    if (!line) {
      last = null;
      continue;
    }
    if (isSeparatorRow(line)) continue;
    if (isExportNoise(line) || columnRole(line) !== null) {
      last = null;
      continue;
    }
    if (isNoise(line)) {
      last = null;
      continue;
    }
    if (isHeading(line)) {
      last = null;
      continue;
    }

    let segments: string[];
    if (line.includes('|')) {
      segments = line
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (delimiter && countChar(line, delimiter) >= 1) {
      segments = splitCsvLine(line, delimiter);
      if (isCsvHeader(segments)) continue;
    } else {
      segments = splitSegments(line);
      // Fallback for comma-delimited translation rows embedded in free text
      // (e.g. "Wasser,water,ماء") that have no other delimiter. Only when a
      // part carries Arabic, so we never mis-split verb forms ("lief, gelaufen").
      if (
        segments.length < 2 &&
        line.includes(',') &&
        !/[—–=|\t➜→·•]| - | : |：/.test(line)
      ) {
        const parts = line.split(',').map((s) => s.trim()).filter(Boolean);
        const firstIsHeadword =
          parts.length > 0 &&
          !hasArabic(parts[0]) &&
          hasLatin(parts[0]) &&
          parts[0].split(/\s+/).length <= 3 &&
          !/[()…]/.test(parts[0]);
        if (parts.length >= 2 && parts.length <= 4 && firstIsHeadword) {
          if (parts.some(hasArabic)) {
            segments = parts;
          } else if (isCsvHeader(parts)) {
            continue; // a bare header row like "German,English,Arabic"
          }
        }
      }
    }

    // A line made only of column names ("Typ/Artikel") is table furniture.
    if (segments.length >= 2 && segments.every((s) => columnRole(s) !== null)) {
      last = null;
      continue;
    }

    if (segments.length >= 2) {
      const cand = buildCandidate(segments, line);
      if (cand) {
        candidates.push(cand);
        last = cand;
        continue;
      }
    }

    // Single-segment lines: either an example for the previous word, or a lone
    // headword worth keeping (low confidence → needs-review, never dropped).
    if (isGermanSentence(line) && last) {
      last.examples.push(line);
      continue;
    }
    if (looksGerman(line) && line.split(/\s+/).length <= 3 && !isDrillForm(line)) {
      const cand = buildCandidate([line], line);
      if (cand) {
        candidates.push(cand);
        last = cand;
      }
    }
  }
  return candidates;
}

/** Collapse duplicate candidates within a single import. */
export function dedupeCandidates(cands: ParsedCandidate[]): ParsedCandidate[] {
  const map = new Map<string, ParsedCandidate>();
  for (const c of cands) {
    const key = normalizeGerman(c.german);
    if (!key) continue;
    const existing = map.get(key);
    map.set(key, existing ? mergeCandidates(existing, c) : c);
  }
  return [...map.values()];
}

/**
 * Full preview: New (confident + not in DB), Merged (already in DB), and
 * Needs-review (parsed but low confidence). `minConfidence` is the cutoff for
 * auto-accepting a new word.
 */
export function buildPreview(
  text: string,
  existing: VocabularyEntry[],
  source: string,
  minConfidence = 0.6,
): ImportPreview {
  const deduped = dedupeCandidates(extractFromText(text, source));
  const byKey = new Map(existing.map((e) => [e.normalized, e]));

  const fresh: ParsedCandidate[] = [];
  const merges: ImportPreview['merges'] = [];
  const needsReview: ParsedCandidate[] = [];

  for (const c of deduped) {
    const key = normalizeGerman(c.german);
    const ex = byKey.get(key);
    if (ex) {
      merges.push({ candidate: c, existing: ex });
    } else if (c.confidence >= minConfidence) {
      fresh.push(c);
    } else {
      needsReview.push(c);
    }
  }
  return { fresh, merges, needsReview, source };
}

export { applyCandidateToEntry, detectSourceName };
