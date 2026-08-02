import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  assertPublicArticleSources,
  isAllowedArticleContentWrite,
  isAllowedContentWriteBody,
  isAllowedGitHubPath,
  isServerEntrypoint,
  publicArticleTitleHealth
} from '../server.mjs';
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

test('read-only contents requests and non-contents writes retain their route policy', () => {
  assert.equal(isAllowedContentWriteBody('GET', undefined), true);
  assert.equal(isAllowedGitHubPath(contentPath, 'GET'), true);
  assert.equal(isAllowedGitHubPath('/repos/hicodesome/codesome-docs-site/pulls', 'POST'), true);
  assert.equal(isAllowedGitHubPath(contentPath, 'POST'), false);
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

test('the direct server entrypoint refuses to start with a broken public article', () => {
  const sourceRoot = fileURLToPath(new URL('../', import.meta.url));
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'codesome-title-boot-'));
  try {
    mkdirSync(join(temporaryRoot, 'scripts'));
    cpSync(fileURLToPath(new URL('../server.mjs', import.meta.url)), join(temporaryRoot, 'server.mjs'));
    for (const script of ['markdown-headings.mjs', 'title-metadata.mjs', 'cdc-manifest.mjs', 'content-baseline.mjs']) {
      cpSync(join(sourceRoot, 'scripts', script), join(temporaryRoot, 'scripts', script));
    }
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
    assert.match(`${result.stdout}\n${result.stderr}`, /refusing to start/);
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
