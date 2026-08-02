import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { headings } from './markdown-headings.mjs';
import { articleTitleEntries } from './title-metadata.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const titleAsset = readFileSync(resolve(root, 'assets/article-titles.js'), 'utf8');
const injector = readFileSync(resolve(root, 'assets/cdc-title-injector.js'), 'utf8');

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function createContext(mode) {
  const context = {
    console,
    Promise,
    localStorage: createStorage(),
    location: { hash: '#/' },
    $docsify: {
      homepage: '03-Agentic入门宝典.md',
      plugins: []
    },
    Docsify: {
      get(url) {
        const source = readFileSync(resolve(root, decodeURIComponent(url).split('?')[0]), 'utf8');
        if (mode === 'promise') return Promise.resolve(source);
        if (mode === 'docsify-thenable') {
          return {
            then(success) { return success(source, { updatedAt: 'test' }); },
            abort() {}
          };
        }
        return source;
      }
    }
  };
  context.window = context;
  vm.runInNewContext(titleAsset, context, { filename: 'assets/article-titles.js' });
  vm.runInNewContext(injector, context, { filename: 'assets/cdc-title-injector.js' });
  return context;
}

function setRoute(context, site) {
  context.location.hash = site === '03-Agentic入门宝典.md'
    ? '#/'
    : `#/${encodeURIComponent(site)}`;
}

async function normalizedMarkdown(context, site) {
  return Promise.resolve(context.Docsify.get(site));
}

async function renderedMarkdownThroughMainHook(context, site) {
  setRoute(context, site);
  const beforeEachHooks = [];
  const hook = {
    beforeEach(callback) {
      beforeEachHooks.push(callback);
    }
  };

  for (const plugin of context.window.$docsify.plugins) {
    plugin(hook);
  }

  assert.equal(beforeEachHooks.length, 1, 'title pipeline did not register a beforeEach hook');
  let output = readFileSync(resolve(root, site), 'utf8');
  for (const callback of beforeEachHooks) {
    output = await callback(output);
  }
  return output;
}

async function checkMode(mode) {
  const context = createContext(mode);
  const actualMap = context.window.CODESOME_ARTICLE_TITLES;
  assert.equal(Object.keys(actualMap).length, articleTitleEntries.length, 'generated title map size drifted');

  for (const { site, title } of articleTitleEntries) {
    const output = await normalizedMarkdown(context, site);
    const h1s = headings(output).filter(heading => heading.level === 1);
    assert.deepEqual(h1s, [{ level: 1, text: title }], `${site}: rendered H1 does not match its registered title`);

    // Docsify's main renderer bypasses Docsify.get and enters beforeEach.
    const mainOutput = await renderedMarkdownThroughMainHook(context, site);
    const mainH1s = headings(mainOutput).filter(heading => heading.level === 1);
    assert.deepEqual(mainH1s, [{ level: 1, text: title }], `${site}: main-render beforeEach H1 does not match its registered title`);

    assert.equal(context.window.CODESOME_TITLE_PIPELINE.status, 'ready', `${site}: title pipeline is not ready`);
    assert.deepEqual(
      context.window.CODESOME_TITLE_PIPELINE.processed[site]?.title,
      title,
      `${site}: title pipeline did not process the registered title`
    );
  }
  assert.equal(context.window.CODESOME_TITLE_PIPELINE.failures.length, 0, 'title pipeline recorded failures');
}

await checkMode(false);
await checkMode('promise');
await checkMode('docsify-thenable');
console.log(`Rendered title check passed: ${articleTitleEntries.length} articles in sync, Promise, and Docsify thenable modes`);
