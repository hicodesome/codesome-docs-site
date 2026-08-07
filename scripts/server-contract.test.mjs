import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  assertPublicArticleSources,
  assertPublicArticleContents,
  isAllowedArticleContentWrite,
  isAllowedContentWriteBody,
  isAllowedContentWriteRequest,
  isAllowedGitRef,
  isAllowedGitHubPath,
  isAllowedPullRequestMutation,
  isServerEntrypoint,
  latestTrustedContractRun,
  publicArticleTitleHealth,
  publicRuntimeTitleHealth
} from '../server.mjs';
import {
  assertPublicRuntimeContract,
  publicRuntimeHealth,
  REQUIRED_TITLE_PIPELINE_SCRIPTS,
  runtimeFingerprint
} from './public-runtime-contract.mjs';
import { articleTitleEntries } from './title-metadata.mjs';

const contentPath = '/repos/hicodesome/codesome-docs-site/contents/01-example.md';
const registeredArticlePath = '/repos/hicodesome/codesome-docs-site/contents/01-V3计划-ClaudeCode安装配置.md';

function body(branch) {
  return Buffer.from(JSON.stringify({ branch }));
}

function articleBody(branch, content) {
  return Buffer.from(JSON.stringify({
    branch,
    content: Buffer.from(content, 'utf8').toString('base64')
  }));
}

function currentRuntimeFiles() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const index = readFileSync(join(root, 'index.html'), 'utf8');
  const paths = new Set([
    'index.html',
    '_sidebar.md',
    ...REQUIRED_TITLE_PIPELINE_SCRIPTS,
    ...articleTitleEntries.map(({ site }) => site)
  ]);
  for (const [, source] of index.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) {
    const url = new URL(source, 'http://codesome-runtime.local/');
    if (url.origin === 'http://codesome-runtime.local') {
      paths.add(decodeURIComponent(url.pathname).replace(/^\/+/, ''));
    }
  }
  return new Map([...paths].map(path => [path, readFileSync(join(root, path), 'utf8')]));
}

test('GitHub contents writes are limited to CMS branches', () => {
  assert.equal(isAllowedGitHubPath(contentPath, 'PUT'), true);
  assert.equal(isAllowedContentWriteBody('PUT', body('cms/article-123')), true);
  assert.equal(isAllowedContentWriteBody('DELETE', body('cms/article-123')), true);
  assert.equal(isAllowedContentWriteBody('PUT', body('main')), false);
  assert.equal(isAllowedContentWriteBody('DELETE', body('refs/heads/cms/article-123')), false);
  assert.equal(isAllowedContentWriteBody('PUT', body('cms/../main')), false);
  assert.equal(isAllowedContentWriteBody('PUT', Buffer.from('{')), false);
  assert.equal(isAllowedContentWriteBody('PUT', undefined), false);
});

test('content write query parameters cannot redirect a CMS write', () => {
  assert.equal(isAllowedContentWriteRequest(contentPath, 'PUT', '?ref=cms/article-123', body('cms/article-123')), true);
  assert.equal(isAllowedContentWriteRequest(contentPath, 'PUT', '?ref=main', body('cms/article-123')), false);
  assert.equal(isAllowedContentWriteRequest(contentPath, 'PUT', '?branch=main', body('cms/article-123')), false);
  assert.equal(isAllowedContentWriteRequest(contentPath, 'PUT', '?ref=cms/other', body('cms/article-123')), false);
  assert.equal(isAllowedContentWriteRequest(contentPath, 'GET', '?ref=main', undefined), true);
});

test('Git refs accept only the CMS namespace for mutations', () => {
  assert.equal(isAllowedGitRef('refs/heads/cms/article-123'), true);
  assert.equal(isAllowedGitRef('refs/heads/cms/nested/article-123'), true);
  assert.equal(isAllowedGitRef('refs/meta/_decap_cms'), true);
  assert.equal(isAllowedGitRef('refs/heads/main'), false);
  assert.equal(isAllowedGitRef('refs/heads/cms/../main'), false);
  assert.equal(isAllowedGitHubPath('/repos/hicodesome/codesome-docs-site/git/refs/heads/cms/article-123', 'PATCH'), true);
  assert.equal(isAllowedGitHubPath('/repos/hicodesome/codesome-docs-site/git/refs/heads/cms%2Fnested%2Farticle-123', 'DELETE'), true);
  assert.equal(isAllowedGitHubPath('/repos/hicodesome/codesome-docs-site/git/refs/heads/main', 'PATCH'), false);
});

test('read-only contents requests and non-contents writes retain their route policy', () => {
  assert.equal(isAllowedContentWriteBody('GET', undefined), true);
  assert.equal(isAllowedGitHubPath(contentPath, 'GET'), true);
  assert.equal(isAllowedGitHubPath('/repos/hicodesome/codesome-docs-site/pulls', 'POST'), true);
  assert.equal(isAllowedGitHubPath(contentPath, 'POST'), false);
});

test('editorial workflow pull requests can only target main from a CMS branch', () => {
  const pullPath = '/repos/hicodesome/codesome-docs-site/pulls';
  const pullNumberPath = `${pullPath}/42`;
  const mergePath = `${pullNumberPath}/merge`;

  assert.equal(isAllowedPullRequestMutation(pullPath, 'POST', Buffer.from(JSON.stringify({
    title: 'Editorial draft',
    head: 'hicodesome:cms/article-42',
    base: 'main'
  }))), true);
  assert.equal(isAllowedPullRequestMutation(pullPath, 'POST', Buffer.from(JSON.stringify({
    head: 'hicodesome:cms/article-42',
    base: 'develop'
  }))), false);
  assert.equal(isAllowedPullRequestMutation(pullPath, 'POST', Buffer.from(JSON.stringify({
    head: 'attacker:cms/article-42',
    base: 'main'
  }))), false);
  assert.equal(isAllowedPullRequestMutation(pullNumberPath, 'PATCH', Buffer.from(JSON.stringify({
    base: 'main',
    state: 'open'
  }))), true);
  assert.equal(isAllowedPullRequestMutation(pullNumberPath, 'PATCH', Buffer.from(JSON.stringify({
    base: 'develop'
  }))), false);
  assert.equal(isAllowedPullRequestMutation(mergePath, 'PUT', Buffer.from('{')), false);
  assert.equal(isAllowedPullRequestMutation(mergePath, 'PUT', undefined), false);
  assert.equal(isAllowedPullRequestMutation(mergePath, 'PUT', Buffer.from(JSON.stringify({}))), false);
  assert.equal(isAllowedPullRequestMutation(mergePath, 'PUT', Buffer.from(JSON.stringify({ sha: 'head-sha' }))), false);
  assert.equal(isAllowedPullRequestMutation(mergePath, 'PUT', Buffer.from(JSON.stringify({ sha: 'a'.repeat(40) }))), true);
});

test('CMS merge accepts contract checks only from GitHub Actions for the exact head SHA', () => {
  const headSha = 'a'.repeat(40);
  const trusted = {
    name: 'contract',
    head_sha: headSha,
    app: { id: 15368 },
    status: 'completed',
    conclusion: 'success',
    completed_at: '2026-08-03T00:00:00Z'
  };
  const spoofed = {
    ...trusted,
    app: { id: 99999 },
    completed_at: '2026-08-03T00:01:00Z'
  };
  const wrongHead = { ...trusted, head_sha: 'b'.repeat(40) };

  assert.equal(latestTrustedContractRun([trusted, spoofed, wrongHead], headSha), trusted);
  assert.equal(latestTrustedContractRun([spoofed, wrongHead], headSha), null);
  assert.equal(latestTrustedContractRun([trusted], 'short-sha'), null);
});

test('the proposed merge tree validator rejects missing or malformed public articles', () => {
  const contents = new Map(articleTitleEntries.map(({ site }) => [
    site,
    readFileSync(fileURLToPath(new URL(`../${site}`, import.meta.url)), 'utf8')
  ]));
  assert.doesNotThrow(() => assertPublicArticleContents(contents));

  contents.set(articleTitleEntries[0].site, '# 错误标题\n\n正文\n');
  assert.throws(
    () => assertPublicArticleContents(contents),
    /public article title contract failed for proposed merge[\s\S]*registered H1/
  );
  contents.delete(articleTitleEntries[1].site);
  assert.throws(
    () => assertPublicArticleContents(contents),
    /article file is missing from proposed commit/
  );
});

test('the proposed merge runtime contract covers the complete public title tree', () => {
  const files = currentRuntimeFiles();
  const validate = proposal => assertPublicRuntimeContract({
    root: fileURLToPath(new URL('../', import.meta.url)),
    entries: articleTitleEntries,
    readSource: site => proposal.get(site),
    readRuntimeFile: path => proposal.get(path)
  });

  assert.doesNotThrow(() => validate(files));

  const missingIndex = new Map(files);
  missingIndex.delete('index.html');
  assert.throws(() => validate(missingIndex), /public runtime title contract failed/);

  const alteredIndex = new Map(files);
  alteredIndex.set('index.html', files.get('index.html').replace('assets/vendor/docsify.min.js', 'assets/missing-docsify.js'));
  assert.throws(() => validate(alteredIndex), /public runtime title contract failed/);

  const alteredSidebar = new Map(files);
  alteredSidebar.set('_sidebar.md', '# invalid sidebar\n');
  assert.throws(() => validate(alteredSidebar), /public runtime title contract failed/);

  const alteredInjector = new Map(files);
  alteredInjector.set(
    'assets/cdc-title-injector.js',
    files.get('assets/cdc-title-injector.js').replaceAll('CODESOME_TITLE_PIPELINE', 'BROKEN_TITLE_PIPELINE')
  );
  assert.throws(() => validate(alteredInjector), /public runtime title contract failed/);
});

test('CMS cannot write a non-canonical public article or delete a registered article', () => {
  const valid = '# V3 Claude Code 安装与配置指南\n\n正文\n';
  const invalid = '# 错误标题\n\n正文\n';

  assert.equal(isAllowedArticleContentWrite(registeredArticlePath, 'PUT', articleBody('cms/edit', valid)), true);
  assert.equal(isAllowedArticleContentWrite(registeredArticlePath, 'PUT', articleBody('cms/edit', invalid)), false);
  assert.equal(isAllowedArticleContentWrite(registeredArticlePath, 'PUT', body('cms/edit')), false);
  assert.equal(isAllowedArticleContentWrite(registeredArticlePath, 'DELETE', body('cms/edit')), false);
  assert.equal(isAllowedArticleContentWrite('/repos/hicodesome/codesome-docs-site/contents/images/uploads/new.png', 'PUT', body('cms/edit')), true);
  assert.equal(isAllowedArticleContentWrite('/repos/hicodesome/codesome-docs-site/contents/99-unregistered.md', 'PUT', articleBody('cms/edit', valid)), false);
});

test('the server validates every public article before it can report healthy', () => {
  const entries = [{ site: 'fixture.md', title: 'Fixture title' }];
  const validSource = () => '# Fixture title\n\n## Body\n';
  const invalidSource = () => '# Wrong title\n\n## Body\n';

  assert.equal(assertPublicArticleSources(entries, validSource), 1);
  assert.deepEqual(publicArticleTitleHealth(entries, validSource), { ok: true, articleCount: 1 });
  assert.throws(
    () => assertPublicArticleSources(entries, invalidSource),
    /public article title contract failed[\s\S]*registered H1/
  );
  assert.deepEqual(publicArticleTitleHealth(entries, invalidSource), { ok: false, articleCount: 0 });
});

test('the runtime health contract covers the public title pipeline', () => {
  const health = publicRuntimeTitleHealth();
  assert.equal(health.ok, true);
  assert.equal(health.articleCount, articleTitleEntries.length);
  assert.match(health.titleMapVersion, /^title-map-[a-f0-9]{16}$/);
});

test('runtime health detects a title pipeline asset drift after startup', () => {
  const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'codesome-runtime-contract-'));
  try {
    cpSync(join(sourceRoot, 'assets'), join(temporaryRoot, 'assets'), { recursive: true });
    cpSync(join(sourceRoot, 'index.html'), join(temporaryRoot, 'index.html'));
    cpSync(join(sourceRoot, '_sidebar.md'), join(temporaryRoot, '_sidebar.md'));
    for (const { site } of articleTitleEntries) cpSync(join(sourceRoot, site), join(temporaryRoot, site));

    assert.equal(publicRuntimeHealth({ root: temporaryRoot }).ok, true);
    const indexPath = join(temporaryRoot, 'index.html');
    const index = readFileSync(indexPath, 'utf8');
    writeFileSync(indexPath, index.replace(/article-titles\.js\?v=[^"]+/, 'article-titles.js?v=stale'));
    const health = publicRuntimeHealth({ root: temporaryRoot });
    assert.equal(health.ok, false);
    assert.match(health.error, /title map script version is stale/);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('runtime fingerprint changes when file content changes with stable metadata', () => {
  const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'codesome-runtime-fingerprint-'));
  try {
    cpSync(join(sourceRoot, 'assets'), join(temporaryRoot, 'assets'), { recursive: true });
    cpSync(join(sourceRoot, 'index.html'), join(temporaryRoot, 'index.html'));
    cpSync(join(sourceRoot, '_sidebar.md'), join(temporaryRoot, '_sidebar.md'));
    for (const { site } of articleTitleEntries) cpSync(join(sourceRoot, site), join(temporaryRoot, site));

    const indexPath = join(temporaryRoot, 'index.html');
    const original = readFileSync(indexPath, 'utf8');
    const originalStat = statSync(indexPath);
    writeFileSync(indexPath, original.replace('<html lang="zh-CN">', '<html lang="zh-TW">'));
    utimesSync(indexPath, originalStat.atime, originalStat.mtime);

    assert.notEqual(
      runtimeFingerprint(temporaryRoot, articleTitleEntries),
      runtimeFingerprint(sourceRoot, articleTitleEntries)
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('the direct server entrypoint refuses to start with a broken public article', () => {
  const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'codesome-title-boot-'));
  try {
    mkdirSync(join(temporaryRoot, 'scripts'));
    cpSync(fileURLToPath(new URL('../server.mjs', import.meta.url)), join(temporaryRoot, 'server.mjs'));
    for (const script of [
      'markdown-headings.mjs',
      'title-metadata.mjs',
      'cdc-manifest.mjs',
      'content-baseline.mjs',
      'public-articles.mjs',
      'public-runtime-contract.mjs',
      'route-slugs.mjs'
    ]) {
      cpSync(join(sourceRoot, 'scripts', script), join(temporaryRoot, 'scripts', script));
    }
    cpSync(join(sourceRoot, 'assets'), join(temporaryRoot, 'assets'), { recursive: true });
    cpSync(join(sourceRoot, 'index.html'), join(temporaryRoot, 'index.html'));
    cpSync(join(sourceRoot, '_sidebar.md'), join(temporaryRoot, '_sidebar.md'));
    for (const { site } of articleTitleEntries) {
      cpSync(join(sourceRoot, site), join(temporaryRoot, site));
    }
    writeFileSync(join(temporaryRoot, articleTitleEntries[0].site), '# 错误标题\n\n## Body\n');

    const result = spawnSync(process.execPath, ['server.mjs'], {
      cwd: temporaryRoot,
      env: { ...process.env, PORT: '0' },
      encoding: 'utf8'
    });

    assert.notEqual(result.status, 0);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /refusing to start|article Markdown must start with the registered H1/
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test('server starts under direct Node and PM2 entrypoints but not test imports', () => {
  const serverPath = fileURLToPath(new URL('../server.mjs', import.meta.url));
  assert.equal(isServerEntrypoint(serverPath, ''), true);
  assert.equal(isServerEntrypoint('/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js', serverPath), true);
  assert.equal(isServerEntrypoint('/tmp/node-test-runner.mjs', ''), false);
});
