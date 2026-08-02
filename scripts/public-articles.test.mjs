import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  discoverPublicArticles,
  extractPublicArticleTitle
} from './public-articles.mjs';
import { orderedPublicArticles, renderAdminConfig } from './generate-admin-config.mjs';

test('public article discovery adds root Markdown from its canonical H1', () => {
  const root = mkdtempSync(join(tmpdir(), 'codesome-public-articles-'));
  try {
    writeFileSync(join(root, '01-known.md'), '# Registered title\n\nBody\n');
    writeFileSync(join(root, '02-new.md'), '# New public article\n\nBody\n');
    writeFileSync(join(root, 'README.md'), '# Private repository readme\n');
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'docs/03-private.md'), '# Nested private file\n');

    assert.deepEqual(discoverPublicArticles({
      root,
      registeredTitles: new Map([['01-known.md', 'Registered title']])
    }), [
      { site: '01-known.md', title: 'Registered title', titleSource: 'registered' },
      { site: '02-new.md', title: 'New public article', titleSource: 'markdown-h1' }
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('public article discovery keeps registered titles strict', () => {
  const root = mkdtempSync(join(tmpdir(), 'codesome-public-articles-'));
  try {
    writeFileSync(join(root, '01-known.md'), '# Wrong title\n\nBody\n');
    assert.throws(
      () => discoverPublicArticles({
        root,
        registeredTitles: new Map([['01-known.md', 'Registered title']])
      }),
      /registered H1/
    );
    assert.throws(
      () => discoverPublicArticles({
        root,
        registeredTitles: new Map([['02-missing.md', 'Missing title']])
      }),
      /registered public articles are missing/
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('automatic title extraction rejects duplicate H1 headings', () => {
  assert.throws(
    () => extractPublicArticleTitle('# New title\n\n# Duplicate\n', '02-new.md'),
    /exactly one registered H1/
  );
});

test('Decap config appends an automatically discovered article', () => {
  const entries = [
    { site: '01-known.md', title: 'Registered title' },
    { site: '02-new.md', title: 'New public article' }
  ];
  assert.deepEqual(
    orderedPublicArticles(entries, [{ site: '01-known.md' }]),
    entries
  );
  const config = renderAdminConfig(entries);
  assert.match(config, /label: "New public article"/);
  assert.match(config, /file: "02-new\.md"/);
  assert.equal((config.match(/      - name: "article-/g) || []).length, 2);
});
