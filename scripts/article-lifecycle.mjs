import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCanonicalArticleMarkdown } from './markdown-headings.mjs';
import { extractPublicArticleTitle } from './public-articles.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sidebarPath = resolve(root, '_sidebar.md');
const articleNamePattern = /^\d{2}-.*\.md$/;

function usage() {
  console.log(`用法：
  node scripts/article-lifecycle.mjs add --site 文件.md --title 标题 [--type slot|site-only]
  node scripts/article-lifecycle.mjs replace --site 旧文件.md --to 新文件.md --title 新标题
  node scripts/article-lifecycle.mjs rename --from 旧文件.md --to 新文件.md [--title 新标题]
  node scripts/article-lifecycle.mjs remove --site 文件.md

说明：
  公开文章集合由站点根目录自动发现；--type 仅为旧命令兼容参数，不会写入人工基准名单。
  每个命令完成后会执行 baseline:refresh 和站点完整检查。`);
}

function fail(message) {
  throw new Error(message);
}

function parseOptions(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) fail(`未知参数: ${arg}`);
    const name = arg.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) fail(`参数 --${name} 需要值`);
    if (options[name]) fail(`参数重复: --${name}`);
    options[name] = value;
    index += 1;
  }
  return options;
}

function required(options, name) {
  if (!options[name]) fail(`缺少参数: --${name}`);
  return options[name];
}

function articleName(value, optionName) {
  if (!articleNamePattern.test(value) || value.includes('/')) {
    fail(`--${optionName} 必须是根目录文章文件名: ${value}`);
  }
  return value;
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function assertArticleSource(site, title) {
  try {
    assertCanonicalArticleMarkdown(read(resolve(root, site)), title);
  } catch (error) {
    fail(`${site} 标题契约不通过: ${error.message}`);
  }
}

function write(path, content) {
  writeFileSync(path, content, 'utf8');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function articleFiles() {
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.(?:md|html?|mjs|js)$/i.test(entry.name))
    .map(entry => entry.name)
    .filter(name => name !== 'article-titles.js');
}

function replaceSiteReferences(from, to) {
  for (const name of articleFiles()) {
    const path = resolve(root, name);
    const current = read(path);
    const next = current.replaceAll(from, to);
    if (next !== current) write(path, next);
  }
}

function replaceArticleLinks(from, to, title) {
  const linkPattern = new RegExp(`\\]\\((?:\\./)?${escapeRegExp(from)}\\)`, 'g');
  for (const name of articleFiles()) {
    const path = resolve(root, name);
    const current = read(path);
    const next = current
      .replace(linkPattern, `](${to})`)
      .replace(new RegExp(`\\[([^\\]]+)\\]\\(${escapeRegExp(to)}\\)`, 'g'), `[${title}](${to})`);
    if (next !== current) write(path, next);
  }
}

function addSidebarLink(site, title) {
  let content = read(sidebarPath);
  if (!content.includes(`](${site})`)) {
    if (!content.endsWith('\n')) content += '\n';
    content += `  - [${title}](${site})\n`;
  }
  write(sidebarPath, content);
}

function removeSidebarLink(site) {
  const pattern = new RegExp(`^.*\\]\\(${escapeRegExp(site)}\\)\\r?\\n?`, 'gm');
  write(sidebarPath, read(sidebarPath).replace(pattern, ''));
}

function removeSiteReferences(site) {
  const linkPattern = new RegExp(`\\[[^\\]]*\\]\\((?:\\./)?${escapeRegExp(site)}(?:#[^)]+)?\\)`, 'g');
  for (const name of articleFiles()) {
    const path = resolve(root, name);
    const current = read(path);
    const next = current.replace(linkPattern, '').replaceAll(site, '');
    if (next !== current) write(path, next);
  }
}

function runChecks() {
  execFileSync('npm', ['run', 'baseline:refresh'], { cwd: root, stdio: 'inherit' });
  execFileSync('npm', ['run', 'check'], { cwd: root, stdio: 'inherit' });
}

function addArticle(options) {
  const site = articleName(required(options, 'site'), 'site');
  const title = required(options, 'title');
  if (options.type && !['slot', 'site-only'].includes(options.type)) {
    fail('--type 只能是 slot 或 site-only');
  }
  if (!existsSync(resolve(root, site))) fail(`文章文件不存在: ${site}`);
  assertArticleSource(site, title);
  addSidebarLink(site, title);
  console.log(`已接入公开文章自动基准: ${site}`);
  runChecks();
}

function replaceArticle(options) {
  const from = articleName(required(options, 'site'), 'site');
  const to = articleName(required(options, 'to'), 'to');
  const title = required(options, 'title');
  if (from === to) fail('--site 与 --to 不能相同');
  if (!existsSync(resolve(root, to))) fail(`新文章文件不存在: ${to}`);
  if (existsSync(resolve(root, from))) fail(`旧文章文件仍存在，请先移除或归档: ${from}`);
  assertArticleSource(to, title);
  removeSidebarLink(from);
  replaceSiteReferences(from, to);
  replaceArticleLinks(from, to, title);
  addSidebarLink(to, title);
  console.log(`已替换公开文章: ${from} -> ${to}`);
  runChecks();
}

function renameArticle(options) {
  const from = articleName(required(options, 'from'), 'from');
  const to = articleName(required(options, 'to'), 'to');
  if (from === to) fail('--from 与 --to 不能相同');
  if (!existsSync(resolve(root, from))) fail(`找不到源文章: ${from}`);
  if (existsSync(resolve(root, to))) fail(`目标文章文件已存在: ${to}`);
  const source = read(resolve(root, from));
  const title = options.title ?? extractPublicArticleTitle(source, from);
  assertCanonicalArticleMarkdown(source, title);
  renameSync(resolve(root, from), resolve(root, to));
  removeSidebarLink(from);
  replaceSiteReferences(from, to);
  replaceArticleLinks(from, to, title);
  addSidebarLink(to, title);
  console.log(`已改名公开文章: ${from} -> ${to}`);
  runChecks();
}

function removeArticle(options) {
  const site = articleName(required(options, 'site'), 'site');
  if (!existsSync(resolve(root, site))) fail(`找不到文章: ${site}`);
  removeSidebarLink(site);
  removeSiteReferences(site);
  unlinkSync(resolve(root, site));
  console.log(`已删除公开文章并刷新当前基准: ${site}`);
  runChecks();
}

const [command, ...args] = process.argv.slice(2);
if (!command || command === '--help' || command === '-h') {
  usage();
  process.exit(command ? 0 : 2);
}

try {
  const options = parseOptions(args);
  if (command === 'add') addArticle(options);
  else if (command === 'replace') replaceArticle(options);
  else if (command === 'rename') renameArticle(options);
  else if (command === 'remove') removeArticle(options);
  else fail(`未知命令: ${command}`);
} catch (error) {
  console.error(`文章生命周期失败: ${error.message}`);
  process.exit(1);
}
