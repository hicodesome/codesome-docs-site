import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAllowedCmsChangedPath,
  renderReviewSummary,
  selectCmsCandidates
} from './review-cms-changes.mjs';
import { scanAddedDiffForSecrets } from './secret-patterns.mjs';

const repository = { full_name: 'hicodesome/codesome-docs-site' };

test('CMS candidate discovery combines pull requests and orphan branches', () => {
  const pulls = [{
    number: 7,
    state: 'open',
    base: { ref: 'main', repo: repository },
    head: { ref: 'cms/article-7', sha: 'pr-sha', repo: repository }
  }, {
    number: 8,
    state: 'open',
    base: { ref: 'main', repo: repository },
    head: { ref: 'feature/not-cms', sha: 'ignored', repo: repository }
  }];
  const refs = [{
    ref: 'refs/heads/cms/article-7',
    object: { sha: 'ref-sha' }
  }, {
    ref: 'refs/heads/cms/orphan',
    object: { sha: 'orphan-sha' }
  }];

  const candidates = selectCmsCandidates(pulls, refs);
  assert.equal(candidates.length, 2);
  assert.deepEqual(candidates.map(candidate => [candidate.branch, candidate.sha, candidate.pull?.number]), [
    ['cms/article-7', 'pr-sha', 7],
    ['cms/orphan', 'orphan-sha', undefined]
  ]);
  assert.deepEqual(selectCmsCandidates(pulls, refs, 7).map(candidate => candidate.branch), ['cms/article-7']);
});

test('CMS changed paths allow only public articles and uploaded images', () => {
  assert.equal(isAllowedCmsChangedPath('02-usage.md'), true);
  assert.equal(isAllowedCmsChangedPath('images/uploads/example.png'), true);
  assert.equal(isAllowedCmsChangedPath('02-nested/article.md'), false);
  assert.equal(isAllowedCmsChangedPath('images/uploads/../scripts/payload.mjs'), false);
  assert.equal(isAllowedCmsChangedPath('scripts/check-secrets.mjs'), false);
  assert.equal(isAllowedCmsChangedPath('_sidebar.md'), false);
});

test('added diff secrets are reported without rendering their values', () => {
  const secret = `ghp_${'A'.repeat(24)}`;
  const diff = [
    'diff --git a/02-usage.md b/02-usage.md',
    '--- a/02-usage.md',
    '+++ b/02-usage.md',
    '@@ -1,1 +1,2 @@',
    ' # Usage',
    `+token: ${secret}`
  ].join('\n');
  const findings = scanAddedDiffForSecrets(diff);
  assert.deepEqual(findings, [{ path: '02-usage.md', line: 2, name: 'ghp' }]);

  const summary = renderReviewSummary([{
    branch: 'cms/article-7',
    sha: 'abc123',
    pullNumber: 7,
    files: [{ filename: `02-${secret}.md`, status: 'modified', additions: 1, deletions: 0 }],
    diffRead: true,
    disallowedPaths: [],
    secretFindings: findings,
    checks: { ok: false, skipped: true, diagnostic: `unsafe ${secret}` }
  }], '2026-08-02T00:00:00.000Z');

  assert.doesNotMatch(summary, new RegExp(secret));
  assert.match(summary, /Potential secrets were found/);
  assert.match(summary, /\[REDACTED:ghp\]/);
  assert.match(summary, /no pull request was merged/);
});
