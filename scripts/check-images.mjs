// 校验所有 md 文档中的 images/ 引用是否存在，并列出未被引用的孤儿图片。
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = decodeURIComponent(new URL('..', import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
const mdFiles = readdirSync(root).filter(f => f.endsWith('.md'));
const refRe = /!\[[^\]]*\]\(<?(images\/[^)>]+?)>?\)/g;

const refs = new Set();
let broken = 0;
for (const md of mdFiles) {
  const text = readFileSync(join(root, md), 'utf8');
  for (const [, ref] of text.matchAll(refRe)) {
    refs.add(ref);
    if (!existsSync(join(root, ref))) {
      console.error(`断链: ${md} -> ${ref}`);
      broken++;
    }
  }
}

const orphans = readdirSync(join(root, 'images')).filter(f => !refs.has(`images/${f}`));
if (orphans.length) console.warn(`孤儿图片（未被引用）: ${orphans.length} 个\n  ` + orphans.join('\n  '));

console.log(`共 ${refs.size} 条图片引用，断链 ${broken} 条`);
process.exit(broken ? 1 : 0);
