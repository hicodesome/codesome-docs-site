import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertCanonicalArticleMarkdown } from './markdown-headings.mjs';

export const PUBLIC_ARTICLE_NAME_PATTERN = /^\d{2}-.*\.md$/;

export function extractPublicArticleTitle(markdown, site = 'article') {
  if (typeof markdown !== 'string' || !markdown) {
    throw new Error(`${site}: public article is empty`);
  }
  const firstLine = markdown.split('\n', 1)[0];
  const match = firstLine.match(/^# (.+)$/);
  if (!match) {
    throw new Error(`${site}: public article must start with one H1`);
  }
  const title = match[1];
  try {
    assertCanonicalArticleMarkdown(markdown, title);
  } catch (error) {
    throw new Error(`${site}: ${error.message}`);
  }
  return title;
}

export function discoverPublicArticles({ root, registeredTitles = new Map() }) {
  const sites = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile() && PUBLIC_ARTICLE_NAME_PATTERN.test(entry.name))
    .map(entry => entry.name)
    .sort();
  const discovered = new Set(sites);
  const missing = [...registeredTitles.keys()].filter(site => !discovered.has(site));
  if (missing.length) {
    throw new Error(`registered public articles are missing: ${missing.join(', ')}`);
  }

  return sites.map(site => {
    const markdown = readFileSync(resolve(root, site), 'utf8');
    const registeredTitle = registeredTitles.get(site);
    const title = registeredTitle ?? extractPublicArticleTitle(markdown, site);
    try {
      assertCanonicalArticleMarkdown(markdown, title);
    } catch (error) {
      throw new Error(`${site}: ${error.message}`);
    }
    return {
      site,
      title,
      titleSource: registeredTitle ? 'registered' : 'markdown-h1'
    };
  });
}
