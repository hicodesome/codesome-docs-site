import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articles } from './cdc-manifest.mjs';
import {
  LATEST_BASELINE_ARTICLES,
  SITE_ONLY_ARTICLES
} from './content-baseline.mjs';
import { discoverPublicArticles } from './public-articles.mjs';

function addUnique(entries, sourceName, target, { allowOverride = false } = {}) {
  const seen = new Set();

  for (const entry of entries) {
    if (!entry.site || !entry.title) {
      throw new Error(`${sourceName} contains an article without site and title`);
    }
    if (seen.has(entry.site)) {
      throw new Error(`${sourceName} contains duplicate article: ${entry.site}`);
    }
    seen.add(entry.site);

    if (target.has(entry.site) && !allowOverride) {
      throw new Error(`duplicate article title registration: ${entry.site}`);
    }
    target.set(entry.site, entry.title);
  }
}

const cdcSites = new Set(articles.map(article => article.site));
const registeredTitleMap = new Map();

addUnique(articles, 'cdc-manifest.mjs', registeredTitleMap);

for (const article of LATEST_BASELINE_ARTICLES) {
  if (!cdcSites.has(article.site)) {
    throw new Error(`latest baseline article is not in the CDC manifest: ${article.site}`);
  }
}
addUnique(LATEST_BASELINE_ARTICLES, 'content-baseline.mjs (latest baseline)', registeredTitleMap, {
  allowOverride: true
});

for (const article of SITE_ONLY_ARTICLES) {
  if (cdcSites.has(article.site)) {
    throw new Error(`site-only article is already in the CDC manifest: ${article.site}`);
  }
}
addUnique(SITE_ONLY_ARTICLES, 'content-baseline.mjs (site only)', registeredTitleMap);

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

export const registeredArticleTitleMap = registeredTitleMap;
export const articleTitleEntries = discoverPublicArticles({
  root,
  registeredTitles: registeredTitleMap
});
export const articleTitleMap = new Map(
  articleTitleEntries.map(({ site, title }) => [site, title])
);
