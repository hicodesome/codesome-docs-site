#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { articleTitleEntries } from './title-metadata.mjs';

const ROOT = new URL('../', import.meta.url);
const HOME_ARTICLE = '03-Agentic入门宝典.md';
const TIMEOUT_MS = Number(process.env.DOC_SITE_BROWSER_TIMEOUT || 20000);

function assertTimeout() {
  if (!Number.isInteger(TIMEOUT_MS) || TIMEOUT_MS < 1000) {
    throw new Error('DOC_SITE_BROWSER_TIMEOUT must be an integer >= 1000');
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function startSite() {
  const port = await freePort();
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: fileURLToPath(ROOT),
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });

  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (child.exitCode !== null) {
        throw new Error(`local site exited before becoming ready (${child.exitCode}): ${stderr || stdout}`);
      }
      try {
        const response = await fetch(`${baseUrl}/index.html`);
        if (response.status === 200) return { child, baseUrl };
      } catch {
        // The server may still be binding its port.
      }
      await sleep(100);
    }
    throw new Error(`local site did not become ready: ${stderr || stdout}`);
  } catch (error) {
    child.kill('SIGTERM');
    throw error;
  }
}

async function stopSite(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), sleep(2000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

function routeFor(article) {
  if (article === HOME_ARTICLE) return '#/';
  return `#/${encodeURIComponent(article.replace(/\.md$/i, ''))}`;
}

function decodedPath(value) {
  try {
    return decodeURIComponent(new URL(value).pathname).replace(/^\/+/, '');
  } catch {
    return '';
  }
}

async function waitForReady(page, article, title) {
  const expectedRoute = article === HOME_ARTICLE ? '' : article.replace(/\.md$/i, '');
  await page.waitForFunction(({ articleName, expectedTitle, expectedRouteName }) => {
    const hash = decodeURIComponent(window.location.hash || '#/')
      .replace(/^#\/?/, '')
      .split(/[?#]/)[0];
    const section = document.querySelector('.markdown-section');
    const h1s = Array.from(section?.querySelectorAll('h1') || []);
    const pipeline = window.CODESOME_TITLE_PIPELINE || {};
    const dom = pipeline.dom?.[window.location.hash || '#/'] || null;
    return Boolean(
      section &&
      (expectedRouteName ? hash === expectedRouteName : hash === '') &&
      h1s.length === 1 &&
      h1s[0].textContent.trim() === expectedTitle &&
      h1s[0].getAttribute('data-codesome-title-source') === 'manifest-injector' &&
      pipeline.status === 'ready' &&
      pipeline.processed?.[articleName]?.title === expectedTitle &&
      dom?.title === expectedTitle &&
      dom?.source === 'manifest-injector' &&
      (pipeline.failures || []).length === 0 &&
      (pipeline.domFallbacks || 0) === 0
    );
  }, { articleName: article, expectedTitle: title, expectedRouteName: expectedRoute }, { timeout: TIMEOUT_MS });

  await page.waitForFunction(() => Array.from(
    document.querySelectorAll('.markdown-section img')
  ).every(image => image.complete), undefined, { timeout: TIMEOUT_MS });
}

async function inspectPage(page, article, title, responses, consoleErrors, networkFailures, baseUrl) {
  const state = await page.evaluate(({ articleName, expectedTitle, homeArticle }) => {
    const section = document.querySelector('.markdown-section');
    const h1s = Array.from(section?.querySelectorAll('h1') || []);
    const pipeline = window.CODESOME_TITLE_PIPELINE || {};
    const dom = pipeline.dom?.[window.location.hash || '#/'] || null;
    const sidebarLink = Array.from(document.querySelectorAll('.sidebar-nav a')).find(link => {
      const href = decodeURIComponent(link.getAttribute('href') || '');
      return link.textContent.trim() === expectedTitle && (
        articleName === homeArticle
          ? /^#\/?$/.test(href)
          : href.endsWith(articleName) || href.endsWith(articleName.replace(/\.md$/i, ''))
      );
    });
    return {
      href: window.location.href,
      h1: h1s.map(node => node.textContent.trim()),
      h1Sources: h1s.map(node => node.getAttribute('data-codesome-title-source') || ''),
      titlePipeline: {
        status: pipeline.status || 'missing',
        processed: pipeline.processed?.[articleName] || null,
        dom,
        failures: pipeline.failures || [],
        domFallbacks: pipeline.domFallbacks || 0
      },
      sidebarLink: sidebarLink ? sidebarLink.getAttribute('href') : null,
      images: Array.from(section?.querySelectorAll('img') || []).map(image => ({
        src: image.currentSrc || image.src,
        complete: image.complete,
        naturalWidth: image.naturalWidth
      }))
    };
  }, { articleName: article, expectedTitle: title, homeArticle: HOME_ARTICLE });

  const articleResponses = responses.filter(response => decodedPath(response.url()) === article);
  const statuses = articleResponses.map(response => response.status());
  const directResponse = await fetch(`${baseUrl}/${encodeURIComponent(article).replaceAll('%2F', '/')}`);
  await directResponse.text();
  const observedStatuses = articleResponses.length ? statuses : [directResponse.status];
  const failures = [
    ...networkFailures,
    ...consoleErrors.map(message => `console: ${message}`)
  ];
  const checks = {
    route: article === HOME_ARTICLE
      ? state.href.endsWith('/#/')
      : decodeURIComponent(state.href).includes(article.replace(/\.md$/i, '')),
    sidebar: Boolean(state.sidebarLink),
    markdown200: directResponse.status === 200 && observedStatuses.every(status => status === 200),
    h1: state.h1.length === 1 && state.h1[0] === title,
    h1Source: state.h1Sources.length === 1 && state.h1Sources[0] === 'manifest-injector',
    pipeline: state.titlePipeline.status === 'ready' &&
      state.titlePipeline.processed?.title === title &&
      state.titlePipeline.dom?.title === title &&
      state.titlePipeline.dom?.source === 'manifest-injector' &&
      state.titlePipeline.failures.length === 0 &&
      state.titlePipeline.domFallbacks === 0,
    images: state.images.every(image => image.complete && image.naturalWidth > 0),
    noErrors: failures.length === 0
  };

  return { article, title, state, statuses, failures, checks };
}

function formatFailure(result) {
  const failedChecks = Object.entries(result.checks)
    .filter(([, pass]) => !pass)
    .map(([name]) => name);
  return `${result.article}: ${failedChecks.join(', ') || 'unknown failure'}${result.failures.length ? `; ${result.failures.join(' | ')}` : ''}`;
}

async function main() {
  assertTimeout();
  const site = await startSite();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addInitScript(() => {
      localStorage.setItem('codesome.article-titles.version', 'title-map-stale');
      localStorage.setItem('docsify.search.index/cdc-titles-v3', 'stale');
      localStorage.setItem('docsify.search.expires/cdc-titles-v3', 'stale');
    });
    const page = await context.newPage();
    const siteOrigin = new URL(site.baseUrl).origin;
    const entries = [
      ...articleTitleEntries.filter(entry => entry.site === HOME_ARTICLE),
      ...articleTitleEntries.filter(entry => entry.site !== HOME_ARTICLE)
    ];
    const results = [];

    for (const entry of entries) {
      const responses = [];
      const consoleErrors = [];
      const networkFailures = [];
      const onResponse = response => responses.push(response);
      const onConsole = message => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      };
      const onPageError = error => consoleErrors.push(`pageerror: ${error.message}`);
      const onRequestFailed = request => {
        if (new URL(request.url()).origin === siteOrigin) {
          networkFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || 'failed'}`);
        }
      };
      page.on('response', onResponse);
      page.on('console', onConsole);
      page.on('pageerror', onPageError);
      page.on('requestfailed', onRequestFailed);
      try {
        await page.goto(`${site.baseUrl}/${routeFor(entry.site)}`, {
          waitUntil: 'domcontentloaded',
          timeout: TIMEOUT_MS
        });
        await waitForReady(page, entry.site, entry.title);
        results.push(await inspectPage(page, entry.site, entry.title, responses, consoleErrors, networkFailures, site.baseUrl));
      } catch (error) {
        results.push({
          article: entry.site,
          title: entry.title,
          failures: [error.message],
          checks: { pageReady: false }
        });
      } finally {
        page.off('response', onResponse);
        page.off('console', onConsole);
        page.off('pageerror', onPageError);
        page.off('requestfailed', onRequestFailed);
      }
      const result = results.at(-1);
      console.log(`${Object.values(result.checks).every(Boolean) ? 'PASS' : 'FAIL'}: ${entry.site} (${entry.title})`);
      if (result.failures?.length || !Object.values(result.checks).every(Boolean)) {
        console.log(`  ${formatFailure(result)}`);
      }
    }

    const failed = results.filter(result => !Object.values(result.checks).every(Boolean));
    if (failed.length) {
      throw new Error(`Rendered title browser check failed: ${failed.length}/${results.length} articles\n${failed.map(formatFailure).join('\n')}`);
    }
    console.log(`Rendered title browser check passed: ${results.length}/${articleTitleEntries.length} articles through local Docsify`);
  } finally {
    if (browser) await browser.close();
    await stopSite(site.child);
  }
}

main().catch(error => {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
});
