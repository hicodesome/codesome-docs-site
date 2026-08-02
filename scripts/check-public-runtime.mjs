import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { articleTitleEntries } from './title-metadata.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexPath = resolve(root, 'index.html');
const index = readFileSync(indexPath, 'utf8');
const sourcePattern = /<script\b[^>]*\bsrc="([^"]+)"/g;
const baseUrl = new URL('http://127.0.0.1/');
const scriptPaths = [];
const errors = [];

for (const match of index.matchAll(sourcePattern)) {
  const source = match[1];
  const url = new URL(source, baseUrl);
  if (url.origin !== baseUrl.origin) continue;

  const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const absolutePath = resolve(root, relativePath);
  const relativeToRoot = relative(root, absolutePath);

  if (!relativePath || relativeToRoot.startsWith('..') || relativeToRoot.includes('..')) {
    errors.push(`invalid local browser resource path: ${source}`);
    continue;
  }
  if (!existsSync(absolutePath)) {
    errors.push(`browser resource does not exist: ${relativePath}`);
    continue;
  }

  scriptPaths.push(relativePath);
}

if (errors.length) {
  throw new Error(errors.join('\n'));
}

function reservePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      const port = typeof address === 'object' && address ? address.port : null;
      probe.close(error => error ? reject(error) : resolvePort(port));
    });
  });
}

function waitForServer(child, port) {
  return new Promise((resolveReady, rejectReady) => {
    let output = '';
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      rejectReady(new Error(`server did not start on port ${port}: ${output.trim()}`));
    }, 10000);

    const consume = chunk => {
      output += chunk;
      if (!settled && output.includes(`on port ${port}`)) {
        settled = true;
        clearTimeout(timeout);
        resolveReady();
      }
    };

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', consume);
    child.stderr.on('data', consume);
    child.once('error', error => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectReady(error);
    });
    child.once('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      rejectReady(new Error(`server exited before startup (code=${code}, signal=${signal})`));
    });
  });
}

function waitForExit(child) {
  if (child.exitCode !== null) return Promise.resolve();
  return new Promise(resolveExit => {
    const timeout = setTimeout(resolveExit, 2000);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolveExit();
    });
  });
}

async function request(port, pathname) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    signal: AbortSignal.timeout(5000)
  });
  await response.text();
  return response.status;
}

async function requestText(port, pathname) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    signal: AbortSignal.timeout(5000)
  });
  return { status: response.status, body: await response.text() };
}

function publicPath(path) {
  return `/${encodeURIComponent(path).replaceAll('%2F', '/')}`;
}

function assertScriptOrder() {
  const indexScripts = scriptPaths.map(path => path.replace(/^\.\//, ''));
  const position = path => indexScripts.indexOf(path);
  const required = [
    'assets/page-title.js',
    'assets/vendor/docsify.min.js',
    'assets/article-titles.js',
    'assets/cdc-title-injector.js',
    'assets/vendor/search.min.js'
  ];
  for (const path of required) {
    if (position(path) === -1) throw new Error(`index.html is missing the title pipeline script: ${path}`);
  }
  if (!(position('assets/page-title.js') < position('assets/vendor/docsify.min.js') &&
    position('assets/vendor/docsify.min.js') < position('assets/article-titles.js') &&
    position('assets/article-titles.js') < position('assets/cdc-title-injector.js') &&
    position('assets/cdc-title-injector.js') < position('assets/vendor/search.min.js'))) {
    throw new Error('index.html title pipeline script order is invalid');
  }
}

async function main() {
  const port = await reservePort();
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: root,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServer(child, port);

    if (await request(port, '/index.html') !== 200) {
      throw new Error('server did not serve index.html');
    }
    assertScriptOrder();

    for (const path of [...new Set(scriptPaths)]) {
      const status = await request(port, `/${path}`);
      if (status !== 200) {
        throw new Error(`browser resource is not public: ${path} (HTTP ${status})`);
      }
    }

    const criticalResources = [
      ['assets/article-titles.js', 'CODESOME_ARTICLE_TITLES'],
      ['assets/cdc-title-injector.js', 'CODESOME_TITLE_PIPELINE'],
      ['assets/page-title.js', 'page-title-fallback']
    ];
    for (const [path, marker] of criticalResources) {
      const response = await requestText(port, publicPath(path));
      if (response.status !== 200 || !response.body.includes(marker)) {
        throw new Error(`public browser resource content is invalid: ${path} (HTTP ${response.status})`);
      }
    }

    for (const { site } of articleTitleEntries) {
      const response = await requestText(port, publicPath(site));
      if (response.status !== 200 || !response.body.trim()) {
        throw new Error(`registered article is not publicly readable: ${site} (HTTP ${response.status})`);
      }
    }

    for (const path of ['/99-unregistered-title-contract.md', '/unregistered-title-contract.md']) {
      const status = await request(port, path);
      if (status !== 404) {
        throw new Error(`unregistered article is unexpectedly public: ${path} (HTTP ${status})`);
      }
    }

    for (const path of [
      '/scripts/generate-title-map.mjs',
      '/scripts/page-title.js',
      '/scripts/home-tutorial-grid.js',
      '/scripts/sidebar-scroll.js',
      '/scripts/copy-page-markdown.js',
      '/server.mjs',
      '/docs/CONTENT_BASELINE.md'
    ]) {
      const status = await request(port, path);
      if (status !== 404) {
        throw new Error(`private path is unexpectedly public: ${path} (HTTP ${status})`);
      }
    }
  } finally {
    if (child.exitCode === null) child.kill('SIGTERM');
    await waitForExit(child);
  }

  console.log(`Public runtime check passed: ${new Set(scriptPaths).size} local browser resources served; private paths remain blocked`);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
