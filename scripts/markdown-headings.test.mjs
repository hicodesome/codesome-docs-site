import test from 'node:test';
import assert from 'node:assert/strict';
import { headings, normalizeArticleMarkdown } from './markdown-headings.mjs';

test('heading scanner includes Setext and nested HTML H1 elements', () => {
  const result = headings([
    '# ATX title',
    '',
    'Setext title',
    '============',
    '',
    '<section><h1>Nested title</h1></section>',
    '',
    '```html',
    '<h1>code sample</h1>',
    '```'
  ].join('\n'));

  assert.deepEqual(result.filter(heading => heading.level === 1), [
    { level: 1, text: 'ATX title' },
    { level: 1, text: 'Setext title' },
    { level: 1, text: 'Nested title' }
  ]);
});

test('article title normalization is unique and idempotent', () => {
  const source = [
    '<section><h1>Nested title</h1></section>',
    '',
    'Setext title',
    '============',
    '',
    '# Source title',
    '',
    '```html',
    '<h1>code sample</h1>',
    '```'
  ].join('\n');
  const normalized = normalizeArticleMarkdown(source, 'Fixture title');

  assert.deepEqual(headings(normalized).filter(heading => heading.level === 1), [
    { level: 1, text: 'Fixture title' }
  ]);
  assert.match(normalized, /<h2>Nested title<\/h2>/);
  assert.match(normalized, /## Setext title/);
  assert.match(normalized, /## Source title/);
  assert.match(normalized, /<h1>code sample<\/h1>/);
  assert.equal(normalizeArticleMarkdown(normalized, 'Fixture title'), normalized);
});
