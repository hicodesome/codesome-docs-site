import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { internalDocumentTargets } from './cdc-manifest.mjs';
import { articleTitleEntries } from './title-metadata.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const articleNames = new Set(articleTitleEntries.map(article => article.site));
const trackedFiles = new Set(
  execFileSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(Boolean)
    .filter(file => existsSync(resolve(root, file)))
);
const diskFiles = new Set(
  readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
);
const knownFiles = new Set([...trackedFiles, ...diskFiles]);
const discoveredArticles = [...knownFiles]
  .filter(file => /^\d{2}-.*\.md$/.test(file))
  .sort();
const expectedArticles = [...articleNames].sort();
const errors = [];

if (JSON.stringify(discoveredArticles) !== JSON.stringify(expectedArticles)) {
  errors.push('站点正文文件集合与自动发现的公开文章集合不一致');
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
    if (!knownFiles.has(target)) {
      errors.push(`${file}: Markdown 断链 -> ${match[1]}`);
    }
  }
}

const sidebar = readFileSync(resolve(root, '_sidebar.md'), 'utf8');
const homepageSite = '03-Agentic入门宝典.md';
const sidebarArticleTargets = [...sidebar.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)]
  .map(match => decodeURIComponent(match[1].split('#')[0]).replace(/^\.\//, '').replace(/^\//, ''))
  .filter(target => target.endsWith('.md'));
const expectedArticleSet = new Set(expectedArticles);
const sidebarArticleSet = new Set(sidebarArticleTargets);
if ((sidebar.match(/\]\(\/\)/g) || []).length > 0) {
  sidebarArticleSet.add(homepageSite);
}

for (const target of sidebarArticleSet) {
  if (!expectedArticleSet.has(target)) {
    errors.push(`_sidebar.md: 未登记文章入口 -> ${target}`);
  }
}
for (const target of expectedArticles) {
  if (!sidebarArticleSet.has(target)) {
    errors.push(`_sidebar.md: 已登记文章没有入口 -> ${target}`);
  }
}

for (const article of articleTitleEntries) {
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

console.log(`链接检查通过：${articleTitleEntries.length} 篇自动发现的公开文章，${localLinks} 条本地 Markdown 链接，已知内部飞书链接残留 0 条`);
