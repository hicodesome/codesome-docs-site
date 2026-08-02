import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverPublicArticles } from './public-articles.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

export const registeredArticleTitleMap = new Map();
export const articleTitleEntries = discoverPublicArticles({
  root
});
export const articleTitleMap = new Map(
  articleTitleEntries.map(({ site, title }) => [site, title])
);
