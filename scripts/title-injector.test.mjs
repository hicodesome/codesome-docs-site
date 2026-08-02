import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { headings } from './markdown-headings.mjs';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const injector = readFileSync(resolve(root, 'assets/cdc-title-injector.js'), 'utf8');

function normalize(source) {
  const context = {
    console,
    Promise,
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    },
    location: { hash: '#/fixture.md' },
    $docsify: { homepage: 'fixture.md', plugins: [] },
    CODESOME_ARTICLE_TITLES: { 'fixture.md': 'Fixture title' },
    CODESOME_ARTICLE_TITLES_VERSION: 'test-version',
    Docsify: { get() { return source; } }
  };
  context.window = context;
  vm.runInNewContext(injector, context, { filename: 'assets/cdc-title-injector.js' });

  const hooks = [];
  for (const plugin of context.$docsify.plugins) {
    plugin({ beforeEach(callback) { hooks.push(callback); } });
  }
  assert.equal(hooks.length, 1);
  return hooks[0](source);
}

test('title injector demotes ATX, Setext and HTML H1 sources', () => {
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
  const normalized = normalize(source);

  assert.deepEqual(headings(normalized).filter(heading => heading.level === 1), [
    { level: 1, text: 'Fixture title' }
  ]);
  assert.match(normalized, /<h2>Nested title<\/h2>/);
  assert.match(normalized, /## Setext title/);
  assert.match(normalized, /## Source title/);
  assert.match(normalized, /<h1>code sample<\/h1>/);
});
