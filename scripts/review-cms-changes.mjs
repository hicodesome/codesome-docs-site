#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { redactSecrets, scanAddedDiffForSecrets } from './secret-patterns.mjs';

const REPO = 'hicodesome/codesome-docs-site';
const API_ROOT = `https://api.github.com/repos/${REPO}`;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_DIFF_BYTES = 12 * 1024 * 1024;
const TOKEN_ENV_NAMES = [
  'CODESOME_CMS_REVIEW_TOKEN',
  'GH_TOKEN',
  'GITHUB_TOKEN'
];

function isCmsBranch(value) {
  return typeof value === 'string' &&
    /^cms\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value) &&
    !value.includes('..') &&
    !value.includes('//') &&
    !value.endsWith('/') &&
    !value.endsWith('.');
}

export function isAllowedCmsChangedPath(path) {
  if (
    typeof path !== 'string' ||
    path.includes('\\') ||
    /[\u0000-\u001f]/.test(path) ||
    path.split('/').some(segment => !segment || segment === '.' || segment === '..')
  ) return false;
  return /^\d{2}-[^/]+\.md$/.test(path) || path.startsWith('images/uploads/');
}

export function selectCmsCandidates(pulls, refs, requestedPr) {
  const branches = new Map();
  for (const ref of refs) {
    const branch = typeof ref?.ref === 'string' ? ref.ref.replace(/^refs\/heads\//, '') : '';
    if (isCmsBranch(branch) && typeof ref?.object?.sha === 'string') {
      branches.set(branch, { branch, sha: ref.object.sha, pull: null });
    }
  }

  for (const pull of pulls) {
    const branch = pull?.head?.ref;
    if (
      pull?.state !== 'open' ||
      !isCmsBranch(branch) ||
      pull?.base?.ref !== 'main' ||
      pull?.base?.repo?.full_name !== REPO ||
      pull?.head?.repo?.full_name !== REPO ||
      typeof pull?.head?.sha !== 'string'
    ) continue;
    branches.set(branch, { branch, sha: pull.head.sha, pull });
  }

  const candidates = [...branches.values()]
    .filter(candidate => requestedPr === undefined || candidate.pull?.number === requestedPr)
    .sort((left, right) => {
      const leftNumber = left.pull?.number ?? Number.MAX_SAFE_INTEGER;
      const rightNumber = right.pull?.number ?? Number.MAX_SAFE_INTEGER;
      return leftNumber - rightNumber || left.branch.localeCompare(right.branch);
    });
  if (requestedPr !== undefined && !candidates.length) {
    throw new Error(`open cms/* pull request #${requestedPr} was not found`);
  }
  return candidates;
}

function tokenCandidates() {
  const candidates = [];
  for (const name of TOKEN_ENV_NAMES) {
    if (process.env[name]) candidates.push({ source: name, token: process.env[name] });
  }
  try {
    const token = execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (token) candidates.push({ source: 'gh auth', token });
  } catch {
    // The unauthenticated public-repository fallback is still attempted below.
  }
  candidates.push({ source: 'public API', token: '' });
  return candidates.filter((candidate, index, all) =>
    all.findIndex(other => other.token === candidate.token) === index
  );
}

function requestHeaders(token, accept = 'application/vnd.github+json') {
  return {
    Accept: accept,
    'User-Agent': 'codesome-cms-review',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function githubRequest(path, { token, accept } = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: requestHeaders(token, accept)
  });
  if (!response.ok) throw new Error(`GitHub API returned HTTP ${response.status} for ${path.split('?')[0]}`);
  return response;
}

async function resolveReadToken() {
  const failures = [];
  for (const candidate of tokenCandidates()) {
    let response;
    try {
      response = await fetch(API_ROOT, {
        headers: requestHeaders(candidate.token)
      });
    } catch {
      failures.push(`${candidate.source}=network-error`);
      continue;
    }
    if (response.ok) return candidate.token;
    failures.push(`${candidate.source}=HTTP-${response.status}`);
  }
  throw new Error(`GitHub API authentication preflight failed (${failures.join(', ')})`);
}

async function githubJson(path, options) {
  return (await githubRequest(path, options)).json();
}

async function pagedJson(path, { token } = {}) {
  const separator = path.includes('?') ? '&' : '?';
  const items = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await githubJson(`${path}${separator}per_page=100&page=${page}`, { token });
    if (!Array.isArray(batch)) throw new Error(`GitHub API returned a non-list for ${path.split('?')[0]}`);
    items.push(...batch);
    if (batch.length < 100) return items;
  }
  throw new Error(`GitHub API pagination limit exceeded for ${path.split('?')[0]}`);
}

async function githubDiff(path, { token } = {}) {
  const response = await githubRequest(path, {
    token,
    accept: 'application/vnd.github.v3.diff'
  });
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_DIFF_BYTES) throw new Error('CMS diff exceeds the 12 MiB review limit');
  const diff = await response.text();
  if (Buffer.byteLength(diff) > MAX_DIFF_BYTES) throw new Error('CMS diff exceeds the 12 MiB review limit');
  return diff;
}

async function candidateChanges(candidate, token) {
  if (candidate.pull) {
    const files = await pagedJson(`/pulls/${candidate.pull.number}/files`, { token });
    const diff = await githubDiff(`/pulls/${candidate.pull.number}`, { token });
    return { files, diff };
  }
  const comparisonPath = `/compare/main...${encodeURIComponent(candidate.sha)}`;
  const comparison = await githubJson(comparisonPath, { token });
  const diff = await githubDiff(comparisonPath, { token });
  return { files: comparison.files ?? [], diff };
}

function checkEnvironment() {
  const environment = { ...process.env };
  for (const name of Object.keys(environment)) {
    if (/(?:TOKEN|SECRET|PASSWORD|CREDENTIAL|API_KEY|PRIVATE_KEY)/i.test(name)) {
      delete environment[name];
    }
  }
  return environment;
}

function ensureCommit(sha) {
  try {
    execFileSync('git', ['cat-file', '-e', `${sha}^{commit}`], {
      cwd: ROOT,
      stdio: 'ignore'
    });
  } catch {
    execFileSync('git', ['fetch', '--no-tags', '--quiet', 'origin', sha], {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'pipe']
    });
  }
}

function isolatedChecks(sha) {
  ensureCommit(sha);
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'codesome-cms-review-'));
  const checkout = join(temporaryRoot, 'checkout');
  try {
    execFileSync('git', ['-c', 'core.hooksPath=/dev/null', 'worktree', 'add', '--detach', checkout, sha], {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'pipe']
    });
    const result = spawnSync('npm', ['run', 'check:cms'], {
      cwd: checkout,
      env: checkEnvironment(),
      encoding: 'utf8',
      timeout: 5 * 60 * 1000,
      maxBuffer: 8 * 1024 * 1024
    });
    const diagnostic = `${result.stdout || ''}\n${result.stderr || ''}`
      .replaceAll(temporaryRoot, '[isolated-checkout]');
    return {
      ok: result.status === 0,
      diagnostic: diagnostic.trim()
    };
  } finally {
    try {
      execFileSync('git', ['-c', 'core.hooksPath=/dev/null', 'worktree', 'remove', '--force', checkout], {
        cwd: ROOT,
        stdio: 'ignore'
      });
    } catch {
      // The exact temporary directory is removed below even if worktree registration failed.
    }
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function safeCell(value) {
  return redactSecrets(String(value ?? ''))
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('`', '\\`')
    .replaceAll('|', '\\|')
    .replace(/[\r\n]+/g, ' ');
}

function safeDiagnostic(value) {
  return redactSecrets(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function boundedDiagnostic(value) {
  const safe = safeDiagnostic(value).trim();
  if (!safe) return '';
  return safe.length <= 3500 ? safe : `${safe.slice(0, 3500)}\n[diagnostic truncated]`;
}

export function renderReviewSummary(results, generatedAt = new Date().toISOString()) {
  const lines = [
    '# Codesome CMS change review',
    '',
    `- Repository: \`${REPO}\``,
    `- Generated: \`${generatedAt}\``,
    '- Mode: read-only discovery and validation; no pull request was merged',
    `- Candidates: ${results.length}`,
    ''
  ];
  if (!results.length) {
    lines.push('No open `cms/*` pull request or branch was found.', '');
    return `${lines.join('\n')}\n`;
  }

  for (const result of results) {
    const label = result.pullNumber ? `PR #${result.pullNumber}` : 'branch without PR';
    lines.push(`## ${safeCell(result.branch)} (${label})`, '');
    lines.push(`- Head: \`${safeCell(result.sha)}\``);
    lines.push(`- Changed files: ${result.files.length}; unified diff read: ${result.diffRead ? 'yes' : 'no'}`);
    lines.push(`- Changed-path policy: ${result.disallowedPaths.length ? 'FAIL' : 'PASS'}`);
    lines.push(`- Added-line secret scan: ${result.secretFindings.length ? 'FAIL' : 'PASS'}`);
    lines.push(`- Documentation/link/image/secret checks: ${result.checks.ok ? 'PASS' : result.checks.skipped ? 'SKIPPED' : 'FAIL'}`);
    lines.push('', '| File | Status | Additions | Deletions |', '|---|---:|---:|---:|');
    for (const file of result.files) {
      lines.push(`| ${safeCell(file.filename)} | ${safeCell(file.status)} | ${Number(file.additions || 0)} | ${Number(file.deletions || 0)} |`);
    }
    if (!result.files.length) lines.push('| (none) | - | 0 | 0 |');
    if (result.disallowedPaths.length) {
      lines.push('', `Disallowed paths: ${result.disallowedPaths.map(path => `\`${safeCell(path)}\``).join(', ')}`);
    }
    if (result.secretFindings.length) {
      lines.push('', 'Potential secrets were found in added diff lines. Values are intentionally omitted.');
      for (const finding of result.secretFindings) {
        lines.push(`- \`${safeCell(finding.path)}:${finding.line}\` (${safeCell(finding.name)})`);
      }
    }
    const diagnostic = boundedDiagnostic(result.checks.diagnostic);
    if (diagnostic && !result.checks.ok) {
      lines.push('', '<details><summary>Sanitized check diagnostic</summary>', '', '<pre>', diagnostic, '</pre>', '', '</details>');
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (!['--output', '--pr'].includes(arg)) throw new Error(`unknown argument: ${arg}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${arg} requires a value`);
    if (arg === '--output') options.output = value;
    if (arg === '--pr') {
      options.pr = Number(value);
      if (!Number.isSafeInteger(options.pr) || options.pr < 1) throw new Error('--pr must be a positive integer');
    }
    index += 1;
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: node scripts/review-cms-changes.mjs [--pr NUMBER] [--output PATH]');
    return;
  }
  const token = await resolveReadToken();
  const [pulls, refs] = await Promise.all([
    pagedJson('/pulls?state=open', { token }),
    pagedJson('/git/matching-refs/heads/cms/', { token })
  ]);
  const candidates = selectCmsCandidates(pulls, refs, options.pr);
  const results = [];
  for (const candidate of candidates) {
    const { files, diff } = await candidateChanges(candidate, token);
    const paths = files.flatMap(file => [file.filename, file.previous_filename].filter(Boolean));
    const disallowedPaths = [...new Set(paths.filter(path => !isAllowedCmsChangedPath(path)))];
    const secretFindings = scanAddedDiffForSecrets(diff);
    const checks = disallowedPaths.length || secretFindings.length
      ? { ok: false, skipped: true, diagnostic: 'Checks skipped because a pre-check failed.' }
      : { ...isolatedChecks(candidate.sha), skipped: false };
    results.push({
      branch: candidate.branch,
      sha: candidate.sha,
      pullNumber: candidate.pull?.number,
      files,
      diffRead: true,
      disallowedPaths,
      secretFindings,
      checks
    });
  }
  const summary = renderReviewSummary(results);
  if (options.output) {
    writeFileSync(resolve(options.output), summary, 'utf8');
    console.log(`CMS review summary written for ${results.length} candidate(s)`);
  } else {
    process.stdout.write(summary);
  }
  if (results.some(result => result.disallowedPaths.length || result.secretFindings.length || !result.checks.ok)) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`CMS review failed: ${redactSecrets(error.message)}`);
    process.exitCode = 1;
  });
}
