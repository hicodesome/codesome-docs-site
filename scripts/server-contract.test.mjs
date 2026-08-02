import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedContentWriteBody, isAllowedGitHubPath } from '../server.mjs';

const contentPath = '/repos/hicodesome/codesome-docs-site/contents/01-example.md';

function body(branch) {
  return Buffer.from(JSON.stringify({ branch }));
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
