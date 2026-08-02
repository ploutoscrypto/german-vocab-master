/**
 * Builds one ExecuteIntegration params file per tracked file, for
 * github__create_or_update_file.
 *
 * The bulk `push_files` action needs GitHub's Git Database API, which this
 * integration is not permitted to use (403 on create tree). The Contents API
 * is permitted, so we upload file by file instead. Payloads are written to
 * disk so large file contents never pass through the model's output, which
 * would risk silent truncation.
 *
 *   node scripts/compose-push.mjs <owner> <repo> <branch> [outDir]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [owner, repo, branch, outDir = '/tmp/push'] = process.argv.slice(2);
if (!owner || !repo || !branch) {
  console.error('usage: compose-push.mjs <owner> <repo> <branch> [outDir]');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean);

// The workflow must land last so CI does not start against a half-uploaded
// repository. Everything else keeps its natural order.
const WORKFLOW = '.github/workflows/deploy.yml';
const ordered = [...tracked.filter((p) => p !== WORKFLOW), WORKFLOW].filter((p) =>
  tracked.includes(p),
);

const index = ordered.map((filePath, i) => {
  const params = {
    owner,
    repo,
    branch,
    path: filePath,
    content: readFileSync(filePath, 'utf8'),
    message: `Add ${filePath}`,
  };
  const slug = String(i).padStart(3, '0');
  const out = path.join(outDir, `${slug}.json`);
  writeFileSync(out, JSON.stringify(params));
  return { i, file: out, path: filePath };
});

writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2));

console.log(`composed ${index.length} payloads in ${outDir}`);
console.log(`workflow is last: ${index[index.length - 1].path}`);
for (const row of index) console.log(`${row.i}\t${row.path}`);
