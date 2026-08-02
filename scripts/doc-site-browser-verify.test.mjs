import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBrowserAssertions, exitCodeForResult, parseArgs } from './doc-site-browser-verify.mjs';

const config = {
  article: '01-V3计划-GrokBuild安装配置.md',
  title: 'V3 Grok Build 安装与配置指南',
  expect: 'Codesome 的 Grok 4.5'
};

function passingProbe() {
  return {
    home: {
      sidebarTitles: [config.title],
      h1: 'codesome｜Agentic 入门宝典',
      h1Count: 1,
      h1Sources: ['manifest-injector'],
      articleResource: { status: 200, statuses: [200], failures: [] },
      titlePipeline: {
        status: 'ready',
        processed: { title: 'codesome｜Agentic 入门宝典' },
        dom: { title: 'codesome｜Agentic 入门宝典', source: 'manifest-injector' },
        failures: [],
        domFallbacks: 0
      },
      consoleErrors: []
    },
    navigation: { clicked: true, href: `https://doc.codesome.ai/#/${encodeURIComponent(config.article.replace(/\.md$/, ''))}` },
    article: {
      h1: config.title,
      h1Count: 1,
      h1Sources: ['manifest-injector'],
      articleResource: { status: 200, statuses: [200], failures: [] },
      titlePipeline: {
        status: 'ready',
        processed: { title: config.title },
        dom: { title: config.title, source: 'manifest-injector' },
        failures: [],
        domFallbacks: 0
      },
      bodyText: `正文 ${config.expect}`,
      images: [{ complete: true, naturalWidth: 1280 }],
      consoleErrors: []
    }
  };
}

test('browser assertions accept a healthy Docsify probe', () => {
  const checks = evaluateBrowserAssertions(passingProbe(), config);
  assert.ok(checks.every(check => check.pass), checks.map(check => check.detail).join('\n'));
});

test('a broken sidebar route fails the navigation assertion', () => {
  const probe = passingProbe();
  probe.navigation.href = 'https://doc.codesome.ai/#/missing-article.md';
  const checks = evaluateBrowserAssertions(probe, config);
  assert.equal(checks.find(check => check.id === 'sidebar-navigation').pass, false);
});

test('an unloaded image fails the image assertion', () => {
  const probe = passingProbe();
  probe.article.images[0].naturalWidth = 0;
  const checks = evaluateBrowserAssertions(probe, config);
  assert.equal(checks.find(check => check.id === 'article-images').pass, false);
});

test('an article without images passes the image assertion', () => {
  const probe = passingProbe();
  probe.article.images = [];
  const checks = evaluateBrowserAssertions(probe, config);
  assert.equal(checks.find(check => check.id === 'article-images').pass, true);
});

test('an article with a copied H1 but no successful title pipeline fails', () => {
  const probe = passingProbe();
  probe.article.titlePipeline.status = 'failed';
  const checks = evaluateBrowserAssertions(probe, config);
  assert.equal(checks.find(check => check.id === 'article-title-pipeline').pass, false);
});

test('an article with a missing Markdown response fails even when a fallback H1 exists', () => {
  const probe = passingProbe();
  probe.article.articleResource = { status: 404, statuses: [404], failures: [] };
  probe.article.h1Sources = ['page-title-fallback'];
  const checks = evaluateBrowserAssertions(probe, config);
  assert.equal(checks.find(check => check.id === 'article-resource').pass, false);
  assert.equal(checks.find(check => check.id === 'article-h1-count').pass, false);
});

test('duplicate article H1 headings fail the browser contract', () => {
  const probe = passingProbe();
  probe.article.h1Count = 2;
  probe.article.h1Sources = ['manifest-injector', 'manifest-injector'];
  const checks = evaluateBrowserAssertions(probe, config);
  assert.equal(checks.find(check => check.id === 'article-h1-count').pass, false);
});

test('CLI rejects invalid timeout and accepts browser options', () => {
  assert.throws(() => parseArgs(['--timeout', '0']), /timeout must be an integer/);
  const parsed = parseArgs(['--article', config.article, '--title', config.title, '--expect', config.expect]);
  assert.equal(parsed.article, config.article);
});

test('CLI accepts full article verification mode', () => {
  const parsed = parseArgs(['--all']);
  assert.equal(parsed.all, true);
});

test('browser result statuses map to documented exit codes', () => {
  assert.equal(exitCodeForResult({ status: 'PASS' }), 0);
  assert.equal(exitCodeForResult({ status: 'FAIL' }), 1);
  assert.equal(exitCodeForResult({ status: 'SKIP' }), 3);
  assert.equal(exitCodeForResult({ status: 'unexpected' }), 1);
});
