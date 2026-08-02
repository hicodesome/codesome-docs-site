import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCanonicalArticleMarkdown } from './markdown-headings.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = resolve(root, 'scripts/cdc-manifest.mjs');
const baselinePath = resolve(root, 'scripts/content-baseline.mjs');
const baselineDocPath = resolve(root, 'docs/CONTENT_BASELINE.md');
const sidebarPath = resolve(root, '_sidebar.md');
const articleNamePattern = /^\d{2}-.*\.md$/;

function usage() {
  console.log(`用法：
  node scripts/article-lifecycle.mjs add --site 文件.md --title 标题 --type slot|site-only [--source CDC源文件.md]
  node scripts/article-lifecycle.mjs replace --site 旧文件.md --to 新文件.md --title 新标题
  node scripts/article-lifecycle.mjs rename --from 旧文件.md --to 新文件.md [--title 新标题]
  node scripts/article-lifecycle.mjs remove --site 文件.md

说明：
  slot 新增必须提供 --source，并写入固定 CDC 槽位；replace 保留原 CDC source，要求新文件已就位、旧文件已移除。
  site-only 文章直接写入人工基准；remove 会删除 site-only 文件，slot 只增加 archived 标记并保留 CDC 槽位。`);
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

function jsString(value) {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replaceAll('\n', '\\n')}'`;
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

function objectBlocks(content) {
  return [...content.matchAll(/  \{\n(?:    .*\n)*?  \},?\n/g)].map(match => ({
    start: match.index,
    end: match.index + match[0].length,
    text: match[0]
  }));
}

function findEntry(content, site, label) {
  const needle = `site: ${jsString(site)},`;
  const entry = objectBlocks(content).find(block => block.text.includes(needle));
  if (!entry) fail(`${label} 未登记文章: ${site}`);
  return entry;
}

function replaceEntryField(block, field, value) {
  const pattern = new RegExp(`^    ${field}: .*?,?$`, 'm');
  if (!pattern.test(block)) fail(`登记项缺少字段 ${field}: ${block}`);
  return block.replace(pattern, `    ${field}: ${jsString(value)},`);
}

function replaceEntry(content, site, updates, label) {
  const entry = findEntry(content, site, label);
  let next = entry.text;
  for (const [field, value] of Object.entries(updates)) {
    next = replaceEntryField(next, field, value);
  }
  return content.slice(0, entry.start) + next + content.slice(entry.end);
}

function removeEntry(content, site, label) {
  const entry = findEntry(content, site, label);
  return content.slice(0, entry.start) + content.slice(entry.end);
}

function addEntry(content, arrayMarker, fields) {
  const arrayStart = content.indexOf(arrayMarker);
  const markerIndex = arrayStart === -1 ? -1 : content.indexOf('\n];', arrayStart);
  if (markerIndex === -1) fail(`找不到登记数组结束位置: ${arrayMarker}`);
  const entry = `  {\n${fields.map(([field, value]) => `    ${field}: ${jsString(value)}`).join(',\n')}\n  },\n`;
  let before = content.slice(0, markerIndex);
  if (!before.trimEnd().endsWith(',')) before += ',';
  return `${before}\n${entry}${content.slice(markerIndex + 1)}`;
}

function hasSiteRegistration(site) {
  return [read(manifestPath), read(baselinePath)].some(content => content.includes(`site: ${jsString(site)},`));
}

function replaceSiteReferences(from, to) {
  const paths = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
    .filter(name => /\.(?:md|html?|mjs|js)$/i.test(name))
    .filter(name => name !== 'article-titles.js');

  for (const name of paths) {
    const path = resolve(root, name);
    const current = read(path);
    if (current.includes(from)) write(path, current.replaceAll(from, to));
  }
}

function replaceArticleLinks(from, to, title) {
  const linkPattern = new RegExp(`\\]\\((?:\\./)?${escapeRegExp(from)}\\)`, 'g');
  const paths = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
    .filter(name => /\.(?:md|html?|mjs|js)$/i.test(name))
    .filter(name => name !== 'article-titles.js');

  for (const name of paths) {
    const path = resolve(root, name);
    const current = read(path);
    const next = current.replace(linkPattern, `](${to})`)
      .replace(new RegExp(`\\[([^\\]]+)\\]\\(${escapeRegExp(to)}\\)`, 'g'), `[${title}](${to})`);
    if (next !== current) write(path, next);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updateBaselineDoc(from, to, title) {
  let content = read(baselineDocPath);
  if (from && to) {
    content = content.replaceAll(`../${from}`, `../${to}`);
    content = content.replace(new RegExp(`\\[([^\\]]+)\\]\\(\\.\\./${escapeRegExp(to)}\\)`, 'g'), `[${title}](${`../${to}`})`);
  } else if (from && !to) {
    content = content.replace(new RegExp(`^.*\\[([^\\]]+)\\]\\(\\.\\./${escapeRegExp(from)}\\)\\r?\\n?`, 'gm'), '');
  } else if (!from && to) {
    const sectionTitle = title.startsWith('[slot]') ? '## 其他教程' : '## 站点独有人工文章';
    const sectionStart = content.indexOf(sectionTitle);
    const sectionEnd = sectionTitle === '## 其他教程'
      ? content.indexOf('\n## 维护规则', sectionStart)
      : content.indexOf('\n机器可读登记位于', sectionStart);
    if (sectionStart === -1 || sectionEnd === -1) fail('CONTENT_BASELINE.md 缺少站点独有文章区段');
    const displayTitle = title.startsWith('[slot]') ? title.slice('[slot]'.length) : title;
    const bullet = `\n- [${displayTitle}](../${to})`;
    content = content.slice(0, sectionEnd) + bullet + content.slice(sectionEnd);
  }
  write(baselineDocPath, content);
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
  const paths = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
    .filter(name => /\.(?:md|html?|mjs|js)$/i.test(name))
    .filter(name => name !== 'article-titles.js');

  for (const name of paths) {
    const path = resolve(root, name);
    const current = read(path);
    const next = current.replace(linkPattern, '').replaceAll(site, '');
    if (next !== current) write(path, next);
  }
}

function runChecks() {
  execFileSync('npm', ['run', 'generate:titles'], { cwd: root, stdio: 'inherit' });
  execFileSync('npm', ['run', 'check'], { cwd: root, stdio: 'inherit' });
}

function updateRegisteredArticle(from, to, title) {
  let manifest = read(manifestPath);
  const entry = findEntry(manifest, from, 'CDC manifest');
  manifest = replaceEntry(manifest, from, { site: to, title }, 'CDC manifest');
  manifest = manifest.replace(
    new RegExp(`(\\['[^']+',\\s*)${escapeRegExp(jsString(from))}(\\],?)`, 'g'),
    `$1${jsString(to)}$2`
  );
  if (entry.text.includes('archived: true')) {
    manifest = manifest.replace(`    site: ${jsString(to)},`, `    site: ${jsString(to)},\n    archived: true,`);
  }
  write(manifestPath, manifest);

  let baseline = read(baselinePath);
  if (baseline.includes(`site: ${jsString(from)},`)) {
    baseline = replaceEntry(baseline, from, { site: to, title }, 'content baseline');
    write(baselinePath, baseline);
  }
}

function addArticle(options) {
  const site = articleName(required(options, 'site'), 'site');
  const title = required(options, 'title');
  const type = required(options, 'type');
  if (!['slot', 'site-only'].includes(type)) fail('--type 只能是 slot 或 site-only');
  if (!existsSync(resolve(root, site))) fail(`文章文件不存在: ${site}`);
  assertArticleSource(site, title);
  if (hasSiteRegistration(site)) fail(`文章已登记: ${site}`);

  if (type === 'slot') {
    const source = required(options, 'source');
    let manifest = read(manifestPath);
    if (manifest.includes(`source: ${jsString(source)},`)) fail(`CDC source 已登记: ${source}`);
    manifest = addEntry(manifest, 'export const articles = [', [['source', source], ['site', site], ['title', title]]);
    write(manifestPath, manifest);
    updateBaselineDoc(undefined, site, `[slot]${title}`);
  } else {
    let baseline = read(baselinePath);
    baseline = addEntry(baseline, 'export const SITE_ONLY_ARTICLES = [', [['site', site], ['title', title]]);
    write(baselinePath, baseline);
    updateBaselineDoc(undefined, site, title);
  }

  addSidebarLink(site, title);
  console.log(`已登记 ${type} 文章: ${site}`);
  console.log(`提醒：请确认首页 03-Agentic入门宝典.md 是否需要增加入口，以及放置位置。`);
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
  if (hasSiteRegistration(to)) fail(`新文章已登记: ${to}`);

  updateRegisteredArticle(from, to, title);
  replaceSiteReferences(from, to);
  replaceArticleLinks(from, to, title);
  updateBaselineDoc(from, to, title);
  addSidebarLink(to, title);
  console.log(`已替换 CDC 槽位: ${from} -> ${to}（source 保留）`);
  runChecks();
}

function renameArticle(options) {
  const from = articleName(required(options, 'from'), 'from');
  const to = articleName(required(options, 'to'), 'to');
  if (from === to) fail('--from 与 --to 不能相同');
  const registered = hasSiteRegistration(from);
  if (!registered) fail(`文章未登记: ${from}`);
  if (hasSiteRegistration(to)) fail(`新文章已登记: ${to}`);
  if (existsSync(resolve(root, from)) && existsSync(resolve(root, to))) fail(`目标文章文件已存在: ${to}`);
  if (!existsSync(resolve(root, from)) && !existsSync(resolve(root, to))) fail(`找不到源文章或目标文章: ${from}`);

  const oldTitle = read(manifestPath).includes(`site: ${jsString(from)},`)
    ? findEntry(read(manifestPath), from, 'CDC manifest').text.match(/^    title: (.*?),?$/m)?.[1]
    : findEntry(read(baselinePath), from, 'content baseline').text.match(/^    title: (.*?),?$/m)?.[1];
  const title = options.title ?? (oldTitle ? oldTitle.slice(1, -1).replaceAll("\\'", "'") : undefined);
  if (!title) fail('无法读取旧标题，请提供 --title');

  assertArticleSource(existsSync(resolve(root, from)) ? from : to, title);

  if (existsSync(resolve(root, from))) renameSync(resolve(root, from), resolve(root, to));
  if (read(manifestPath).includes(`site: ${jsString(from)},`)) {
    updateRegisteredArticle(from, to, title);
  } else {
    let baseline = read(baselinePath);
    baseline = replaceEntry(baseline, from, { site: to, title }, 'content baseline');
    write(baselinePath, baseline);
  }
  replaceSiteReferences(from, to);
  replaceArticleLinks(from, to, title);
  updateBaselineDoc(from, to, title);
  console.log(`已改名文章: ${from} -> ${to}`);
  runChecks();
}

function removeArticle(options) {
  const site = articleName(required(options, 'site'), 'site');
  const manifest = read(manifestPath);
  if (manifest.includes(`site: ${jsString(site)},`)) {
    const entry = findEntry(manifest, site, 'CDC manifest');
    if (entry.text.includes('archived: true')) fail(`文章已经标记 archived: ${site}`);
    let next = removeEntry(manifest, site, 'CDC manifest');
    const sourceLine = entry.text.match(/^    source: (.*?),?$/m)?.[1];
    if (!sourceLine) fail(`CDC 登记缺少 source: ${site}`);
    next = addEntry(next, 'export const articles = [', [
      ['source', sourceLine.slice(1, -1).replaceAll("\\'", "'"),],
      ['site', site],
      ['title', entry.text.match(/^    title: (.*?),?$/m)?.[1]?.slice(1, -1) ?? site],
      ['archived', 'true']
    ]).replace(`    archived: ${jsString('true')}\n`, '    archived: true\n');
    write(manifestPath, next);
    console.log(`已标记 CDC 槽位 archived，保留 source 与文章文件: ${site}`);
  } else {
    if (!read(baselinePath).includes(`site: ${jsString(site)},`)) fail(`文章未登记: ${site}`);
    write(baselinePath, removeEntry(read(baselinePath), site, 'content baseline'));
    removeSidebarLink(site);
    removeSiteReferences(site);
    updateBaselineDoc(site, '', '');
    if (existsSync(resolve(root, site))) unlinkSync(resolve(root, site));
    console.log(`已删除 site-only 文章及登记: ${site}`);
  }
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
  else fail(`未知子命令: ${command}`);
} catch (error) {
  console.error(`文章生命周期操作失败: ${error.message}`);
  process.exit(1);
}
