#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, posix, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  articles as cdcArticles,
  CDC_COMMIT,
  CDC_IMAGE_COUNT,
  CDC_TAG
} from './cdc-manifest.mjs';
import {
  LATEST_BASELINE_SITES,
  SITE_ONLY_SITES
} from './content-baseline.mjs';

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
  node scripts/backup-articles.mjs [--dry-run] [--root PATH] [--output PATH] [--cdc-source PATH]
  node scripts/backup-articles.mjs --verify [--output PATH]
  node scripts/backup-articles.mjs --verify --verify-source [--root PATH] [--output PATH]

Options:
  --dry-run       Discover and validate without writing the backup.
  --verify        Read the backup manifest and verify every copied file hash.
  --verify-source Compare manifest hashes with the current site files as well.
  --root PATH     Site repository root (defaults to this repository).
  --output PATH   Backup directory (defaults to docs/article-backup).
  --cdc-source PATH
                  Read-only hicodesome-docs-source checkout containing the fixed CDC tag.
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
const defaultCdcSource = resolve(root, '..', '..', 'hicodesome-docs-source');
const cdcSource = resolve(option('--cdc-source', process.env.CDC_SOURCE ?? defaultCdcSource));

function gitText(repository, ...gitArgs) {
  try {
    return execFileSync('git', ['-C', repository, ...gitArgs], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024
    });
  } catch (error) {
    const detail = String(error.stderr || error.message).split('\n')[0];
    throw new Error(`git ${gitArgs.join(' ')} failed in ${repository}: ${detail}`);
  }
}

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

function cdcImagePath(rawTarget) {
  const target = rawTarget.trim().split(/[?#]/, 1)[0];
  return target.startsWith('images/') ? target : undefined;
}

function verifyCdcSnapshot() {
  if (!isRegularFile(join(cdcSource, '.git')) && !existsSync(join(cdcSource, '.git'))) {
    throw new Error(`CDC source checkout not found: ${cdcSource}`);
  }

  const verifiedCommit = gitText(cdcSource, 'rev-parse', `${CDC_TAG}^{commit}`).trim();
  if (verifiedCommit !== CDC_COMMIT) {
    throw new Error(`CDC tag mismatch: expected ${CDC_COMMIT}, found ${verifiedCommit}`);
  }

  const expectedArticles = cdcArticles.map(article => article.source).sort();
  const snapshotArticles = gitText(cdcSource, 'ls-tree', '-r', '--name-only', '-z', CDC_TAG)
    .split('\0')
    .filter(file => file.endsWith('.md'))
    .filter(file => !['IMPORT_REPORT.md', 'README.md', 'SOURCE_SNAPSHOT.md'].includes(file))
    .sort();
  if (JSON.stringify(snapshotArticles) !== JSON.stringify(expectedArticles)) {
    throw new Error('CDC snapshot Markdown collection does not match cdc-manifest.mjs');
  }

  const imagePaths = new Set();
  for (const article of cdcArticles) {
    const content = gitText(cdcSource, 'show', `${CDC_TAG}:${article.source}`);
    for (const match of content.matchAll(imagePattern)) {
      const imagePath = cdcImagePath(match[1] ?? match[2]);
      if (imagePath) imagePaths.add(imagePath);
    }
  }
  if (imagePaths.size !== CDC_IMAGE_COUNT) {
    throw new Error(`CDC image reference mismatch: expected ${CDC_IMAGE_COUNT}, found ${imagePaths.size}`);
  }
  for (const imagePath of imagePaths) {
    gitText(cdcSource, 'cat-file', '-e', `${CDC_TAG}:${imagePath}`);
  }

  return {
    tag: CDC_TAG,
    commit: verifiedCommit,
    commitDate: gitText(cdcSource, 'show', '-s', '--format=%cI', `${CDC_TAG}^{commit}`).trim(),
    articleCount: snapshotArticles.length,
    referencedImageCount: imagePaths.size
  };
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
    const article = manifestBySite.get(sitePath);
    if (!article && !SITE_ONLY_SITES.has(sitePath)) {
      throw new Error(`site article is not registered in CDC or site-only baseline: ${sitePath}`);
    }
    const content = readFileSync(join(root, sitePath), 'utf8');
    const imageReferences = extractImagePaths(content, sitePath);
    for (const imagePath of imageReferences) {
      const users = imageUsers.get(imagePath) ?? new Map();
      users.set(sitePath, (users.get(sitePath) ?? 0) + 1);
      imageUsers.set(imagePath, users);
    }

    records.push({
      sitePath,
      kind: article ? 'cdc-slot' : 'site-only',
      baseline: LATEST_BASELINE_SITES.has(sitePath) ? 'latest' : null,
      cdcSourcePath: article?.source ?? null,
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

function siteMetadata() {
  const commit = gitText(root, 'rev-parse', 'HEAD').trim();
  return {
    commit,
    commitDate: gitText(root, 'show', '-s', '--format=%cI', 'HEAD').trim(),
    branch: gitText(root, 'branch', '--show-current').trim() || null
  };
}

function buildManifest(cdc, site, discovered) {
  return {
    format: 'codesome-doc-site-article-backup',
    formatVersion: 1,
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

- manifest.json 是来源、提交时间、文章/图片路径、大小和 SHA-256 清单。
- articles/ 与 images/ 只保存站点当前文件的副本，不复制 CDC 原始集合。
- CDC 来源只读校验固定 tag cdc-snapshot-2026-07-14，不会切换真值、改写正文或放宽 sync-cdc。
- 清单中的站点提交时间来自站点 Git HEAD；备份命令不写入不稳定的运行时间，因此重复执行不会产生无意义差异。

## 运行

~~~bash
node scripts/backup-articles.mjs --dry-run --cdc-source /path/to/hicodesome-docs-source
node scripts/backup-articles.mjs --cdc-source /path/to/hicodesome-docs-source
node scripts/backup-articles.mjs --verify
~~~

缺图、外部图片、越界图片引用或 CDC 固定快照不一致都会失败。--verify 独立读取本目录清单，逐文件进行 SHA-256 和字节数校验；追加 --verify-source 可再与当前站点源文件逐项比对。

## 恢复

恢复前先运行 --verify。将 articles/ 下文件复制回站点根目录、将 images/ 下文件复制回站点 images/，再运行站点 npm run check；清单中的 backupPath 与 sha256 用于逐文件核对，不能用 CDC 原始目录覆盖此备份。
`;

function verifyBackup() {
  const manifestPath = join(output, 'manifest.json');
  if (!isRegularFile(manifestPath)) throw new Error(`backup manifest not found: ${manifestPath}`);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`invalid backup manifest: ${error.message}`);
  }
  if (manifest.format !== 'codesome-doc-site-article-backup' || manifest.formatVersion !== 1) {
    throw new Error('unsupported backup manifest format');
  }
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
  const cdc = verifyCdcSnapshot();
  const site = siteMetadata();
  const discovered = discoverArticles();
  const manifest = buildManifest(cdc, site, discovered);
  if (dryRun) {
    console.log(
      `backup dry-run: ${manifest.scope.articleCount} articles, ` +
      `${manifest.scope.uniqueImageCount} unique images, ` +
      `${manifest.scope.imageReferenceCount} image references; no files written`
    );
    return;
  }

  let changedFiles = 0;
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
