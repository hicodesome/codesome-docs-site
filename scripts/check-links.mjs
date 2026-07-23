import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articles, internalDocumentTargets } from './cdc-manifest.mjs';
import { SITE_ONLY_ARTICLES, SITE_ONLY_SITES } from './content-baseline.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const articleNames = new Set(articles.map(article => article.site));
const discoveredArticles = readdirSync(root)
  .filter(file => /^\d{2}-.*\.md$/.test(file))
  .sort();
const expectedArticles = [...articleNames, ...SITE_ONLY_SITES].sort();
const errors = [];

if (JSON.stringify(discoveredArticles) !== JSON.stringify(expectedArticles)) {
  errors.push('站点正文文件集合与已登记文章清单（CDC 25 篇 + 站点独有文章）不一致');
}

const files = [...expectedArticles, 'README.md', '_sidebar.md'];
let localLinks = 0;

for (const file of files) {
  const content = readFileSync(resolve(root, file), 'utf8');

  if (/<\[[^\]]+\]\([^)]+\.md\)>/.test(content)) {
    errors.push(`${file}: 站内 Markdown 链接外存在多余尖括号`);
  }

  for (const token of internalDocumentTargets.keys()) {
    if (content.includes(token)) {
      errors.push(`${file}: 已知 CDC 内部飞书链接未改为站内链接 (${token})`);
    }
  }

  for (const match of content.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+\.md(?:#[^)]+)?)\)/g)) {
    const target = decodeURIComponent(match[1].split('#')[0]).replace(/^\.\//, '').replace(/^\//, '');
    localLinks++;
    if (!existsSync(resolve(root, target))) {
      errors.push(`${file}: Markdown 断链 -> ${match[1]}`);
    }
  }
}

const sidebar = readFileSync(resolve(root, '_sidebar.md'), 'utf8');
const homepageSite = '03-Agentic入门宝典.md';
for (const article of [...articles, ...SITE_ONLY_ARTICLES]) {
  const articleOccurrences = sidebar.split(`(${article.site})`).length - 1;
  const homepageOccurrences = article.site === homepageSite
    ? (sidebar.match(/\]\(\/\)/g) || []).length
    : 0;
  const occurrences = articleOccurrences + homepageOccurrences;
  if (occurrences !== 1) {
    errors.push(`_sidebar.md: ${article.site} should appear once, found ${occurrences}`);
  }
  const titleLink = sidebar.includes(`[${article.title}](${article.site})`) ||
    (article.site === homepageSite && sidebar.includes(`[${article.title}](/)`));
  if (!titleLink) {
    errors.push(`_sidebar.md: 侧边栏标题与登记标题不一致 (${article.title})`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`链接检查通过：${articles.length} 篇 CDC 正文 + ${SITE_ONLY_ARTICLES.length} 篇站点独有文章，${localLinks} 条本地 Markdown 链接，已知内部飞书链接残留 0 条`);
