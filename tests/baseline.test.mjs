import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('..', import.meta.url));
const script = join(siteRoot, 'scripts/backup-articles.mjs');

function filesUnder(root) {
  const files = [];
  function visit(current, prefix = '') {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const target = join(current, entry.name);
      if (entry.isDirectory()) visit(target, relative);
      else files.push(relative);
    }
  }
  visit(root);
  return files.sort();
}

function run(scriptPath, ...args) {
  return execFileSync(process.execPath, [scriptPath, ...args], {
    cwd: siteRoot,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function runFail(scriptPath, ...args) {
  assert.throws(() => run(scriptPath, ...args));
}

function manifest(output) {
  return JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'));
}

const fixture = mkdtempSync(join(tmpdir(), 'codesome-baseline-'));
const output = join(fixture, 'docs/article-backup');

try {
  mkdirSync(join(fixture, 'images'), { recursive: true });
  writeFileSync(join(fixture, 'images/first.png'), Buffer.from('first-image\n'));
  writeFileSync(
    join(fixture, '01-first.md'),
    '# First article\n\n![first](images/first.png)\n![first again](images/first.png)\n'
  );
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: fixture });
  execFileSync('git', ['config', 'user.name', 'baseline-test'], { cwd: fixture });
  execFileSync('git', ['config', 'user.email', 'baseline-test@example.invalid'], { cwd: fixture });
  execFileSync('git', ['add', '.'], { cwd: fixture });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: fixture });

  run(script, '--root', fixture, '--output', output);
  let current = manifest(output);
  assert.equal(current.formatVersion, 2);
  assert.deepEqual(current.scope, {
    articlePattern: '^\\d{2}-.+\\.md$ at the site repository root',
    articleCount: 1,
    uniqueImageCount: 1,
    imageReferenceCount: 2
  });
  assert.equal(current.images[0].referenceCount, 2);

  const firstManifest = readFileSync(join(output, 'manifest.json'));
  const firstMtime = statSync(join(output, 'images/first.png')).mtimeMs;
  assert.match(run(script, '--root', fixture, '--output', output), /0 files changed/);
  assert.deepEqual(readFileSync(join(output, 'manifest.json')), firstManifest);
  assert.equal(statSync(join(output, 'images/first.png')).mtimeMs, firstMtime);

  writeFileSync(join(fixture, '02-second.md'), '# Second article\n\nSecond body\n');
  writeFileSync(join(fixture, 'images/second.png'), Buffer.from('second-image\n'));
  writeFileSync(join(fixture, '02-second.md'), '# Second article\n\n![second](images/second.png)\n');
  run(script, '--root', fixture, '--output', output);
  current = manifest(output);
  assert.equal(current.scope.articleCount, 2);
  assert.equal(current.scope.uniqueImageCount, 2);

  const originalFirstHash = current.articles.find(article => article.sitePath === '01-first.md').sha256;
  writeFileSync(join(fixture, '01-first.md'), '# First article\n\nUpdated body\n');
  run(script, '--root', fixture, '--output', output);
  current = manifest(output);
  assert.notEqual(current.articles.find(article => article.sitePath === '01-first.md').sha256, originalFirstHash);

  rmSync(join(fixture, '01-first.md'));
  writeFileSync(join(fixture, '03-renamed.md'), '# First article\n\nRenamed body\n');
  run(script, '--root', fixture, '--output', output);
  current = manifest(output);
  assert.equal(current.articles.some(article => article.sitePath === '01-first.md'), false);
  assert.equal(current.articles.some(article => article.sitePath === '03-renamed.md'), true);
  assert.equal(statSync(join(output, 'articles/01-first.md'), { throwIfNoEntry: false }), undefined);
  assert.ok(statSync(join(output, 'articles/03-renamed.md')));

  rmSync(join(fixture, '02-second.md'));
  rmSync(join(fixture, 'images/second.png'));
  run(script, '--root', fixture, '--output', output);
  current = manifest(output);
  assert.equal(current.scope.articleCount, 1);
  assert.equal(current.scope.uniqueImageCount, 0);
  assert.equal(statSync(join(output, 'articles/02-second.md'), { throwIfNoEntry: false }), undefined);
  assert.equal(statSync(join(output, 'images/second.png'), { throwIfNoEntry: false }), undefined);

  writeFileSync(join(output, 'images/stale.png'), Buffer.from('stale\n'));
  run(script, '--root', fixture, '--output', output);
  assert.equal(statSync(join(output, 'images/stale.png'), { throwIfNoEntry: false }), undefined);
  run(script, '--verify', '--verify-source', '--root', fixture, '--output', output);

  writeFileSync(join(fixture, '03-renamed.md'), '# First article\n\n![missing](images/missing.png)\n');
  runFail(script, '--root', fixture, '--output', output);
  writeFileSync(join(fixture, '03-renamed.md'), '# First article\n\n![remote](https://example.invalid/image.png)\n');
  runFail(script, '--root', fixture, '--output', output);
  writeFileSync(join(fixture, '03-renamed.md'), '# First article\n\nRenamed body\n');

  writeFileSync(join(output, 'articles/03-renamed.md'), '# Corrupted\n');
  runFail(script, '--verify', '--root', fixture, '--output', output);
  run(script, '--root', fixture, '--output', output);
  writeFileSync(join(fixture, '03-renamed.md'), '# First article\n\nChanged source\n');
  runFail(script, '--verify', '--verify-source', '--root', fixture, '--output', output);
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

console.log('baseline refresh/check scenarios passed');
