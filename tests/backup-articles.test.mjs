import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const siteRoot = fileURLToPath(new URL('..', import.meta.url));
const script = join(siteRoot, 'scripts/backup-articles.mjs');
const fixture = mkdtempSync(join(tmpdir(), 'codesome-article-backup-'));
const output = join(fixture, 'docs/article-backup');

function run(...args) {
  return execFileSync(process.execPath, [script, ...args], {
    cwd: siteRoot,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function runFail(...args) {
  assert.throws(() => run(...args));
}

try {
  mkdirSync(join(fixture, 'images'), { recursive: true });
  writeFileSync(join(fixture, 'images/sample.png'), Buffer.from('fixture-image\n'));
  writeFileSync(
    join(fixture, '01-PIAgent模型配置示例.md'),
    '# PIAgent 模型配置示例\n\n![sample](images/sample.png)\n\n![sample again](images/sample.png)\n'
  );
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: fixture });
  execFileSync('git', ['config', 'user.name', 'backup-test'], { cwd: fixture });
  execFileSync('git', ['config', 'user.email', 'backup-test@example.invalid'], { cwd: fixture });
  execFileSync('git', ['add', '.'], { cwd: fixture });
  execFileSync('git', ['commit', '-qm', 'fixture'], { cwd: fixture });

  const dryRunOutput = join(fixture, 'dry-run-output');
  const dryRunResult = run(
    '--dry-run',
    '--root', fixture,
    '--output', dryRunOutput,
  );
  assert.match(dryRunResult, /backup dry-run: 1 articles, 1 unique images/);
  assert.equal(statSync(dryRunOutput, { throwIfNoEntry: false }), undefined);

  const firstResult = run('--root', fixture, '--output', output);
  assert.match(firstResult, /backup created: 1 articles, 1 unique images/);
  const manifest = JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'));
  assert.equal(manifest.scope.articleCount, 1);
  assert.equal(manifest.scope.uniqueImageCount, 1);
  assert.equal(manifest.scope.imageReferenceCount, 2);
  assert.equal(manifest.images[0].referenceCount, 2);
  assert.equal(manifest.images[0].sha256.length, 64);
  const imageBackup = join(output, 'images/sample.png');
  const imageMtime = statSync(imageBackup).mtimeMs;

  const secondResult = run('--root', fixture, '--output', output);
  assert.match(secondResult, /0 files changed/);
  assert.equal(statSync(imageBackup).mtimeMs, imageMtime);
  assert.match(
    run('--verify', '--verify-source', '--root', fixture, '--output', output),
    /backup verify passed with source hashes: 1 articles, 1 unique images/
  );

  const manifestPath = join(output, 'manifest.json');
  const manifestBytes = readFileSync(manifestPath);
  const incompleteManifest = JSON.parse(manifestBytes);
  incompleteManifest.articles = [];
  incompleteManifest.scope.articleCount = 0;
  writeFileSync(manifestPath, `${JSON.stringify(incompleteManifest, null, 2)}\n`);
  runFail('--verify', '--root', fixture, '--output', output);
  writeFileSync(manifestPath, manifestBytes);

  const articleBackup = join(output, 'articles/01-PIAgent模型配置示例.md');
  const articleBytes = readFileSync(articleBackup);
  writeFileSync(articleBackup, '# 错误标题\n\n正文\n');
  runFail('--verify', '--root', fixture, '--output', output);
  writeFileSync(articleBackup, articleBytes);

  writeFileSync(imageBackup, Buffer.from('corrupted\n'));
  runFail('--verify', '--root', fixture, '--output', output);
  writeFileSync(imageBackup, Buffer.from('fixture-image\n'));
  run('--verify', '--verify-source', '--root', fixture, '--output', output);

  rmSync(join(fixture, 'images/sample.png'));
  runFail('--verify', '--verify-source', '--root', fixture, '--output', output);
  runFail('--dry-run', '--root', fixture, '--output', join(fixture, 'missing-output'));
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

console.log('backup-articles tests passed');
