import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import {
  isAllowedArticleContentWrite,
  isAllowedContentWriteBody,
  isAllowedGitHubPath,
  isServerEntrypoint
} from '../server.mjs';

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

test('server starts under direct Node and PM2 entrypoints but not test imports', () => {
  const serverPath = fileURLToPath(new URL('../server.mjs', import.meta.url));
  assert.equal(isServerEntrypoint(serverPath, ''), true);
  assert.equal(isServerEntrypoint('/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js', serverPath), true);
  assert.equal(isServerEntrypoint('/tmp/node-test-runner.mjs', ''), false);
});
