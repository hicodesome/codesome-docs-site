import test from 'node:test';
import assert from 'node:assert/strict';
import { headings } from './markdown-headings.mjs';

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
