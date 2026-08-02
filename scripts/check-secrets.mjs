import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanTextForSecrets } from './secret-patterns.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scannedExtensions = /\.(?:md|html?|mjs|js)$/i;

function gitFiles(...args) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024
  })
    .split('\0')
    .filter(Boolean);
}

const candidates = new Set([
  ...gitFiles('ls-files', '-z'),
  ...gitFiles('diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'),
  ...gitFiles('ls-files', '--others', '--exclude-standard', '-z')
]);
const findings = [];

for (const relativePath of [...candidates].sort()) {
  if (!scannedExtensions.test(relativePath) || relativePath.startsWith('node_modules/')) continue;

  const absolutePath = resolve(root, relativePath);
  let content;
  try {
    content = readFileSync(absolutePath, 'utf8');
  } catch {
    continue;
  }

  findings.push(...scanTextForSecrets(content, relativePath));
}

if (findings.length) {
  console.error('敏感 Key 扫描失败：');
  for (const finding of findings) {
    console.error(`  ${finding.path}:${finding.line} (${finding.name} token pattern)`);
  }
  process.exit(1);
}

console.log(`敏感 Key 扫描通过：${[...candidates].filter(path => scannedExtensions.test(path)).length} 个候选文件`);
