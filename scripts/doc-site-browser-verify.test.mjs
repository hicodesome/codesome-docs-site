import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBrowserAssertions, parseArgs } from './doc-site-browser-verify.mjs';

const config = {
  article: '01-V3计划-GrokBuild安装配置.md',
  title: 'V3 Grok Build 安装与配置指南',
  expect: 'Codesome 的 Grok 4.5'
};

function passingProbe() {
  return {
    home: { sidebarTitles: [config.title], consoleErrors: [] },
    navigation: { clicked: true, href: `https://doc.codesome.ai/#/${encodeURIComponent(config.article.replace(/\.md$/, ''))}` },
    article: {
      h1: config.title,
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

test('CLI rejects invalid timeout and accepts browser options', () => {
  assert.throws(() => parseArgs(['--timeout', '0']), /timeout must be an integer/);
  const parsed = parseArgs(['--article', config.article, '--title', config.title, '--expect', config.expect]);
  assert.equal(parsed.article, config.article);
});
