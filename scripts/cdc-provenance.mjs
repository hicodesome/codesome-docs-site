import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { articles, CDC_COMMIT, CDC_IMAGE_COUNT, CDC_TAG } from './cdc-manifest.mjs';

export const CDC_REPOSITORY = 'hicodesome/hicodesome-docs-source';

const imagePattern = /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^)]+?))\s*\)/g;

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

function imagePath(rawTarget) {
  const target = rawTarget.trim().split(/[?#]/, 1)[0];
  return target.startsWith('images/') ? target : undefined;
}

export function unverifiedCdcProvenance() {
  return {
    repository: CDC_REPOSITORY,
    tag: CDC_TAG,
    commit: CDC_COMMIT,
    status: 'not-checked',
    reason: 'CDC checkout is optional for the current site baseline'
  };
}

export function verifyCdcProvenance(sourceRepo) {
  const repository = resolve(sourceRepo);
  if (!existsSync(join(repository, '.git'))) {
    throw new Error(`CDC source checkout not found: ${repository}`);
  }

  const verifiedCommit = gitText(repository, 'rev-parse', `${CDC_TAG}^{commit}`).trim();
  if (verifiedCommit !== CDC_COMMIT) {
    throw new Error(`CDC tag mismatch: expected ${CDC_COMMIT}, found ${verifiedCommit}`);
  }

  const expectedArticles = articles.map(article => article.source).sort();
  const snapshotArticles = gitText(repository, 'ls-tree', '-r', '--name-only', '-z', CDC_TAG)
    .split('\0')
    .filter(file => file.endsWith('.md'))
    .filter(file => !['IMPORT_REPORT.md', 'README.md', 'SOURCE_SNAPSHOT.md'].includes(file))
    .sort();
  if (JSON.stringify(snapshotArticles) !== JSON.stringify(expectedArticles)) {
    throw new Error('CDC snapshot Markdown collection does not match cdc-manifest.mjs');
  }

  const imagePaths = new Set();
  for (const article of articles) {
    const content = gitText(repository, 'show', `${CDC_TAG}:${article.source}`);
    for (const match of content.matchAll(imagePattern)) {
      const path = imagePath(match[1] ?? match[2]);
      if (path) imagePaths.add(path);
    }
  }
  if (imagePaths.size !== CDC_IMAGE_COUNT) {
    throw new Error(`CDC image reference mismatch: expected ${CDC_IMAGE_COUNT}, found ${imagePaths.size}`);
  }
  for (const path of imagePaths) gitText(repository, 'cat-file', '-e', `${CDC_TAG}:${path}`);

  return {
    repository: CDC_REPOSITORY,
    tag: CDC_TAG,
    commit: verifiedCommit,
    status: 'verified',
    commitDate: gitText(repository, 'show', '-s', '--format=%cI', `${CDC_TAG}^{commit}`).trim(),
    articleCount: snapshotArticles.length,
    referencedImageCount: imagePaths.size
  };
}
