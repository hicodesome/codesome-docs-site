import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  articles,
  CDC_COMMIT,
  CDC_TAG,
  internalTargetForUrl
} from './cdc-manifest.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const sourceArgIndex = process.argv.indexOf('--source');
if (sourceArgIndex !== -1 && !process.argv[sourceArgIndex + 1]) {
  console.error('--source requires a repository path');
  process.exit(2);
}
const sourceRepo = resolve(
  sourceArgIndex === -1
    ? resolve(root, '..', '..', 'hicodesome-docs-source')
    : process.argv[sourceArgIndex + 1]
);

function git(...args) {
  return execFileSync('git', ['-C', sourceRepo, ...args], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  });
}

const tagCommit = git('rev-parse', `${CDC_TAG}^{commit}`).trim();
if (tagCommit !== CDC_COMMIT) {
  console.error(`CDC tag mismatch: expected ${CDC_COMMIT}, found ${tagCommit}`);
  process.exit(1);
}

const snapshotFiles = git('ls-tree', '-r', '--name-only', '-z', CDC_TAG)
  .split('\0')
  .filter(file => file.endsWith('.md'))
  .filter(file => !['IMPORT_REPORT.md', 'README.md', 'SOURCE_SNAPSHOT.md'].includes(file))
  .sort();
const manifestFiles = articles.map(article => article.source).sort();
if (JSON.stringify(snapshotFiles) !== JSON.stringify(manifestFiles)) {
  console.error('CDC article manifest does not match the 25 Markdown files in the fixed tag');
  process.exit(1);
}

function renderArticle(source) {
  let rewrites = 0;
  let content = source.replace(/\]\((https?:\/\/[^)\s]+)\)/g, (match, url) => {
    const target = internalTargetForUrl(url);
    if (!target) return match;
    rewrites++;
    return `](${target})`;
  });

  content = content.replace(/<(https?:\/\/[^>\s]+)>/g, (match, url) => {
    const target = internalTargetForUrl(url);
    if (!target) return match;
    rewrites++;
    return `[站内文章](${target})`;
  });

  content = content.replace(/https?:\/\/[^\s<>)]+/g, url => {
    const target = internalTargetForUrl(url);
    if (!target) return url;
    rewrites++;
    return `[站内文章](${target})`;
  });

  return { content: content.replace(/\s*$/, '\n'), rewrites };
}

let changed = 0;
let totalRewrites = 0;
const mismatches = [];

for (const article of articles) {
  const source = git('show', `${CDC_TAG}:${article.source}`);
  const rendered = renderArticle(source);
  const destination = resolve(root, article.site);
  const current = readFileSync(destination, 'utf8');
  totalRewrites += rendered.rewrites;

  if (current === rendered.content) continue;
  changed++;
  if (checkOnly) {
    mismatches.push(article.site);
  } else {
    writeFileSync(destination, rendered.content, 'utf8');
  }
}

if (mismatches.length) {
  console.error(`CDC content mismatch (${mismatches.length}):\n  ${mismatches.join('\n  ')}`);
  process.exit(1);
}

const action = checkOnly ? 'validated' : 'synchronized';
console.log(`CDC ${action}: ${articles.length} articles, ${totalRewrites} internal links, ${changed} changed`);
