import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = resolve(root, 'index.html');
const localOrigin = 'http://127.0.0.1/';

function resourcePath(source) {
  try {
    const url = new URL(source, localOrigin);
    if (url.origin !== localOrigin.slice(0, -1)) return null;
    return {
      path: decodeURIComponent(url.pathname).replace(/^\/+/, ''),
      version: url.searchParams.get('v') || ''
    };
  } catch {
    return null;
  }
}

export function isManagedResource(path) {
  return /^styles\/[^/]+\.css$/i.test(path) ||
    /^assets\/(?!vendor\/).+\.(?:js|css)$/i.test(path) ||
    /^scripts\/[^/]+\.(?:js|css)$/i.test(path);
}

export function declarations(indexText) {
  const result = new Map();
  for (const line of indexText.split(/\r?\n/)) {
    for (const match of line.matchAll(/\b(?:src|href)="([^"]+)"/gi)) {
      const resource = resourcePath(match[1]);
      if (!resource || !isManagedResource(resource.path)) continue;
      const entries = result.get(resource.path) || [];
      entries.push({ line, source: match[1], version: resource.version });
      result.set(resource.path, entries);
    }
  }
  return result;
}

export function checkIndexCacheVersions(indexText) {
  const errors = [];
  const entries = declarations(indexText);
  for (const [path, resources] of entries) {
    for (const resource of resources) {
      if (!resource.version) {
        errors.push(`browser resource lacks a non-empty ?v= cache version in index.html: ${path}`);
      }
    }
  }
  return { errors, entries };
}

export function checkChangedCacheVersions(baseIndex, currentIndex, changedPaths) {
  const errors = [];
  const current = checkIndexCacheVersions(currentIndex).entries;
  const base = declarations(baseIndex);
  for (const path of changedPaths) {
    if (!isManagedResource(path)) continue;
    const currentEntries = current.get(path);
    if (!currentEntries) continue;
    const baseEntries = base.get(path) || [];
    for (const currentEntry of currentEntries) {
      if (baseEntries.some(baseEntry => baseEntry.line === currentEntry.line)) {
        errors.push(`browser resource changed without bumping its index.html cache version: ${path}`);
      }
    }
  }
  return errors;
}

function gitText(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

function resolveBaseRef() {
  const explicit = process.argv[2] || process.env.CACHE_VERSION_BASE;
  if (explicit) return explicit;
  if (process.env.GITHUB_EVENT_NAME === 'pull_request' && process.env.GITHUB_BASE_REF) {
    return `origin/${process.env.GITHUB_BASE_REF}`;
  }
  try {
    return gitText(['rev-parse', 'HEAD^']).trim();
  } catch {
    return '';
  }
}

function changedResources(baseRef) {
  if (!baseRef) return [];
  return gitText([
    'diff', '--name-only', '-z', '--diff-filter=ACMRT', baseRef, 'HEAD', '--',
    'styles/*.css', 'scripts/*.js', 'assets/*.js', 'assets/*.css'
  ]).split('\0').filter(Boolean);
}

function main() {
  const index = readFileSync(indexPath, 'utf8');
  const errors = [...checkIndexCacheVersions(index).errors];
  for (const [path] of declarations(index)) {
    if (!existsSync(resolve(root, path))) errors.push(`browser resource does not exist: ${path}`);
  }

  const baseRef = resolveBaseRef();
  if (baseRef) {
    let baseIndex;
    try {
      baseIndex = gitText(['show', `${baseRef}:index.html`]);
    } catch (error) {
      throw new Error(`could not read cache-version comparison base ${baseRef}: ${error.message}`);
    }
    errors.push(...checkChangedCacheVersions(baseIndex, index, changedResources(baseRef)));
  }

  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Cache version check passed${baseRef ? ` against ${baseRef}` : ''}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
