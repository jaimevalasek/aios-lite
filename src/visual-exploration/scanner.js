'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { isInsideRoot, toPosixPath } = require('../verification/path-policy');

const SKIP_DIRS = new Set(['.git', '.aioson', 'node_modules', 'dist', 'build', 'coverage', '.next', '.nuxt', 'vendor']);
const SOURCE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.css', '.scss', '.sass', '.less', '.html']);
const TEST_RE = /(?:^|[\\/])(?:test|tests|__tests__)(?:[\\/])|\.(?:test|spec)\.[cm]?[jt]sx?$/i;
const STYLE_RE = /\.(?:css|scss|sass|less)$/i;
const ROUTE_RE = /(?:route|router|routes|page|layout|screen|view)/i;
const COMPONENT_RE = /(?:^|[\\/])(?:components?|ui)(?:[\\/])/i;
const MAX_SCAN_FILE_BYTES = 2 * 1024 * 1024;

function isFrontendCandidate(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return SOURCE_EXTS.has(ext) || ['package.json', 'vite.config.js', 'vite.config.ts', 'next.config.js', 'tailwind.config.js', 'tailwind.config.ts'].includes(path.basename(fileName));
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function walk(root, start, out, limit) {
  if (out.length >= limit) return;
  let entries;
  try {
    entries = await fs.readdir(start, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (out.length >= limit) break;
    if (entry.isSymbolicLink()) continue;
    const absolute = path.join(start, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(root, absolute, out, limit);
      continue;
    }
    if (!entry.isFile()) continue;
    const relative = toPosixPath(path.relative(root, absolute));
    if (isFrontendCandidate(entry.name)) {
      out.push({ absolute, relative });
    }
  }
}

function classify(relative) {
  if (/package\.json$|(?:vite|next|tailwind|webpack|astro)\.config/i.test(relative)) return 'manifest/config';
  if (TEST_RE.test(relative)) return 'test';
  if (STYLE_RE.test(relative)) return 'style/token';
  if (ROUTE_RE.test(relative)) return 'route/entry';
  if (COMPONENT_RE.test(relative)) return 'component';
  return 'source';
}

async function scanFrontend(projectDir, { scope = 'targeted', paths = [] } = {}) {
  const root = path.resolve(projectDir);
  const limit = scope === 'full' ? 500 : 200;
  const starts = [];
  const requested = Array.isArray(paths) ? paths : String(paths || '').split(',');
  for (const candidate of requested.map(value => String(value || '').trim()).filter(Boolean)) {
    const absolute = path.resolve(root, candidate);
    if (!isInsideRoot(root, absolute)) throw new Error(`scan path escapes project: ${candidate}`);
    starts.push(absolute);
  }
  if (starts.length === 0 && scope === 'full') {
    starts.push(root);
  } else if (starts.length === 0) {
    for (const candidate of ['src', 'app', 'frontend', 'web', 'packages', 'package.json', 'vite.config.js', 'vite.config.ts', 'next.config.js', 'tailwind.config.js', 'tailwind.config.ts']) {
      const absolute = path.join(root, candidate);
      try {
        const stat = await fs.stat(absolute);
        if (stat.isDirectory() || (stat.isFile() && isFrontendCandidate(absolute))) starts.push(absolute);
      } catch {}
    }
    if (starts.length === 0) starts.push(root);
  }

  const discovered = [];
  for (const start of [...new Set(starts)]) {
    let stat;
    try { stat = await fs.stat(start); } catch { continue; }
    if (stat.isFile() && isFrontendCandidate(start)) {
      discovered.push({ absolute: start, relative: toPosixPath(path.relative(root, start)) });
    } else if (stat.isDirectory()) {
      await walk(root, start, discovered, limit);
    }
  }
  const unique = new Map(discovered.map(item => [item.relative, item]));
  const files = [];
  const skippedLarge = [];
  for (const item of [...unique.values()].slice(0, limit)) {
    let data;
    try {
      const stat = await fs.stat(item.absolute);
      if (stat.size > MAX_SCAN_FILE_BYTES) {
        skippedLarge.push(item.relative);
        continue;
      }
      data = await fs.readFile(item.absolute);
    } catch {
      continue;
    }
    files.push({
      path: item.relative,
      kind: classify(item.relative),
      bytes: data.length,
      sha256: sha256(data)
    });
  }
  files.sort((a, b) => a.kind.localeCompare(b.kind) || a.path.localeCompare(b.path));
  return { scope, limit, truncated: unique.size > limit, skipped_large: skippedLarge, files };
}

function renderSourceMap(scan) {
  const groups = new Map();
  for (const file of scan.files) {
    if (!groups.has(file.kind)) groups.set(file.kind, []);
    groups.get(file.kind).push(file);
  }
  const lines = [
    '# Current front-end source map',
    '',
    '<!-- aioson:visual-exploration-source-map -->',
    '',
    `- Scan scope: ${scan.scope}`,
    `- Files recorded: ${scan.files.length}`,
    `- Truncated at bound: ${scan.truncated ? 'yes' : 'no'}`,
    `- Oversized files skipped: ${scan.skipped_large?.length || 0}`,
    '',
    '> This is a deterministic candidate inventory. Inspect the nearest implementation, tests, manifest, and production entry point before making behavioral claims.',
    ''
  ];
  for (const [kind, files] of groups) {
    lines.push(`## ${kind}`, '', '| Path | Bytes | SHA-256 |', '|---|---:|---|');
    for (const file of files) lines.push(`| \`${file.path}\` | ${file.bytes} | \`${file.sha256}\` |`);
    lines.push('');
  }
  lines.push('## Observed behavior and constraints', '', 'TBD — enrich from targeted repository inspection.', '');
  return `${lines.join('\n')}\n`;
}

module.exports = { renderSourceMap, scanFrontend, sha256 };
