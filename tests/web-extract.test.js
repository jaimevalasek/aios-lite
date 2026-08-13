'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const os = require('node:os');
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawn } = require('node:child_process');

function startLocalServer(handler) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        port,
        close: () => new Promise((done) => server.close(() => done()))
      });
    });
    server.on('error', reject);
  });
}

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-web-extract-'));
}

function runCli(args, cwd = process.cwd()) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(process.cwd(), 'bin/aioson.js'), ...args], {
      cwd,
      env: process.env
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

const ROUTES = {
  '/': {
    type: 'text/html; charset=utf-8',
    body: [
      '<!doctype html><html><head><title>Neon Studio</title>',
      '<meta name="description" content="Motion-heavy studio site">',
      '<link rel="stylesheet" href="/css/main.css">',
      '</head><body>',
      '<header class="site-head"><h1>Neon Studio</h1></header>',
      '<main><section id="hero"><h2>We move pixels</h2></section></main>',
      '<footer class="site-foot"></footer>',
      '<script src="/js/app.js"></script>',
      '</body></html>'
    ].join('')
  },
  '/css/main.css': {
    type: 'text/css',
    body: [
      ':root { --accent: #ff5c00; --bg: #0f172a; }',
      '@font-face { font-family: Brand; src: url("../fonts/brand.woff2"); }',
      'body { font-family: Brand, sans-serif; color: #0f172a; background: linear-gradient(180deg, #0f172a, #ff5c00); }',
      '.hero { background-attachment: fixed; transition: transform .4s ease; }',
      '@keyframes floaty { from { transform: translateY(0); } to { transform: translateY(-12px); } }',
      '.card { animation: floaty 3s infinite alternate; box-shadow: 0 8px 24px rgba(0,0,0,.4); }',
      '@media (max-width: 768px) { .hero { background-attachment: scroll; } }'
    ].join('\n')
  },
  '/js/app.js': {
    type: 'application/javascript',
    body: 'gsap.to(".hero", { y: -20 });\nconst io = new IntersectionObserver(() => {});\nrequestAnimationFrame(() => {});\n'
  },
  '/fonts/brand.woff2': { type: 'font/woff2', body: Buffer.from([0x77, 0x4f, 0x46, 0x32, 1, 2, 3]) }
};

async function saveFixtureSite(dir, port) {
  const cli = await runCli(['web:save', dir, `--url=http://127.0.0.1:${port}/`, '--slug=neon', '--json']);
  assert.equal(cli.code, 0, cli.stderr);
  return JSON.parse(cli.stdout);
}

test('web:extract writes a token-lean design extract from a saved site', async () => {
  const dir = await makeTempDir();
  const { port, close } = await startLocalServer((req, res) => {
    const route = ROUTES[req.url.split('?')[0]];
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': route.type });
    res.end(route.body);
  });

  try {
    await saveFixtureSite(dir, port);
    const cli = await runCli(['web:extract', dir, '--slug=neon', '--json']);
    assert.equal(cli.code, 0, cli.stderr);
    const parsed = JSON.parse(cli.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.mode, 'extract');
    assert.equal(parsed.title, 'Neon Studio');
    assert.equal(parsed.keyframes.some((entry) => entry.name === 'floaty'), true);
    assert.equal(parsed.libraries.includes('gsap'), true);
    assert.equal(parsed.jsApis.includes('IntersectionObserver'), true);
    assert.equal(parsed.fontFaces.some((entry) => entry.family === 'Brand'), true);
    assert.equal(parsed.mediaQueries.some((entry) => entry.includes('max-width: 768px')), true);

    const extractPath = path.join(dir, 'researchs', 'neon', 'extract.md');
    assert.equal(parsed.file, extractPath);
    const extract = await fs.readFile(extractPath, 'utf8');
    assert.equal(extract.includes('# Design extract: Neon Studio'), true);
    assert.equal(extract.includes('@keyframes floaty'), true);
    assert.equal(extract.includes('--accent: #ff5c00'), true);
    assert.equal(extract.includes('parallax (background-attachment: fixed)'), true);
    assert.equal(extract.includes('## Section topology'), true);
    assert.match(extract, /1\. header \.site-head — "Neon Studio"/);
  } finally {
    await close();
  }
});

test('web:extract --query returns bounded source snippets', async () => {
  const dir = await makeTempDir();
  const { port, close } = await startLocalServer((req, res) => {
    const route = ROUTES[req.url.split('?')[0]];
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': route.type });
    res.end(route.body);
  });

  try {
    await saveFixtureSite(dir, port);
    const cli = await runCli(['web:extract', dir, '--slug=neon', '--query=keyframes', '--json']);
    assert.equal(cli.code, 0, cli.stderr);
    const parsed = JSON.parse(cli.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.mode, 'search');
    assert.equal(parsed.matchCount >= 1, true);
    assert.equal(parsed.matches[0].file.startsWith('css/'), true);
    assert.equal(parsed.matches[0].text.includes('@keyframes floaty'), true);
  } finally {
    await close();
  }
});

test('web:extract fails cleanly when the saved site is missing', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['web:extract', dir, '--slug=ghost', '--json']);
  assert.equal(cli.code, 1);
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error, 'dir_missing');
});
