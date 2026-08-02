/**
 * Minimal test runner: bundles each TypeScript suite with esbuild (resolving
 * the "@/" alias) and runs it in Node. Keeps the project free of a heavyweight
 * test framework while still guarding everything that matters — the import
 * extractor, the SM-2 engine, the quiz grader, the memory helper, the real
 * IndexedDB data layer and the rendered UI.
 *
 *   npm test              run every suite
 *   npm test -- e2e       run only suites whose name matches "e2e"
 */
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Bundles must live inside the project so Node can resolve node_modules for
// packages we intentionally leave unbundled (jsdom).
const outDir = path.join(root, '.test-build');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const ALL_SUITES = [
  { file: 'scripts/smoke.ts', name: 'extractor + SM-2' },
  { file: 'scripts/quiz-smoke.ts', name: 'quiz engine' },
  { file: 'scripts/memory-smoke.ts', name: 'memory helper' },
  { file: 'scripts/e2e-smoke.ts', name: 'end-to-end (IndexedDB)' },
  { file: 'scripts/ui-smoke.ts', name: 'UI render (jsdom)', external: ['jsdom'] },
];

const filter = process.argv[2];
const suites = filter
  ? ALL_SUITES.filter((s) => s.file.includes(filter) || s.name.includes(filter))
  : ALL_SUITES;

if (suites.length === 0) {
  console.error(`No suite matches "${filter}"`);
  process.exit(1);
}

let failed = 0;

for (const suite of suites) {
  const outfile = path.join(outDir, path.basename(suite.file).replace(/\.ts$/, '.mjs'));
  await build({
    entryPoints: [path.join(root, suite.file)],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    alias: { '@': path.join(root, 'src') },
    external: suite.external ?? [],
    logLevel: 'error',
    logOverride: { 'empty-import-meta': 'silent' },
  });

  console.log(`\n══════ ${suite.name} ══════`);
  try {
    execFileSync(process.execPath, [outfile], { cwd: root, stdio: 'inherit' });
  } catch {
    failed += 1;
  }
}

rmSync(outDir, { recursive: true, force: true });

if (failed > 0) {
  console.error(`\n${failed} suite(s) failed ❌`);
  process.exit(1);
}
console.log('\nAll suites passed ✅');
