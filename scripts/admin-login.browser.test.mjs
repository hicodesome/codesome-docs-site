import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, scryptSync } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const EDITOR_TOKEN = 'local-admin-browser-test-token';
const TIMEOUT_MS = 20_000;

function editorTokenHash(token) {
  const salt = createHash('sha256').update('codesome-admin-browser-test').digest().subarray(0, 16);
  const hash = scryptSync(token, salt, 32, { N: 16_384, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
  return `scrypt$16384$8$1$${salt.toString('base64url')}$${hash.toString('base64url')}`;
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
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      CODESOME_DOC_ADMIN_SESSION_SECRET: 'local-admin-browser-session-secret',
      CODESOME_DOC_ADMIN_TOKEN_HASH: editorTokenHash(EDITOR_TOKEN),
      CODESOME_DOC_ADMIN_GITHUB_TOKEN: 'local-admin-browser-github-token'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const baseUrl = `http://127.0.0.1:${port}`;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`local site exited before startup: ${output}`);
    try {
      const response = await fetch(`${baseUrl}/admin-api/healthz`);
      if (response.ok) return { baseUrl, child };
    } catch {
      // The server may still be binding its port.
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  child.kill('SIGTERM');
  throw new Error(`local site did not become ready: ${output}`);
}

async function stopSite(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    once(child, 'exit'),
    new Promise(resolve => setTimeout(resolve, 2000))
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

test('the fallback Token entry completes Decap authentication', { timeout: 30_000 }, async () => {
  const site = await startSite();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let releaseConfig;
    const configAvailable = new Promise(resolve => {
      releaseConfig = resolve;
    });
    await page.route('**/admin/config.yml', async route => {
      await configAvailable;
      const response = await route.fetch();
      const config = (await response.text()).replace(
        'base_url: https://doc.codesome.ai',
        `base_url: ${site.baseUrl}`
      );
      await route.fulfill({ response, body: config });
    });

    await page.route('**/admin-api/github/**', route => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'local browser test fixture' })
    }));

    await page.goto(`${site.baseUrl}/admin/`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    const nativeLogin = page.locator('#nc-root button, #nc-root a').filter({ hasText: /GitHub/i }).first();
    assert.equal(await nativeLogin.count(), 0);

    const popupPromise = context.waitForEvent('page', { timeout: TIMEOUT_MS });
    await page.locator('#admin-token-login').click();
    const popup = await popupPromise;
    releaseConfig();
    await popup.waitForURL('**/admin-api/auth**', { timeout: TIMEOUT_MS });
    await nativeLogin.waitFor({ state: 'visible', timeout: TIMEOUT_MS });
    await page.locator('#admin-token-access').waitFor({ state: 'visible', timeout: TIMEOUT_MS });
    assert.equal(await page.locator('#admin-fallback').isHidden(), true);
    await popup.locator('#editor-token').fill(EDITOR_TOKEN);

    const tokenResponsePromise = popup.waitForResponse(response => (
      response.url().endsWith('/admin-api/token') && response.request().method() === 'POST'
    ), { timeout: TIMEOUT_MS });
    const proxyRequestPromise = page.waitForRequest(request => (
      request.url().includes('/admin-api/github/')
    ), { timeout: TIMEOUT_MS });

    await popup.locator('#submit').click();
    const tokenResponse = await tokenResponsePromise;
    assert.equal(tokenResponse.status(), 200);

    const proxyRequest = await proxyRequestPromise;
    assert.match(proxyRequest.headers().authorization || '', /^(?:Bearer|token)\s+\S+$/i);
  } finally {
    if (browser) await browser.close();
    await stopSite(site.child);
  }
});

test('the ready editor keeps a direct Token entry', { timeout: 30_000 }, async () => {
  const site = await startSite();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.route('**/admin/config.yml', async route => {
      const response = await route.fetch();
      const config = (await response.text()).replace(
        'base_url: https://doc.codesome.ai',
        `base_url: ${site.baseUrl}`
      );
      await route.fulfill({ response, body: config });
    });
    await page.route('**/admin-api/github/**', route => route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'local browser test fixture' })
    }));

    await page.goto(`${site.baseUrl}/admin/`, { waitUntil: 'networkidle', timeout: TIMEOUT_MS });
    await page.locator('#admin-token-access').waitFor({ state: 'visible', timeout: TIMEOUT_MS });
    const popupPromise = context.waitForEvent('page', { timeout: TIMEOUT_MS });
    const proxyRequestPromise = page.waitForRequest(request => (
      request.url().includes('/admin-api/github/')
    ), { timeout: TIMEOUT_MS });
    await page.locator('#admin-token-access').click();
    const popup = await popupPromise;
    await popup.waitForURL('**/admin-api/auth**', { timeout: TIMEOUT_MS });
    await popup.locator('#editor-token').fill(EDITOR_TOKEN);

    const tokenResponsePromise = popup.waitForResponse(response => (
      response.url().endsWith('/admin-api/token') && response.request().method() === 'POST'
    ), { timeout: TIMEOUT_MS });
    await popup.locator('#submit').click();
    const tokenResponse = await tokenResponsePromise;
    assert.equal(tokenResponse.status(), 200);

    const proxyRequest = await proxyRequestPromise;
    assert.match(proxyRequest.headers().authorization || '', /^(?:Bearer|token)\s+\S+$/i);
  } finally {
    if (browser) await browser.close();
    await stopSite(site.child);
  }
});
