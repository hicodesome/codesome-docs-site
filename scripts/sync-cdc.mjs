import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  articles,
  CDC_COMMIT,
  CDC_IMAGE_COUNT,
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

function gitText(...args) {
  return execFileSync('git', ['-C', sourceRepo, ...args], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  });
}

function gitBinary(...args) {
  return execFileSync('git', ['-C', sourceRepo, ...args], {
    maxBuffer: 16 * 1024 * 1024
  });
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function imagePattern() {
  return /(!\[[^\]]*\]\()\s*(?:<([^>]+)>|([^)]+?))\s*(\))/g;
}

function imagePathFromTarget(target) {
  const path = target.trim().split(/[?#]/, 1)[0];
  return path.startsWith('images/') ? path : undefined;
}

const tagCommit = gitText('rev-parse', `${CDC_TAG}^{commit}`).trim();
if (tagCommit !== CDC_COMMIT) {
  console.error(`CDC tag mismatch: expected ${CDC_COMMIT}, found ${tagCommit}`);
  process.exit(1);
}

const snapshotFiles = gitText('ls-tree', '-r', '--name-only', '-z', CDC_TAG)
  .split('\0')
  .filter(file => file.endsWith('.md'))
  .filter(file => !['IMPORT_REPORT.md', 'README.md', 'SOURCE_SNAPSHOT.md'].includes(file))
  .sort();
const manifestFiles = articles.map(article => article.source).sort();
if (JSON.stringify(snapshotFiles) !== JSON.stringify(manifestFiles)) {
  console.error('CDC article manifest does not match the 25 Markdown files in the fixed tag');
  process.exit(1);
}

const sourceArticles = new Map();
const imagePaths = new Set();

for (const article of articles) {
  const source = gitText('show', `${CDC_TAG}:${article.source}`);
  sourceArticles.set(article.source, source);

  for (const match of source.matchAll(imagePattern())) {
    const imagePath = imagePathFromTarget(match[2] ?? match[3]);
    if (imagePath) imagePaths.add(imagePath);
  }
}

if (imagePaths.size !== CDC_IMAGE_COUNT) {
  console.error(`CDC image reference mismatch: expected ${CDC_IMAGE_COUNT}, found ${imagePaths.size}`);
  process.exit(1);
}

const snapshotImages = new Map();
for (const imagePath of [...imagePaths].sort()) {
  const content = gitBinary('show', `${CDC_TAG}:${imagePath}`);
  snapshotImages.set(imagePath, { content, hash: sha256(content) });
}

function renderArticle(source) {
  let rewrites = 0;
  let content = source.replace(imagePattern(), (match, prefix, bracketed, bare, suffix) => {
    const imagePath = imagePathFromTarget(bracketed ?? bare);
    if (!imagePath) return match;
    const snapshot = snapshotImages.get(imagePath);
    if (!snapshot) throw new Error(`CDC image is not loaded: ${imagePath}`);
    return `${prefix}<${imagePath}?v=${snapshot.hash}>${suffix}`;
  });

  content = content.replace(/\]\((https?:\/\/[^)\s]+)\)/g, (match, url) => {
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

let changedArticles = 0;
let changedImages = 0;
let totalRewrites = 0;
const articleMismatches = [];
const imageMismatches = [];

for (const article of articles) {
  const source = sourceArticles.get(article.source);
  const rendered = renderArticle(source);
  const destination = resolve(root, article.site);
  const current = readFileSync(destination, 'utf8');
  totalRewrites += rendered.rewrites;

  if (current === rendered.content) continue;
  changedArticles++;
  if (checkOnly) {
    articleMismatches.push(article.site);
  } else {
    writeFileSync(destination, rendered.content, 'utf8');
  }
}

for (const [imagePath, snapshot] of snapshotImages) {
  const destination = resolve(root, imagePath);
  const current = existsSync(destination) ? readFileSync(destination) : undefined;
  if (current?.equals(snapshot.content)) continue;

  changedImages++;
  if (checkOnly) {
    imageMismatches.push(imagePath);
  } else {
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, snapshot.content);
  }
}

if (articleMismatches.length || imageMismatches.length) {
  if (articleMismatches.length) {
    console.error(`CDC article mismatch (${articleMismatches.length}):\n  ${articleMismatches.join('\n  ')}`);
  }
  if (imageMismatches.length) {
    console.error(`CDC image mismatch (${imageMismatches.length}):\n  ${imageMismatches.join('\n  ')}`);
  }
  process.exit(1);
}

const action = checkOnly ? 'validated' : 'synchronized';
console.log(
  `CDC ${action}: ${articles.length} articles, ${totalRewrites} internal links, ` +
  `${snapshotImages.size} images, ${changedArticles} articles changed, ${changedImages} images changed`
);
