import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCanonicalArticleMarkdown,
  headings,
  normalizeArticleMarkdown
} from './markdown-headings.mjs';

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

test('heading scanner follows blockquote Markdown and ignores quoted fenced code', () => {
  const result = headings([
    '> # Quoted title',
    '>',
    '> Setext title',
    '> ============',
    '>',
    '> ```html',
    '> <h1>code sample</h1>',
    '> ```'
  ].join('\n'));

  assert.deepEqual(result.filter(heading => heading.level === 1), [
    { level: 1, text: 'Quoted title' },
    { level: 1, text: 'Setext title' }
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
    '> # Quoted title',
    '>',
    '> Setext title',
    '> ============',
    '>',
    '> ```html',
    '> <h1>quoted code sample</h1>',
    '> ```',
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
  assert.match(normalized, /> ## Quoted title/);
  assert.match(normalized, /> ## Setext title/);
  assert.match(normalized, /> <h1>quoted code sample<\/h1>/);
  assert.match(normalized, /<h1>code sample<\/h1>/);
  assert.equal(normalizeArticleMarkdown(normalized, 'Fixture title'), normalized);
});

test('canonical article validation rejects missing, duplicate, or mismatched H1 sources', () => {
  const valid = '# Fixture title\n\n## Body\n';
  assert.equal(assertCanonicalArticleMarkdown(valid, 'Fixture title'), valid);
  assert.throws(
    () => assertCanonicalArticleMarkdown('Body\n', 'Fixture title'),
    /must start with the registered H1/
  );
  assert.throws(
    () => assertCanonicalArticleMarkdown('# Fixture title\n\n# Duplicate\n', 'Fixture title'),
    /must contain exactly one registered H1/
  );
  assert.throws(
    () => assertCanonicalArticleMarkdown('# Fixture title\r\n', 'Fixture title'),
    /LF line endings/
  );
});
