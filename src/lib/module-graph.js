'use strict';

/**
 * Module graph — internal imports per file, fan-out, fan-in and import cycles.
 *
 * The coupling doctrine (design-docs/componentization.md, file-size.md) was
 * prose an agent read and a reviewer could not verify: nothing in the gates
 * counted an edge. This module reads import statements lexically and
 * build-free — JS/TS (`import … from`, `export … from`, `require()`,
 * `import()`), Python (`import a.b`, `from .a import b`) — resolves the ones
 * that point INSIDE the project, and answers the two questions a reviewer
 * can act on: how many internal modules does this file pull in (fan-out),
 * and is it part of an import cycle. External packages are not edges:
 * coupling to a library is a dependency decision; coupling to
 * `../../billing/ledger` is architecture.
 *
 * Deliberately conservative: an unresolved specifier is dropped, never
 * guessed. A false negative is cheaper than a finding that teaches everyone
 * to ignore the gate.
 */

const path = require('node:path');
const { SIZE_EXEMPT_PATH } = require('./code-size');

const JS_EXTS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.svelte', '.astro'];
const PY_EXTS = ['.py'];
const MODULE_EXTS = new Set([...JS_EXTS, ...PY_EXTS]);
const JS_EXT_SET = new Set(JS_EXTS);

// `import x from './a.js'` in a TypeScript project points at `./a.ts`.
const EXT_SWAPS = { '.js': ['.ts', '.tsx'], '.jsx': ['.tsx'], '.mjs': ['.mts'], '.cjs': ['.cts'] };

// Source-root aliases TS/Vite/Nuxt projects declare for their own tree. Only
// a resolved target makes an edge, so a wrong guess costs nothing.
const ALIAS_PREFIXES = [['@/', ['src/', 'app/', '']], ['~/', ['src/', 'app/', '']], ['#/', ['src/', '']], ['src/', ['']], ['app/', ['']]];

// Where a Python absolute import may be rooted when the package is not at the repo root.
const PY_ROOTS = ['', 'src/', 'app/', 'lib/'];

// Tests, fixtures, generated files, config and route tables: the size
// doctrine's exemptions are the coupling doctrine's — a route table imports
// every controller by design.
const COUPLING_EXEMPT_PATH = SIZE_EXEMPT_PATH;

// Composition roots and barrels import many modules because that is their
// job — the CLI registry, the app wiring, an area's `index` that exports its
// public surface. They are exempt from the fan-out limit only: a composition
// root inside an import cycle is still a cycle.
const COMPOSITION_ROOT_PATH = /(?:^|\/)(?:index|main|cli|app|server|bootstrap|router|registry|container|wiring|providers|plugins|commands|module)\.[^/]+$/i;

const JS_IMPORT_PATTERNS = [
  /\bimport\s+(?:type\s+)?(?:[^'"();]*?\s+from\s+)?['"]([^'"\n]+)['"]/g,
  /\bexport\s+(?:type\s+)?[^'";]*?\s+from\s+['"]([^'"\n]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g
];

/** Drop JS comments but keep string contents — the specifiers live inside quotes. */
function stripJsComments(text) {
  const out = [];
  let i = 0;
  let mode = null; // null | 'line' | 'block' | '"' | "'" | '`'
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (mode === 'line') {
      if (ch === '\n') { mode = null; out.push('\n'); }
      i += 1; continue;
    }
    if (mode === 'block') {
      if (ch === '*' && next === '/') { mode = null; i += 2; continue; }
      if (ch === '\n') out.push('\n');
      i += 1; continue;
    }
    if (mode) {
      out.push(ch);
      if (ch === '\\') { out.push(next === undefined ? '' : next); i += 2; continue; }
      if (ch === mode || (ch === '\n' && mode !== '`')) mode = null;
      i += 1; continue;
    }
    if (ch === '/' && next === '/') { mode = 'line'; i += 2; continue; }
    if (ch === '/' && next === '*') { mode = 'block'; i += 2; continue; }
    if (ch === '"' || ch === "'" || ch === '`') mode = ch;
    out.push(ch);
    i += 1;
  }
  return out.join('');
}

function jsSpecifiers(text) {
  const clean = stripJsComments(text);
  const found = [];
  for (const pattern of JS_IMPORT_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = re.exec(clean)) !== null) found.push(match[1].trim());
  }
  return found;
}

const PY_FROM = /^\s*from\s+([.\w]+)\s+import\s+([^#\n]+)/;
const PY_IMPORT = /^\s*import\s+([^#\n]+)/;

/** Python imports as { module, names } — `names` only for `from X import a, b`. */
function pySpecifiers(lines) {
  const found = [];
  let inTriple = null;
  for (let i = 0; i < lines.length; i += 1) {
    let line = String(lines[i]);
    if (inTriple) {
      if (line.includes(inTriple)) inTriple = null;
      continue;
    }
    const triple = line.match(/^\s*[rbu]*("""|''')/);
    if (triple) {
      // a one-line docstring closes on the same line
      const rest = line.slice(line.indexOf(triple[1]) + 3);
      if (!rest.includes(triple[1])) inTriple = triple[1];
      continue;
    }
    // `from x import (a,` continues until the closing parenthesis.
    if (/^\s*from\s+[.\w]+\s+import\s*\(/.test(line) && !line.includes(')')) {
      while (i + 1 < lines.length && !line.includes(')')) {
        i += 1;
        line += ` ${String(lines[i]).split('#')[0]}`;
      }
    }
    let match = line.match(PY_FROM);
    if (match) {
      const names = match[2].replace(/[()\\]/g, ' ').split(',').map((n) => n.trim().split(/\s+as\s+/)[0].trim()).filter((n) => n && n !== '*');
      found.push({ module: match[1], names });
      continue;
    }
    match = line.match(PY_IMPORT);
    if (match) {
      for (const part of match[1].split(',')) {
        const mod = part.trim().split(/\s+as\s+/)[0].trim();
        if (/^[\w.]+$/.test(mod)) found.push({ module: mod, names: [] });
      }
    }
  }
  return found;
}

function posixNormalize(rel) {
  const normalized = path.posix.normalize(rel).replace(/^\.\//, '');
  return normalized === '.' ? '' : normalized;
}

function isModuleFile(rel) {
  return MODULE_EXTS.has(path.posix.extname(rel).toLowerCase());
}

function resolveJs(fromRel, spec, index) {
  let bases = [];
  const clean = spec.split('?')[0].split('#')[0];
  if (clean.startsWith('./') || clean.startsWith('../')) {
    bases = [posixNormalize(path.posix.join(path.posix.dirname(fromRel), clean))];
  } else if (clean.startsWith('/')) {
    bases = [posixNormalize(clean.slice(1))];
  } else {
    for (const [prefix, roots] of ALIAS_PREFIXES) {
      if (!clean.startsWith(prefix)) continue;
      const tail = clean.slice(prefix.length);
      bases = roots.map((root) => posixNormalize(`${root}${tail}`));
      break;
    }
  }
  if (bases.length === 0) return null;
  for (const base of bases) {
    if (!base) continue;
    const ext = path.posix.extname(base).toLowerCase();
    const candidates = [];
    if (JS_EXT_SET.has(ext)) {
      candidates.push(base);
      for (const swap of EXT_SWAPS[ext] || []) candidates.push(base.slice(0, -ext.length) + swap);
    }
    for (const e of JS_EXTS) candidates.push(`${base}${e}`);
    for (const e of JS_EXTS) candidates.push(`${base}/index${e}`);
    for (const candidate of candidates) if (index.has(candidate)) return candidate;
  }
  return null;
}

function pyModuleCandidates(base) {
  return [`${base}.py`, `${base}/__init__.py`];
}

function resolvePy(fromRel, spec, index) {
  const targets = [];
  const dots = spec.module.match(/^\.*/)[0].length;
  const dotted = spec.module.slice(dots);
  const parts = dotted ? dotted.split('.') : [];
  const bases = [];
  if (dots > 0) {
    let dir = path.posix.dirname(fromRel);
    for (let i = 1; i < dots; i += 1) dir = path.posix.dirname(dir);
    if (dir === '.') dir = '';
    bases.push(posixNormalize(path.posix.join(dir, ...parts)));
  } else {
    for (const root of PY_ROOTS) bases.push(posixNormalize(path.posix.join(root, ...parts)));
  }
  for (const base of bases) {
    const module = (base ? pyModuleCandidates(base) : []).find((candidate) => index.has(candidate));
    if (!module) continue;
    targets.push(module);
    // `from pkg import sub` — the names may be submodules of a package.
    if (module.endsWith('__init__.py')) {
      for (const name of spec.names) {
        const sub = pyModuleCandidates(posixNormalize(path.posix.join(base, name))).find((candidate) => index.has(candidate));
        if (sub) targets.push(sub);
      }
    }
    break;
  }
  return targets;
}

/**
 * @param {Array<{rel: string, lines: string[]}>} files every module file of the tree (posix rels)
 * @returns {{ nodes: Map<string, {fan_out: number, fan_in: number, imports: string[], external: number, exempt: boolean}>, edges: Map<string, Set<string>>, cycles: Array<string[]> }}
 */
function buildModuleGraph(files) {
  const index = new Set();
  const byRel = new Map();
  for (const file of files) {
    const rel = String(file.rel).split(path.sep).join('/');
    if (!isModuleFile(rel)) continue;
    index.add(rel);
    byRel.set(rel, file.lines);
  }
  const edges = new Map();
  const nodes = new Map();
  for (const [rel, lines] of byRel) {
    const targets = new Set();
    let external = 0;
    const ext = path.posix.extname(rel).toLowerCase();
    if (JS_EXT_SET.has(ext)) {
      for (const spec of jsSpecifiers(lines.join('\n'))) {
        const target = resolveJs(rel, spec, index);
        if (target) { if (target !== rel) targets.add(target); } else if (!/^[./~@#]/.test(spec) && !spec.startsWith('src/') && !spec.startsWith('app/')) external += 1;
      }
    } else {
      for (const spec of pySpecifiers(lines)) {
        const resolved = resolvePy(rel, spec, index);
        if (resolved.length === 0) { if (!spec.module.startsWith('.')) external += 1; continue; }
        for (const target of resolved) if (target !== rel) targets.add(target);
      }
    }
    edges.set(rel, targets);
    nodes.set(rel, { fan_out: targets.size, fan_in: 0, imports: [...targets].sort(), external, exempt: COUPLING_EXEMPT_PATH.test(rel), composition_root: COMPOSITION_ROOT_PATH.test(rel) });
  }
  for (const targets of edges.values()) for (const target of targets) nodes.get(target).fan_in += 1;
  return { nodes, edges, cycles: stronglyConnected(edges).filter((members) => members.length > 1).map((members) => members.sort()) };
}

/** Tarjan's strongly connected components over the edge map (iterative). */
function stronglyConnected(edges) {
  const indexOf = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const out = [];
  let counter = 0;
  for (const start of edges.keys()) {
    if (indexOf.has(start)) continue;
    const work = [[start, [...(edges.get(start) || [])], 0]];
    indexOf.set(start, counter); low.set(start, counter); counter += 1;
    stack.push(start); onStack.add(start);
    while (work.length > 0) {
      const frame = work[work.length - 1];
      const [node, targets] = frame;
      if (frame[2] < targets.length) {
        const next = targets[frame[2]];
        frame[2] += 1;
        if (!indexOf.has(next)) {
          indexOf.set(next, counter); low.set(next, counter); counter += 1;
          stack.push(next); onStack.add(next);
          work.push([next, [...(edges.get(next) || [])], 0]);
        } else if (onStack.has(next)) {
          low.set(node, Math.min(low.get(node), indexOf.get(next)));
        }
        continue;
      }
      work.pop();
      if (work.length > 0) {
        const parent = work[work.length - 1][0];
        low.set(parent, Math.min(low.get(parent), low.get(node)));
      }
      if (low.get(node) === indexOf.get(node)) {
        const members = [];
        let popped;
        do {
          popped = stack.pop();
          onStack.delete(popped);
          members.push(popped);
        } while (popped !== node);
        out.push(members);
      }
    }
  }
  return out;
}

/**
 * The shortest import path from `rel` back to itself inside its cycle, as
 * `[rel, …, rel]` — what the finding shows so the fix is directed.
 */
function cyclePath(graph, rel, maxLength = 12) {
  const cycle = graph.cycles.find((members) => members.includes(rel));
  if (!cycle) return null;
  const members = new Set(cycle);
  const queue = [[rel]];
  const seen = new Set();
  while (queue.length > 0) {
    const trail = queue.shift();
    const last = trail[trail.length - 1];
    if (trail.length > maxLength) break;
    for (const next of graph.edges.get(last) || []) {
      if (!members.has(next)) continue;
      if (next === rel) return [...trail, rel];
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push([...trail, next]);
    }
  }
  return [...cycle, rel];
}

module.exports = {
  MODULE_EXTS,
  COUPLING_EXEMPT_PATH,
  COMPOSITION_ROOT_PATH,
  stripJsComments,
  jsSpecifiers,
  pySpecifiers,
  buildModuleGraph,
  stronglyConnected,
  cyclePath
};
