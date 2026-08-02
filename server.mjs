import { createServer } from 'node:http';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extname, relative, resolve } from 'node:path';
import { assertCanonicalArticleMarkdown } from './scripts/markdown-headings.mjs';
import { articleTitleEntries } from './scripts/title-metadata.mjs';
import {
  assertPublicArticleSources,
  assertPublicRuntimeContract,
  publicRuntimeHealth
} from './scripts/public-runtime-contract.mjs';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT || process.env.PM2_SERVE_PORT || 3009);
const REPO = 'hicodesome/codesome-docs-site';
const REPO_API_ROOT = `/repos/${REPO}`;
const GITHUB_API_ROOT = 'https://api.github.com';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const MAX_BODY_BYTES = 40 * 1024 * 1024;
const SESSION_SECRET = process.env.CODESOME_DOC_ADMIN_SESSION_SECRET || '';
const EDITOR_TOKEN_HASH = process.env.CODESOME_DOC_ADMIN_TOKEN_HASH || '';
const GITHUB_TOKEN = process.env.CODESOME_DOC_ADMIN_GITHUB_TOKEN || '';
const revokedSessions = new Map();
const loginAttempts = new Map();
const ALLOWED_PROXY_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);
const PRIVATE_STATIC_PREFIXES = ['.git/', '.agents/', 'node_modules/', 'scripts/', 'docs/'];
const PUBLIC_STATIC_PLACEHOLDERS = new Set(['images/uploads/.gitkeep']);
const CONTENTS_PATH_PATTERN = /^\/contents(?:\/[^/]+\.md|\/images\/uploads(?:\/.+)?)?$/;
const PRIVATE_STATIC_FILES = new Set([
  'ecosystem.config.js',
  'package.json',
  'package-lock.json',
  'server.mjs'
]);
const PUBLIC_DOCUMENT_FILES = new Set(['README.md', '_sidebar.md']);
const PUBLIC_ARTICLE_TITLES = new Map(articleTitleEntries.map(article => [article.site, article.title]));
const PUBLIC_ARTICLE_FILES = new Set(PUBLIC_ARTICLE_TITLES.keys());

export { assertPublicArticleSources };

export function publicArticleTitleHealth(entries = articleTitleEntries, readSource) {
  try {
    const articleCount = readSource
      ? assertPublicArticleSources(entries, readSource)
      : assertPublicArticleSources(entries);
    return { ok: true, articleCount };
  } catch {
    return { ok: false, articleCount: 0 };
  }
}

export function publicRuntimeTitleHealth() {
  return publicRuntimeHealth({ root: ROOT });
}

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.yml': 'text/yaml; charset=utf-8',
  '.yaml': 'text/yaml; charset=utf-8'
};

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64url(value) {
  return Buffer.from(value, 'base64url');
}

function json(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(payload);
}

function text(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(body);
}

function configReady() {
  return Boolean(SESSION_SECRET && EDITOR_TOKEN_HASH && GITHUB_TOKEN);
}

function readRequestBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    let rejected = false;
    req.on('data', chunk => {
      if (rejected) return;
      size += chunk.length;
      if (size > maxBytes) {
        rejected = true;
        reject(Object.assign(new Error('request body too large'), { statusCode: 413 }));
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!rejected) resolveBody(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

function parseScryptHash(value) {
  const parts = value.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;
  const [name, nText, rText, pText, saltText, hashText] = parts;
  const n = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (!Number.isSafeInteger(n) || n < 16_384 || n > 1_048_576 || (n & (n - 1)) !== 0) return null;
  if (!Number.isSafeInteger(r) || r < 1 || r > 32) return null;
  if (!Number.isSafeInteger(p) || p < 1 || p > 4) return null;
  try {
    const salt = decodeBase64url(saltText);
    const hash = decodeBase64url(hashText);
    if (salt.length < 8 || salt.length > 64 || hash.length < 32 || hash.length > 64) return null;
    return {
      n,
      r,
      p,
      salt,
      hash,
      name
    };
  } catch {
    return null;
  }
}

function verifyEditorToken(candidate) {
  if (!candidate || !EDITOR_TOKEN_HASH) return false;
  const parsed = parseScryptHash(EDITOR_TOKEN_HASH);
  if (!parsed || parsed.name !== 'scrypt' || parsed.hash.length < 32) return false;
  try {
    const derived = scryptSync(candidate, parsed.salt, parsed.hash.length, {
      N: parsed.n,
      r: parsed.r,
      p: parsed.p,
      maxmem: 128 * 1024 * 1024
    });
    return timingSafeEqual(derived, parsed.hash);
  } catch {
    return false;
  }
}

function signSession(payload) {
  const encoded = base64url(JSON.stringify(payload));
  const signature = createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function issueSession() {
  const now = Math.floor(Date.now() / 1000);
  return signSession({
    sub: 'codesome-doc-editor',
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    jti: randomBytes(16).toString('hex')
  });
}

function verifySession(req) {
  if (!SESSION_SECRET) return null;
  const authorization = String(req.headers.authorization || '');
  const match = authorization.match(/^(?:token|bearer)\s+(.+)$/i);
  if (!match) return null;
  const token = match[1];
  if (token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, receivedSignature] = parts;
  if (!encoded || !receivedSignature || !/^[A-Za-z0-9_-]+$/.test(encoded) || !/^[A-Za-z0-9_-]+$/.test(receivedSignature)) return null;
  const expectedSignature = createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(receivedSignature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const payload = JSON.parse(decodeBase64url(encoded).toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.sub !== 'codesome-doc-editor' || !payload.jti || !Number.isSafeInteger(payload.exp) || payload.exp <= now) return null;
    const revokedUntil = revokedSessions.get(payload.jti);
    if (revokedUntil && revokedUntil > now) return null;
    if (revokedUntil) revokedSessions.delete(payload.jti);
    return { token, payload };
  } catch {
    return null;
  }
}

function clientAddress(req) {
  const remote = req.socket.remoteAddress || 'unknown';
  const isTrustedProxy = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
  const forwarded = isTrustedProxy ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
  return forwarded || remote;
}

function loginRateLimited(req) {
  const key = clientAddress(req);
  const now = Date.now();
  const current = loginAttempts.get(key) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (current.resetAt <= now) {
    current.count = 0;
    current.resetAt = now + 15 * 60 * 1000;
  }
  current.count += 1;
  loginAttempts.set(key, current);
  return current.count > 10;
}

function pruneAuthState() {
  const now = Date.now();
  for (const [key, attempt] of loginAttempts) {
    if (attempt.resetAt <= now) loginAttempts.delete(key);
  }
  const nowSeconds = Math.floor(now / 1000);
  for (const [jti, expiresAt] of revokedSessions) {
    if (expiresAt <= nowSeconds) revokedSessions.delete(jti);
  }
}

function authPopup() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Codesome 文档编辑登录</title>
  <style>
    :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f3f7f4; color: #24332a; }
    main { width: min(360px, calc(100vw - 40px)); padding: 28px; border: 1px solid #d8e4db; border-radius: 8px; background: #fff; box-shadow: 0 8px 28px rgba(37, 64, 47, .12); }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p { color: #5d6b62; font-size: 14px; line-height: 1.5; }
    label { display: block; margin: 20px 0 6px; font-size: 13px; font-weight: 600; }
    input { box-sizing: border-box; width: 100%; padding: 11px 12px; border: 1px solid #b9cbbf; border-radius: 4px; font: inherit; }
    input:focus { outline: 2px solid rgba(66, 185, 131, .35); border-color: #42b983; }
    button { width: 100%; margin-top: 18px; padding: 11px 12px; border: 0; border-radius: 4px; background: #168a58; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
    button:disabled { opacity: .6; cursor: wait; }
    #error { min-height: 1.4em; margin: 12px 0 0; color: #b42318; }
  </style>
</head>
<body>
  <main>
    <h1>Codesome 文档编辑</h1>
    <p>请输入编辑 Token。</p>
    <form id="login-form" hidden>
      <label for="editor-token">编辑 Token</label>
      <input id="editor-token" name="token" type="password" autocomplete="current-password" required>
      <button id="submit" type="submit">登录</button>
      <p id="error" role="alert"></p>
    </form>
  </main>
  <script>
    (() => {
      const origin = window.location.origin;
      const provider = new URLSearchParams(window.location.search).get('provider') || 'github';
      const handshake = 'authorizing:' + provider;
      const form = document.getElementById('login-form');
      const input = document.getElementById('editor-token');
      const button = document.getElementById('submit');
      const error = document.getElementById('error');
      let ready = false;

      function showForm() {
        if (ready) return;
        ready = true;
        form.hidden = false;
        input.focus();
      }

      function send(message) {
        if (window.opener && !window.opener.closed) window.opener.postMessage(message, origin);
      }

      window.addEventListener('message', event => {
        if (event.origin === origin && event.data === handshake) showForm();
      });
      send(handshake);
      const retry = window.setInterval(() => {
        if (ready) return window.clearInterval(retry);
        send(handshake);
      }, 500);
      window.setTimeout(showForm, 800);

      form.addEventListener('submit', async event => {
        event.preventDefault();
        error.textContent = '';
        button.disabled = true;
        try {
          const response = await fetch('/admin-api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: input.value })
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data.token) throw new Error(data.error || '登录失败');
          send('authorization:' + provider + ':success:' + JSON.stringify({
            token: data.token,
            token_type: 'bearer',
            expires_in: data.expires_in || 28800
          }));
          window.setTimeout(() => window.close(), 150);
        } catch (loginError) {
          error.textContent = loginError.message || '登录失败';
          button.disabled = false;
          input.select();
        }
      });
    })();
  </script>
</body>
</html>`;
}

async function handleToken(req, res) {
  if (req.method !== 'POST') return text(res, 405, 'Method Not Allowed');
  if (!configReady()) return json(res, 503, { error: '编辑服务尚未配置' });
  if (loginRateLimited(req)) return json(res, 429, { error: '登录尝试过于频繁，请稍后再试' });
  let body;
  try {
    body = JSON.parse((await readRequestBody(req, 64 * 1024)).toString('utf8'));
  } catch (error) {
    return json(res, error.statusCode || 400, { error: error.statusCode === 413 ? '请求体过大' : '无效请求' });
  }
  if (!verifyEditorToken(typeof body.token === 'string' ? body.token : '')) {
    return json(res, 401, { error: 'Token 无效' });
  }
  return json(res, 200, {
    token: issueSession(),
    expires_in: SESSION_TTL_SECONDS
  });
}

function isAllowedCmsBranch(branch) {
  return typeof branch === 'string' &&
    /^cms\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(branch) &&
    !branch.includes('..') &&
    !branch.includes('//') &&
    !branch.endsWith('/') &&
    !branch.endsWith('.');
}

export function isAllowedContentWriteBody(method, body) {
  if (!['PUT', 'DELETE'].includes(method)) return true;
  if (!body) return false;
  try {
    const payload = JSON.parse(Buffer.from(body).toString('utf8'));
    return isAllowedCmsBranch(payload.branch);
  } catch {
    return false;
  }
}

export function isAllowedContentWriteRequest(pathname, method, search, body) {
  if (!['PUT', 'DELETE'].includes(method)) return true;
  if (!isAllowedContentWriteBody(method, body)) return false;

  const payload = parseContentPayload(body);
  const branch = payload?.branch;
  if (!isAllowedCmsBranch(branch)) return false;

  const query = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  for (const key of ['branch', 'ref']) {
    if (query.getAll(key).some(value => value !== branch)) return false;
  }
  return true;
}

function contentPathFromApiPath(pathname) {
  const prefix = `${REPO_API_ROOT}/contents/`;
  if (!pathname.startsWith(prefix)) return null;
  try {
    return decodeURIComponent(pathname.slice(prefix.length));
  } catch {
    return '';
  }
}

function parseContentPayload(body) {
  if (!body) return null;
  try {
    const payload = JSON.parse(Buffer.from(body).toString('utf8'));
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    return null;
  }
}

function decodeGitHubContent(value) {
  if (typeof value !== 'string') return null;
  const compact = value.replace(/\s+/g, '');
  if (!compact || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length % 4 !== 0) return null;
  const content = Buffer.from(compact, 'base64');
  if (content.toString('base64') !== compact) return null;
  return content.toString('utf8');
}

export function isAllowedArticleContentWrite(pathname, method, body) {
  if (!['PUT', 'DELETE'].includes(method)) return true;
  const articlePath = contentPathFromApiPath(pathname);
  if (articlePath === null || articlePath.startsWith('images/uploads/')) return true;
  if (PUBLIC_DOCUMENT_FILES.has(articlePath)) return true;

  const title = PUBLIC_ARTICLE_TITLES.get(articlePath);
  if (!title || method === 'DELETE') return false;
  const payload = parseContentPayload(body);
  const content = decodeGitHubContent(payload?.content);
  if (content === null) return false;

  try {
    assertCanonicalArticleMarkdown(content, title);
    return true;
  } catch {
    return false;
  }
}

export function isAllowedGitRef(ref) {
  if (ref === 'refs/meta/_decap_cms') return true;
  if (typeof ref !== 'string' || !ref.startsWith('refs/heads/')) return false;
  return isAllowedCmsBranch(ref.slice('refs/heads/'.length));
}

function refFromGitHubPath(repoPath) {
  const prefix = '/git/refs/heads/';
  if (!repoPath.startsWith(prefix)) return null;
  try {
    return decodeURIComponent(repoPath.slice(prefix.length));
  } catch {
    return null;
  }
}

export function isAllowedGitHubPath(pathname, method) {
  if (!ALLOWED_PROXY_METHODS.has(method)) return false;
  if (!pathname || pathname.includes('\\') || pathname.includes('\0') || /(?:^|\/)\.\.(?:\/|$)/.test(pathname) || /%2e(?:%2e)?/i.test(pathname)) return false;
  if (pathname === '/user') return method === 'GET';
  if (/^\/users\/[A-Za-z0-9][A-Za-z0-9-]*$/.test(pathname)) return method === 'GET';
  if (pathname === '/search/issues') return method === 'GET';
  const repoRoot = REPO_API_ROOT;
  if (pathname !== repoRoot && !pathname.startsWith(`${repoRoot}/`)) return false;
  const repoPath = pathname.slice(repoRoot.length);
  if (repoPath === '' || repoPath === '/') return method === 'GET' || method === 'HEAD';

  if (CONTENTS_PATH_PATTERN.test(repoPath)) {
    return ['GET', 'HEAD', 'PUT', 'DELETE'].includes(method);
  }
  if (/^\/branches\/[^/]+$/.test(repoPath)) return method === 'GET' || method === 'HEAD';
  if (/^\/git\/(?:blobs|trees)(?:\/.*)?$/.test(repoPath)) return ['GET', 'HEAD', 'POST'].includes(method);
  if (/^\/git\/commits(?:\/[^/]+)?$/.test(repoPath)) return ['GET', 'HEAD', 'POST'].includes(method);
  if (repoPath === '/git/refs') return method === 'POST';
  if (/^\/git\/refs\/meta\/_decap_cms$/.test(repoPath)) return ['GET', 'HEAD', 'POST'].includes(method);
  if (repoPath.startsWith('/git/refs/heads/')) {
    const ref = refFromGitHubPath(repoPath);
    if (!ref) return false;
    if (isAllowedCmsBranch(ref)) return ['GET', 'HEAD', 'PATCH', 'DELETE'].includes(method);
    return !ref.includes('/') && ['GET', 'HEAD'].includes(method);
  }
  if (/^\/commits(?:\/[^/]+(?:\/status)?)?$/.test(repoPath)) return method === 'GET' || method === 'HEAD';
  if (/^\/compare\/[^/]+\.\.\.[^/]+$/.test(repoPath)) return method === 'GET' || method === 'HEAD';
  if (repoPath === '/pulls') return ['GET', 'HEAD', 'POST'].includes(method);
  if (/^\/pulls\/\d+$/.test(repoPath)) return ['GET', 'HEAD', 'PATCH'].includes(method);
  if (/^\/pulls\/\d+\/(?:commits|files)$/.test(repoPath)) return method === 'GET' || method === 'HEAD';
  if (/^\/pulls\/\d+\/merge$/.test(repoPath)) return method === 'PUT';
  if (repoPath === '/labels') return ['GET', 'HEAD', 'POST'].includes(method);
  if (repoPath === '/issues') return ['GET', 'HEAD', 'POST'].includes(method);
  if (/^\/issues\/\d+$/.test(repoPath)) return ['GET', 'HEAD', 'PATCH'].includes(method);
  if (/^\/issues\/\d+\/(?:labels|comments)$/.test(repoPath)) return ['GET', 'HEAD', 'POST', 'PUT'].includes(method);
  if (/^\/issues\/comments\/\d+$/.test(repoPath)) return ['PATCH', 'DELETE'].includes(method);
  return false;
}

async function handleGitHubProxy(req, res, url) {
  if (!verifySession(req)) return json(res, 401, { message: '登录已失效' });
  if (!GITHUB_TOKEN) return json(res, 503, { message: 'GitHub 写入服务尚未配置' });
  const pathname = url.pathname.slice('/admin-api/github'.length) || '/';
  if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return text(res, 405, 'Method Not Allowed');
  }
  if (!isAllowedGitHubPath(pathname, req.method)) return json(res, 403, { message: 'API path is not allowed' });

  let body;
  if (!['GET', 'HEAD'].includes(req.method)) {
    try {
      body = await readRequestBody(req);
    } catch (error) {
      return json(res, error.statusCode || 400, { message: '请求体无效' });
    }
  }

  const isContentsPath = pathname === `${REPO_API_ROOT}/contents` ||
    pathname.startsWith(`${REPO_API_ROOT}/contents/`);
  if (isContentsPath && (
    !isAllowedContentWriteRequest(pathname, req.method, url.search, body) ||
    !isAllowedArticleContentWrite(pathname, req.method, body)
  )) {
    return json(res, 403, { message: 'contents writes must target a cms/* branch and canonical registered article' });
  }

  if (req.method === 'POST' && pathname.endsWith('/git/refs')) {
    let ref;
    try {
      ref = JSON.parse(body.toString('utf8')).ref;
    } catch {
      return json(res, 400, { message: '请求体无效' });
    }
    if (!isAllowedGitRef(ref)) {
      return json(res, 403, { message: 'ref is not allowed' });
    }
  }

  let upstream;
  try {
    upstream = await fetch(`${GITHUB_API_ROOT}${pathname}${url.search}`, {
      method: req.method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'User-Agent': 'codesome-doc-admin',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(req.headers['content-type'] ? { 'Content-Type': req.headers['content-type'] } : {})
      },
      body
    });
  } catch {
    return json(res, 502, { message: 'GitHub API 暂时不可用' });
  }

  const responseBody = Buffer.from(await upstream.arrayBuffer());
  const responseHeaders = {};
  for (const name of ['content-type', 'etag', 'link', 'x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders[name] = value;
  }
  res.writeHead(upstream.status, responseHeaders);
  res.end(responseBody);
}

async function serveStatic(req, res, url) {
  if (!['GET', 'HEAD'].includes(req.method)) return text(res, 405, 'Method Not Allowed');
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return text(res, 400, 'Bad Request');
  }
  if (pathname.includes('\0') || pathname.split('/').includes('..')) return text(res, 400, 'Bad Request');
  if (pathname === '/admin' || pathname === '/admin/') pathname = '/admin/index.html';
  const isAdmin = pathname === '/admin/index.html' || pathname.startsWith('/admin/');
  if (!isAdmin && !publicRuntimeTitleHealth().ok) {
    return text(res, 503, 'Public title contract failed');
  }
  let relativePath = pathname.replace(/^\/+/, '');
  if (!relativePath) relativePath = 'index.html';
  const isPublicPlaceholder = PUBLIC_STATIC_PLACEHOLDERS.has(relativePath);
  if (!isAdmin && !isPublicPlaceholder && !extname(relativePath)) relativePath = 'index.html';
  const isHiddenPath = relativePath.split('/').some(segment => segment.startsWith('.') && segment !== '.nojekyll');
  if (isHiddenPath && !PUBLIC_STATIC_PLACEHOLDERS.has(relativePath)) return text(res, 404, 'Not Found');
  if (PRIVATE_STATIC_FILES.has(relativePath) || PRIVATE_STATIC_PREFIXES.some(prefix => relativePath.startsWith(prefix))) {
    return text(res, 404, 'Not Found');
  }
  if (/\.md$/i.test(relativePath) &&
      !PUBLIC_ARTICLE_FILES.has(relativePath) &&
      !PUBLIC_DOCUMENT_FILES.has(relativePath)) {
    return text(res, 404, 'Not Found');
  }
  if (/^\d{2}-.*\.md$/i.test(relativePath) && !PUBLIC_ARTICLE_FILES.has(relativePath)) {
    return text(res, 404, 'Not Found');
  }

  const absolutePath = resolve(ROOT, relativePath);
  const relativeToRoot = relative(ROOT, absolutePath);
  if (relativeToRoot.startsWith('..') || relativeToRoot.includes('..')) return text(res, 403, 'Forbidden');
  let fileStat;
  try {
    fileStat = await stat(absolutePath);
    if (!fileStat.isFile()) throw new Error('not a file');
  } catch {
    return text(res, 404, 'Not Found');
  }

  let responseBody;
  const articleTitle = PUBLIC_ARTICLE_TITLES.get(relativePath);
  if (articleTitle) {
    try {
      const source = await readFile(absolutePath, 'utf8');
      responseBody = Buffer.from(assertCanonicalArticleMarkdown(source, articleTitle), 'utf8');
    } catch {
      return text(res, 500, 'Article title contract failed');
    }
  }

  const cacheControl = isAdmin || relativePath === 'index.html' || articleTitle
    ? 'no-cache, must-revalidate'
    : 'public, max-age=300';
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[extname(absolutePath).toLowerCase()] || 'application/octet-stream',
    'Content-Length': responseBody ? responseBody.length : fileStat.size,
    'Cache-Control': cacheControl
  });
  if (req.method === 'HEAD') return res.end();
  if (responseBody) return res.end(responseBody);
  createReadStream(absolutePath).pipe(res);
}

async function handleRequest(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/admin-api/healthz') {
    const titleContract = publicRuntimeTitleHealth();
    return json(res, titleContract.ok ? 200 : 503, {
      ok: titleContract.ok,
      configured: configReady(),
      titleContract: titleContract.ok ? 'ready' : 'failed',
      articleCount: titleContract.articleCount,
      titleMapVersion: titleContract.titleMapVersion || null
    });
  }
  if (url.pathname === '/admin-api/auth') {
    if (req.method !== 'GET') return text(res, 405, 'Method Not Allowed');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'SAMEORIGIN'
    });
    return res.end(authPopup());
  }
  if (url.pathname === '/admin-api/token') return handleToken(req, res);
  if (url.pathname === '/admin-api/logout') {
    const session = verifySession(req);
    if (session) revokedSessions.set(session.payload.jti, session.payload.exp);
    return json(res, 200, { ok: true });
  }
  if (url.pathname === '/admin-api/github' || url.pathname.startsWith('/admin-api/github/')) return handleGitHubProxy(req, res, url);
  return serveStatic(req, res, url);
}

export function isServerEntrypoint(argvPath = process.argv[1], pmExecPath = process.env.pm_exec_path) {
  const modulePath = fileURLToPath(import.meta.url);
  return [argvPath, pmExecPath].some(candidate => candidate && resolve(candidate) === modulePath);
}

if (isServerEntrypoint()) {
  const titleContract = publicRuntimeTitleHealth();
  if (!titleContract.ok) {
    try {
      assertPublicRuntimeContract({ root: ROOT });
    } catch (error) {
      console.error(`doc-site title contract failed; refusing to start: ${error.message}`);
    }
    process.exitCode = 1;
  } else {
    const server = createServer((req, res) => {
      handleRequest(req, res).catch(error => {
        if (!res.headersSent) json(res, 500, { message: '服务内部错误' });
      });
    });

    server.listen(PORT, '0.0.0.0', () => {
      const missing = [];
      if (!SESSION_SECRET) missing.push('CODESOME_DOC_ADMIN_SESSION_SECRET');
      if (!EDITOR_TOKEN_HASH) missing.push('CODESOME_DOC_ADMIN_TOKEN_HASH');
      if (!GITHUB_TOKEN) missing.push('CODESOME_DOC_ADMIN_GITHUB_TOKEN');
      if (missing.length) console.warn(`doc-site admin disabled; missing environment: ${missing.join(', ')}`);
      console.log(`doc-site serving ${ROOT} on port ${PORT}`);
    });

    const authStatePruner = setInterval(pruneAuthState, 15 * 60 * 1000);
    authStatePruner.unref();
  }
}
