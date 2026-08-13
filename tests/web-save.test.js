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
  return fs.mkdtemp(path.join(os.tmpdir(), 'aioson-web-save-'));
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

const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const WOFF2_BYTES = Buffer.from([0x77, 0x4f, 0x46, 0x32, 9, 9, 9, 9]);

function buildRoutes() {
  return {
    '/': {
      type: 'text/html; charset=utf-8',
      body: [
        '<!doctype html><html><head><title>Fx</title>',
        '<base href="/nested/">',
        '<link rel="stylesheet" href="/css/main.css">',
        '<style>.hero { background: url(\'/images/hero.png\'); }</style>',
        '</head><body>',
        '<img src="/images/logo.png" srcset="/images/logo.png 1x, /images/logo@2x.png 2x">',
        '<div style="background-image: url(/images/hero.png)">fx</div>',
        '<img src="/images/missing.png">',
        '<script src="/js/app.js"></script>',
        '</body></html>'
      ].join('')
    },
    '/css/main.css': {
      type: 'text/css',
      body: '@import "extra.css";\n@font-face { font-family: Brand; src: url("../fonts/brand.woff2"); }\n.btn { transition: all .3s ease; }\n'
    },
    '/css/extra.css': {
      type: 'text/css',
      body: '@keyframes spin { to { transform: rotate(360deg); } }\n.x { background: url(/images/logo.png); }\n'
    },
    '/js/app.js': { type: 'application/javascript', body: 'console.log("fx");\n' },
    '/fonts/brand.woff2': { type: 'font/woff2', body: WOFF2_BYTES },
    '/images/logo.png': { type: 'image/png', body: PNG_BYTES },
    '/images/logo@2x.png': { type: 'image/png', body: PNG_BYTES },
    '/images/hero.png': { type: 'image/png', body: PNG_BYTES }
  };
}

test('web:save --json mirrors page, assets, and rewrites references', async () => {
  const dir = await makeTempDir();
  const routes = buildRoutes();
  const { port, close } = await startLocalServer((req, res) => {
    const route = routes[req.url.split('?')[0]];
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': route.type });
    res.end(route.body);
  });

  try {
    const cli = await runCli(['web:save', dir, `--url=http://127.0.0.1:${port}/`, '--slug=fx-site', '--json']);
    assert.equal(cli.code, 0, cli.stderr);
    const parsed = JSON.parse(cli.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.slug, 'fx-site');

    const siteDir = path.join(dir, 'researchs', 'fx-site', 'site');
    assert.equal(parsed.dir, siteDir);

    const html = await fs.readFile(path.join(siteDir, 'index.html'), 'utf8');
    assert.equal(html.includes('<base'), false);
    assert.equal(html.includes('/css/main.css'), false);
    assert.match(html, /href="css\/main-[0-9a-f]{8}\.css"/);
    assert.match(html, /src="images\/logo-[0-9a-f]{8}\.png"/);
    assert.match(html, /srcset="images\/logo-[0-9a-f]{8}\.png 1x, images\/logo-2x-[0-9a-f]{8}\.png 2x"/);
    assert.match(html, /url\('images\/hero-[0-9a-f]{8}\.png'\)/);
    assert.match(html, /url\(images\/hero-[0-9a-f]{8}\.png\)/);
    assert.match(html, /src="js\/app-[0-9a-f]{8}\.js"/);

    const manifest = JSON.parse(await fs.readFile(path.join(siteDir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.counts.css, 2);
    assert.equal(manifest.counts.js, 1);
    assert.equal(manifest.counts.font, 1);
    assert.equal(manifest.counts.image, 3);
    assert.equal(manifest.failures.length, 1);
    assert.equal(manifest.failures[0].reason, 'http_error');
    assert.equal(manifest.failures[0].statusCode, 404);

    const mainCssEntry = manifest.files.find((file) => file.url.endsWith('/css/main.css'));
    const mainCss = await fs.readFile(path.join(siteDir, ...mainCssEntry.path.split('/')), 'utf8');
    assert.match(mainCss, /@import "extra-[0-9a-f]{8}\.css"/);
    assert.match(mainCss, /url\("\.\.\/fonts\/brand-[0-9a-f]{8}\.woff2"\)/);
    assert.equal(mainCss.includes('transition: all .3s ease'), true);

    const extraCssEntry = manifest.files.find((file) => file.url.endsWith('/css/extra.css'));
    const extraCss = await fs.readFile(path.join(siteDir, ...extraCssEntry.path.split('/')), 'utf8');
    assert.match(extraCss, /url\(\.\.\/images\/logo-[0-9a-f]{8}\.png\)/);
    assert.equal(extraCss.includes('@keyframes spin'), true);

    const fontEntry = manifest.files.find((file) => file.kind === 'font');
    const fontBytes = await fs.readFile(path.join(siteDir, ...fontEntry.path.split('/')));
    assert.deepEqual(fontBytes, WOFF2_BYTES);

    const summary = await fs.readFile(path.join(dir, 'researchs', 'fx-site', 'summary.md'), 'utf8');
    assert.equal(summary.includes('agent: web-save'), true);
    assert.equal(summary.includes(`http://127.0.0.1:${port}/`), true);
  } finally {
    await close();
  }
});

test('web:save enforces --max-files budget without failing the run', async () => {
  const dir = await makeTempDir();
  const routes = buildRoutes();
  const { port, close } = await startLocalServer((req, res) => {
    const route = routes[req.url.split('?')[0]];
    if (!route) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': route.type });
    res.end(route.body);
  });

  try {
    const cli = await runCli(['web:save', dir, `--url=http://127.0.0.1:${port}/`, '--slug=budget', '--max-files=2', '--json']);
    assert.equal(cli.code, 0, cli.stderr);
    const parsed = JSON.parse(cli.stdout);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.failures.some((failure) => failure.reason === 'max_files_reached'), true);
    const manifest = JSON.parse(await fs.readFile(path.join(dir, 'researchs', 'budget', 'site', 'manifest.json'), 'utf8'));
    assert.equal(manifest.file_count <= 3, true);
  } finally {
    await close();
  }
});

test('web:save without --url fails with exit 1', async () => {
  const dir = await makeTempDir();
  const cli = await runCli(['web:save', dir, '--json']);
  assert.equal(cli.code, 1);
  const parsed = JSON.parse(cli.stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error, 'url_missing');
});
