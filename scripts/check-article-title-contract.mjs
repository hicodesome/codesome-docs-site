import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertCanonicalArticleMarkdown,
  headings,
  normalizeArticleMarkdown
} from './markdown-headings.mjs';
import { articleTitleEntries } from './title-metadata.mjs';
import { HOME_ARTICLE, resolveRouteTarget } from './route-slugs.mjs';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const homeArticle = HOME_ARTICLE;
const sidebar = readFileSync(resolve(root, '_sidebar.md'), 'utf8');
const sidebarLinks = [...sidebar.matchAll(/^\s*-\s*\[([^\]]+)\]\(([^)]+)\)/gm)]
  .map(([, title, href]) => ({ title: title.trim(), href: href.trim() }));
const articleSidebarLinks = sidebarLinks.filter(({ href }) => {
  if (href === '/') return true;
  return resolveRouteTarget(basename(href.split(/[?#]/)[0])) !== null;
});
const errors = [];

for (const { site, title } of articleTitleEntries) {
  const path = resolve(root, site);
  if (!existsSync(path)) {
    errors.push(`${site}: article file is missing`);
    continue;
  }

  const source = readFileSync(path, 'utf8');
  if (!source.trim()) errors.push(`${site}: article source is empty`);

  try {
    assertCanonicalArticleMarkdown(source, title);
    assert.equal(
      normalizeArticleMarkdown(source, title),
      source,
      `${site}: article source is not in canonical title format`
    );
  } catch (error) {
    errors.push(`${site}: ${error.message}`);
    continue;
  }

  const h1s = headings(source).filter(heading => heading.level === 1);
  try {
    assert.deepEqual(h1s, [{ level: 1, text: title }], `${site}: source article must contain one registered H1`);
  } catch (error) {
    errors.push(error.message);
  }

  const matchingLinks = articleSidebarLinks.filter(({ href }) => {
    if (site === homeArticle) return href === '/';
    return resolveRouteTarget(basename(href.split(/[?#]/)[0])) === site;
  });
  if (matchingLinks.length !== 1) {
    errors.push(`${site}: sidebar must contain exactly one article link (found ${matchingLinks.length})`);
  } else if (matchingLinks[0].title !== title) {
    errors.push(`${site}: sidebar title drifted from the registered title`);
  }
}

if (articleSidebarLinks.length !== articleTitleEntries.length) {
  errors.push(`sidebar article link count drifted: expected ${articleTitleEntries.length}, found ${articleSidebarLinks.length}`);
}

if (errors.length) throw new Error(errors.join('\n'));
console.log(`Article title contract passed: ${articleTitleEntries.length} canonical source H1 and sidebar entries in sync`);
