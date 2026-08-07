import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { headings } from './markdown-headings.mjs';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const injector = readFileSync(resolve(root, 'assets/cdc-title-injector.js'), 'utf8');

function run(source, hash = '#/fixture.md', alias = {}) {
  const context = {
    console,
    Promise,
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    },
    location: { hash },
    $docsify: { homepage: 'fixture.md', alias, plugins: [] },
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
  return { context, output: hooks[0](source) };
}

test('title injector accepts a canonical article source unchanged', () => {
  const source = [
    '# Fixture title',
    '',
    '## Body section',
    '',
    '```html',
    '<h1>code sample</h1>',
    '```',
    ''
  ].join('\n');
  const { context, output } = run(source);

  assert.equal(output, source);
  assert.deepEqual(headings(output).filter(heading => heading.level === 1), [
    { level: 1, text: 'Fixture title' }
  ]);
  assert.equal(context.CODESOME_TITLE_PIPELINE.status, 'ready');
  assert.equal(context.CODESOME_TITLE_PIPELINE.failures.length, 0);
});

test('title injector resolves a Docsify route alias to the canonical article', () => {
  const source = '# Fixture title\n\n正文\n';
  const { context, output } = run(source, '#/fixture', {
    '/fixture(?:\\.md)?': '/fixture.md'
  });

  assert.equal(output, source);
  assert.equal(context.CODESOME_TITLE_PIPELINE.status, 'ready');
  assert.equal(context.CODESOME_TITLE_PIPELINE.processed['fixture.md'].title, 'Fixture title');
  assert.equal(context.CODESOME_TITLE_PIPELINE.failures.length, 0);
});

test('title injector fails closed for a non-canonical source', () => {
  const source = '# Wrong title\n\n正文\n';
  const { context, output } = run(source);

  assert.equal(output, source);
  assert.equal(context.CODESOME_TITLE_PIPELINE.status, 'failed');
  assert.equal(context.CODESOME_TITLE_PIPELINE.failures.length, 1);
});
