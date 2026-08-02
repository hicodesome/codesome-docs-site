#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, posix, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  articles as cdcArticles
} from './cdc-manifest.mjs';
import { assertCanonicalArticleMarkdown } from './markdown-headings.mjs';
import { extractPublicArticleTitle } from './public-articles.mjs';
import { verifyCdcProvenance, unverifiedCdcProvenance } from './cdc-provenance.mjs';

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imagePattern = /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^)]+?))\s*\)/g;
const manifestBySite = new Map(cdcArticles.map(article => [article.site, article]));
const args = process.argv.slice(2);

function hasFlag(flag) {
  return args.includes(flag);
}

function option(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
  return value;
}

function showHelp() {
  console.log(`Usage:
  node scripts/backup-articles.mjs [--dry-run] [--root PATH] [--output PATH]
  node scripts/backup-articles.mjs --verify [--output PATH]
  node scripts/backup-articles.mjs --verify --verify-source [--root PATH] [--output PATH]
  node scripts/backup-articles.mjs --verify --cdc-source PATH

Options:
  --dry-run       Discover and validate without writing the backup.
  --verify        Verify every copied file, the complete current article set, and backup H1s.
  --verify-source Compare manifest hashes with the current site files as well.
  --root PATH     Site repository root (defaults to this repository).
  --output PATH   Backup directory (defaults to docs/article-backup).
  --cdc-source PATH
                  Optional read-only CDC checkout; validates provenance only when supplied.
`);
}

if (hasFlag('--help') || hasFlag('-h')) {
  showHelp();
  process.exit(0);
}

const dryRun = hasFlag('--dry-run');
const verifyOnly = hasFlag('--verify');
if (dryRun && verifyOnly) throw new Error('--dry-run and --verify cannot be combined');

const root = resolve(option('--root', scriptRoot));
const output = resolve(option('--output', join(root, 'docs/article-backup')));
const cdcSourceOption = option('--cdc-source', undefined);
const cdcSource = cdcSourceOption || process.env.CDC_SOURCE
  ? resolve(cdcSourceOption || process.env.CDC_SOURCE)
  : undefined;

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function fileInfo(file) {
  const content = readFileSync(file);
  return { bytes: content.length, sha256: sha256(content) };
}

function isRegularFile(file) {
  try {
    return lstatSync(file).isFile();
  } catch {
    return false;
  }
}

function assertInside(base, target, label) {
  const basePath = resolve(base);
  const targetPath = resolve(target);
  if (targetPath !== basePath && !targetPath.startsWith(`${basePath}${sep}`)) {
    throw new Error(`${label} escapes its repository boundary: ${target}`);
  }
  return targetPath;
}

function sitePathFromImageTarget(rawTarget, articlePath, bracketed) {
  const raw = rawTarget.trim();
  if (!raw) throw new Error(`${articlePath}: empty image reference`);
  if (!bracketed && /\s/.test(raw)) {
    throw new Error(`${articlePath}: image reference with spaces must use angle brackets: ${raw}`);
  }

  let target = raw.split(/[?#]/, 1)[0];
  try {
    target = decodeURIComponent(target);
  } catch {
    throw new Error(`${articlePath}: invalid URL encoding in image reference: ${raw}`);
  }
  if (/^(?:https?:|data:|\/\/)/i.test(target)) {
    throw new Error(`${articlePath}: external image cannot be backed up: ${raw}`);
  }

  const withoutLeadingSlash = target.replace(/^\/+/, '');
  const normalised = posix.normalize(posix.join(posix.dirname(articlePath), withoutLeadingSlash));
  if (!normalised.startsWith('images/')) {
    throw new Error(`${articlePath}: image reference is outside images/: ${raw}`);
  }

  const destination = assertInside(root, join(root, ...normalised.split('/')), 'image reference');
  if (!isRegularFile(destination)) {
    throw new Error(`${articlePath}: missing image: ${normalised}`);
  }
  return normalised;
}

function extractImagePaths(content, articlePath) {
  const refs = [];
  for (const match of content.matchAll(imagePattern)) {
    refs.push(sitePathFromImageTarget(match[1] ?? match[2], articlePath, Boolean(match[1])));
  }
  return refs.sort();
}

function discoverArticles() {
  const files = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile() && /^\d{2}-.+\.md$/.test(entry.name))
    .map(entry => entry.name)
    .sort();
  if (!files.length) throw new Error(`no site article Markdown files found in ${root}`);

  const records = [];
  const imageUsers = new Map();
  for (const sitePath of files) {
    const content = readFileSync(join(root, sitePath), 'utf8');
    const title = extractPublicArticleTitle(content, sitePath);
    try {
      assertCanonicalArticleMarkdown(content, title);
    } catch (error) {
      throw new Error(`${sitePath}: ${error.message}`);
    }
    const imageReferences = extractImagePaths(content, sitePath);
    for (const imagePath of imageReferences) {
      const users = imageUsers.get(imagePath) ?? new Map();
      users.set(sitePath, (users.get(sitePath) ?? 0) + 1);
      imageUsers.set(imagePath, users);
    }

    records.push({
      sitePath,
      kind: manifestBySite.has(sitePath) ? 'cdc-provenance' : 'site-current',
      cdcSourcePath: manifestBySite.get(sitePath)?.source ?? null,
      ...fileInfo(join(root, sitePath)),
      backupPath: `articles/${sitePath}`,
      imageReferences
    });
  }

  const images = [...imageUsers.keys()].sort().map(sitePath => ({
    sitePath,
    ...fileInfo(join(root, ...sitePath.split('/'))),
    backupPath: sitePath,
    referenceCount: [...imageUsers.get(sitePath).values()].reduce((sum, count) => sum + count, 0),
    referencedBy: [...imageUsers.get(sitePath).keys()].sort()
  }));
  return { articles: records, images };
}

function contentFingerprint(discovered) {
  const stableContent = {
    articles: discovered.articles.map(article => ({
      sitePath: article.sitePath,
      sha256: article.sha256,
      imageReferences: article.imageReferences
    })),
    images: discovered.images.map(image => ({
      sitePath: image.sitePath,
      sha256: image.sha256,
      referenceCount: image.referenceCount,
      referencedBy: image.referencedBy
    }))
  };
  return sha256(Buffer.from(JSON.stringify(stableContent), 'utf8'));
}

function siteMetadata(discovered) {
  return {
    repository: 'hicodesome/codesome-docs-site',
    contentFingerprint: contentFingerprint(discovered)
  };
}

function buildManifest(cdc, site, discovered) {
  return {
    format: 'codesome-doc-site-article-backup',
    formatVersion: 2,
    generatedFrom: {
      site,
      cdc
    },
    scope: {
      articlePattern: '^\\d{2}-.+\\.md$ at the site repository root',
      articleCount: discovered.articles.length,
      uniqueImageCount: discovered.images.length,
      imageReferenceCount: discovered.articles.reduce(
        (count, article) => count + article.imageReferences.length,
        0
      )
    },
    articles: discovered.articles,
    images: discovered.images
  };
}

function writeIfChanged(file, content) {
  if (existsSync(file) && readFileSync(file).equals(Buffer.from(content))) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return true;
}

function copyIfChanged(source, destination) {
  const content = readFileSync(source);
  if (existsSync(destination) && isRegularFile(destination) && readFileSync(destination).equals(content)) {
    return false;
  }
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
  return true;
}

const backupReadme = `# 文档站文章备份

此目录由 scripts/backup-articles.mjs 生成，保存当前站点根目录文章（^\\d{2}-.+\\.md$）及其实际引用的本地图片。

## 边界

  - manifest.json 是当前站点真值的来源、稳定内容指纹、文章/图片路径、大小和 SHA-256 清单。
  - articles/ 与 images/ 只保存站点当前文件的副本，不复制 CDC 原始集合。
  - generatedFrom.cdc 仅记录固定 tag 的 provenance 状态，不会切换真值或改写正文；验证需显式提供 CDC checkout。
  - generatedFrom.site 只由当前公开文章和引用图片的稳定路径、哈希及引用关系计算，不写 Git HEAD、commitDate 或运行时间；无关 Git 提交不会改变清单。

## 运行

~~~bash
node scripts/backup-articles.mjs --dry-run
node scripts/backup-articles.mjs
node scripts/backup-articles.mjs --verify
node scripts/backup-articles.mjs --verify --cdc-source /path/to/hicodesome-docs-source
~~~

缺图、外部图片、越界图片引用都会失败。--verify 会确认清单完整覆盖当前站点文章、引用图片、备份文章 canonical H1 和当前文件哈希；追加 --verify-source 可再显式比对当前站点源文件。提供 --cdc-source 时只额外校验固定 CDC provenance。

## 恢复

恢复前先运行 --verify。将 articles/ 下文件复制回站点根目录、将 images/ 下文件复制回站点 images/，再运行站点 npm run check；清单中的 backupPath 与 sha256 用于逐文件核对，不能用 CDC 原始目录覆盖此备份。
`;

function currentArticlePaths() {
  const files = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile() && /^\d{2}-.+\.md$/.test(entry.name))
    .map(entry => entry.name)
    .sort();
  if (!files.length) throw new Error(`no site article Markdown files found in ${root}`);
  return files;
}

function comparableArticle(entry) {
  return {
    sitePath: entry.sitePath,
    kind: entry.kind,
    cdcSourcePath: entry.cdcSourcePath ?? null,
    bytes: entry.bytes,
    sha256: entry.sha256,
    backupPath: entry.backupPath,
    imageReferences: entry.imageReferences
  };
}

function comparableImage(entry) {
  return {
    sitePath: entry.sitePath,
    bytes: entry.bytes,
    sha256: entry.sha256,
    backupPath: entry.backupPath,
    referenceCount: entry.referenceCount,
    referencedBy: entry.referencedBy
  };
}

function verifyManifestArticleCoverage(manifest, discovered) {
  if (!Array.isArray(manifest.articles) || !Array.isArray(manifest.images)) {
    throw new Error('backup manifest articles and images must be arrays');
  }
  if (manifest.format !== 'codesome-doc-site-article-backup' || manifest.formatVersion !== 2) {
    throw new Error('unsupported backup manifest format');
  }
  if (manifest.scope?.articleCount !== discovered.articles.length) {
    throw new Error(`backup manifest article count differs: expected ${discovered.articles.length}, found ${manifest.scope?.articleCount}`);
  }

  const actualSites = manifest.articles.map(entry => entry?.sitePath);
  if (actualSites.some(site => typeof site !== 'string') || new Set(actualSites).size !== actualSites.length) {
    throw new Error('backup manifest article site paths must be unique strings');
  }
  if (JSON.stringify(manifest.articles.map(comparableArticle)) !== JSON.stringify(discovered.articles.map(comparableArticle))) {
    throw new Error('backup manifest does not cover exactly the current site article set');
  }
  if (JSON.stringify(manifest.images.map(comparableImage)) !== JSON.stringify(discovered.images.map(comparableImage))) {
    throw new Error('backup manifest does not cover exactly the current referenced image set');
  }

  for (const entry of manifest.articles) {
    if (typeof entry.backupPath !== 'string' || entry.backupPath.includes('..')) {
      throw new Error(`invalid article backup path: ${entry.backupPath}`);
    }
    const expectedBackupPath = `articles/${entry.sitePath}`;
    if (entry.backupPath !== expectedBackupPath) {
      throw new Error(`article backup path is not canonical: ${entry.sitePath}`);
    }
    const backupFile = assertInside(output, join(output, ...entry.backupPath.split('/')), 'article backup path');
    try {
      assertCanonicalArticleMarkdown(readFileSync(backupFile, 'utf8'), extractPublicArticleTitle(readFileSync(join(root, entry.sitePath), 'utf8'), entry.sitePath));
    } catch (error) {
      throw new Error(`${entry.sitePath}: backup article title contract failed (${error.message})`);
    }
  }
}

function relativeFiles(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  function visit(current, prefix = '') {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const target = join(current, entry.name);
      if (entry.isDirectory()) visit(target, relative);
      else if (entry.isFile()) files.push(relative);
    }
  }
  visit(directory);
  return files.sort();
}

function verifyExactBackupFiles(manifest) {
  const expected = new Set(['README.md', 'manifest.json']);
  for (const entry of [...manifest.articles, ...manifest.images]) expected.add(entry.backupPath);
  const actual = [
    ...relativeFiles(join(output, 'articles')).map(file => `articles/${file}`),
    ...relativeFiles(join(output, 'images')).map(file => `images/${file}`),
    ...(isRegularFile(join(output, 'README.md')) ? ['README.md'] : []),
    ...(isRegularFile(join(output, 'manifest.json')) ? ['manifest.json'] : [])
  ];
  const extras = actual.filter(file => !expected.has(file));
  const missing = [...expected].filter(file => !actual.includes(file));
  if (extras.length || missing.length) {
    throw new Error(`backup file set drifted${extras.length ? `; extra: ${extras.join(', ')}` : ''}${missing.length ? `; missing: ${missing.join(', ')}` : ''}`);
  }
}

function verifyBackup() {
  const manifestPath = join(output, 'manifest.json');
  if (!isRegularFile(manifestPath)) throw new Error(`backup manifest not found: ${manifestPath}`);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`invalid backup manifest: ${error.message}`);
  }
  if (cdcSource) verifyCdcProvenance(cdcSource);
  const discovered = discoverArticles();
  verifyManifestArticleCoverage(manifest, discovered);
  verifyExactBackupFiles(manifest);
  const entries = [...(manifest.articles ?? []), ...(manifest.images ?? [])];
  if (!entries.length) throw new Error('backup manifest contains no files');
  for (const entry of entries) {
    if (typeof entry.backupPath !== 'string' || entry.backupPath.includes('..')) {
      throw new Error(`invalid backup path in manifest: ${entry.backupPath}`);
    }
    const file = assertInside(output, join(output, ...entry.backupPath.split('/')), 'backup path');
    if (!isRegularFile(file)) throw new Error(`missing backup file: ${entry.backupPath}`);
    const actual = fileInfo(file);
    if (actual.bytes !== entry.bytes || actual.sha256 !== entry.sha256) {
      throw new Error(`backup hash mismatch: ${entry.backupPath}`);
    }
  }
  if (hasFlag('--verify-source')) {
    for (const entry of entries) {
      if (typeof entry.sitePath !== 'string') throw new Error('manifest entry has no source path');
      const source = assertInside(root, join(root, ...entry.sitePath.split('/')), 'source path');
      if (!isRegularFile(source)) throw new Error(`missing source file: ${entry.sitePath}`);
      const actual = fileInfo(source);
      if (actual.bytes !== entry.bytes || actual.sha256 !== entry.sha256) {
        throw new Error(`source hash mismatch: ${entry.sitePath}`);
      }
    }
  }
  if (!isRegularFile(join(output, 'README.md'))) throw new Error('backup README.md not found');
  console.log(
    `backup verify passed${hasFlag('--verify-source') ? ' with source hashes' : ''}: ` +
    `${manifest.articles.length} articles, ${manifest.images.length} unique images`
  );
}

function createBackup() {
  assertInside(root, output, 'backup output');
  if (output === root) throw new Error('backup output cannot be the site repository root');
  const cdc = cdcSource ? verifyCdcProvenance(cdcSource) : unverifiedCdcProvenance();
  const discovered = discoverArticles();
  const site = siteMetadata(discovered);
  const manifest = buildManifest(cdc, site, discovered);
  if (dryRun) {
    console.log(
      `backup dry-run: ${manifest.scope.articleCount} articles, ` +
      `${manifest.scope.uniqueImageCount} unique images, ` +
      `${manifest.scope.imageReferenceCount} image references; no files written`
    );
    return;
  }

  const expectedFiles = new Set(['README.md', 'manifest.json']);
  for (const article of discovered.articles) expectedFiles.add(article.backupPath);
  for (const image of discovered.images) expectedFiles.add(image.backupPath);
  let changedFiles = 0;
  for (const file of [
    ...relativeFiles(join(output, 'articles')).map(item => `articles/${item}`),
    ...relativeFiles(join(output, 'images')).map(item => `images/${item}`)
  ]) {
    if (expectedFiles.has(file)) continue;
    rmSync(join(output, ...file.split('/')), { force: true });
    changedFiles++;
  }
  for (const article of discovered.articles) {
    if (copyIfChanged(join(root, article.sitePath), join(output, ...article.backupPath.split('/')))) {
      changedFiles++;
    }
  }
  for (const image of discovered.images) {
    if (copyIfChanged(join(root, ...image.sitePath.split('/')), join(output, ...image.backupPath.split('/')))) {
      changedFiles++;
    }
  }
  if (writeIfChanged(join(output, 'README.md'), backupReadme)) changedFiles++;
  if (writeIfChanged(join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)) changedFiles++;
  console.log(
    `backup created: ${manifest.scope.articleCount} articles, ` +
    `${manifest.scope.uniqueImageCount} unique images, ${changedFiles} files changed`
  );
}

try {
  if (verifyOnly) verifyBackup();
  else createBackup();
} catch (error) {
  console.error(`backup failed: ${error.message}`);
  process.exit(1);
}
