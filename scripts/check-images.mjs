// 校验公开文章中的本地图片引用、可解析路径和可选的内容哈希版本。
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articleTitleEntries } from './title-metadata.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const imagePattern = /!\[[^\]]*\]\(\s*(?:<([^>]+)>|([^)]+?))\s*\)/g;
const refs = new Set();
const hashes = new Map();
const errors = [];

for (const article of articleTitleEntries) {
  const text = readFileSync(join(root, article.site), 'utf8');
  for (const match of text.matchAll(imagePattern)) {
    const target = (match[1] ?? match[2]).trim();
    const rawPath = target.split(/[?#]/, 1)[0];
    if (/^(?:https?:|data:|\/\/)/i.test(rawPath)) {
      errors.push(`外部图片不允许作为公开基准: ${article.site} -> ${target}`);
      continue;
    }
    let ref;
    try {
      ref = decodeURIComponent(rawPath).replace(/^\/+/, '');
    } catch {
      errors.push(`图片路径编码无效: ${article.site} -> ${target}`);
      continue;
    }
    if (!ref.startsWith('images/')) {
      errors.push(`图片引用必须位于 images/: ${article.site} -> ${target}`);
      continue;
    }

    const destination = resolve(root, ref);
    if (!destination.startsWith(`${resolve(root, 'images')}${sep}`) || !existsSync(destination)) {
      errors.push(`图片断链或越界: ${article.site} -> ${target}`);
      continue;
    }
    refs.add(ref);

    const query = target.indexOf('?');
    const version = query === -1 ? undefined : new URLSearchParams(target.slice(query + 1)).get('v');
    if (version === undefined) continue;
    if (!/^[0-9a-f]{64}$/.test(version)) continue;
    let actual = hashes.get(ref);
    if (!actual) {
      actual = createHash('sha256').update(readFileSync(destination)).digest('hex');
      hashes.set(ref, actual);
    }
    if (actual !== version) {
      errors.push(`图片内容哈希不一致: ${article.site} -> ${ref} (expected ${version}, found ${actual})`);
    }
  }
}

const orphans = existsSync(join(root, 'images'))
  ? readdirSync(join(root, 'images')).filter(file => !refs.has(`images/${file}`))
  : [];
if (orphans.length) console.warn(`孤儿图片（未被引用）: ${orphans.length} 个\n  ` + orphans.join('\n  '));

if (errors.length) console.error(errors.join('\n'));
console.log(`图片检查：${articleTitleEntries.length} 篇公开文章，${refs.size} 条本地引用，错误 ${errors.length} 条`);
process.exit(errors.length ? 1 : 0);
