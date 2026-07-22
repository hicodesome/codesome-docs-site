// 校验 CDC 正文中的图片引用、缓存版本和实际文件内容，并列出孤儿图片。
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articles } from './cdc-manifest.mjs';
import { LATEST_BASELINE_SITES } from './content-baseline.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imagePattern = /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^)]+?))\s*\)/g;

const refs = new Set();
const allRefs = new Set();
const hashes = new Map();
const errors = [];

for (const article of articles) {
  const isCdcArticle = !LATEST_BASELINE_SITES.has(article.site);
  const text = readFileSync(join(root, article.site), 'utf8');
  for (const match of text.matchAll(imagePattern)) {
    const target = (match[1] ?? match[2]).trim();
    const question = target.indexOf('?');
    const ref = question === -1 ? target : target.slice(0, question);
    if (!ref.startsWith('images/')) continue;

    allRefs.add(ref);
    const destination = join(root, ref);
    if (!existsSync(destination)) {
      errors.push(`断链: ${article.site} -> ${ref}`);
      continue;
    }
    if (!isCdcArticle) continue;

    refs.add(ref);

    const version = question === -1
      ? undefined
      : new URLSearchParams(target.slice(question + 1)).get('v');
    if (!version || !/^[0-9a-f]{64}$/.test(version)) {
      errors.push(`缺少完整 SHA-256 版本: ${article.site} -> ${target}`);
      continue;
    }

    let actual = hashes.get(ref);
    if (!actual) {
      actual = createHash('sha256').update(readFileSync(destination)).digest('hex');
      hashes.set(ref, actual);
    }
    if (actual !== version) {
      errors.push(`内容哈希不一致: ${article.site} -> ${ref} (expected ${version}, found ${actual})`);
    }
  }
}

const orphans = readdirSync(join(root, 'images')).filter(f => !allRefs.has(`images/${f}`));
if (orphans.length) console.warn(`孤儿图片（未被引用）: ${orphans.length} 个\n  ` + orphans.join('\n  '));

if (errors.length) console.error(errors.join('\n'));
console.log(`共 ${refs.size} 条 CDC 图片引用，内容哈希错误 ${errors.length} 条；全部教程图片引用 ${allRefs.size} 条`);
process.exit(errors.length ? 1 : 0);
