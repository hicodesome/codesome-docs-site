import test from 'node:test';
import assert from 'node:assert/strict';
import { checkChangedCacheVersions, checkIndexCacheVersions } from './check-cache-versions.mjs';

const current = '<script src="assets/example.js?v=2"></script>\n';
const unchanged = '<script src="assets/example.js?v=1"></script>\n';

test('cache check requires a version on managed first-party resources', () => {
  assert.deepEqual(checkIndexCacheVersions('<script src="assets/example.js"></script>\n').errors, [
    'browser resource lacks a non-empty ?v= cache version in index.html: assets/example.js'
  ]);
  assert.deepEqual(checkIndexCacheVersions(current).errors, []);
});

test('cache check rejects changed resources whose index declaration did not change', () => {
  assert.deepEqual(checkChangedCacheVersions(unchanged, unchanged, ['assets/example.js']), [
    'browser resource changed without bumping its index.html cache version: assets/example.js'
  ]);
  assert.deepEqual(checkChangedCacheVersions(unchanged, current, ['assets/example.js']), []);
});
