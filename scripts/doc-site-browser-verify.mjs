#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articleTitleEntries } from './title-metadata.mjs';

export const EXIT_CODES = Object.freeze({ PASS: 0, FAIL: 1, USAGE: 2, SKIP: 3 });

const DEFAULTS = Object.freeze({
  url: 'https://doc.codesome.ai',
  article: '01-V3计划-GrokBuild安装配置.md',
  title: 'V3 Grok Build 安装与配置指南',
  expect: 'Codesome 的 Grok 4.5',
  sshHost: process.env.CHROME_SSH_HOST || 'lzc-joe',
  container: process.env.CHROME_CONTAINER || '',
  timeoutMs: Number(process.env.CHROME_TIMEOUT || 30000),
  outputDir: process.env.DOC_SITE_BROWSER_OUTPUT_DIR || 'var/doc-site-browser-verify'
});
const HOME_TITLE = 'codesome｜Agentic 入门宝典';

const USAGE = `Usage:
  node scripts/doc-site-browser-verify.mjs [options]

Options:
  --url URL             Public or local site URL (default: ${DEFAULTS.url})
  --all                 Verify every article in scripts/title-metadata.mjs
  --article FILE        Article filename used for sidebar navigation
  --title TEXT          Expected article title in sidebar and H1
  --expect TEXT         Required text in the rendered article body
  --ssh-host ALIAS      SSH alias for the Chrome DRM host
  --container NAME      Chrome DRM container name (otherwise auto-discover)
  --timeout MS          Browser wait budget in milliseconds
  --output-dir DIR      Git-ignored evidence directory
  -h, --help            Show this help

Exit codes:
  0 PASS, 1 assertion failure, 2 invalid arguments, 3 browser prerequisite SKIP`;

function failUsage(message) {
  throw new Error(`${message}\n\n${USAGE}`);
}

export function parseArgs(argv = process.argv.slice(2)) {
  const config = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      if (index + 1 >= argv.length) failUsage(`${arg} requires a value`);
      index += 1;
      return argv[index];
    };
    switch (arg) {
      case '-h':
      case '--help':
        return { help: true };
      case '--url':
        config.url = next();
        break;
      case '--all':
        config.all = true;
        break;
      case '--article':
        config.article = next();
        break;
      case '--title':
        config.title = next();
        break;
      case '--expect':
        config.expect = next();
        break;
      case '--ssh-host':
        config.sshHost = next();
        break;
      case '--container':
        config.container = next();
        break;
      case '--timeout':
        config.timeoutMs = Number(next());
        break;
      case '--output-dir':
        config.outputDir = next();
        break;
      default:
        failUsage(`unknown option: ${arg}`);
    }
  }
  if (!/^https?:\/\//.test(config.url)) failUsage('--url must start with http:// or https://');
  if (!config.all && (!config.article || !config.title || !config.expect)) {
    failUsage('--article, --title and --expect are required unless --all is used');
  }
  if (!Number.isInteger(config.timeoutMs) || config.timeoutMs < 1000) failUsage('--timeout must be an integer >= 1000');
  return config;
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function hasText(values, expected) {
  const wanted = normalizeText(expected);
  return values.some(value => normalizeText(value) === wanted);
}

export function evaluateBrowserAssertions(probe, config) {
  const home = probe.home || {};
  const article = probe.article || {};
  const navigation = probe.navigation || {};
  const homeErrors = home.consoleErrors || [];
  const articleErrors = article.consoleErrors || [];
  const images = article.images || [];
  const articleRoute = normalizeText(navigation.href);
  const homePipeline = home.titlePipeline || {};
  const articlePipeline = article.titlePipeline || {};
  const homeResource = home.articleResource || {};
  const articleResource = article.articleResource || {};
  const isHomepage = config.article === '03-Agentic入门宝典.md';
  const routeFile = encodeURIComponent(config.article).replaceAll('%2F', '/');
  const routeWithoutExtension = encodeURIComponent(config.article.replace(/\.md$/i, '')).replaceAll('%2F', '/');
  return [
    {
      id: 'home-target-title',
      pass: hasText(home.sidebarTitles || [], config.title),
      detail: `首页侧栏包含目标文章标题：${config.title}`
    },
    {
      id: 'home-console',
      pass: homeErrors.length === 0,
      detail: homeErrors.length ? `首页 console error ${homeErrors.length} 条` : '首页无 console error'
    },
    {
      id: 'home-h1',
      pass: normalizeText(home.h1) === HOME_TITLE && home.h1Count === 1 && home.h1Sources?.[0] === 'manifest-injector',
      detail: `首页 H1：${home.h1 || '(空)'}，数量：${home.h1Count || 0}`
    },
    {
      id: 'home-resource',
      pass: homeResource.status === 200 &&
        (homeResource.statuses || []).length > 0 &&
        homeResource.statuses.every(status => status === 200) &&
        (homeResource.failures || []).length === 0,
      detail: `首页文章请求状态：${homeResource.status ?? '(未捕获)'}`
    },
    {
      id: 'home-title-pipeline',
      pass: homePipeline.status === 'ready' &&
        homePipeline.processed?.title === HOME_TITLE &&
        homePipeline.dom?.title === HOME_TITLE &&
        homePipeline.dom?.source === 'manifest-injector' &&
        (homePipeline.failures || []).length === 0 &&
        (homePipeline.domFallbacks || 0) === 0,
      detail: `首页标题管线状态：${homePipeline.status || 'missing'}`
    },
    {
      id: 'sidebar-navigation',
      pass: isHomepage
        ? navigation.clicked === false && /#\/?$/.test(articleRoute)
        : navigation.clicked === true && (
          articleRoute.includes(config.article) ||
          articleRoute.includes(routeFile) ||
          articleRoute.includes(routeWithoutExtension)
        ),
      detail: isHomepage
        ? (navigation.clicked === false ? '首页文章保持首页路由，无需侧栏跳转' : `首页文章被错误导航到：${navigation.href || '(空)'}`)
        : navigation.clicked
        ? `侧栏目标链接进入路由：${navigation.href || '(空)'}`
        : `未找到可进入目标文章的侧栏链接：${config.article}`
    },
    {
      id: 'article-h1',
      pass: normalizeText(article.h1) === normalizeText(config.title),
      detail: `文章 H1：${article.h1 || '(空)'}`
    },
    {
      id: 'article-h1-count',
      pass: article.h1Count === 1 && article.h1Sources?.[0] === 'manifest-injector',
      detail: `文章后代 H1 数量：${article.h1Count || 0}，来源：${article.h1Sources?.join(', ') || '(空)'}`
    },
    {
      id: 'article-resource',
      pass: articleResource.status === 200 &&
        (articleResource.statuses || []).length > 0 &&
        articleResource.statuses.every(status => status === 200) &&
        (articleResource.failures || []).length === 0,
      detail: `文章请求状态：${articleResource.status ?? '(未捕获)'}`
    },
    {
      id: 'article-title-pipeline',
      pass: articlePipeline.status === 'ready' &&
        articlePipeline.processed?.title === config.title &&
        articlePipeline.dom?.title === config.title &&
        articlePipeline.dom?.source === 'manifest-injector' &&
        (articlePipeline.failures || []).length === 0 &&
        (articlePipeline.domFallbacks || 0) === 0,
      detail: `文章标题管线状态：${articlePipeline.status || 'missing'}`
    },
    {
      id: 'article-body',
      pass: !config.expect || normalizeText(article.bodyText).includes(normalizeText(config.expect)),
      detail: config.expect ? `正文包含关键文字：${config.expect}` : '未指定正文断言，跳过正文文字检查'
    },
    {
      id: 'article-images',
      pass: images.every(image => image.complete === true && Number(image.naturalWidth) > 0),
      detail: images.length ? `正文图片 ${images.length} 张，naturalWidth 均大于 0` : '正文无图片，图片检查通过'
    },
    {
      id: 'article-console',
      pass: articleErrors.length === 0,
      detail: articleErrors.length ? `文章 console error ${articleErrors.length} 条` : '文章无 console error'
    }
  ];
}

function discoverContainer(config) {
  if (config.container) return config.container;
  const output = execFileSync(
    'ssh',
    [config.sshHost, "lzc-docker ps --format '{{.Names}}' | awk '/chrome-drm-chrome/{print; exit}'"],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 }
  ).trim();
  const container = output.split(/\r?\n/).find(Boolean) || '';
  if (!/^[A-Za-z0-9_.-]+$/.test(container)) throw new Error('Chrome DRM container was not found');
  return container;
}

function encodeConfig(config) {
  return Buffer.from(JSON.stringify(config), 'utf8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function runRemoteProbe(config, container) {
  const scriptPath = join(dirname(fileURLToPath(import.meta.url)), 'doc-site-browser-runner.py');
  const runner = readFileSync(scriptPath, 'utf8');
  const payload = encodeConfig({
    url: config.url.replace(/\/$/, ''),
    article: config.article,
    title: config.title,
    timeout_ms: config.timeoutMs
  });
  const remoteCommand = `lzc-docker exec -i ${shellQuote(container)} python3 - ${shellQuote(payload)}`;
  const result = spawnSync('ssh', [config.sshHost, remoteCommand], {
    input: runner,
    encoding: 'utf8',
    timeout: Math.max(config.timeoutMs * 3, 60000),
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.error) throw new Error(`Chrome DRM runner could not start: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Chrome DRM runner exited ${result.status}`);
  try {
    return JSON.parse(result.stdout.trim());
  } catch {
    throw new Error('Chrome DRM runner did not return a JSON result');
  }
}

function evidenceStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function safeName(value) {
  return value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'site';
}

function writeEvidence(config, probe, checks) {
  const outputDir = resolve(config.outputDir);
  mkdirSync(outputDir, { recursive: true });
  const prefix = `${evidenceStamp()}-${safeName(config.article)}`;
  const files = {};
  for (const [name, page] of [['home', probe.home], ['article', probe.article]]) {
    if (!page) continue;
    if (page.html) {
      files[`${name}Html`] = join(outputDir, `${prefix}-${name}.html`);
      writeFileSync(files[`${name}Html`], page.html);
    }
    if (page.screenshot) {
      files[`${name}Screenshot`] = join(outputDir, `${prefix}-${name}.png`);
      writeFileSync(files[`${name}Screenshot`], Buffer.from(page.screenshot, 'base64'));
    }
  }
  const summary = {
    generatedAt: new Date().toISOString(),
    url: config.url,
    article: config.article,
    title: config.title,
    expectedText: config.expect,
    consoleErrors: {
      home: probe.home?.consoleErrors || [],
      article: probe.article?.consoleErrors || []
    },
    checks,
    evidence: files
  };
  files.summary = join(outputDir, `${prefix}-summary.json`);
  writeFileSync(files.summary, `${JSON.stringify(summary, null, 2)}\n`);
  return files;
}

function printChecks(checks) {
  for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'}: [${check.id}] ${check.detail}`);
}

export function exitCodeForResult(result) {
  if (result.status === 'PASS') return EXIT_CODES.PASS;
  if (result.status === 'SKIP') return EXIT_CODES.SKIP;
  return EXIT_CODES.FAIL;
}

export async function run(config, knownContainer = '') {
  let container = knownContainer;
  if (!container) {
    try {
      container = discoverContainer(config);
    } catch (error) {
      return { status: 'SKIP', reason: error.message };
    }
  }
  let probe;
  try {
    probe = runRemoteProbe(config, container);
  } catch (error) {
    return { status: 'SKIP', reason: error.message, container };
  }
  if (probe.status === 'SKIP') return { ...probe, container };
  if (probe.status === 'FAIL') return { ...probe, container };
  if (probe.status !== 'PASS') return { status: 'FAIL', reason: probe.reason || 'Chrome DRM runner did not complete', container };
  const checks = evaluateBrowserAssertions(probe, config);
  const evidence = writeEvidence(config, probe, checks);
  return { status: checks.every(check => check.pass) ? 'PASS' : 'FAIL', checks, evidence, container };
}

export async function runAll(config) {
  let container;
  try {
    container = discoverContainer(config);
  } catch (error) {
    return { status: 'SKIP', reason: error.message, results: [] };
  }

  const results = [];
  for (const entry of articleTitleEntries) {
    const result = await run({
      ...config,
      all: false,
      article: entry.site,
      title: entry.title,
      expect: ''
    }, container);
    results.push({ ...result, article: entry.site, title: entry.title });
    if (result.status === 'SKIP') {
      return { status: 'SKIP', reason: result.reason, container, results };
    }
  }

  return {
    status: results.every(result => result.status === 'PASS') ? 'PASS' : 'FAIL',
    container,
    results
  };
}

export async function main(argv = process.argv.slice(2)) {
  let config;
  try {
    config = parseArgs(argv);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return EXIT_CODES.USAGE;
  }
  if (config.help) {
    console.log(USAGE);
    return EXIT_CODES.PASS;
  }
  const result = config.all ? await runAll(config) : await run(config);
  const exitCode = exitCodeForResult(result);
  if (result.status === 'SKIP') {
    console.log(`SKIP: browser prerequisite unavailable; ${result.reason}`);
    return exitCode;
  }
  if (result.status === 'FAIL' && !result.checks && !result.results) {
    console.log(`FAIL: browser runner could not complete page verification; ${result.reason}`);
    return exitCode;
  }
  if (result.results) {
    for (const article of result.results) {
      console.log(`${article.status}: ${article.article} (${article.title})`);
      if (article.checks) printChecks(article.checks);
      if (article.evidence) console.log(`Evidence: ${article.evidence.summary}`);
      if (article.reason) console.log(`Reason: ${article.reason}`);
    }
    console.log(`Browser verification ${result.status}: ${result.results.length}/${articleTitleEntries.length} articles checked`);
  } else {
    printChecks(result.checks);
    console.log(`Evidence: ${result.evidence.summary}`);
  }
  return exitCode;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(code => process.exit(code));
}
