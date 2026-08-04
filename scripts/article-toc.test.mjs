import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const index = readFileSync(join(root, 'index.html'), 'utf8');

test('right article TOC includes one deeper heading level', () => {
  assert.match(index, /querySelectorAll\('h1, h2, h3, h4'\)/);
  assert.match(index, /\.article-toc a\.level-4/);
});

test('right article TOC keeps h4 visibly deeper than h3', () => {
  assert.match(index, /\.article-toc a\.level-3[\s\S]*?padding-left: 26px/);
  assert.match(index, /\.article-toc a\.level-4[\s\S]*?padding-left: 38px/);
});
