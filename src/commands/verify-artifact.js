'use strict';

/**
 * aioson verify:artifact --kind=<kind> [--slug=<slug>] [path] [--advisory]
 *   [--strict] [--json] — the build-free "done = proven, not asserted" gate for
 *   the NON-code artifacts the peripheral agents produce.
 *
 * Where an SG-* criterion gates a code feature's harness contract, this gates a
 * produced artifact (project context, a genome, a research report, the bootstrap
 * cache, a hybrid skill, ...) the same cheap way: read the declared files and
 * prove a required structure is present and no placeholder / truncation slipped
 * in before the agent self-declares done. Pure fs + RegExp + JSON.parse — no
 * shell, no build — so it costs ~milliseconds and runs at every agent's done
 * gate, cross-platform by construction.
 *
 * Each `kind` resolves to EITHER an existing validator (project context →
 * validateProjectContextFile; genome → genome:doctor) OR a declarative ruleset
 * evaluated by the shared static-criteria engine. No new analysis logic per
 * artifact — just data. Adding a kind is a registry entry, not a code path.
 *
 * Exit code: a hard failure sets exit 1 (blocking) unless --advisory (warn-only,
 * always exit 0). Pass suppressExitCode for programmatic callers (an agent
 * done-gate that wants to interpret the verdict itself). --strict promotes
 * warnings to blocking issues.
 */

const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const { evaluateStaticCriterion } = require('../harness/static-criteria');
const { resolveTargetDir, resolveOperandPath } = require('../lib/project-root');
const { VISUAL_EVIDENCE_FILE, VISUAL_IMPLEMENTATION_FILE } = require('../lib/visual-evidence');

const VERSION = '1.0.0';
const GENERATOR = `aioson verify:artifact@${VERSION}`;

// ─── ruleset engine ─────────────────────────────────────────────────────────

/**
 * Run a list of static criteria (the same {id, files, must_match, must_not_match}
 * shape the harness SG-* gate uses) against the working tree. Returns a uniform
 * { ok, issues, warnings, checks }.
 *
 * @param {Array} criteria
 * @param {string} targetDir
 */
function evaluateRuleset(criteria, targetDir) {
  const checks = [];
  const issues = [];
  for (const criterion of Array.isArray(criteria) ? criteria : []) {
    const res = evaluateStaticCriterion(criterion, targetDir);
    checks.push(res);
    if (!res.ok) {
      issues.push(`[${res.id}] ${res.detail || 'failed'}`);
    }
  }
  return { ok: issues.length === 0, issues, warnings: [], checks };
}

// ─── ruleset registry (declarative, data-only) ──────────────────────────────
//
// Each entry is (ctx) => { label, criteria[] }. ctx = { slug, targetDir }.
// Frontmatter/placeholder checks reuse the OR-across-files / absent-in-all
// semantics of the static engine; per-file structure is expressed as one
// criterion per file.

const PLACEHOLDER_PATTERNS = ['\\bTODO\\b', '\\bFIXME\\b', '\\bTBD\\b', 'Lorem ipsum', '\\[\\.\\.\\.\\]', 'XXXX'];

const BOOTSTRAP_DIR = '.aioson/context/bootstrap';
const BOOTSTRAP_FILES = ['what-is.md', 'what-it-does.md', 'how-it-works.md', 'current-state.md'];
const PROFILER_DIR = '.aioson/profiler-reports';

// Unfilled template tokens left in a produced artifact (a tell that the agent
// emitted the skeleton without filling it). Targeted, not a blanket `[...]`
// match, to avoid flagging legitimate `[1]`-style citations.
const TEMPLATE_TOKENS = ['\\[Full Name\\]', '\\[count\\]', '\\[low/medium/high'];

// Content slop: headline formulas that survive a total product swap. Kept to the
// handful that are unmistakably template marketing in EN and pt-BR, because the
// cost of a false positive on real brand copy is higher than the miss. The
// engine compiles these without flags, so case variants are spelled out.
const COPY_CLICHES = [
  '[Tt]ransform your (workflow|business|team)',
  '[Tt]ake (your|it) .{0,24} to the next level',
  '[Uu]nlock the (power|potential) of',
  '[Ss]upercharge your',
  '[Rr]evolutioni[sz]e (the way|your)',
  '[Ll]eve (o seu|seu|sua) .{0,24} para (o|um) (pr[óo]ximo n[íi]vel)',
  '[Tt]ransforme (o seu|seu|sua) (neg[óo]cio|fluxo de trabalho|empresa)',
  '[Dd]esbloqueie o (poder|potencial)'
];

const RULESETS = {
  // discover — the 4-file cold-start cache must all exist with real frontmatter.
  bootstrap: () => ({
    label: 'discovery bootstrap cache',
    criteria: BOOTSTRAP_FILES.map((f) => ({
      id: `bootstrap:${f}`,
      files: [`${BOOTSTRAP_DIR}/${f}`],
      must_match: ['generated_by', 'confidence'],
      must_not_match: PLACEHOLDER_PATTERNS
    }))
  }),

  // profiler-researcher — the research report must carry its frontmatter and the
  // load-bearing skeleton (inventory + extracted material + gaps), with no
  // unfilled template token.
  'research-report': (ctx) => ({
    label: 'profiler research report',
    criteria: [{
      id: 'research-report',
      files: [`${PROFILER_DIR}/${ctx.slug}/research-report.md`],
      must_match: ['sources_found', '## Source Inventory', '## Extracted Material by Category', '## Gaps and Next Research Moves'],
      must_not_match: [...PLACEHOLDER_PATTERNS, ...TEMPLATE_TOKENS]
    }]
  }),

  // profiler-enricher — the enriched profile must carry the executive summary,
  // psychometric profile, the operational method (the part that makes a genome
  // *work* rather than simulate opinions), and the trait-interaction analysis.
  'enriched-profile': (ctx) => ({
    label: 'profiler enriched profile',
    criteria: [{
      id: 'enriched-profile',
      files: [`${PROFILER_DIR}/${ctx.slug}/enriched-profile.md`],
      must_match: ['## Executive Summary', '## Psychometric Profile', '## Operational Method', '## Trait Interactions'],
      must_not_match: [...PLACEHOLDER_PATTERNS, ...TEMPLATE_TOKENS]
    }]
  }),

  // orache — the investigation report is date-stamped, so it's resolved via
  // --file. It must carry the 7-dimension skeleton, an impact analysis, and
  // source attribution, with no unfilled template token.
  'orache-report': (ctx) => ({
    label: 'orache investigation report',
    criteria: [{
      id: 'orache-report',
      files: [ctx.file || `squad-searches/${ctx.slug || 'MISSING'}/investigation.md`],
      must_match: [
        '## D1', '## D2', '## D3', '## D4', '## D5', '## D6', '## D7',
        '## Impact Analysis',
        // A legitimate empty-yield investigation records the explicit
        // no-novel-finding line per dimension instead of a Source block —
        // honesty about a dry run must not fail its own done gate.
        '\\*\\*Source:\\*\\*|No novel externally verified finding'
      ],
      must_not_match: [...PLACEHOLDER_PATTERNS, '\\{where discovered\\}']
    }]
  }),

  // design-hybrid-forge — the hybrid skill package: a parseable .skill-meta.json
  // recording its sources, a real SKILL.md, and both required previews.
  'hybrid-skill': (ctx) => ({
    label: 'hybrid design skill package',
    criteria: [
      { id: 'hybrid:meta', files: [`.aioson/installed-skills/${ctx.slug}/.skill-meta.json`], must_match: ['sources'], must_not_match: [] },
      { id: 'hybrid:skill', files: [`.aioson/installed-skills/${ctx.slug}/SKILL.md`], must_match: [], must_not_match: PLACEHOLDER_PATTERNS },
      {
        id: 'hybrid:previews',
        files: [
          `.aioson/installed-skills/${ctx.slug}/previews/${ctx.slug}.html`,
          `.aioson/installed-skills/${ctx.slug}/previews/${ctx.slug}-website.html`
        ],
        must_match: [],
        must_not_match: []
      }
    ]
  }),

  // copywriter — an advisory placeholder/template scan over the saved copy
  // artifacts (the rich resonance checks stay in the agent's Phase-5 checklist;
  // this just makes "no placeholder/Lorem/TODO/unfilled token/headline formula"
  // deterministic). Visual slop has a twin in copy: a headline that still works
  // after the product is swapped out is the same regression to the mean.
  // The six modes write four canonical documents; the scan covers whichever
  // exist for the slug — a VSL-only session used to fail on the absent
  // copy-{slug}.md while the actual script went unscanned. Only a slug with no
  // copy artifact at all is an issue.
  copy: (ctx) => {
    // Mode 4 (squad executor) writes outside .aioson/context — under the squad's
    // output/ tree per the genome-approve specimen contract. --file retargets the
    // same scan at that exact deliverable so every mode stays measurable.
    if (ctx.file) {
      return {
        label: 'copywriter copy document',
        criteria: [{
          id: `copy:${path.basename(ctx.file)}`,
          files: [ctx.file],
          must_match: [],
          must_not_match: [...PLACEHOLDER_PATTERNS, ...TEMPLATE_TOKENS, ...COPY_CLICHES]
        }]
      };
    }
    const candidates = [
      `.aioson/context/copy-${ctx.slug}.md`,
      `.aioson/context/copy-review-${ctx.slug}.md`,
      `.aioson/context/vsl-script-${ctx.slug}.md`,
      `.aioson/context/campaign-${ctx.slug}.md`
    ];
    const present = candidates.filter((rel) => fs.existsSync(path.resolve(ctx.targetDir, rel)));
    if (present.length === 0) {
      // One criterion carrying all four paths, so the failure names every
      // canonical location the copywriter could have written.
      return {
        label: 'copywriter copy document',
        criteria: [{ id: 'copy', files: candidates, must_match: [], must_not_match: [] }]
      };
    }
    return {
      label: 'copywriter copy document',
      criteria: present.map((rel) => ({
        id: `copy:${path.basename(rel)}`,
        files: [rel],
        must_match: [],
        must_not_match: [...PLACEHOLDER_PATTERNS, ...TEMPLATE_TOKENS, ...COPY_CLICHES]
      }))
    };
  },

  // reference-identity-extract — identity.md is the extracted token + per-component
  // structure system-of-record. Its path varies by scope (briefing vs brand) so it is
  // resolved via --file. It must carry the token skeleton plus the two anti-sameness
  // anchors (pillars + signature moves) and the component-structure section, with no
  // placeholder or unfilled hex/token left behind.
  identity: (ctx) => ({
    label: 'reference identity system',
    criteria: [{
      id: 'identity',
      files: [ctx.file || `.aioson/briefings/${ctx.slug || 'MISSING'}/identity.md`],
      must_match: [
        'generated_by',
        '## Design pillars', '## Palette', '## Typography', '## Spacing',
        '## Radius', '## Motion', '## Signature moves', '## Component structure notes'
      ],
      must_not_match: [...PLACEHOLDER_PATTERNS, '#RRGGBB', '#XXXXXX', '\\{hex\\}', '\\{token\\}']
    }]
  })
};

// Kinds whose target file path is keyed by --slug; without it we cannot resolve
// the artifact, so fail with a clear usage error instead of a `null/` path.
const REQUIRES_SLUG = new Set(['genome', 'research-report', 'enriched-profile', 'hybrid-skill', 'copy', 'review', 'sources', 'briefing', 'test-report', 'squad-pilot']);

// Kinds whose artifact has a date-stamped / caller-known path — resolved via
// --file=<path> rather than derived from a slug.
const REQUIRES_FILE = new Set(['orache-report', 'identity', 'rule']);

// ─── adapters to existing validators ────────────────────────────────────────
//
// Each adapter is async (ctx, logger) => { ok, issues, warnings, checks }.

function quietLogger() {
  return { log() {}, error() {}, warn() {} };
}

// ─── kind=site (runtime build gate for a generated Next.js site) ──────────────

const SITE_IGNORE = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'out', 'coverage', '.turbo', '.vercel', '.aioson']);
const SITE_SCAN_EXTS = new Set(['.tsx', '.jsx', '.ts', '.js', '.mjs', '.html', '.vue', '.svelte']);
const SITE_ENTRY_CANDIDATES = ['app/page.tsx', 'app/page.jsx', 'src/app/page.tsx', 'src/app/page.jsx', 'pages/index.tsx', 'pages/index.jsx', 'pages/index.js'];
const SITE_LEAKS = [
  { re: /\balert\s*\(/, msg: 'native alert() dialog — use in-app UI chrome' },
  { re: /\bconfirm\s*\(/, msg: 'native confirm() dialog — use in-app UI chrome' },
  { re: /\bwindow\.prompt\s*\(/, msg: 'native window.prompt() dialog — use in-app UI chrome' },
  { re: /Lorem ipsum/i, msg: 'Lorem ipsum placeholder copy' },
  { re: /\bTODO\b|\bFIXME\b/, msg: 'TODO/FIXME left in shipped code' }
];

function walkSiteFiles(root, max = 800) {
  const out = [];
  const stack = [root];
  while (stack.length && out.length < max) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SITE_IGNORE.has(e.name)) stack.push(full);
      } else if (e.isFile() && SITE_SCAN_EXTS.has(path.extname(e.name).toLowerCase())) {
        out.push(full);
      }
    }
  }
  return out;
}

/** Scan a generated site for native-dialog and placeholder leaks (build-free). */
function scanSiteForLeaks(siteDir, maxHits = 20) {
  const hits = [];
  for (const abs of walkSiteFiles(siteDir)) {
    let content;
    try { content = fs.readFileSync(abs, 'utf8'); } catch { continue; }
    const rel = path.relative(siteDir, abs).split(path.sep).join('/');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const stripped = lines[i].trim();
      if (stripped.startsWith('//') || stripped.startsWith('*') || stripped.startsWith('/*')) continue;
      for (const leak of SITE_LEAKS) {
        if (leak.re.test(lines[i])) { hits.push(`${rel}:${i + 1} — ${leak.msg}`); break; }
      }
      if (hits.length >= maxHits) return hits;
    }
  }
  return hits;
}

/** Build-free static floor for a site: build script, entry route, no leaks. */
function staticSiteChecks(siteDir) {
  const issues = [];
  const warnings = [];

  let pkg = null;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(siteDir, 'package.json'), 'utf8'));
  } catch {
    issues.push('no readable package.json at the site root');
  }
  if (pkg && !(pkg.scripts && pkg.scripts.build)) issues.push('package.json has no "build" script');

  if (!SITE_ENTRY_CANDIDATES.some((rel) => fs.existsSync(path.join(siteDir, rel)))) {
    issues.push('no entry route found (app/page.* or pages/index.*)');
  }

  for (const leak of scanSiteForLeaks(siteDir)) issues.push(leak);
  return { issues, warnings };
}

/**
 * The RG-* runtime floor: the site must actually build on the real toolchain.
 * `command` defaults to `npm run build`; it is overridable so a caller (or a
 * test) can drive the same spawn/exit logic without the npm layer.
 */
function runSiteBuild(siteDir, timeout = 600000, command = ['npm', 'run', 'build']) {
  const [cmd, ...rest] = command;
  const res = spawnSync(cmd, rest, { cwd: siteDir, encoding: 'utf8', shell: true, timeout });
  if (res.error) return { ok: false, detail: `build could not start: ${res.error.message}` };
  if (res.status === 0) return { ok: true, detail: null };
  const tail = String(res.stderr || res.stdout || '')
    .split('\n').map((l) => l.trim()).filter(Boolean).slice(-4).join(' | ');
  return { ok: false, detail: `build failed (exit ${res.status}): ${tail || 'see build output'}` };
}

// ─── kind=commit-message (advisory subject-quality heuristics) ────────────────

/** Conservative, low-false-positive commit-subject checks. Returns issue list. */
function evaluateCommitMessage(message) {
  const issues = [];
  const subject = (String(message || '').replace(/^\s+/, '').split('\n')[0] || '').trim();
  if (!subject) {
    issues.push('empty commit subject');
    return issues;
  }
  if (subject.length > 72) issues.push(`subject is ${subject.length} chars — keep it <= 72 (ideally <= 50)`);
  if (/[.]$/.test(subject)) issues.push('subject ends with a period — drop it');
  if (/^(wip|stuff|misc|various|things|update|updates|changes|tweaks?|minor)$/i.test(subject)) {
    issues.push(`subject is a single vague word: "${subject}"`);
  }
  if (/^(fix|update|change|tweak|adjust)\s+(it|this|that|stuff|things?|bugs?|code|tests?)$/i.test(subject)) {
    issues.push(`subject is vague: "${subject}" — say what changed and why`);
  }
  return issues;
}

// ─── kind=visual (static telemetry for a produced interface) ─────────────────

// The corpus has three shapes — documents, stylesheets, component sources —
// because a shipped interface keeps its markup and styles in all three.
// Reading only .html/.css measured a different product than the one a
// framework app ships: zero markup (every copy and composition metric read 0
// in silence) and finish referenced from components reported as dead.
const VISUAL_DOC_EXTS = new Set(['.html', '.htm']);
const VISUAL_STYLE_EXTS = new Set(['.css', '.scss', '.sass', '.less']);
const VISUAL_COMPONENT_EXTS = new Set(['.tsx', '.jsx', '.vue', '.svelte', '.astro', '.js', '.mjs', '.ts']);
// Tests, type declarations, stories and tool configs hold strings that are
// not UI copy; their directories are skipped and their files are left out.
const VISUAL_NOISE_FILE = /\.(?:test|spec|d|stories|config)\.[cm]?[jt]sx?$/i;
const VISUAL_NOISE_DIRS = new Set(['__tests__', '__mocks__', 'e2e', 'test', 'tests', 'cypress']);
const VISUAL_MAX_FILES = 400;
const VISUAL_MAX_WALK = 8000;
const VISUAL_FILES_LISTED = 60;

function classifyVisualFile(abs) {
  const ext = path.extname(abs).toLowerCase();
  if (VISUAL_DOC_EXTS.has(ext)) return 'documents';
  if (VISUAL_STYLE_EXTS.has(ext)) return 'stylesheets';
  if (VISUAL_COMPONENT_EXTS.has(ext)) return VISUAL_NOISE_FILE.test(path.basename(abs)) ? 'noise' : 'components';
  return null;
}

/**
 * Collect the interface corpus for `kind=visual`, in locator precedence:
 * --file (one artifact) → --dir (a front-end root) → --slug (the feature-owned
 * prototype). A directory walk is deterministic: documents first, then
 * stylesheets, then component sources, each sorted by path, cut at
 * VISUAL_MAX_FILES with the cut reported — a silent cap reads as "measured
 * everything" when it did not. Returns { html, css, components, files, entry,
 * corpus } or null when nothing resolves.
 */
function collectVisualSources({ targetDir, file, dir, slug }) {
  const read = (abs) => { try { return fs.readFileSync(abs, 'utf8'); } catch { return null; } };
  const bucket = {
    html: [], css: [], components: [], files: [], entry: null,
    corpus: { documents: 0, stylesheets: 0, components: 0, files_total: 0, truncated: 0 }
  };
  const add = (abs, cls) => {
    const content = read(abs);
    if (content === null) return;
    if (cls === 'documents') bucket.html.push(content);
    else if (cls === 'stylesheets') bucket.css.push(content);
    else bucket.components.push(content);
    bucket.corpus[cls] += 1;
    const rel = path.relative(targetDir, abs).split(path.sep).join('/');
    bucket.files.push(rel);
    // The first HTML document is the only thing a browser can be pointed at.
    if (!bucket.entry && cls === 'documents') bucket.entry = rel;
  };

  if (file) {
    const abs = path.resolve(targetDir, file);
    if (!fs.existsSync(abs)) return null;
    // An explicit file is measured whatever its name says.
    const cls = classifyVisualFile(abs);
    if (cls) add(abs, cls === 'noise' ? 'components' : cls);
  } else if (dir) {
    const root = path.resolve(targetDir, dir);
    if (!fs.existsSync(root)) return null;
    const candidates = [];
    const stack = [root];
    let walked = 0;
    while (stack.length && walked < VISUAL_MAX_WALK) {
      const current = stack.pop();
      let entries;
      try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
      for (const e of entries) {
        walked += 1;
        const full = path.join(current, e.name);
        if (e.isDirectory()) {
          if (!SITE_IGNORE.has(e.name) && !VISUAL_NOISE_DIRS.has(e.name)) stack.push(full);
        } else if (e.isFile()) {
          const cls = classifyVisualFile(full);
          if (cls && cls !== 'noise') candidates.push({ abs: full, cls });
        }
      }
    }
    const order = { documents: 0, stylesheets: 1, components: 2 };
    candidates.sort((a, b) => order[a.cls] - order[b.cls] || (a.abs < b.abs ? -1 : a.abs > b.abs ? 1 : 0));
    bucket.corpus.truncated = Math.max(0, candidates.length - VISUAL_MAX_FILES);
    for (const c of candidates.slice(0, VISUAL_MAX_FILES)) add(c.abs, c.cls);
  } else if (slug) {
    const abs = path.resolve(targetDir, '.aioson', 'briefings', slug, 'prototype.html');
    if (!fs.existsSync(abs)) return null;
    add(abs, 'documents');
  } else {
    return null;
  }

  if (bucket.files.length === 0) return null;
  bucket.corpus.files_total = bucket.files.length;
  return {
    html: bucket.html.join('\n'),
    css: bucket.css.join('\n'),
    components: bucket.components.join('\n'),
    files: bucket.files,
    entry: bucket.entry,
    corpus: bucket.corpus
  };
}

/**
 * The surface mode the prototype manifest declares for a slug run, or null.
 * Frontmatter `surface_mode:` / `mode:` first; then a `mode:`/`surface:`
 * bullet inside `## Visual direction`.
 */
function declaredSurfaceMode(ctx) {
  if (!ctx.slug) return null;
  let manifest;
  try {
    manifest = fs.readFileSync(path.resolve(ctx.targetDir, '.aioson', 'briefings', ctx.slug, 'prototype-manifest.md'), 'utf8');
  } catch {
    return null;
  }
  const front = manifest.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (front) {
    const line = front[1].match(/^(?:surface_mode|mode)\s*:\s*["']?([A-Za-z-]+)/mi);
    if (line) return line[1];
  }
  const section = manifest.match(/(?:^|\n)##\s+Visual direction[^\n]*((?:\n(?!##\s)[^\n]*)*)/i);
  if (section) {
    const bullet = section[1].match(/^\s*[-*]\s*(?:surface[ _-]?mode|mode|surface)\s*:\s*["']?([A-Za-z-]+)/mi);
    if (bullet) return bullet[1];
  }
  return null;
}

/** The axes the prototype floor is held on — the same numbers on both sides. */
function conformanceAxes(m) {
  return {
    craft: m.craft && m.craft.measured ? m.craft.active_levers : null,
    materials: m.craft && m.craft.measured ? (m.craft.material_depth ?? 0) : null,
    tells: m.tells ? m.tells.active : 0,
    font_delivered: Boolean(m.font_delivery && m.font_delivery.delivered),
    display_px: Number(m.max_font_size_px) || 0,
    modern_css: m.craft && Array.isArray(m.craft.modern_css) ? m.craft.modern_css.length : 0
  };
}

/**
 * A corpus whose styling decisions live in class attributes instead of
 * declarations. Nothing static reads it — typeface, display scale and dialect
 * all read as absent, so comparing them against a prototype would invent
 * regressions. Hand-authored CSS under the craft floor is a different case:
 * too thin for a craft SCORE, perfectly readable on every other axis.
 */
function isUtilityStyled(m) {
  const utility = m.utility_classes;
  return Boolean(utility && utility.utility >= 40 && utility.share >= 0.5);
}

/**
 * Hold one measurement to a prototype's measured floor, and say exactly how
 * much of it was actually held.
 *
 * The craft score needs 150 authored declarations; tells, typeface delivery,
 * display scale and CSS dialect do not. Bailing out of every axis because the
 * SCORE was unavailable left `regressed: []` on a comparison that never ran —
 * which downstream read as a pass. So the axes are compared independently, and
 * what could not be compared is named rather than assumed green.
 *
 * @returns {{prototype:object|null, implementation:object|null, state:'compared'|'partial'|'not-compared', compared:string[], not_compared:string[], regressed:string[], reason:string|null}}
 */
function compareToPrototype(proto, metrics, slug) {
  if (!proto) {
    return {
      prototype: null,
      implementation: null,
      state: 'not-compared',
      compared: [],
      not_compared: ['craft', 'materials', 'tells', 'typeface', 'display type', 'modern CSS'],
      regressed: [],
      reason: `no recorded prototype evidence for ${slug} — nothing to hold the implementation to`
    };
  }
  const before = conformanceAxes(proto);
  const after = conformanceAxes(metrics);
  const craftMeasured = Boolean(metrics.craft && metrics.craft.measured);
  const utilityStyled = isUtilityStyled(metrics);
  const compared = [];
  const notCompared = [];
  const regressed = [];

  if (craftMeasured && before.craft !== null) {
    compared.push('craft', 'materials');
    if (after.craft < before.craft) regressed.push(`craft ${before.craft}/5 → ${after.craft}/5`);
    if (before.materials !== null && after.materials < before.materials) regressed.push(`materials ${before.materials}/7 → ${after.materials}/7`);
  } else {
    notCompared.push('craft', 'materials');
  }

  // Readable from markup and authored CSS alike — a thin hand-written surface
  // still declares its typeface, its display size and its dialect. Only a
  // utility-class build keeps them somewhere static telemetry cannot look.
  if (utilityStyled) {
    notCompared.push('tells', 'typeface', 'display type', 'modern CSS');
  } else {
    compared.push('tells', 'typeface', 'display type', 'modern CSS');
    if (after.tells > before.tells) regressed.push(`tells ${before.tells} → ${after.tells}`);
    if (before.font_delivered && !after.font_delivered) regressed.push('typeface delivered → OS fallback');
    if (before.display_px >= 56 && after.display_px < 56) regressed.push(`display type ${before.display_px}px → ${after.display_px}px`);
    if (before.modern_css > 0 && after.modern_css === 0) regressed.push('modern CSS baseline → pre-2020 dialect');
  }

  const state = compared.length === 0 ? 'not-compared' : (notCompared.length > 0 ? 'partial' : 'compared');
  let reason = null;
  if (notCompared.length > 0) {
    reason = utilityStyled
      ? `${notCompared.join(', ')} not compared: utility-class styling keeps its decisions out of the ${metrics.declarations} authored declarations — compare the served app with --url=<http://…> --runtime`
      : `${notCompared.join(', ')} not compared: implementation craft not measured statically (${metrics.declarations} declarations)`;
  }
  return { prototype: before, implementation: after, state, compared, not_compared: notCompared, regressed, reason };
}

/** The corpus of a `--url`-only run: nothing static to read, a browser to open. */
function emptyVisualSources() {
  return { html: '', css: '', components: '', files: [], entry: null, corpus: { documents: 0, stylesheets: 0, components: 0, files_total: 0, truncated: 0 } };
}

const ADAPTERS = {
  // setup — project.context.md is the root artifact every session reads first.
  'project-context': async (ctx) => {
    const { validateProjectContextFile } = require('../context');
    let res;
    try {
      res = await validateProjectContextFile(ctx.targetDir);
    } catch (err) {
      return { ok: false, issues: [`project.context.md could not be validated: ${err.message}`], warnings: [], checks: [] };
    }
    const issues = [];
    if (!res.exists) {
      issues.push(`project.context.md not found (${res.filePath || '.aioson/context/project.context.md'}) — run /setup`);
    } else if (!res.parsed) {
      issues.push(`project.context.md frontmatter does not parse (${res.parseError || 'invalid YAML'})`);
    } else if (!res.valid) {
      for (const issue of res.issues || []) {
        issues.push(typeof issue === 'string' ? issue : (issue.key || JSON.stringify(issue)));
      }
      if (issues.length === 0) issues.push('project.context.md has invalid or missing required fields');
    }
    return { ok: issues.length === 0, issues, warnings: [], checks: [{ id: 'project-context', ok: issues.length === 0, detail: issues[0] || null }] };
  },

  // profiler-forge / genome — reuse the comprehensive genome doctor.
  genome: async (ctx, logger) => {
    const { runGenomeDoctor, isGenomeAvailable } = require('./genome-doctor');
    if (!ctx.slug) {
      return { ok: false, issues: ['kind=genome requires --slug=<genome-slug>'], warnings: [], checks: [] };
    }
    const avail = await isGenomeAvailable(ctx.targetDir, ctx.slug);
    if (!avail.found) {
      return {
        ok: false,
        issues: [`genome "${ctx.slug}" not found under .aioson/genomes/ (neither <slug>.md nor <slug>/SKILL.md)`],
        warnings: [],
        checks: []
      };
    }
    const target = path.resolve(ctx.targetDir, avail.path);
    let res;
    try {
      res = await runGenomeDoctor({ args: [target], options: { json: true }, logger: logger || quietLogger() });
    } catch (err) {
      return { ok: false, issues: [`genome:doctor failed: ${err.message}`], warnings: [], checks: [] };
    }
    // Advisory drift scan: after an enrich/recompile, name every squad whose
    // USER approval (genome:approve) no longer matches the binding identity.
    let approvalWarnings = [];
    try {
      const { findGenomeApprovalDrift } = require('../lib/genome-approval-lint');
      approvalWarnings = findGenomeApprovalDrift({ targetDir: ctx.targetDir, genomeSlug: ctx.slug });
    } catch {
      // advisory only — never block the doctor verdict
    }
    return {
      ok: Boolean(res.ok),
      issues: res.ok ? [] : (res.issues || []).slice(),
      warnings: [...(res.warnings || []), ...approvalWarnings],
      checks: [{ id: `genome:${ctx.slug}`, ok: Boolean(res.ok), detail: res.ok ? null : (res.issues || []).join('; ') }]
    };
  },

  // site-forge — a generated Next.js site is not done until it BUILDS on the
  // real toolchain (the RG-* runtime floor), on top of a static floor: a build
  // script, an entry route, and no native-dialog / placeholder leak. --no-build
  // runs the static floor only; --dir points at the site root (default: cwd).
  site: async (ctx) => {
    const siteDir = ctx.dir ? path.resolve(ctx.targetDir, ctx.dir) : ctx.targetDir;
    const { issues, warnings } = staticSiteChecks(siteDir);
    if (ctx.noBuild) {
      warnings.push('npm run build skipped (--no-build): static checks only — not a full runtime gate');
    } else if (issues.length === 0) {
      const b = runSiteBuild(siteDir, ctx.buildTimeout, ctx.buildCommand);
      if (!b.ok) issues.push(b.detail);
    } else {
      warnings.push('npm run build skipped: static checks already failed');
    }
    return { ok: issues.length === 0, issues, warnings, checks: [{ id: 'site', ok: issues.length === 0, detail: issues.join('; ') || null }] };
  },

  // briefing-refiner — the review surface must be the deterministic, fully
  // self-contained artifact `aioson briefing:review` renders: export fallbacks
  // present, no external resources, an embedded source_hash, and a feedback
  // JSON that passes the canonical schema. Staleness (briefings.md changed
  // after generation, e.g. right after an apply) is a warning, not a failure.
  review: async (ctx) => {
    if (!ctx.slug) {
      return { ok: false, issues: ['kind=review requires --slug=<briefing-slug>'], warnings: [], checks: [] };
    }
    const { hashText } = require('../lib/briefing-refiner/briefing-sections');
    const { validateFeedback } = require('../lib/briefing-refiner/feedback-schema');
    const briefingDir = path.resolve(ctx.targetDir, '.aioson', 'briefings', ctx.slug);
    const issues = [];
    const warnings = [];

    let html = null;
    try {
      html = fs.readFileSync(path.join(briefingDir, 'review.html'), 'utf8');
    } catch {
      issues.push(`review.html not found for briefing "${ctx.slug}" — run: aioson briefing:review . --slug=${ctx.slug}`);
    }
    if (html) {
      if (!html.includes('aioson:review')) {
        issues.push('review.html lacks the aioson:review marker (hand-rolled surface) — regenerate with `aioson briefing:review`');
      }
      if (!/id="download"/.test(html)) issues.push('review.html has no download fallback button (id="download")');
      if (!/id="copy"/.test(html)) issues.push('review.html has no copy-JSON fallback button (id="copy")');
      // User content is HTML-escaped by the generator (quotes become &quot;),
      // so a real external reference can only be generator-emitted markup —
      // match those forms only, or briefing text quoting HTML/CSS would
      // false-positive the gate.
      if (/<script[^>]+\bsrc=|<link[^>]+href=["']https?:|\bsrc=["']https?:/i.test(html)) {
        issues.push('review.html references external resources — it must be fully self-contained');
      }
      const hashMatch = html.match(/source_hash=([0-9a-f]{64})/);
      if (!hashMatch) {
        issues.push('review.html has no embedded source_hash');
      } else {
        try {
          const currentHash = hashText(fs.readFileSync(path.join(briefingDir, 'briefings.md'), 'utf8'));
          if (hashMatch[1] !== currentHash) {
            warnings.push('review.html is stale: source_hash differs from the current briefings.md — regenerate the review for the next round');
          }
        } catch {
          issues.push('briefings.md not found next to review.html');
        }
      }
    }

    try {
      const feedback = JSON.parse(fs.readFileSync(path.join(briefingDir, 'refinement-feedback.json'), 'utf8'));
      const res = validateFeedback(feedback, { slug: ctx.slug, allowStale: true });
      if (!res.ok) {
        for (const err of res.errors) issues.push(`refinement-feedback.json: ${err}`);
      }
    } catch {
      // Absent right after an apply (it gets archived) — only a warning.
      warnings.push('refinement-feedback.json missing or unreadable — expected right after review generation');
    }

    return { ok: issues.length === 0, issues, warnings, checks: [{ id: `review:${ctx.slug}`, ok: issues.length === 0, detail: issues.join('; ') || null }] };
  },

  // committer — advisory subject-quality audit. Reads --file if given, else the
  // HEAD commit message (post-commit, so the agent can amend before push).
  'commit-message': async (ctx) => {
    let message = null;
    if (ctx.file) {
      try {
        message = fs.readFileSync(path.resolve(ctx.targetDir, ctx.file), 'utf8');
      } catch {
        return { ok: false, issues: [`cannot read commit message file: ${ctx.file}`], warnings: [], checks: [] };
      }
    } else {
      const res = spawnSync('git', ['log', '-1', '--pretty=%B'], { cwd: ctx.targetDir, encoding: 'utf8' });
      if (res.status !== 0) {
        return { ok: false, issues: ['could not read HEAD commit message (no git repo or no commits)'], warnings: [], checks: [] };
      }
      message = res.stdout;
    }
    const found = evaluateCommitMessage(message);
    return { ok: found.length === 0, issues: found, warnings: [], checks: [{ id: 'commit-message', ok: found.length === 0, detail: found.join('; ') || null }] };
  },

  // rule:new — a project-authored rule is only useful if context:select can reach
  // it and it says something checkable. This proves both: the routing frontmatter
  // resolves, and the scaffold placeholders were actually replaced.
  rule: async (ctx) => {
    const rel = ctx.file || (ctx.slug ? `.aioson/rules/${ctx.slug}.md` : null);
    if (!rel) {
      return { ok: false, issues: ['kind=rule requires --file=<path> or --slug=<rule-name>'], warnings: [], checks: [] };
    }
    let content;
    try {
      content = fs.readFileSync(path.resolve(ctx.targetDir, rel), 'utf8');
    } catch {
      return { ok: false, issues: [`cannot read rule file: ${rel}`], warnings: [], checks: [] };
    }

    const issues = [];
    const warnings = [];
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatter) {
      issues.push('no YAML frontmatter — context:select cannot route a rule without it');
    } else {
      const fm = frontmatter[1];
      const has = (key) => new RegExp(`^${key}:\\s*\\S`, 'm').test(fm);
      if (!has('name')) issues.push('frontmatter has no `name`');
      if (!has('description')) issues.push('frontmatter has no `description` — it is what semantic recall matches on');

      const routing = ['agents', 'paths', 'triggers', 'task_types'].filter(has);
      const alwaysLoaded = /^load_tier:\s*always\s*$/m.test(fm);
      if (routing.length === 0 && !alwaysLoaded) {
        issues.push('no routing dimension (agents / paths / triggers / task_types) and load_tier is not `always` — this rule would rarely be selected');
      }
      const priority = fm.match(/^priority:\s*(-?\d+)/m);
      if (priority && (Number(priority[1]) < 0 || Number(priority[1]) > 100)) {
        issues.push(`priority ${priority[1]} is outside 0-100`);
      }
    }

    const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---/, '');
    if (/Replace this list with|Replace this description with|Name what this rule deliberately/i.test(body)) {
      issues.push('scaffold placeholders are still present — replace them with concrete, checkable requirements');
    }
    const statements = (body.match(/^\s*[-*]\s+\S/gm) || []).length;
    if (statements === 0) issues.push('the rule states no requirements');
    else if (statements < 2) warnings.push('only one requirement stated — confirm the rule is complete');
    if (!/##\s+Precedence/i.test(body)) {
      warnings.push('no `## Precedence` section — state explicitly that this project rule outranks brain and skill defaults');
    }

    return {
      ok: issues.length === 0,
      issues,
      warnings,
      checks: [{ id: `rule:${path.basename(rel, '.md')}`, ok: issues.length === 0, detail: issues.join('; ') || null }]
    };
  },

  // Sheldon's source-pack verification, machine-run: re-hash every inventoried
  // source against its recorded fingerprint and reconcile the SRC-* / PROM-* /
  // Source Coverage bijections plus lifecycle — the work the kernel previously
  // asked the model to redo by hand, file by file. Reuses the same lineage
  // analyzer the gates already trust; this only exposes its verdict early.
  sources: async (ctx) => {
    const { analyzeFeatureCompleteness } = require('../lib/feature-completeness');
    let analysis;
    try {
      analysis = await analyzeFeatureCompleteness(ctx.targetDir, ctx.slug, {});
    } catch (error) {
      return { ok: false, issues: [`source lineage analysis failed: ${error.message}`], warnings: [], checks: [] };
    }
    const lineage = analysis.source_lineage
      || { applicable: false, findings: [], inventory: [], promises: [], coverage: [] };
    if (!lineage.applicable) {
      return {
        ok: true,
        issues: [],
        warnings: ['source lineage not applicable: no briefing found for this feature'],
        checks: [{ id: 'sources', ok: true, detail: 'not applicable' }],
        metrics: { applicable: false }
      };
    }
    const issues = lineage.findings.map((f) => `[${f.check}] ${f.message}`);
    const present = lineage.inventory.filter((item) => item.file_status === 'present').length;
    const ok = issues.length === 0;
    return {
      ok,
      issues,
      warnings: [],
      checks: [{ id: 'sources', ok, detail: issues.join('; ') || null }],
      metrics: {
        applicable: true,
        sources_total: lineage.inventory.length,
        sources_present: present,
        sources_missing: lineage.inventory.length - present,
        promises_total: lineage.promises.length,
        promises_required: lineage.promises.filter((p) => p.state === 'required').length,
        coverage_rows: lineage.coverage.length,
        lifecycle_stage: lineage.lifecycle ? lineage.lifecycle.stage : null,
        absorbed: lineage.lifecycle ? lineage.lifecycle.absorbed : null
      }
    };
  },

  // The deterministic half of the Briefing contract, run where the lineage is
  // born instead of two agents later: frontmatter identity, the eight mandatory
  // sections, open-question classification, placeholder discipline, and the
  // config.md registry entry — plus the same source-lineage analyzer kind=sources
  // trusts, so fingerprint staleness and SRC-*/PROM-* breaks surface at authoring
  // time. Whether each promise faithfully represents its source stays with the agent.
  briefing: async (ctx) => {
    const rel = `.aioson/briefings/${ctx.slug}/briefings.md`;
    let briefingText;
    try {
      briefingText = fs.readFileSync(path.resolve(ctx.targetDir, rel), 'utf8');
    } catch {
      return { ok: false, issues: [`briefing not found: ${rel}`], warnings: [], checks: [] };
    }
    let configText = '';
    try {
      configText = fs.readFileSync(path.resolve(ctx.targetDir, '.aioson/briefings/config.md'), 'utf8');
    } catch { /* registry check degrades to a warning */ }

    const { analyzeBriefing } = require('../lib/briefing-lint');
    const result = analyzeBriefing({ briefing: briefingText, config: configText, slug: ctx.slug });
    const issues = [...result.issues];
    const warnings = [...result.warnings];
    const metrics = { ...result.metrics, file: rel };

    // Lineage at birth. Legacy and conversational briefings without an
    // inventory are legal, so inapplicability and analyzer failure degrade to
    // warnings — the structural lint above remains the verdict's backbone.
    try {
      const { analyzeFeatureCompleteness } = require('../lib/feature-completeness');
      const analysis = await analyzeFeatureCompleteness(ctx.targetDir, ctx.slug, {});
      const lineage = analysis.source_lineage || { applicable: false, findings: [] };
      if (lineage.applicable) {
        issues.push(...lineage.findings.map((f) => `[${f.check}] ${f.message}`));
        metrics.lineage = {
          sources_total: (lineage.inventory || []).length,
          promises_total: (lineage.promises || []).length,
          lifecycle_stage: lineage.lifecycle ? lineage.lifecycle.stage : null
        };
      } else {
        warnings.push('source lineage not applicable to this briefing');
        metrics.lineage = { applicable: false };
      }
    } catch (error) {
      warnings.push(`source lineage analysis failed: ${error.message}`);
    }

    // Prototype resolution is advisory here — a draft briefing may legitimately
    // not have built it yet — but briefing:approve refuses while it is missing,
    // so surface the pending state before the human hits that wall.
    try {
      const { resolvePrototypeState } = require('../lib/briefing-refiner/prototype-resolution');
      const prototype = resolvePrototypeState(ctx.targetDir, ctx.slug, briefingText);
      metrics.prototype_state = prototype.state;
      if (prototype.state === 'missing') {
        warnings.push(`prototype unresolved — briefing:approve will refuse until @briefing-refiner builds .aioson/briefings/${ctx.slug}/prototype.html or the briefing records \`prototype: not_applicable\``);
      } else if (prototype.state === 'skipped_measured_run') {
        warnings.push('prototype skipped by the measured-run contract (.aioson/benchmark/measured-run.json) — this briefing is round evidence, never product authority');
      }
    } catch (error) {
      warnings.push(`prototype resolution check failed: ${error.message}`);
    }

    const ok = issues.length === 0;
    return {
      ok,
      issues,
      warnings,
      checks: [{ id: 'briefing', ok, detail: issues.join('; ') || null }],
      metrics
    };
  },

  // The deterministic half of the Tester contract: report identity, the
  // class-tagged hypothesis matrix, executed-command evidence, and named
  // residual risk — so stopping short of full coverage is a visible decision,
  // never a silent default. Whether each hypothesis actually bites, and the
  // delivery verdict itself, stay with the agent and with QA.
  'test-report': async (ctx) => {
    const rel = `.aioson/context/test-report-${ctx.slug}.md`;
    let reportText;
    try {
      reportText = fs.readFileSync(path.resolve(ctx.targetDir, rel), 'utf8');
    } catch {
      return { ok: false, issues: [`test report not found: ${rel}`], warnings: [], checks: [] };
    }

    const { analyzeTestReport } = require('../lib/test-report-lint');
    const result = analyzeTestReport({ report: reportText, slug: ctx.slug });
    const ok = result.issues.length === 0;
    return {
      ok,
      issues: result.issues,
      warnings: result.warnings,
      checks: [{ id: 'test-report', ok, detail: result.issues.join('; ') || null }],
      metrics: { ...result.metrics, file: rel }
    };
  },

  // The deterministic half of the @benchmark output contract: schema v1 shape,
  // status/validation enums, research/validation row shapes, path containment
  // and existence, forbidden provenance fields, and the "completed needs
  // entrypoints + validation coverage" rule. Whether the delivery is honest and
  // ambitious stays with the agent (and the external orchestrator).
  'benchmark-result': async (ctx) => {
    const rel = ctx.file || 'benchmark-result.json';
    const abs = path.resolve(ctx.targetDir, rel);
    const { analyzeBenchmarkResult } = require('../lib/benchmark-result-lint');
    const result = analyzeBenchmarkResult({ file: abs });
    const ok = result.issues.length === 0;
    return {
      ok,
      issues: result.issues,
      warnings: result.warnings,
      checks: [{ id: 'benchmark-result', ok, detail: result.issues.join('; ') || null }],
      metrics: { ...result.metrics, file: rel }
    };
  },

  // The deterministic half of the Shakedown contract: frontmatter identity and
  // enums, Coverage-table arithmetic against the declared {visited}/{inventoried},
  // punch-list row discipline (SHK ids, class/lane enums, per-class evidence),
  // and the "Not visited empty ⇔ complete run" invariant. Whether an absence is
  // a real gap — and the walkthrough itself — stay with the agent.
  shakedown: async (ctx) => {
    const rel = ctx.file || (ctx.slug ? `.aioson/context/shakedown-${ctx.slug}.md` : null);
    if (!rel) {
      return { ok: false, issues: ['kind=shakedown requires --file=<path> or --slug=<target>'], warnings: [], checks: [] };
    }
    let reportText;
    try {
      reportText = fs.readFileSync(path.resolve(ctx.targetDir, rel), 'utf8');
    } catch {
      return { ok: false, issues: [`shakedown report not found: ${rel}`], warnings: [], checks: [] };
    }

    const { analyzeShakedown } = require('../lib/shakedown-lint');
    const result = analyzeShakedown({ report: reportText, slug: ctx.slug || null });
    const ok = result.issues.length === 0;
    return {
      ok,
      issues: result.issues,
      warnings: result.warnings,
      checks: [{ id: 'shakedown', ok, detail: result.issues.join('; ') || null }],
      metrics: { ...result.metrics, file: rel }
    };
  },

  // The deterministic half of the squad pilot contract: pilot-block coherence,
  // entrypoint containment, the PILOT.md evidence doc, placeholder hygiene,
  // lane-proportional deferral, and fingerprint freshness. The taste verdict —
  // does the pilot carry the domain signature — stays with the user, whose
  // squad:pilot-approve is the only way a pilot becomes approved.
  'squad-pilot': async (ctx) => {
    const { analyzeSquadPilot } = require('../lib/squad-pilot-lint');
    const result = analyzeSquadPilot({ targetDir: ctx.targetDir, slug: ctx.slug });
    const ok = result.issues.length === 0;
    return {
      ok,
      issues: result.issues,
      warnings: result.warnings,
      checks: [{ id: 'squad-pilot', ok, detail: result.issues.join('; ') || null }],
      metrics: result.metrics
    };
  },

  // The deterministic half of Sheldon's PRD approval contract: PROM coverage
  // against the briefing, the CAP → Current System Fit → Acceptance Criteria
  // chain, assertion-only evidence cells, and prototype binding coherence.
  // What needs product judgment stays with the reviewing agent.
  prd: async (ctx) => {
    let rel = ctx.file || (ctx.slug ? `.aioson/context/prd-${ctx.slug}.md` : null);
    if (!rel) {
      return { ok: false, issues: ['kind=prd requires --file=<path> or --slug=<feature>'], warnings: [], checks: [] };
    }
    if (!ctx.file && !fs.existsSync(path.resolve(ctx.targetDir, rel)) && fs.existsSync(path.resolve(ctx.targetDir, '.aioson/context/prd.md'))) {
      rel = '.aioson/context/prd.md';
    }
    let prdText;
    try {
      prdText = fs.readFileSync(path.resolve(ctx.targetDir, rel), 'utf8');
    } catch {
      return { ok: false, issues: [`cannot read PRD file: ${rel}`], warnings: [], checks: [] };
    }

    const { analyzePrd, parseFrontmatter } = require('../lib/prd-lint');
    const slug = ctx.slug || parseFrontmatter(prdText).feature || null;
    let briefingText = '';
    if (slug) {
      try {
        briefingText = fs.readFileSync(path.resolve(ctx.targetDir, `.aioson/briefings/${slug}/briefings.md`), 'utf8');
      } catch { /* no briefing — PROM coverage not applicable */ }
    }

    const result = analyzePrd({ prd: prdText, briefing: briefingText, targetDir: ctx.targetDir });
    const ok = result.issues.length === 0;
    return {
      ok,
      issues: result.issues,
      warnings: result.warnings,
      checks: [{ id: 'prd', ok, detail: result.issues.join('; ') || null }],
      metrics: { ...result.metrics, file: rel, briefing_read: briefingText.length > 0 }
    };
  },

  // The measured half of anti-slop. Every other visual gate in AIOSON is prose
  // an agent may or may not honor; this one reads the HTML/CSS that was written
  // and reports arithmetic — token adherence, spacing rhythm, depth strategies,
  // motion and state coverage — plus the structural defects provable from text.
  // Findings a browser or taste would be needed for stay out by construction.
  visual: async (ctx) => {
    const sources = collectVisualSources(ctx) || (ctx.url ? emptyVisualSources() : null);
    if (!sources) {
      return {
        ok: false,
        issues: ['kind=visual found no interface sources — pass --file=<path>, --dir=<front-end root>, or --slug=<feature> for the owned prototype; a served framework app is measured with --url=<http://…> --runtime'],
        warnings: [],
        checks: []
      };
    }

    const { analyzeVisualSources } = require('../lib/visual-telemetry');
    // A declared surface mode outranks detection: the prototype manifest names
    // what the visitor came to do (`surface_mode: operate|brand|read` in its
    // frontmatter, or a `mode:` bullet under `## Visual direction`), and
    // `--surface-mode=` says it for a directory run.
    const result = analyzeVisualSources({ ...sources, surfaceMode: ctx.surfaceMode || declaredSurfaceMode(ctx) });

    const issues = [...result.issues];
    const warnings = [...result.warnings];
    const metrics = {
      ...result.metrics,
      files: sources.files.slice(0, VISUAL_FILES_LISTED),
      corpus: sources.corpus
    };
    if (sources.corpus.truncated > 0) {
      warnings.push(`corpus truncated: ${sources.corpus.truncated} file(s) beyond the ${VISUAL_MAX_FILES}-file cap were not read, so this measurement is partial — point --dir at the interface root (src/, app/) rather than the repository`);
    }

    // A browser can still measure what static telemetry cannot read, so a
    // not-applicable static pass only ends the run when no runtime target
    // was given.
    const runtimeTarget = ctx.runtime ? (ctx.url || sources.entry) : null;
    if (!result.applicable) {
      warnings.push(`visual telemetry not applicable: ${result.reason}`);
      if (!runtimeTarget) {
        return {
          ok: true,
          issues: [],
          warnings,
          checks: [{ id: 'visual', ok: true, detail: result.reason }],
          metrics
        };
      }
    }

    // Slug mode resolves the feature-owned prototype, whose contract is the
    // prototype.html + prototype-manifest.md PAIR. A manifest without a
    // `## Visual direction` (register, thesis, anti-goals, signature) means the
    // composition was never decided in writing — the exact gap that lets an
    // identity re-skin ship over the default generative layout.
    if (result.applicable && ctx.slug && !ctx.file && !ctx.dir) {
      const manifestPath = path.resolve(ctx.targetDir, '.aioson', 'briefings', ctx.slug, 'prototype-manifest.md');
      let manifest = null;
      try { manifest = fs.readFileSync(manifestPath, 'utf8'); } catch { /* handled below */ }
      if (manifest === null) {
        issues.push('prototype-manifest.md not found next to prototype.html — the manifest (with its `## Visual direction`) is half of the prototype artifact');
      } else {
        // Line-anchored capture: the section body is every following line that
        // does not open another `##` section, so an empty section cannot
        // swallow its neighbor's content and read as filled.
        const section = manifest.match(/(?:^|\n)##\s+Visual direction[^\n]*((?:\n(?!##\s)[^\n]*)*)/i);
        const body = section ? section[1].trim() : '';
        if (body.length === 0) {
          issues.push('prototype-manifest.md has no filled `## Visual direction` — register, thesis, anti-goals, and the composition signature must be written before layout; an identity record supplies tokens, never the composition decision');
        }
        metrics.manifest_visual_direction = body.length > 0;

        // A `## Quality evidence` section that is empty or still a placeholder
        // means the measurement ran nowhere — the exact misfire that let a
        // flat prototype ship with its evidence section reading "(filled after
        // measurement)". Warning tier: the manifest may legitimately not exist
        // yet mid-build; an EMPTY evidence section at verify time is the smell.
        const evidence = manifest.match(/(?:^|\n)##\s+Quality evidence[^\n]*((?:\n(?!##\s)[^\n]*)*)/i);
        if (evidence) {
          const evidenceBody = evidence[1].replace(/[_*()\s-]+/g, ' ').trim();
          const placeholder = evidenceBody.length < 60 || /preenchid|filled after|to be filled|pendente|\btbd\b|\btodo\b/i.test(evidenceBody.slice(0, 80));
          if (placeholder) {
            warnings.push('prototype-manifest.md `## Quality evidence` is empty or a placeholder — the measured numbers (kind=visual metrics, fold outcome, walkthrough verdict) were never persisted; run the measurement and record it, or the done-gate is self-graded prose');
          }
          metrics.manifest_quality_evidence = !placeholder;
        }

        // Identity provenance: an intent-first build (`identity: none`) whose
        // craft measurements missed has a NAMED route — extract an identity
        // from the owner's references — and the gate says so, instead of the
        // next round re-rolling the same intent-first dice or a preset menu.
        const identityLine = manifest.match(/^identity:\s*(.+)$/mi);
        const identityRef = identityLine ? identityLine[1].trim().replace(/^["']|["']$/g, '') : null;
        metrics.manifest_identity = identityRef;
        const intentFirst = !identityRef || /^(none|null|~)$/i.test(identityRef);
        const craftMissed = warnings.some((w) => /never delivered|OS default stacks|craft floor/.test(w));
        if (intentFirst && craftMissed) {
          warnings.push('intent-first build (`identity: none`) with the measured craft floor unmet — before another intent-first round or any preset menu, ask the owner for visual references (screenshots, capture folders, site URLs) and run reference-identity-extract into the briefing\'s identity.md; an extracted identity outranks origination');
        }
      }
    }

    // Opt-in runtime pass. Static telemetry reads what was written; this reads
    // what the browser did with it — overflow, clipping, real computed contrast.
    // A missing browser is a reported state, never a silent pass — and so is a
    // missing target: a framework app has no HTML document to open until it is
    // built or served, and a run that asked for the browser must say which.
    if (ctx.runtime && !runtimeTarget) {
      const reason = 'runtime pass skipped: the corpus holds no HTML document to open — pass --file=<built index.html> or --url=<served app> (e.g. http://localhost:5173) with --runtime; the fold, overflow and computed-contrast findings need a rendered page';
      warnings.push(reason);
      metrics.runtime = { available: false, reason };
    } else if (ctx.runtime) {
      const { collectRuntimeMeasurements, summarizeRuntime } = require('../lib/visual-runtime');
      const { pathToFileURL } = require('node:url');
      const entryUrl = ctx.url || pathToFileURL(path.resolve(ctx.targetDir, sources.entry)).href;
      const collected = await collectRuntimeMeasurements({
        fileUrl: entryUrl,
        route: ctx.route || null,
        launcher: ctx.browserLauncher || null
      });
      if (!collected.available) {
        warnings.push(collected.reason);
        metrics.runtime = { available: false, reason: collected.reason };
      } else {
        const runtime = summarizeRuntime(collected.runs);
        issues.push(...runtime.issues);
        warnings.push(...runtime.warnings);
        metrics.runtime = { available: true, entry: ctx.url || sources.entry, ...runtime.metrics };
      }
    }

    // Conformance: the approved prototype's measured verdict is the floor of
    // its implementation. "Craft regressing in translation" was a prose duty in
    // the dev doctrine; with the prototype's evidence recorded, it is a delta.
    if (ctx.conformance) {
      const { readVisualEvidence } = require('../lib/visual-evidence');
      const evidence = readVisualEvidence(ctx.targetDir, ctx.conformance);
      const proto = evidence && evidence.metrics;
      const conformance = compareToPrototype(proto, metrics, ctx.conformance);
      metrics.conformance = conformance;
      // An axis nobody could read is not an axis that passed. Saying so here is
      // what keeps `regressed: []` from reading as a verdict downstream.
      if (conformance.state === 'not-compared') {
        warnings.push(`visual conformance NOT measured: ${conformance.reason} — this surface was not held to any prototype floor; record the outcome instead of assuming it`);
      } else if (conformance.state === 'partial') {
        warnings.push(`visual conformance partial: ${conformance.reason} — the rest of the floor was held; measure the served app with --url=<http://…> --runtime to close the gap`);
      }
      if (conformance.regressed.length > 0) {
        warnings.push(`visual conformance: the implementation regressed below the approved prototype's measured floor — ${conformance.regressed.join(', ')}; the real stack makes the craft easier, not harder: restore it or record the deviation in the PRD as approved`);
      }
    }

    // Cross-project palette repetition. Each surface can pass every gate alone
    // while the operator's projects all land on the model's favorite palette —
    // the fingerprint registry (operator-local, best-effort) is the only place
    // that sameness is visible. Advisory by design: two brands may genuinely
    // share a family, but that is a decision to record, not a default to
    // discover after the third identical site.
    // Only full surfaces (craft-measured, ≥150 declarations) carry a palette
    // identity worth registering — fragments and snippets stay out.
    try {
      const pal = metrics.palette;
      if (pal && pal.accent_hue != null && pal.ground && metrics.craft && metrics.craft.measured) {
        const { readRegistry, recordFingerprint, findRepetition } = require('../lib/design-seed');
        const current = {
          project: path.basename(path.resolve(ctx.targetDir)),
          slug: ctx.slug || null,
          accent_hue: pal.accent_hue,
          ground_pole: pal.ground.pole,
          ground_hue: pal.ground.h,
          display_face: metrics.display_face || (metrics.font_families || [])[0] || null,
          source: 'measured'
        };
        const repetition = findRepetition(current, readRegistry().entries);
        if (repetition) {
          const face = repetition.same_face ? ', same display face' : '';
          warnings.push(`cross-project palette repetition: accent hue ~${pal.accent_hue}° on a ${pal.ground.pole} ground repeats recent project "${repetition.entry.project}" (Δ${repetition.delta}°, ${repetition.reason}${face}) — the model's favorite palette is reappearing across unrelated projects; draw a diversified start with \`aioson design:seed\` (or extract an identity from the owner's references), or record why these brands genuinely share the family`);
          metrics.palette_repeat = { project: repetition.entry.project, delta_deg: repetition.delta, reason: repetition.reason, same_face: repetition.same_face };
        }
        // A diagnostic run (`--no-persist`) compares but never records: a
        // measurement must not rewrite the operator's registry as a side
        // effect of looking.
        metrics.fingerprint_recorded = ctx.persist !== false && recordFingerprint(current);
      }
    } catch { /* fingerprinting is advisory — a broken registry never blocks the gate */ }

    const ok = issues.length === 0;
    return {
      ok,
      issues,
      warnings,
      checks: [{ id: 'visual', ok, detail: issues.join('; ') || null }],
      metrics
    };
  }
};

// ─── kind resolution ────────────────────────────────────────────────────────

function availableKinds() {
  return [...Object.keys(ADAPTERS), ...Object.keys(RULESETS)].sort();
}

async function evaluateKind(kind, ctx, logger) {
  if (ADAPTERS[kind]) {
    return ADAPTERS[kind](ctx, logger);
  }
  if (RULESETS[kind]) {
    const { criteria } = RULESETS[kind](ctx);
    return evaluateRuleset(criteria, ctx.targetDir);
  }
  return null; // unknown
}

// ─── main command ─────────────────────────────────────────────────────────────

async function runVerifyArtifact({ args, options = {}, logger }) {
  const targetDir = resolveTargetDir(args);
  const kind = options.kind ? String(options.kind).trim() : '';
  const slug = options.slug ? String(options.slug).trim() : null;
  // Absolutized here so every kind downstream reads the artifact the caller
  // meant: when the target dir was lifted out of a .aioson/ tree, a relative
  // operand still resolves from where the command was actually run.
  const file = options.file ? resolveOperandPath(targetDir, String(options.file).trim()) : null;
  const dir = options.dir ? resolveOperandPath(targetDir, String(options.dir).trim()) : null;
  const noBuild = Boolean(options['no-build'] || options.noBuild);
  const buildTimeout = options['build-timeout'] ? Number(options['build-timeout']) : undefined;
  const buildCommand = Array.isArray(options.buildCommand) ? options.buildCommand : undefined;
  const advisory = Boolean(options.advisory);
  const strict = Boolean(options.strict);
  const suppressExitCode = Boolean(options.suppressExitCode);
  const setExitCode = (code) => { if (!suppressExitCode) process.exitCode = code; };

  if (!kind) {
    const msg = `verify:artifact requires --kind=<kind>. Available: ${availableKinds().join(', ')}`;
    if (options.json) { setExitCode(1); return { ok: false, kind: null, error: 'missing_kind', available: availableKinds() }; }
    logger.error(msg);
    setExitCode(1);
    return { ok: false, kind: null };
  }

  if (REQUIRES_SLUG.has(kind) && !slug) {
    const msg = `verify:artifact kind=${kind} requires --slug=<slug>`;
    const blocking = !advisory;
    if (options.json) {
      setExitCode(blocking ? 1 : 0);
      return { generator: GENERATOR, kind, slug: null, root: targetDir, mode: advisory ? 'advisory' : 'blocking', ok: false, blocking, issues: [msg], warnings: [], checks: [], error: 'missing_slug', exitCode: blocking ? 1 : 0 };
    }
    logger.error(msg);
    setExitCode(blocking ? 1 : 0);
    return { ok: false, kind };
  }

  if (REQUIRES_FILE.has(kind) && !file) {
    const msg = `verify:artifact kind=${kind} requires --file=<path>`;
    const blocking = !advisory;
    if (options.json) {
      setExitCode(blocking ? 1 : 0);
      return { generator: GENERATOR, kind, slug, root: targetDir, mode: advisory ? 'advisory' : 'blocking', ok: false, blocking, issues: [msg], warnings: [], checks: [], error: 'missing_file', exitCode: blocking ? 1 : 0 };
    }
    logger.error(msg);
    setExitCode(blocking ? 1 : 0);
    return { ok: false, kind };
  }

  const runtime = Boolean(options.runtime);
  const route = options.route ? String(options.route).trim() : null;
  const url = options.url ? String(options.url).trim() : null;
  // `--conformance=<slug>`: hold this measurement to the prototype evidence
  // recorded for the feature (the implementers' session end threads it).
  const conformance = options.conformance ? String(options.conformance).trim() : null;
  const surfaceMode = options['surface-mode'] || options.surfaceMode ? String(options['surface-mode'] || options.surfaceMode).trim() : null;
  // `--no-persist`: a diagnostic run reads and reports but writes nothing —
  // no context report, no operator fingerprint. Measuring is not mutating.
  const persist = !(options['no-persist'] || options.noPersist);
  const result = await evaluateKind(kind, {
    slug, targetDir, file, dir, noBuild, buildTimeout, buildCommand,
    runtime, route, url, persist, conformance, surfaceMode, browserLauncher: options.browserLauncher || null
  }, logger);

  if (result === null) {
    const msg = `verify:artifact: unknown kind "${kind}". Available: ${availableKinds().join(', ')}`;
    if (options.json) { setExitCode(1); return { ok: false, kind, error: 'unknown_kind', available: availableKinds() }; }
    logger.error(msg);
    setExitCode(1);
    return { ok: false, kind };
  }

  // strict promotes warnings to blocking issues.
  const issues = strict ? [...result.issues, ...result.warnings] : [...result.issues];
  const warnings = strict ? [] : [...result.warnings];
  const ok = issues.length === 0;
  const blocking = !ok && !advisory;

  const report = {
    generator: GENERATOR,
    kind,
    slug,
    root: targetDir,
    mode: advisory ? 'advisory' : 'blocking',
    ok,
    blocking,
    issues,
    warnings,
    checks: result.checks || []
  };

  // Telemetry kinds return measurements alongside the verdict. They are the
  // point of the run, not decoration — a number that never reaches the caller
  // cannot be acted on.
  if (result.metrics) report.metrics = result.metrics;

  // The CLI wrapper fails the process for any result carrying `ok: false`, which
  // would silently override --advisory at the shell — the command decided not to
  // block and the shell blocked anyway. Returning the exit code explicitly makes
  // this verdict the authority: the wrapper honors `exitCode` before it looks at
  // `ok`. Without it, "advisory never blocks" is only true in-process.
  report.exitCode = blocking ? 1 : 0;

  // Persist for downstream consumption (mirrors audit:code). The per-kind file
  // is the LATEST run of that kind — a shared slot by design, like audit:code.
  // A feature-owned measurement (kind=visual in pure --slug mode) is also
  // written to the feature's own evidence slot, where a later run over
  // another feature or an ad-hoc --dir cannot overwrite it; feature:trace and
  // feature:close read it from there.
  if (persist) {
    try {
      const ctxDir = path.join(targetDir, '.aioson', 'context');
      fs.mkdirSync(ctxDir, { recursive: true });
      fs.writeFileSync(path.join(ctxDir, `verify-artifact-${kind}.json`), JSON.stringify(report, null, 2), 'utf8');
      if (kind === 'visual' && slug && !file && !dir) {
        const evidenceDir = path.join(ctxDir, 'features', slug);
        fs.mkdirSync(evidenceDir, { recursive: true });
        fs.writeFileSync(path.join(evidenceDir, VISUAL_EVIDENCE_FILE), JSON.stringify({ ...report, measured_at: new Date().toISOString() }, null, 2), 'utf8');
        report.evidence = `.aioson/context/features/${slug}/${VISUAL_EVIDENCE_FILE}`;
      }
      // The implementation's measurement lives next to the prototype's, so the
      // feature carries both halves of its visual record to trace and close.
      if (kind === 'visual' && conformance) {
        const evidenceDir = path.join(ctxDir, 'features', conformance);
        fs.mkdirSync(evidenceDir, { recursive: true });
        fs.writeFileSync(path.join(evidenceDir, VISUAL_IMPLEMENTATION_FILE), JSON.stringify({ ...report, measured_at: new Date().toISOString() }, null, 2), 'utf8');
        report.implementation_evidence = `.aioson/context/features/${conformance}/${VISUAL_IMPLEMENTATION_FILE}`;
      }
    } catch {
      // best-effort persistence — never fail the gate on a write error
    }
  } else {
    report.persisted = false;
  }

  if (options.json) {
    logger.log(JSON.stringify(report, null, 2));
    setExitCode(blocking ? 1 : 0);
    return report;
  }

  const verdict = ok ? 'OK' : (advisory ? 'ADVISORY' : 'FAIL');
  logger.log(`verify:artifact — kind=${kind}${slug ? ` slug=${slug}` : ''} — ${verdict}`);
  if (report.metrics) {
    const m = report.metrics;
    const pct = m.token_adherence_pct === null || m.token_adherence_pct === undefined ? 'n/a' : `${m.token_adherence_pct}%`;
    const craft = m.craft && m.craft.measured
      ? ` | type max ${m.max_font_size_px || 0}px | font ${m.font_delivery && m.font_delivery.delivered ? 'delivered' : 'not delivered'} | craft ${m.craft.active_levers}/${m.craft.lever_count || 5}${m.craft.mode && m.craft.mode !== 'unknown' ? ` (${m.craft.mode})` : ''} | materials ${m.craft.material_depth ?? 0}/7`
      : '';
    const tells = m.tells && m.tells.active > 0 ? ` | tells ${m.tells.active}` : '';
    const palette = m.palette && m.palette.accent_hue != null && m.palette.ground
      ? ` | accent ~${m.palette.accent_hue}° on ${m.palette.ground.pole}`
      : '';
    logger.log(`  tokens ${pct} | spacing off-grid ${m.spacing_off_grid ?? 'n/a'} | depth ${(m.depth_strategies || []).join('+') || 'none'} | fonts ${(m.font_families || []).length} | reduced-motion ${m.reduced_motion_handled ? 'yes' : 'no'}${craft}${tells}${palette}`);
    if (Array.isArray(m.states_missing) && m.states_missing.length) logger.log(`  states missing: ${m.states_missing.join(', ')}`);
  }
  for (const issue of issues) logger.log(`  ✗ ${issue}`);
  for (const w of warnings) logger.log(`  ⚠ ${w}`);
  if (ok && warnings.length === 0) logger.log('  (no issues)');

  setExitCode(blocking ? 1 : 0);
  return report;
}

module.exports = {
  runVerifyArtifact,
  // exported for reuse / tests
  evaluateRuleset,
  availableKinds,
  RULESETS,
  ADAPTERS,
  PLACEHOLDER_PATTERNS,
  staticSiteChecks,
  scanSiteForLeaks,
  collectVisualSources,
  runSiteBuild,
  evaluateCommitMessage
};
